import { apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/game-helpers";
import { format, isSameDay, subDays } from "date-fns";
import {
  Activity, ArrowUpRight, CheckCircle2, Clock3, DollarSign, Eye, Filter,
  Grid2X2, LineChart as LineChartIcon, LoaderCircle, RefreshCw, RotateCcw,
  Search, ShieldAlert, Wallet, XCircle, Zap,
} from "lucide-react";
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const TOKEN_KEY = "kizopay_token";

function authedFetch(url: string) {
  const token = localStorage.getItem(TOKEN_KEY);
  return fetch(apiUrl(url), token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
}

interface ResellerBalance {
  username: string;
  balance: number;
  status: string;
  role: string;
  totalOrders: number;
  totalSpent: number;
}

interface Order {
  id: string;
  gameName: string;
  productName: string;
  playerId: string;
  serverId?: string | null;
  amountUsd: string;
  currency: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  updatedAt?: string;
}

interface OrderSummary {
  total: number;
  pending: number;
  paid: number;
  completed: number;
  failed: number;
  profitUsd: number;
  recentOrders: Order[];
}

interface CatalogGame {
  gameCode: string;
  name: string;
  imageUrl?: string;
}

function useResellerBalance() {
  return useQuery<ResellerBalance>({
    queryKey: ["reseller-balance"],
    queryFn: async () => {
      const res = await authedFetch("/api/balance");
      if (!res.ok) throw new Error("Failed to fetch balance");
      return res.json();
    },
    refetchInterval: 30000,
  });
}

function useAdminOrderSummary() {
  return useQuery<OrderSummary>({
    queryKey: ["order-summary"],
    queryFn: async () => {
      const res = await authedFetch("/api/orders/summary");
      if (!res.ok) throw new Error("Failed to fetch order summary");
      return res.json();
    },
    refetchInterval: 10000,
  });
}

function useCatalogGames() {
  return useQuery<CatalogGame[]>({
    queryKey: ["catalog-games"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/games"));
      if (!res.ok) throw new Error("Failed to fetch games");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export default function AdminDashboard() {
  const { data: summary, isLoading, error, refetch } = useAdminOrderSummary();
  const { data: balance, isLoading: isLoadingBalance } = useResellerBalance();
  const { data: catalogGames = [] } = useCatalogGames();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [operationSearch, setOperationSearch] = useState("");
  const [operationStatus, setOperationStatus] = useState("all");
  const balanceAmount = balance ? Number(balance.balance) : Number.NaN;
  const spentAmount = balance ? Number(balance.totalSpent) : Number.NaN;
  const orders = summary?.recentOrders ?? [];
  const gameImages = new Map(catalogGames.map((game) => [game.name, game.imageUrl]));
  const today = new Date();
  const todayOrders = orders.filter((order) => isSameDay(new Date(order.createdAt), today));
  const todaySpent = todayOrders.reduce((total, order) => total + Number(order.amountUsd || 0), 0);
  const isLowBalance = Number.isFinite(balanceAmount) && balanceAmount < 5;
  const normalizedSearch = operationSearch.trim().toLowerCase();
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = !normalizedSearch || [
      order.id, order.gameName, order.productName, order.playerId, order.serverId ?? "",
    ].join(" ").toLowerCase().includes(normalizedSearch);
    const matchesStatus = operationStatus === "all"
      || order.orderStatus === operationStatus
      || order.paymentStatus === operationStatus
      || (operationStatus === "success" && isSuccessful(order));
    return matchesSearch && matchesStatus;
  });
  const chartData = useMemo(() => buildChartData(orders), [orders]);

  if (error) {
    return (
      <AdminLayout>
        <div className="admin-panel admin-reveal mx-auto max-w-lg rounded-3xl px-6 py-16 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <p className="eyebrow mb-2 text-destructive">Connection issue</p>
          <h2 className="mb-2 font-display text-2xl font-bold tracking-tight">Dashboard data unavailable</h2>
          <p className="mb-6 text-sm font-medium text-muted-foreground">We could not reach the order service. Your existing settings are safe.</p>
          <button type="button" onClick={() => refetch()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90">
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-reveal mb-5 flex items-end justify-between gap-4 sm:mb-7">
        <div>
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Grid2X2 className="h-5 w-5" />
            <span className="font-display text-sm font-semibold">Your overview</span>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Account snapshot</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here&apos;s a snapshot of your reseller account.</p>
        </div>
        <div className="hidden items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live data
        </div>
      </div>

      {isLoading || !summary ? (
        <DashboardSkeleton />
      ) : (
        <>
          <section className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 sm:gap-4 lg:grid-cols-4">
            <MetricCard
              title="Balance"
              value={isLoadingBalance ? "—" : Number.isFinite(balanceAmount) ? `$${balanceAmount.toFixed(2)}` : "Unavailable"}
              caption={isLowBalance ? "Low balance · Request top-up" : "Request top-up"}
              icon={<Wallet />}
              tone="teal"
            />
            <MetricCard title="Total orders" value={summary.total} caption="All time" icon={<Zap />} tone="blue" />
            <MetricCard
              title="Total spent"
              value={Number.isFinite(spentAmount) ? `$${spentAmount.toFixed(2)}` : "Unavailable"}
              caption={Number.isFinite(spentAmount) && summary.total > 0 ? `Avg $${(spentAmount / summary.total).toFixed(2)} / order` : "All time"}
              icon={<DollarSign />}
              tone="purple"
            />
            <MetricCard title="Failed orders" value={summary.failed} caption="Needs attention" icon={<XCircle />} tone="red" />
            <MetricCard title="Today&apos;s orders" value={todayOrders.length} caption="Since midnight" icon={<Zap />} tone="blue" />
            <MetricCard title="Today&apos;s spent" value={`$${todaySpent.toFixed(2)}`} caption="Since midnight" icon={<DollarSign />} tone="purple" />
            <MetricCard title="Success" value={summary.completed} caption="Completed orders" icon={<CheckCircle2 />} tone="teal" />
            <MetricCard title="Pending" value={summary.pending} caption="In progress" icon={<Clock3 />} tone="amber" />
          </section>

          <section className="admin-panel admin-reveal mb-5 overflow-hidden rounded-3xl sm:mb-6">
            <div className="flex items-center gap-3 px-4 pb-2 pt-4 sm:px-6 sm:pt-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-primary">
                <LineChartIcon className="h-4 w-4" />
              </div>
              <h2 className="font-display text-base font-semibold">Daily orders &amp; spend — {format(today, "MMMM yyyy")}</h2>
            </div>
            <div className="h-[260px] w-full px-1 pb-4 pt-2 sm:h-[330px] sm:px-5 sm:pb-5">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(220 18% 90%)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "hsl(220 10% 49%)", fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis yAxisId="orders" tick={{ fill: "hsl(220 10% 49%)", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                  <YAxis yAxisId="spend" orientation="right" tick={{ fill: "hsl(220 10% 49%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} width={38} />
                  <Tooltip
                    contentStyle={{ borderRadius: 14, border: "1px solid hsl(220 18% 90%)", boxShadow: "0 8px 20px hsl(222 28% 15% / .08)", fontSize: 12 }}
                    formatter={(value: number, name: string) => [name === "Spent ($)" ? `$${value.toFixed(2)}` : value, name]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                  <Line yAxisId="spend" type="monotone" dataKey="spend" name="Spent ($)" stroke="#20b486" strokeWidth={2.5} dot={{ r: 2.5, fill: "#20b486", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  <Line yAxisId="orders" type="monotone" dataKey="orders" name="Orders" stroke="#3d7bea" strokeWidth={2.5} dot={{ r: 2.5, fill: "#3d7bea", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="admin-panel admin-reveal overflow-hidden rounded-3xl">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Activity className="h-4 w-4" />
                </div>
                <h2 className="font-display text-base font-semibold">Latest orders</h2>
              </div>
              <span className="hidden text-xs font-semibold text-accent sm:block">Updated live</span>
            </div>
            <div className="border-b border-border/70 bg-muted/25 p-3 sm:p-4">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={operationSearch}
                    onChange={(event) => setOperationSearch(event.target.value)}
                    placeholder="Search orders, games, player IDs…"
                    className="h-10 rounded-xl border-border bg-card pl-9 text-sm"
                    aria-label="Search latest orders"
                    data-testid="input-search-operations"
                  />
                </div>
                <div className="relative">
                  <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select value={operationStatus} onChange={(event) => setOperationStatus(event.target.value)} className="h-10 w-full appearance-none rounded-xl border border-border bg-card pl-9 pr-8 text-sm font-medium text-foreground outline-none focus:border-primary" aria-label="Filter orders by status" data-testid="select-operation-status">
                    <option value="all">All statuses</option>
                    <option value="success">Success</option>
                    <option value="processing">Processing</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <button type="button" onClick={() => { setOperationSearch(""); setOperationStatus("all"); }} disabled={!operationSearch && operationStatus === "all"} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-reset-operation-filters">
                  <RotateCcw className="h-4 w-4" /> Reset
                </button>
              </div>
              {(operationSearch || operationStatus !== "all") && <p className="mt-2 text-xs font-medium text-muted-foreground">Showing {filteredOrders.length} of {orders.length} latest orders</p>}
            </div>
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center font-medium text-muted-foreground">{orders.length === 0 ? "No orders recorded yet" : "No matching orders"}</div>
            ) : (
              <div className="divide-y divide-border/70">
                {filteredOrders.map((order) => (
                  <OrderRow key={order.id} order={order} imageUrl={gameImages.get(order.gameName)} onView={() => setSelectedOrder(order)} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-md rounded-3xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display font-semibold"><ReceiptIcon /> Order details</DialogTitle>
            <DialogDescription className="font-mono text-xs">{selectedOrder?.id}</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="divide-y divide-border/70 rounded-2xl border border-border/70 bg-background/40">
              <DetailRow label="Game" value={selectedOrder.gameName} />
              <DetailRow label="Product" value={selectedOrder.productName} />
              <DetailRow label="Player ID" value={`${selectedOrder.playerId}${selectedOrder.serverId ? ` (${selectedOrder.serverId})` : ""}`} />
              <DetailRow label="Amount" value={formatCurrency(selectedOrder.amountUsd, selectedOrder.currency as any)} />
              <DetailRow label="Payment" value={selectedOrder.paymentStatus} />
              <DetailRow label="Status" value={selectedOrder.orderStatus} />
              <DetailRow label="Placed" value={format(new Date(selectedOrder.createdAt), "MMM d, yyyy · h:mm a")} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function buildChartData(orders: Order[]) {
  return Array.from({ length: 30 }, (_, index) => {
    const date = subDays(new Date(), 29 - index);
    const dayOrders = orders.filter((order) => isSameDay(new Date(order.createdAt), date));
    return {
      label: format(date, "d"),
      orders: dayOrders.length,
      spend: dayOrders.reduce((total, order) => total + Number(order.amountUsd || 0), 0),
    };
  });
}

type MetricTone = "teal" | "blue" | "purple" | "red" | "amber";

const metricToneClasses: Record<MetricTone, { icon: string; value: string; panel: string }> = {
  teal: { icon: "bg-emerald-500/10 text-emerald-600", value: "text-emerald-700", panel: "hover:border-emerald-500/30" },
  blue: { icon: "bg-blue-500/10 text-blue-600", value: "text-foreground", panel: "hover:border-blue-500/30" },
  purple: { icon: "bg-violet-500/10 text-violet-600", value: "text-foreground", panel: "hover:border-violet-500/30" },
  red: { icon: "bg-rose-500/10 text-rose-600", value: "text-rose-600", panel: "hover:border-rose-500/30" },
  amber: { icon: "bg-amber-500/10 text-amber-600", value: "text-amber-700", panel: "hover:border-amber-500/30" },
};

function MetricCard({ title, value, caption, icon, tone }: { title: string; value: number | string; caption: string; icon: ReactNode; tone: MetricTone }) {
  const classes = metricToneClasses[tone];
  return (
    <div className={`admin-panel flex min-h-[126px] flex-col justify-between rounded-2xl p-3.5 transition-colors sm:min-h-[142px] sm:p-4 ${classes.panel}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground sm:text-sm">{title}</p>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${classes.icon}`}>{icon}</div>
      </div>
      <div>
        <p className={`font-display text-2xl font-semibold tracking-tight sm:text-3xl ${classes.value}`}>{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className={`mt-1 truncate text-[11px] font-medium sm:text-xs ${tone === "red" || tone === "amber" ? classes.value : "text-muted-foreground"}`}>{caption}</p>
      </div>
    </div>
  );
}

function OrderRow({ order, imageUrl, onView }: { order: Order; imageUrl?: string; onView: () => void }) {
  const success = isSuccessful(order);
  return (
    <div className="flex items-center gap-3 px-3 py-3.5 transition-colors hover:bg-muted/25 sm:px-6 sm:py-4">
      {imageUrl ? <img src={imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-border object-cover sm:h-12 sm:w-12" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-primary sm:h-12 sm:w-12"><Zap className="h-5 w-5" /></div>}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-display text-sm font-semibold text-foreground sm:text-base">{order.productName || order.gameName}</p>
          <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">#{order.id}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{order.gameName} · {order.playerId}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground sm:hidden">{format(new Date(order.createdAt), "MMM d, h:mm a")}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <p className="font-display text-sm font-semibold text-foreground sm:text-base">{formatCurrency(order.amountUsd, order.currency as any)}</p>
        <StatusBadge status={success ? "success" : order.orderStatus} />
      </div>
      <button type="button" onClick={onView} className="hidden h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex" aria-label={`View order ${order.id}`} data-testid={`button-view-order-${order.id}`}>
        <Eye className="h-4 w-4" />
      </button>
    </div>
  );
}

function isSuccessful(order: Order) {
  return order.orderStatus === "completed" || order.paymentStatus === "paid" || order.paymentStatus === "approved";
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const success = normalized === "success" || normalized === "paid" || normalized === "completed";
  const failed = normalized === "failed" || normalized === "expired";
  const pending = normalized === "pending" || normalized === "processing";
  const classes = success
    ? "bg-emerald-500/10 text-emerald-700"
    : failed
      ? "bg-rose-500/10 text-rose-600"
      : pending
        ? "bg-amber-500/10 text-amber-700"
        : "bg-blue-500/10 text-blue-700";
  const Icon = success ? CheckCircle2 : failed ? XCircle : pending ? Clock3 : LoaderCircle;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${classes}`}><Icon className="h-3 w-3" />{status}</span>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="max-w-[68%] truncate text-right font-mono font-bold text-foreground" title={value}>{value}</span></div>;
}

function ReceiptIcon() {
  return <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-primary"><DollarSign className="h-4 w-4" /></span>;
}

function DashboardSkeleton() {
  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-32 w-full rounded-2xl" />)}
      </div>
      <Skeleton className="mb-5 h-[330px] w-full rounded-3xl" />
      <Skeleton className="h-[420px] w-full rounded-3xl" />
    </>
  );
}