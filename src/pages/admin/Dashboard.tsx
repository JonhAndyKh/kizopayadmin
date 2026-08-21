import { apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/game-helpers";
import { format } from "date-fns";
import { Activity, CheckCircle, Clock, XCircle, Zap, ShieldAlert, Wallet, TrendingUp, AlertTriangle, DollarSign, Eye, ReceiptText } from "lucide-react";

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
  const { data: summary, isLoading, error } = useAdminOrderSummary();
  const { data: balance, isLoading: isLoadingBalance } = useResellerBalance();
  const { data: catalogGames = [] } = useCatalogGames();
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary["recentOrders"][number] | null>(null);
  const balanceAmount = balance ? Number(balance.balance) : Number.NaN;
  const spentAmount = balance ? Number(balance.totalSpent) : Number.NaN;
  const isLowBalance = Number.isFinite(balanceAmount) && balanceAmount < 5;
  const gameImages = new Map(catalogGames.map((game) => [game.name, game.imageUrl]));

  if (error) {
    return (
      <AdminLayout>
        <div className="py-24 text-center max-w-md mx-auto">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-6" />
          <h2 className="text-2xl font-display font-black uppercase tracking-tight text-destructive mb-2">Telemetry Offline</h2>
          <p className="text-muted-foreground font-medium">Unable to connect to the stats server.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-7 sm:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
            </span>
            <span className="font-display font-bold uppercase tracking-widest text-xs text-accent">Live Telemetry</span>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-display font-black uppercase tracking-tight text-foreground">Command Center</h1>
        </div>

        {/* Bay2Game Balance */}
        <div className={`w-full min-w-0 rounded-2xl border p-3 sm:p-4 flex items-center gap-3 sm:gap-4 md:min-w-[280px] backdrop-blur-sm ${isLowBalance ? "border-amber-400/35 bg-amber-400/8" : "border-accent/30 bg-accent/6"}`}>
          <div className={`p-2.5 rounded-xl border ${isLowBalance ? "border-amber-400/35 bg-amber-400/8 text-amber-300" : "border-accent/30 bg-accent/8 text-accent"}`}>
            {isLowBalance ? <AlertTriangle className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <p className="font-display font-bold uppercase tracking-widest text-[10px] text-muted-foreground">Bay2Game Balance</p>
            {isLoadingBalance ? <Skeleton className="h-7 w-24 mt-1" /> : Number.isFinite(balanceAmount) ? (
              <>
                <p className={`text-2xl font-display font-black tracking-tight ${isLowBalance ? "text-amber-300" : "text-accent"}`}>${balanceAmount.toFixed(2)}</p>
                {isLowBalance && <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Low — top up soon</p>}
              </>
            ) : <p className="text-sm text-muted-foreground">Unavailable</p>}
          </div>
          {balance && Number.isFinite(spentAmount) && (
            <div className="text-right border-l border-border/50 pl-4">
              <div className="flex items-center gap-1 justify-end text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground mb-1">
                <TrendingUp className="w-3 h-3" /> Spent
              </div>
              <p className="font-display font-black text-lg text-foreground">${spentAmount.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground font-medium">{balance.totalOrders} orders</p>
            </div>
          )}
        </div>
      </div>

      {isLoading || !summary ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
          <Skeleton className="h-[500px] w-full rounded-xl" />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
            <StatCard title="Total Volume" value={summary.total} icon={<Zap className="w-6 h-6 text-primary fill-primary/20" />} color="border-primary" />
            <StatCard title="Pending" value={summary.pending} icon={<Clock className="w-6 h-6 text-amber-500" />} color="border-amber-500" />
            <StatCard title="Victories" value={summary.completed} icon={<CheckCircle className="w-6 h-6 text-emerald-500" />} color="border-emerald-500" />
            <StatCard title="Defeats" value={summary.failed} icon={<XCircle className="w-6 h-6 text-destructive" />} color="border-destructive" />
            <StatCard title="Net Profit" value={`$${summary.profitUsd.toFixed(2)}`} icon={<DollarSign className="w-6 h-6 text-accent" />} color="border-accent" />
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-muted/60 border-b border-border px-4 sm:px-6 py-4 flex items-center gap-3">
              <Activity className="w-5 h-5 text-accent" />
              <h2 className="font-display font-black uppercase tracking-widest text-sm text-foreground">Recent Operations</h2>
            </div>
            {summary.recentOrders.length === 0 ? (
              <div className="p-16 text-center text-muted-foreground font-medium font-display uppercase tracking-widest">No operations recorded</div>
            ) : (
              <div className="grid gap-4 p-3 sm:p-5">
                {summary.recentOrders.map((order) => {
                  const imageUrl = gameImages.get(order.gameName);
                  const isSuccess = order.orderStatus === "completed" || order.paymentStatus === "paid" || order.paymentStatus === "approved";
                  return (
                    <article key={order.id} className="overflow-hidden rounded-2xl border border-border/80 bg-background/45 shadow-sm transition-colors hover:border-accent/35">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
                        <div className="min-w-0 text-xs text-muted-foreground">
                          <span className="font-mono font-bold text-foreground">#{order.id}</span>
                          <span className="mx-2 text-border">·</span>
                          <span>{format(new Date(order.createdAt), "MMM d, yyyy · h:mm a")}</span>
                        </div>
                        <StatusBadge status={isSuccess ? "success" : order.orderStatus} />
                      </div>
                      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
                        {imageUrl ? (
                          <img src={imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover" />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                            <Zap className="h-6 w-6" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-base font-black text-foreground sm:text-lg">{order.gameName}</h3>
                          <p className="truncate text-sm font-medium text-muted-foreground">{order.productName}</p>
                        </div>
                      </div>
                      <div className="grid gap-0 sm:grid-cols-2">
                        <OperationField label="Player ID" value={`${order.playerId}${order.serverId ? ` (${order.serverId})` : ""}`} />
                        <OperationField label="Amount" value={formatCurrency(order.amountUsd, order.currency as any)} emphasis />
                      </div>
                      <div className="flex justify-end border-t border-border/60 px-4 py-3 sm:px-5">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/20"
                          data-testid={`button-view-order-${order.id}`}
                        >
                          <Eye className="h-4 w-4" /> View
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
    <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-3 first:border-t-0 sm:px-5 sm:first:border-t-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={`max-w-[68%] truncate text-right font-mono text-sm ${emphasis ? "text-lg font-black text-foreground" : "font-bold text-foreground"}`} title={value}>{value}</span>
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
    <div className={`bg-card border ${color} rounded-xl p-6 flex flex-col justify-between h-full relative overflow-hidden group hover:bg-muted/20 transition-colors`}>
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs font-display font-bold tracking-widest uppercase text-muted-foreground">{title}</p>
        <div className="p-2 bg-background border-2 border-border rounded-lg">{icon}</div>
      </div>
      <p className={`${typeof value === "string" ? "text-4xl" : "text-5xl"} font-display font-black tracking-tighter text-foreground`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let cls = "uppercase text-[9px] font-display font-bold tracking-widest px-2 py-1 rounded-lg border-2 ";
  if (status === "success" || status === "paid" || status === "completed") cls += "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
  else if (status === "failed" || status === "expired") cls += "bg-destructive/10 text-destructive border-destructive/20";
  else if (status === "pending") cls += "bg-amber-500/10 text-amber-300 border-amber-500/20";
  else cls += "bg-primary/10 text-primary border-primary/20";
  return <span className={cls}>{status}</span>;
}
