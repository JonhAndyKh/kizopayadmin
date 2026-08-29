import { apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/game-helpers";
import { format } from "date-fns";
import {
  CheckCircle2, Clock3, Eye, Filter, LoaderCircle, RotateCcw, Search,
  ShieldAlert, Wallet, XCircle, Zap, DollarSign, Target,
} from "lucide-react";

const TOKEN_KEY = "kizopay_token";

function authedFetch(url: string) {
  const token = localStorage.getItem(TOKEN_KEY);
  return fetch(apiUrl(url), token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
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

interface ResellerBalance {
  balance: number;
  totalSpent: number;
}

interface CatalogGame {
  name: string;
  imageUrl?: string;
}

function useOrderSummary() {
  return useQuery<OrderSummary>({
    queryKey: ["order-summary"],
    queryFn: async () => {
      const response = await authedFetch("/api/orders/summary");
      if (!response.ok) throw new Error("Failed to fetch orders");
      return response.json();
    },
    refetchInterval: 10000,
  });
}

function useBalance() {
  return useQuery<ResellerBalance>({
    queryKey: ["reseller-balance"],
    queryFn: async () => {
      const response = await authedFetch("/api/balance");
      if (!response.ok) throw new Error("Failed to fetch balance");
      return response.json();
    },
    refetchInterval: 30000,
  });
}

function useCatalogGames() {
  return useQuery<CatalogGame[]>({
    queryKey: ["catalog-games"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/games"));
      if (!response.ok) throw new Error("Failed to fetch games");
      return response.json();
    },
    staleTime: 60_000,
  });
}

export default function OrdersPage() {
  const { data: summary, isLoading, error, refetch } = useOrderSummary();
  const { data: balance } = useBalance();
  const { data: games = [] } = useCatalogGames();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [draftSearch, setDraftSearch] = useState("");
  const [draftStatus, setDraftStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const orders = summary?.recentOrders ?? [];
  const gameImages = new Map(games.map((game) => [game.name, game.imageUrl]));
  const normalizedSearch = search.trim().toLowerCase();
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = !normalizedSearch || [
      order.id, order.gameName, order.productName, order.playerId, order.serverId ?? "",
    ].join(" ").toLowerCase().includes(normalizedSearch);
    const matchesStatus = status === "all"
      || order.orderStatus === status
      || order.paymentStatus === status
      || (status === "success" && isSuccessful(order));
    return matchesSearch && matchesStatus;
  });
  const totalSpent = balance ? Number(balance.totalSpent) : 0;
  const successRate = summary?.total ? Math.round((summary.completed / summary.total) * 100) : 0;

  const applyFilters = () => {
    setSearch(draftSearch);
    setStatus(draftStatus);
  };

  const resetFilters = () => {
    setDraftSearch("");
    setDraftStatus("all");
    setSearch("");
    setStatus("all");
  };

  if (error) {
    return (
      <AdminLayout>
        <div className="admin-panel mx-auto max-w-lg rounded-3xl px-6 py-16 text-center">
          <ShieldAlert className="mx-auto mb-4 h-8 w-8 text-destructive" />
          <h1 className="font-display text-2xl font-semibold">Orders unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">We could not load the reseller order history.</p>
          <button type="button" onClick={() => refetch()} className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white"><RotateCcw className="h-4 w-4" /> Try again</button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-reveal mb-5 sm:mb-7">
        <div className="flex items-center gap-2 text-primary">
          <ClipboardIcon />
          <span className="font-display text-sm font-semibold">Order management</span>
        </div>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review transactions, fulfilment status, and reseller activity.</p>
      </div>

      {isLoading || !summary ? (
        <OrdersSkeleton />
      ) : (
        <>
          <section className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-4 sm:gap-4">
            <SummaryCard title="Total orders" value={summary.total} caption="All time" icon={<Zap />} tone="blue" />
            <SummaryCard title="Total spent" value={`$${totalSpent.toFixed(2)}`} caption={summary.total ? `Avg $${(totalSpent / summary.total).toFixed(2)} / order` : "All time"} icon={<DollarSign />} tone="teal" />
            <SummaryCard title="Success rate" value={`${successRate}%`} caption={`${summary.completed} completed`} icon={<Target />} tone="amber" />
            <SummaryCard title="Pending / failed" value={`${summary.pending} / ${summary.failed}`} caption="Needing attention" icon={<Clock3 />} tone="red" />
          </section>

          <section className="admin-panel mb-4 rounded-3xl p-3 sm:mb-5 sm:p-4">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px_170px_170px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && applyFilters()} placeholder="Search transaction" className="h-12 rounded-xl border-border bg-muted/35 pl-10 text-sm" aria-label="Search transactions" />
              </div>
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)} className="h-12 w-full appearance-none rounded-xl border border-border bg-muted/35 pl-10 pr-8 text-sm font-medium text-foreground outline-none focus:border-primary" aria-label="Select order status">
                  <option value="all">All Status</option>
                  <option value="success">Success</option>
                  <option value="processing">Processing</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <button type="button" onClick={applyFilters} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-colors hover:bg-primary/90"><Filter className="h-4 w-4" /> Apply</button>
              <button type="button" onClick={resetFilters} disabled={!draftSearch && draftStatus === "all" && !search && status === "all"} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"><RotateCcw className="h-4 w-4" /> Reset</button>
            </div>
          </section>

          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-xs font-medium text-muted-foreground">{filteredOrders.length} of {orders.length} latest transactions</p>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-accent"><span className="h-2 w-2 rounded-full bg-accent" /> Live updates</span>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="admin-panel rounded-3xl p-14 text-center text-sm font-medium text-muted-foreground">{orders.length ? "No transactions match your filters." : "No transactions recorded yet."}</div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <OrderCard key={order.id} order={order} imageUrl={gameImages.get(order.gameName)} currentBalance={balance?.balance} onView={() => setSelectedOrder(order)} />
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-md rounded-3xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display font-semibold"><ClipboardIcon /> Order details</DialogTitle>
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

function OrderCard({ order, imageUrl, currentBalance, onView }: { order: Order; imageUrl?: string; currentBalance?: number; onView: () => void }) {
  return (
    <article className="admin-panel overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate font-mono">#{order.id}</span>
          <span>·</span>
          <span className="whitespace-nowrap">{format(new Date(order.createdAt), "MMM d, h:mm a")}</span>
        </div>
        <StatusBadge status={isSuccessful(order) ? "success" : order.orderStatus} />
      </div>
      <div className="flex items-center gap-3 px-3 py-4 sm:px-4">
        {imageUrl ? <img src={imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-border object-cover sm:h-12 sm:w-12" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-primary sm:h-12 sm:w-12"><Zap className="h-5 w-5" /></div>}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold text-foreground">{order.gameName}</p>
          <p className="truncate text-sm text-muted-foreground">{order.productName}</p>
        </div>
      </div>
      <div className="divide-y divide-border/50 border-t border-border/50">
        <OrderField label="Player ID" value={`${order.playerId}${order.serverId ? ` (${order.serverId})` : ""}`} icon={<Target />} />
        <OrderField label="Balance" value={Number.isFinite(Number(currentBalance)) ? `Current: $${Number(currentBalance).toFixed(2)}` : "Live reseller balance"} icon={<Wallet />} />
        <OrderField label="Amount" value={formatCurrency(order.amountUsd, order.currency as any)} emphasis icon={<DollarSign />} />
      </div>
      <div className="flex justify-end border-t border-border/50 px-3 py-3 sm:px-4">
        <button type="button" onClick={onView} className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20" data-testid={`button-view-order-${order.id}`}><Eye className="h-4 w-4" /> View</button>
      </div>
    </article>
  );
}

function OrderField({ label, value, icon, emphasis = false }: { label: string; value: string; icon: ReactNode; emphasis?: boolean }) {
  return <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4"><span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"><span className="text-muted-foreground/70">{icon}</span>{label}</span><span className={`max-w-[65%] truncate text-right ${emphasis ? "font-display text-lg font-semibold text-foreground" : "text-sm font-medium text-foreground"}`}>{value}</span></div>;
}

function SummaryCard({ title, value, caption, icon, tone }: { title: string; value: string | number; caption: string; icon: ReactNode; tone: "blue" | "teal" | "amber" | "red" }) {
  const styles = {
    blue: "bg-blue-500/10 text-blue-600",
    teal: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    red: "bg-rose-500/10 text-rose-600",
  }[tone];
  return <div className="admin-panel flex min-h-[126px] flex-col justify-between rounded-2xl p-3.5 sm:min-h-[140px] sm:p-4"><div className="flex items-start justify-between gap-2"><p className="text-xs font-medium text-muted-foreground sm:text-sm">{title}</p><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${styles}`}>{icon}</div></div><div><p className={`font-display text-2xl font-semibold tracking-tight ${tone === "red" ? "text-rose-600" : "text-foreground"}`}>{value}</p><p className="mt-1 truncate text-[11px] font-medium text-muted-foreground sm:text-xs">{caption}</p></div></div>;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const success = normalized === "success" || normalized === "paid" || normalized === "completed";
  const failed = normalized === "failed" || normalized === "expired";
  const pending = normalized === "pending" || normalized === "processing";
  const classes = success ? "bg-emerald-500/10 text-emerald-700" : failed ? "bg-rose-500/10 text-rose-600" : pending ? "bg-amber-500/10 text-amber-700" : "bg-blue-500/10 text-blue-700";
  const Icon = success ? CheckCircle2 : failed ? XCircle : pending ? Clock3 : LoaderCircle;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${classes}`}><Icon className="h-3 w-3" />{status}</span>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="max-w-[68%] truncate text-right font-mono font-bold text-foreground" title={value}>{value}</span></div>;
}

function ClipboardIcon() {
  return <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-primary"><ClipboardListIcon /></span>;
}

function ClipboardListIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4.5V3h6v1.5M9 9h6M9 13h6M9 17h4" /></svg>;
}

function OrdersSkeleton() {
  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 sm:grid-cols-4 sm:gap-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)}</div>
      <Skeleton className="mb-5 h-20 rounded-3xl" />
      <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-64 rounded-3xl" />)}</div>
    </>
  );
}

function isSuccessful(order: Order) {
  return order.orderStatus === "completed" || order.paymentStatus === "paid" || order.paymentStatus === "approved";
}