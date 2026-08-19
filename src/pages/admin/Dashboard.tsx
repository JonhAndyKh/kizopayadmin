import { apiUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils/game-helpers";
import { format } from "date-fns";
import { Activity, CheckCircle, Clock, XCircle, Zap, ShieldAlert, Wallet, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";

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
    amountUsd: string; currency: string; paymentStatus: string; orderStatus: string; createdAt: string;
  }>;
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

export default function AdminDashboard() {
  const { data: summary, isLoading, error } = useAdminOrderSummary();
  const { data: balance, isLoading: isLoadingBalance } = useResellerBalance();
  const balanceAmount = balance ? Number(balance.balance) : Number.NaN;
  const spentAmount = balance ? Number(balance.totalSpent) : Number.NaN;
  const isLowBalance = Number.isFinite(balanceAmount) && balanceAmount < 5;

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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-border">
                      {["Target ID","Timestamp","Payload","Value","Payment","Fulfillment"].map(h => (
                        <TableHead key={h} className="font-display font-bold uppercase tracking-wider text-xs">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.recentOrders.map((order) => (
                      <TableRow key={order.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                         <TableCell>
                           <div className="font-mono text-sm font-bold bg-muted w-fit max-w-[140px] truncate px-2 py-0.5 rounded-lg" title={order.playerId}>
                             {order.playerId}
                           </div>
                         </TableCell>
                        <TableCell className="text-sm font-medium whitespace-nowrap text-muted-foreground">{format(new Date(order.createdAt), "MMM d, HH:mm")}</TableCell>
                        <TableCell>
                          <div className="font-display font-bold text-sm uppercase text-foreground">{order.gameName}</div>
                          <div className="text-xs text-muted-foreground font-medium">{order.productName}</div>
                        </TableCell>
                        <TableCell className="text-right font-display font-black text-primary text-base">{formatCurrency(order.amountUsd, order.currency as any)}</TableCell>
                        <TableCell className="text-center"><StatusBadge status={order.paymentStatus} /></TableCell>
                        <TableCell className="text-center"><StatusBadge status={order.orderStatus} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
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
  if (status === "paid" || status === "completed") cls += "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
  else if (status === "failed" || status === "expired") cls += "bg-destructive/10 text-destructive border-destructive/20";
  else if (status === "pending") cls += "bg-amber-500/10 text-amber-300 border-amber-500/20";
  else cls += "bg-primary/10 text-primary border-primary/20";
  return <span className={cls}>{status}</span>;
}
