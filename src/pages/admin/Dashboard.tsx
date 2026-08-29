import { apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/game-helpers";
import { format } from "date-fns";
import { Activity, ArrowUpRight, CheckCircle, Clock, XCircle, Zap, ShieldAlert, Wallet, TrendingUp, AlertTriangle, DollarSign, Eye, ReceiptText, Search, RotateCcw, Filter, RefreshCw } from "lucide-react";

const TOKEN_KEY = "kizopay_token";

function authedFetch(url: string) {
  const token = localStorage.getItem(TOKEN_KEY);
  return fetch(apiUrl(url), token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
}

interface ResellerBalance {
  username: string; balance: number; status: string; role: string; totalOrders: number; totalSpent: number;
}

interface OrderSummary {
  total: number; pending: number; paid: number; completed: number; failed: number; profitUsd: number;
  recentOrders: Array<{
    id: string; gameName: string; productName: string; playerId: string;
    serverId?: string | null; amountUsd: string; currency: string; paymentStatus: string; orderStatus: string; createdAt: string; updatedAt?: string;
  }>;
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
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary["recentOrders"][number] | null>(null);
  const [operationSearch, setOperationSearch] = useState("");
  const [operationStatus, setOperationStatus] = useState("all");
  const balanceAmount = balance ? Number(balance.balance) : Number.NaN;
  const spentAmount = balance ? Number(balance.totalSpent) : Number.NaN;
  const isLowBalance = Number.isFinite(balanceAmount) && balanceAmount < 5;
  const gameImages = new Map(catalogGames.map((game) => [game.name, game.imageUrl]));
  const normalizedSearch = operationSearch.trim().toLowerCase();
  const filteredOrders = (summary?.recentOrders ?? []).filter((order) => {
    const matchesSearch = !normalizedSearch || [
      order.id, order.gameName, order.productName, order.playerId, order.serverId ?? "",
    ].join(" ").toLowerCase().includes(normalizedSearch);
    const matchesStatus = operationStatus === "all"
      || order.orderStatus === operationStatus
      || order.paymentStatus === operationStatus
      || (operationStatus === "success" && (order.orderStatus === "completed" || order.paymentStatus === "paid" || order.paymentStatus === "approved"));
    return matchesSearch && matchesStatus;
  });

  if (error) {
    return (
      <AdminLayout>
        <div className="admin-panel admin-reveal mx-auto max-w-lg rounded-xl px-6 py-16 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <p className="eyebrow mb-2 text-destructive">Connection issue</p>
          <h2 className="mb-2 font-display text-2xl font-bold tracking-tight">Operations data unavailable</h2>
          <p className="mb-6 text-sm font-medium text-muted-foreground">We could not reach the order service. Your existing settings are safe.</p>
          <button type="button" onClick={() => refetch()} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90">
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-reveal mb-7 flex flex-col gap-5 sm:mb-9 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="eyebrow text-emerald-700">Service status · healthy</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Operations overview</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">A clear read on balance, order flow, and fulfillment across your storefront.</p>
        </div>

        <div className={`admin-panel flex w-full min-w-0 items-center gap-3 rounded-xl p-3 sm:gap-4 sm:p-4 md:min-w-[320px] ${isLowBalance ? "border-amber-500/40 bg-amber-50" : "border-accent/30"}`}>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${isLowBalance ? "border-amber-500/30 bg-amber-100 text-amber-700" : "border-accent/30 bg-accent/10 text-accent"}`}>
            {isLowBalance ? <AlertTriangle className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <p className="eyebrow text-muted-foreground">Bay2Game balance</p>
            {isLoadingBalance ? <Skeleton className="h-7 w-24 mt-1" /> : Number.isFinite(balanceAmount) ? (
              <>
                <p className={`font-display text-2xl font-bold tracking-tight ${isLowBalance ? "text-amber-700" : "text-accent"}`}>${balanceAmount.toFixed(2)}</p>
                {isLowBalance && <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Low balance · top up soon</p>}
              </>
            ) : <p className="text-sm text-muted-foreground">Unavailable</p>}
          </div>
          {balance && Number.isFinite(spentAmount) && (
            <div className="text-right border-l border-border/50 pl-4">
              <div className="mb-1 flex items-center justify-end gap-1 text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground">
                <TrendingUp className="w-3 h-3" /> Spent
              </div>
              <p className="font-display text-lg font-bold text-foreground">${spentAmount.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground font-medium">{balance.totalOrders} orders</p>
            </div>
          )}
        </div>
      </div>

      {isLoading || !summary ? (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-10 sm:gap-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
          <Skeleton className="h-[500px] w-full rounded-xl" />
        </>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-10 sm:gap-4 lg:grid-cols-5">
            <StatCard title="Total orders" value={summary.total} icon={<Zap className="h-5 w-5 text-primary" />} color="border-primary/40" />
            <StatCard title="Pending" value={summary.pending} icon={<Clock className="h-5 w-5 text-amber-700" />} color="border-amber-500/35" />
            <StatCard title="Completed" value={summary.completed} icon={<CheckCircle className="h-5 w-5 text-emerald-700" />} color="border-emerald-500/35" />
            <StatCard title="Failed" value={summary.failed} icon={<XCircle className="h-5 w-5 text-destructive" />} color="border-destructive/35" />
            <div className="col-span-2 lg:col-span-1">
              <StatCard title="Net profit" value={`$${summary.profitUsd.toFixed(2)}`} icon={<DollarSign className="h-5 w-5 text-accent" />} color="border-accent/40" />
            </div>
          </div>

          <div className="admin-panel admin-reveal admin-reveal-delay-2 overflow-hidden rounded-xl">
            <div className="flex items-center justify-between border-b border-border bg-muted/45 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent"><Activity className="h-4 w-4" /></div>
                <div>
                  <h2 className="font-display text-sm font-bold tracking-tight text-foreground">Recent operations</h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Latest order activity from your reseller account</p>
                </div>
              </div>
              <div className="hidden items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Updated live
              </div>
            </div>
            <div className="border-b border-border/70 bg-background/35 p-3 sm:p-5">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={operationSearch}
                    onChange={(event) => setOperationSearch(event.target.value)}
                    placeholder="Search transaction, game, player ID…"
                    className="h-11 rounded-xl border-border bg-card pl-9 text-sm"
                    aria-label="Search recent operations"
                    data-testid="input-search-operations"
                  />
                </div>
                <div className="relative">
                  <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={operationStatus}
                    onChange={(event) => setOperationStatus(event.target.value)}
                    className="h-11 w-full appearance-none rounded-xl border border-border bg-card pl-9 pr-8 text-sm font-medium text-foreground outline-none focus:border-primary"
                    aria-label="Filter operations by status"
                    data-testid="select-operation-status"
                  >
                    <option value="all">All statuses</option>
                    <option value="success">Success</option>
                    <option value="processing">Processing</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                   <button
                  type="button"
                  onClick={() => { setOperationSearch(""); setOperationStatus("all"); }}
                  disabled={!operationSearch && operationStatus === "all"}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
                  data-testid="button-reset-operation-filters"
                >
                   <RotateCcw className="h-4 w-4" /> Reset
                </button>
              </div>
              {(operationSearch || operationStatus !== "all") && (
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  Showing {filteredOrders.length} of {summary.recentOrders.length} recent operations
                </p>
              )}
            </div>
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center font-medium text-muted-foreground">
                {summary.recentOrders.length === 0 ? "No operations recorded" : "No matching operations"}
              </div>
            ) : (
              <div className="grid gap-3 p-2.5 sm:gap-4 sm:p-5">
                {filteredOrders.map((order) => {
                  const imageUrl = gameImages.get(order.gameName);
                  const isSuccess = order.orderStatus === "completed" || order.paymentStatus === "paid" || order.paymentStatus === "approved";
                  return (
                    <article key={order.id} className="overflow-hidden rounded-lg border border-border/80 bg-background/45 shadow-sm transition-colors hover:border-accent/40">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/70 px-3 py-2 sm:px-5 sm:py-3">
                        <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground sm:gap-2 sm:text-xs">
                          <span className="min-w-0 max-w-[55%] truncate font-mono font-bold text-foreground" title={`#${order.id}`}>#{order.id}</span>
                          <span className="shrink-0 text-border">·</span>
                          <span className="shrink-0 whitespace-nowrap">{format(new Date(order.createdAt), "MMM d · h:mm a")}</span>
                        </div>
                        <div className="shrink-0">
                          <StatusBadge status={isSuccess ? "success" : order.orderStatus} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 border-b border-border/60 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-4">
                        {imageUrl ? (
                          <img src={imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover sm:h-14 sm:w-14 sm:rounded-xl" />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary sm:h-14 sm:w-14 sm:rounded-xl">
                            <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-sm font-black text-foreground sm:text-lg">{order.gameName}</h3>
                          <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{order.productName}</p>
                        </div>
                      </div>
                      <div className="grid gap-0 sm:grid-cols-2">
                        <OperationField label="Player ID" value={`${order.playerId}${order.serverId ? ` (${order.serverId})` : ""}`} />
                        <OperationField label="Amount" value={formatCurrency(order.amountUsd, order.currency as any)} emphasis />
                      </div>
                      <div className="flex justify-end border-t border-border/60 px-3 py-2 sm:px-5 sm:py-3">
                         <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20 sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm"
                          data-testid={`button-view-order-${order.id}`}
                        >
                           <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> View details <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-md rounded-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display font-black">
              <ReceiptText className="h-5 w-5 text-primary" /> Order Details
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">{selectedOrder?.id}</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="divide-y divide-border/70 rounded-xl border border-border/70 bg-background/40">
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

function OperationField({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border/60 px-3 py-2 first:border-t-0 sm:px-5 sm:py-3 sm:first:border-t-0">
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground sm:text-[10px]">{label}</span>
      <span className={`max-w-[68%] truncate text-right font-mono text-xs sm:text-sm ${emphasis ? "text-sm font-black text-foreground sm:text-lg" : "font-bold text-foreground"}`} title={value}>{value}</span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[68%] truncate text-right font-mono font-bold text-foreground" title={value}>{value}</span>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className={`admin-panel group relative flex min-h-[132px] flex-col justify-between overflow-hidden rounded-xl border-l-2 ${color} p-4 transition-colors hover:bg-muted/30 sm:min-h-[148px] sm:p-5`}>
      <div className="mb-4 flex items-start justify-between gap-2 sm:mb-6">
        <p className="eyebrow text-muted-foreground">{title}</p>
        <div className="shrink-0 rounded-lg border border-border bg-background p-2">{icon}</div>
      </div>
      <p className={`${typeof value === "string" ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"} font-display font-bold tracking-tight text-foreground`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let cls = "uppercase text-[8px] font-display font-bold tracking-widest px-2 py-0.5 rounded-md border sm:text-[9px] sm:py-1 ";
  if (status === "success" || status === "paid" || status === "completed") cls += "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
  else if (status === "failed" || status === "expired") cls += "bg-destructive/10 text-destructive border-destructive/20";
  else if (status === "pending") cls += "bg-amber-500/10 text-amber-700 border-amber-500/20";
  else cls += "bg-primary/10 text-primary border-primary/20";
  return <span className={cls}>{status}</span>;
}
