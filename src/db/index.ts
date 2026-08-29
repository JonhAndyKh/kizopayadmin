import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn(
    "[db] DATABASE_URL is not set — database-backed operations will be unavailable.",
  );
}

export const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : (undefined as unknown as InstanceType<typeof Pool>);

type Database = ReturnType<typeof drizzle>;

const unavailableDatabase = new Proxy({} as Database, {
  get() {
    throw new Error(
      "DATABASE_URL must be set to use database-backed operations.",
    );
  },
});

export const db = databaseUrl
  ? drizzle(pool, { schema })
  : unavailableDatabase;

/**
 * Vercel's external deployment does not run Replit's normal database setup
 * hook. Keep the first production request self-initializing for the additive
 * orders table so a fresh Neon database can accept orders safely.
 */
export async function ensureOrdersTable(): Promise<void> {
  if (!pool) {
    throw new Error("DATABASE_URL must be set to use database-backed operations.");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      game_code TEXT NOT NULL,
      game_name TEXT NOT NULL,
      product_code TEXT NOT NULL,
      product_name TEXT NOT NULL,
      player_id TEXT NOT NULL,
      server_id TEXT,
      email TEXT,
      currency TEXT NOT NULL DEFAULT 'USD',
      amount_usd TEXT NOT NULL,
      bay2_cost_usd TEXT,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      order_status TEXT NOT NULL DEFAULT 'pending',
      qr_string TEXT,
      qr_link TEXT,
      checkout_link TEXT,
      expires_at TIMESTAMPTZ,
      bay2_ref_id TEXT,
      tolasaint_payment_id TEXT,
      promo_code TEXT,
      discount_usd TEXT,
      promo_redeemed TEXT DEFAULT 'false',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS bay2_cost_usd TEXT`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_link TEXT`);
}

export * from "./schema";
