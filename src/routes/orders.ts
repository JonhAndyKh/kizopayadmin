import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, desc, count, sql, and, or, ilike, gte, lt } from "drizzle-orm";
import { db, ensureOrdersTable, ordersTable } from "@workspace/db";
import { getCategories, getProducts, createOrder as createBay2Order, checkOrder } from "../lib/bay2game";
import { createPayment, getPaymentStatus } from "../lib/tolasaint";
import { requireAdmin } from "../middleware/auth";
import { CustomGameModel } from "../models/CustomGame";
import { CustomProductModel } from "../models/CustomProduct";
import { PromoCodeModel } from "../models/PromoCode";
import { isMongoConnected } from "../lib/mongodb";

const router: IRouter = Router();

function generateId(): string {
  return `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getNestedErrorInfo(error: unknown): { message: string; code: string | null } {
  const messages: string[] = [];
  const codes: string[] = [];
  let current: unknown = error;

  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (typeof current !== "object") break;
    const record = current as { message?: unknown; code?: unknown; cause?: unknown };
    if (typeof record.message === "string") messages.push(record.message);
    if (typeof record.code === "string" || typeof record.code === "number") {
      codes.push(String(record.code));
    }
    current = record.cause;
  }

  return {
    message: messages.join(" | "),
    code: codes[0] ?? null,
  };
}

// ─── POST /orders ─────────────────────────────────────────────────────────────
const createOrderSchema = z.object({
  gameCode: z.string().min(1),
  productCode: z.string().min(1),
  playerId: z.string().min(1),
  serverId: z.string().nullable().optional(),
  email: z.string().email().optional(),
  currency: z.enum(["USD"]).default("USD"),
  promoCode: z.string().optional(),
});

router.post("/orders", async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", issues: parsed.error.issues });
  }

  const { gameCode, productCode, playerId, serverId, email, currency, promoCode } = parsed.data;

  let stage = "catalog";
  try {
    // Look up game and product details from either the custom catalog or Bay2Game.
    const customGame = isMongoConnected()
      ? await CustomGameModel.findOne({ gameCode, isVisible: true }).lean()
      : null;
    let gameName: string;
    let productName: string;
    let baseAmountUsd: number;
    let bay2CostUsd: number | null = null;

    if (customGame) {
      const customProduct = await CustomProductModel.findOne({
        gameCode,
        productCode,
        isVisible: true,
      }).lean();
      if (!customProduct) {
        return res.status(404).json({ error: "Product not found" });
      }
      gameName = customGame.name;
      productName = customProduct.name;
      baseAmountUsd = Number(customProduct.price);

      // Custom packages still fulfill through Bay2Game. Use the provider
      // catalog price as the cost when the custom game has a provider mapping.
      if (customGame.providerGameCode) {
        try {
          const providerProducts = await getProducts(customGame.providerGameCode);
          const providerProduct = providerProducts.find((product) => product.product_code === productCode);
          if (providerProduct) {
            bay2CostUsd = Number(providerProduct.sell_price);
          }
        } catch (error) {
          req.log.warn({ error, gameCode, productCode }, "Unable to load Bay2Game cost for custom product");
        }
      }
    } else {
      const [allGames, allProducts] = await Promise.all([
        getCategories(),
        getProducts(gameCode),
      ]);
      const game = allGames.find((g) => g.game_code === gameCode);
      const product = allProducts.find((p) => p.product_code === productCode);

      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      gameName = game.name;
      productName = product.name;
      baseAmountUsd = Number(product.sell_price);
      bay2CostUsd = Number(product.sell_price);
    }

    // Apply product overrides (custom name and price) if available.
    try {
      const { isMongoConnected } = await import("../lib/mongodb");
      if (isMongoConnected()) {
        const { ProductOverrideModel } = await import("../models/ProductOverride");
        const ov = await ProductOverrideModel.findOne({ gameCode, productCode });
        if (ov) {
          if (ov.customName) productName = ov.customName;
          if (ov.customPrice) baseAmountUsd = Number(ov.customPrice);
          if (!ov.isVisible) {
            return res.status(404).json({ error: "Product not found" });
          }
        }
      }
    } catch {
      // Non-fatal — use raw Bay2Game values
    }

    // Validate promo code: check eligibility but do NOT increment yet.
    // Increment only happens after payment is confirmed (see redeemPromoOnPayment).
    let discountUsd = 0;
    let appliedPromoCode: string | null = null;
    const normalizedPromoCode = promoCode?.trim().toUpperCase();
    if (normalizedPromoCode) {
      if (!isMongoConnected()) {
        return res.status(503).json({ error: "Promo codes unavailable" });
      }

      const promo = await PromoCodeModel.findOne({ code: normalizedPromoCode });
      if (!promo || !promo.isActive) {
        return res.status(400).json({ error: "Invalid promo code" });
      }
      if (promo.expiresAt && promo.expiresAt <= new Date()) {
        return res.status(400).json({ error: "Promo code has expired" });
      }
      if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
        return res.status(400).json({ error: "Promo code has reached its usage limit" });
      }
      if (baseAmountUsd < Number(promo.minOrderUsd)) {
        return res.status(400).json({
          error: `Minimum order amount is $${Number(promo.minOrderUsd).toFixed(2)}`,
        });
      }

      if (promo.discountType === "percent") {
        discountUsd = baseAmountUsd * (Number(promo.discountValue) / 100);
      } else {
        discountUsd = Math.min(Number(promo.discountValue), baseAmountUsd);
      }
      discountUsd = Math.round(discountUsd * 100) / 100;
      appliedPromoCode = promo.code;
    }

    const finalAmountUsd = Math.max(0, Math.round((baseAmountUsd - discountUsd) * 100) / 100);
    const amountUsd = String(finalAmountUsd);

    const paymentAmount = amountUsd;

    // Verify that the production order database is reachable before creating
    // an external payment. This prevents orphaned KHQR requests when the
    // database is unavailable or its schema is stale.
    stage = "database";
    await ensureOrdersTable();
    await db.select({ id: ordersTable.id }).from(ordersTable).limit(1);

    // Create Tolasaint KHQR payment
    const orderId = generateId();
    stage = "payment";
    const tolasaintPayment = await createPayment(
      paymentAmount,
      currency,
      orderId,
      { gameCode, productCode, playerId, email },
    );

    const now = new Date();
    const order = {
      id: orderId,
      gameCode,
      gameName,
      productCode,
      productName,
      playerId,
      serverId: serverId ?? null,
      email: email ?? null,
      currency,
      amountUsd,
      bay2CostUsd: bay2CostUsd !== null ? String(bay2CostUsd) : null,
      paymentStatus: "pending" as const,
      orderStatus: "pending" as const,
      qrString: tolasaintPayment.qr_string ?? null,
      qrLink: tolasaintPayment.qr_link ?? null,
      checkoutLink: tolasaintPayment.checkout_link ?? null,
      expiresAt: tolasaintPayment.expires_at ? new Date(tolasaintPayment.expires_at) : null,
      bay2RefId: null,
      tolasaintPaymentId: tolasaintPayment.id ?? null,
      promoCode: appliedPromoCode,
      discountUsd: discountUsd > 0 ? String(discountUsd) : null,
      promoRedeemed: "false",
      createdAt: now,
      updatedAt: now,
    };

    stage = "database";
    await db.insert(ordersTable).values(order);

    return res.status(201).json(serializeOrder(order));
  } catch (error) {
    const { message: errorMessage, code: databaseErrorCode } = getNestedErrorInfo(error);
    req.log.error({ error, errorMessage, databaseErrorCode, stage }, "Failed to create order");
    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    if (errorMessage.includes("TOLASAINT_API_KEY is not configured")) {
      return res.status(503).json({ error: "Payment service is not configured on the server." });
    }
    if (/Tolasaint createPayment failed:\s*(401|403)\b/.test(errorMessage)) {
      return res.status(502).json({ error: "Payment service rejected its server API key." });
    }
    if (errorMessage.includes("DATABASE_URL must be set")) {
      return res.status(503).json({ error: "Order database is not configured or has not been initialized." });
    }
    const providerStatus = errorMessage.match(/Tolasaint createPayment failed:\s*(\d{3})\b/)?.[1];
    if (stage === "payment") {
      return res.status(502).json({
        error: providerStatus
          ? `Payment provider rejected the KHQR request (HTTP ${providerStatus}).`
          : "Payment provider failed while generating the KHQR payment.",
      });
    }
    if (stage === "database") {
      if (databaseErrorCode === "42P01" || /relation .* does not exist/i.test(errorMessage)) {
        return res.status(503).json({
          error: "Order database is missing the orders table. Apply the current PostgreSQL schema before accepting orders.",
        });
      }
      if (databaseErrorCode === "42703" || /column .* does not exist/i.test(errorMessage)) {
        return res.status(503).json({
          error: "Order database schema is out of date. Apply the current PostgreSQL schema before accepting orders.",
        });
      }
      if (databaseErrorCode === "28P01" || /password authentication failed|authentication failed/i.test(errorMessage)) {
        return res.status(503).json({
          error: "Order database authentication failed. Verify the production DATABASE_URL credentials.",
        });
      }
      if (databaseErrorCode === "42501" || /permission denied/i.test(errorMessage)) {
        return res.status(503).json({
          error: "The production database user cannot write orders. Grant it access to the public orders table.",
        });
      }
      if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|timeout|connection terminated|connection refused/i.test(errorMessage)) {
        return res.status(503).json({
          error: "Order database could not be reached. Verify the production database host, network access, and SSL settings.",
        });
      }
      return res.status(503).json({
        error: databaseErrorCode
          ? `Order database rejected the request (PostgreSQL code ${databaseErrorCode}). Verify the production schema and DATABASE_URL.`
          : "Order database could not be validated. Verify the production schema and DATABASE_URL.",
      });
    }
    return res.status(502).json({ error: "Failed to create order. Please try again." });
  }
});

// ─── GET /orders/summary (admin only) ─────────────────────────────────────────
router.get("/orders/summary", requireAdmin, async (req, res) => {
  try {
    const [totals, recent, profitResult] = await Promise.all([
      db
        .select({
          paymentStatus: ordersTable.paymentStatus,
          cnt: count(),
        })
        .from(ordersTable)
        .groupBy(ordersTable.paymentStatus),
      db
        .select()
        .from(ordersTable)
        .orderBy(desc(ordersTable.createdAt))
        .limit(20),
      db
        .select({
          profitUsd: sql<string>`
            COALESCE(
              SUM(
                CASE
                  WHEN ${ordersTable.orderStatus} = 'completed'
                    AND ${ordersTable.bay2CostUsd} IS NOT NULL
                  THEN CAST(${ordersTable.amountUsd} AS NUMERIC) - CAST(${ordersTable.bay2CostUsd} AS NUMERIC)
                  ELSE 0
                END
              ),
              0
            )
          `,
        })
        .from(ordersTable),
    ]);

    const statusMap: Record<string, number> = {};
    let total = 0;
    for (const row of totals) {
      statusMap[row.paymentStatus] = Number(row.cnt);
      total += Number(row.cnt);
    }

    return res.json({
      total,
      pending: statusMap["pending"] ?? 0,
      paid: (statusMap["paid"] ?? 0) + (statusMap["approved"] ?? 0),
      completed: statusMap["completed"] ?? 0,
      failed: (statusMap["failed"] ?? 0) + (statusMap["expired"] ?? 0),
      profitUsd: Math.round(Number(profitResult[0]?.profitUsd ?? 0) * 100) / 100,
      recentOrders: recent.map(serializeOrder),
    });
  } catch (error) {
    req.log.error({ error }, "Failed to fetch order summary");
    return res.status(500).json({ error: "Failed to load summary" });
  }
});

// ─── GET /orders/list (admin only) ─────────────────────────────────────────────
// The summary intentionally stays lightweight for the overview dashboard. This
// endpoint is the full order-history surface and must be paginated.
const orderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).optional(),
  status: z.enum(["all", "success", "processing", "pending", "failed", "expired"]).default("all"),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

router.get("/orders/list", requireAdmin, async (req, res) => {
  const parsed = orderListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid order filters", issues: parsed.error.issues });
  }

  const { page, pageSize, search, status, from, to } = parsed.data;
  const filters = [];

  if (search) {
    const searchPattern = `%${search}%`;
    filters.push(or(
      ilike(ordersTable.id, searchPattern),
      ilike(ordersTable.gameName, searchPattern),
      ilike(ordersTable.productName, searchPattern),
      ilike(ordersTable.playerId, searchPattern),
      ilike(ordersTable.serverId, searchPattern),
    ));
  }

  if (from) filters.push(gte(ordersTable.createdAt, new Date(from)));
  if (to) filters.push(lt(ordersTable.createdAt, new Date(to)));

  if (status === "success") {
    filters.push(or(
      eq(ordersTable.orderStatus, "completed"),
      eq(ordersTable.paymentStatus, "paid"),
      eq(ordersTable.paymentStatus, "approved"),
    ));
  } else if (status === "failed") {
    filters.push(or(
      eq(ordersTable.orderStatus, "failed"),
      eq(ordersTable.paymentStatus, "failed"),
    ));
  } else if (status === "expired") {
    filters.push(or(
      eq(ordersTable.orderStatus, "expired"),
      eq(ordersTable.paymentStatus, "expired"),
    ));
  } else if (status === "processing") {
    filters.push(or(
      eq(ordersTable.orderStatus, "processing"),
      eq(ordersTable.paymentStatus, "processing"),
    ));
  } else if (status === "pending") {
    filters.push(or(
      eq(ordersTable.orderStatus, "pending"),
      eq(ordersTable.paymentStatus, "pending"),
    ));
  }

  const whereClause = filters.length ? and(...filters) : undefined;
  const offset = (page - 1) * pageSize;

  try {
    const [rows, totalResult] = await Promise.all([
      db
        .select()
        .from(ordersTable)
        .where(whereClause)
        .orderBy(desc(ordersTable.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: count() })
        .from(ordersTable)
        .where(whereClause),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return res.json({
      orders: rows.map(serializeOrder),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    req.log.error({ error }, "Failed to fetch order list");
    return res.status(500).json({ error: "Failed to load orders" });
  }
});

// ─── GET /orders/:orderId ──────────────────────────────────────────────────────
router.get("/orders/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    const rows = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    if (!rows.length) {
      return res.status(404).json({ error: "Order not found" });
    }

    let order = rows[0]!;

    // Poll Tolasaint for live status if not yet terminal
    const isTerminal = ["paid", "approved", "failed", "expired"].includes(order.paymentStatus);
    if (!isTerminal && order.tolasaintPaymentId) {
      try {
        const status = await getPaymentStatus(order.tolasaintPaymentId);
        const newStatus = status.status;

        if (newStatus !== order.paymentStatus) {
          const updates: Partial<typeof order> = {
            paymentStatus: newStatus,
            updatedAt: new Date(),
          };

          // Payment confirmed — place the Bay2Game order (atomic guard prevents double-fulfillment)
          if (newStatus === "paid" || newStatus === "approved") {
            // Atomically claim fulfillment: only proceeds if orderStatus is still "pending"
            const claimed = await db
              .update(ordersTable)
              .set({ orderStatus: "processing", paymentStatus: newStatus, updatedAt: new Date() })
              .where(sql`${ordersTable.id} = ${orderId} AND ${ordersTable.orderStatus} = 'pending'`)
              .returning({ id: ordersTable.id });

            if (claimed.length > 0) {
              // We claimed it — call Bay2Game now
              try {
                const bay2Result = await createBay2Order(
                  order.productCode,
                  order.playerId,
                  order.id,
                  order.serverId ?? undefined,
                );
                updates.bay2RefId = bay2Result.reference ?? null;
                if (bay2Result.status?.toUpperCase() === "SUCCESS") {
                  // Verify actual delivery via checkOrder — Bay2Game may queue despite returning "success"
                  try {
                    const check = await checkOrder(order.id);
                    const cs = check.status?.toUpperCase();
                    updates.orderStatus = cs === "SUCCESS" || cs === "COMPLETED" ? "completed"
                      : (cs === "FAILED" || cs === "ERROR") ? "failed"
                      : "processing"; // still queued/processing — keep polling
                  } catch {
                    updates.orderStatus = "processing"; // can't verify yet — poll later
                  }
                } else {
                  updates.orderStatus = "failed";
                }
              } catch (bay2Err) {
                req.log.error({ bay2Err, orderId }, "Bay2Game order placement failed");
                updates.orderStatus = "failed";
              }
              updates.paymentStatus = newStatus;
              await db
                .update(ordersTable)
                .set(updates)
                .where(eq(ordersTable.id, orderId));
            } else {
              // Already claimed by webhook or another poll — just update paymentStatus
              await db
                .update(ordersTable)
                .set({ paymentStatus: newStatus, updatedAt: new Date() })
                .where(eq(ordersTable.id, orderId));
              updates.paymentStatus = newStatus;
              // Fetch final orderStatus from DB so we return the correct state
              const fresh = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
              if (fresh[0]) updates.orderStatus = fresh[0].orderStatus;
            }
          } else if (newStatus === "failed" || newStatus === "expired") {
            updates.orderStatus = "failed";
            await db
              .update(ordersTable)
              .set(updates)
              .where(eq(ordersTable.id, orderId));
          } else {
            await db
              .update(ordersTable)
              .set(updates)
              .where(eq(ordersTable.id, orderId));
          }

          order = { ...order, ...updates } as typeof order;

          // Atomically redeem promo after payment confirmation
          if (newStatus === "paid" || newStatus === "approved") {
            await redeemPromoOnPayment(order);
          }
        }
      } catch (pollErr) {
        // Non-fatal — return cached order status
        req.log.warn({ pollErr, orderId }, "Failed to poll Tolasaint status");
      }
    }

    // If payment is confirmed but Bay2Game is still processing, poll checkOrder for live delivery status
    const paymentDone = ["paid", "approved"].includes(order.paymentStatus);
    if (paymentDone && order.orderStatus === "processing") {
      try {
        const check = await checkOrder(order.id);
        const cs = check.status?.toUpperCase();
        const deliveryStatus = cs === "SUCCESS" || cs === "COMPLETED" ? "completed"
          : (cs === "FAILED" || cs === "ERROR") ? "failed"
          : "processing";
        if (deliveryStatus !== order.orderStatus) {
          const upd = { orderStatus: deliveryStatus, bay2RefId: check.reference ?? order.bay2RefId, updatedAt: new Date() };
          await db.update(ordersTable).set(upd).where(eq(ordersTable.id, orderId));
          order = { ...order, ...upd } as typeof order;
        }
      } catch {
        // Non-fatal — keep current orderStatus
      }
    }

    return res.json(serializeOrder(order));
  } catch (error) {
    req.log.error({ error, orderId }, "Failed to fetch order");
    return res.status(500).json({ error: "Failed to fetch order" });
  }
});

// ─── POST /webhooks/tolasaint ─────────────────────────────────────────────────
const webhookSchema = z.object({
  id: z.string(),
  status: z.string(),
  amount: z.string().optional(),
  currency: z.string().optional(),
  reference: z.string().optional(),
});

router.post("/webhooks/tolasaint", async (req, res) => {
  const parsed = webhookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid webhook payload" });
  }

  const { id: tolasaintId, status, reference } = parsed.data;

  try {
    // Find order by Tolasaint payment ID or reference (the order ID)
    const rows = await db
      .select()
      .from(ordersTable)
      .where(
        sql`${ordersTable.tolasaintPaymentId} = ${tolasaintId} OR ${ordersTable.id} = ${reference ?? ""}`,
      )
      .limit(1);

    if (!rows.length) {
      return res.json({ ok: true }); // unknown — acknowledge silently
    }

    const order = rows[0]!;
    const isTerminal = ["paid", "approved", "failed", "expired"].includes(order.paymentStatus);
    if (isTerminal) {
      return res.json({ ok: true });
    }

    const updates: Partial<typeof order> = {
      paymentStatus: status,
      updatedAt: new Date(),
    };

    if (status === "paid" || status === "approved") {
      // Atomically claim fulfillment: only proceeds if orderStatus is still "pending"
      const claimed = await db
        .update(ordersTable)
        .set({ orderStatus: "processing", paymentStatus: status, updatedAt: new Date() })
        .where(sql`${ordersTable.id} = ${order.id} AND ${ordersTable.orderStatus} = 'pending'`)
        .returning({ id: ordersTable.id });

      if (claimed.length > 0) {
        try {
          const bay2Result = await createBay2Order(
            order.productCode,
            order.playerId,
            order.id,
            order.serverId ?? undefined,
          );
          updates.bay2RefId = bay2Result.reference ?? null;
          if (bay2Result.status?.toUpperCase() === "SUCCESS") {
            try {
              const check = await checkOrder(order.id);
              const cs = check.status?.toUpperCase();
              updates.orderStatus = cs === "SUCCESS" || cs === "COMPLETED" ? "completed"
                : (cs === "FAILED" || cs === "ERROR") ? "failed"
                : "processing";
            } catch {
              updates.orderStatus = "processing";
            }
          } else {
            updates.orderStatus = "failed";
          }
        } catch (bay2Err) {
          req.log.error({ bay2Err, orderId: order.id }, "Bay2Game order failed after webhook");
          updates.orderStatus = "failed";
        }
        updates.paymentStatus = status;
        await db.update(ordersTable).set(updates).where(eq(ordersTable.id, order.id));
      } else {
        // Poll already claimed fulfillment — just ensure paymentStatus is updated
        await db
          .update(ordersTable)
          .set({ paymentStatus: status, updatedAt: new Date() })
          .where(eq(ordersTable.id, order.id));
      }
    } else if (status === "failed" || status === "expired") {
      updates.orderStatus = "failed";
      await db.update(ordersTable).set(updates).where(eq(ordersTable.id, order.id));
    } else {
      await db.update(ordersTable).set(updates).where(eq(ordersTable.id, order.id));
    }

    // Atomically redeem promo after payment confirmation
    if (status === "paid" || status === "approved") {
      await redeemPromoOnPayment({ ...order, ...updates } as typeof order);
    }

    return res.json({ ok: true });
  } catch (error) {
    req.log.error({ error, tolasaintId }, "Webhook processing failed");
    return res.status(500).json({ error: "Internal error" });
  }
});

// ─── Promo redemption (called only after payment confirmed) ───────────────────
// Uses an atomic findOneAndUpdate with a condition to prevent exceeding maxUses
// under concurrent requests, and the promoRedeemed flag to prevent double-counting.
async function redeemPromoOnPayment(order: typeof ordersTable.$inferSelect): Promise<void> {
  if (!order.promoCode || order.promoRedeemed === "true") return;
  try {
    const { isMongoConnected } = await import("../lib/mongodb");
    if (!isMongoConnected()) return;
    const { PromoCodeModel } = await import("../models/PromoCode");
    // Atomic increment: only if code is still active and maxUses not exceeded
    await PromoCodeModel.findOneAndUpdate(
      {
        code: order.promoCode,
        isActive: true,
        $or: [
          { maxUses: 0 },
          { $expr: { $lt: ["$usedCount", "$maxUses"] } },
        ],
      },
      { $inc: { usedCount: 1 } }
    );
    // Mark order as redeemed so this never runs twice
    await db
      .update(ordersTable)
      .set({ promoRedeemed: "true" })
      .where(eq(ordersTable.id, order.id));
  } catch (err) {
    // Non-fatal: promo count may be slightly off, but order was fulfilled
    console.error("[Promo] Failed to atomically redeem promo for order", order.id, err);
  }
}

// ─── Serializer ───────────────────────────────────────────────────────────────
function serializeOrder(order: typeof ordersTable.$inferSelect) {
  return {
    id: order.id,
    gameCode: order.gameCode,
    gameName: order.gameName,
    productCode: order.productCode,
    productName: order.productName,
    playerId: order.playerId,
    serverId: order.serverId ?? null,
    email: order.email,
    currency: order.currency,
    amountUsd: order.amountUsd,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    qrString: order.qrString ?? null,
    qrLink: order.qrLink ?? null,
    checkoutLink: order.checkoutLink ?? null,
    expiresAt: order.expiresAt?.toISOString() ?? null,
    bay2RefId: order.bay2RefId ?? null,
    tolasaintPaymentId: order.tolasaintPaymentId ?? null,
    promoCode: order.promoCode ?? null,
    discountUsd: order.discountUsd ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export default router;
