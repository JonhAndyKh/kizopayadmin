import { apiUrl } from "@/lib/api";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag, Plus, Pencil, Trash2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PromoCode {
  _id: string;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minOrderUsd: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

function useAdminFetch(token: string | null) {
  return (url: string, options: RequestInit = {}) =>
    fetch(apiUrl(url), {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...((options.headers ?? {}) as object) },
    });
}

const EMPTY: { code: string; discountType: "percent" | "fixed"; discountValue: number; minOrderUsd: number; maxUses: number; isActive: boolean; expiresAt: string } = { code: "", discountType: "percent", discountValue: 10, minOrderUsd: 0, maxUses: 0, isActive: true, expiresAt: "" };

export default function PromosPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const authFetch = useAdminFetch(token);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<{ code: string; discountType: "percent" | "fixed"; discountValue: number; minOrderUsd: number; maxUses: number; isActive: boolean; expiresAt: string }>({ ...EMPTY });

  const { data: promos = [], isLoading } = useQuery<PromoCode[]>({
    queryKey: ["admin-promos"],
    queryFn: () => authFetch("/api/admin/promos").then((r) => r.json()),
    enabled: !!token,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const isEdit = !!editing;
      const url = isEdit ? `/api/admin/promos/${editing!._id}` : "/api/admin/promos";
      const payload = {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
      };
      const res = await authFetch(url, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-promos"] }); toast({ title: editing ? "Promo updated" : "Promo created" }); closeForm(); },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => authFetch(`/api/admin/promos/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-promos"] }); toast({ title: "Promo deleted" }); },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await authFetch(`/api/admin/promos/${id}`, { method: "PUT", body: JSON.stringify({ isActive }) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-promos"] }),
  });

  const openEdit = (p: PromoCode) => {
    setEditing(p);
    setForm({ code: p.code, discountType: p.discountType, discountValue: p.discountValue, minOrderUsd: p.minOrderUsd, maxUses: p.maxUses, isActive: p.isActive, expiresAt: p.expiresAt ? p.expiresAt.slice(0, 16) : "" });
    setIsCreating(true);
  };
  const closeForm = () => { setEditing(null); setIsCreating(false); setForm({ ...EMPTY }); };
  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [key]: key === "discountValue" || key === "minOrderUsd" || key === "maxUses" ? Number(e.target.value) : e.target.value }));

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-7 sm:mb-8">
        <div>
          <h1 className="text-3xl font-display font-black uppercase tracking-tight">Promo Codes</h1>
          <p className="text-muted-foreground text-sm mt-1">Discount codes for customers</p>
        </div>
        <Button onClick={() => { setIsCreating(true); setEditing(null); setForm({ ...EMPTY }); }} className="rounded-lg font-display font-bold uppercase tracking-wide text-xs bg-primary text-white">
          <Plus className="w-4 h-4 mr-1" /> New Code
        </Button>
      </div>

      {/* Form */}
      {isCreating && (
        <div className="mb-8 bg-card border border-primary/30 rounded-xl p-4 sm:p-6">
          <h2 className="font-display font-black uppercase tracking-wider text-sm mb-5">{editing ? "Edit Promo Code" : "New Promo Code"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-display font-bold uppercase text-xs tracking-wider">Code *</Label>
              <Input value={form.code} onChange={f("code")} placeholder="e.g. SAVE20" className="bg-muted border-none uppercase font-mono" style={{ textTransform: "uppercase" }} disabled={!!editing} />
            </div>
            <div className="space-y-1.5">
              <Label className="font-display font-bold uppercase text-xs tracking-wider">Discount Type *</Label>
              <select value={form.discountType} onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value as "percent" | "fixed" }))} className="w-full h-10 px-3 bg-muted border-none rounded-md font-medium text-sm">
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount (USD)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-display font-bold uppercase text-xs tracking-wider">Discount Value *</Label>
              <Input type="number" min={0} max={form.discountType === "percent" ? 100 : undefined} value={form.discountValue} onChange={f("discountValue")} className="bg-muted border-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-display font-bold uppercase text-xs tracking-wider">Min. Order (USD)</Label>
              <Input type="number" min={0} step="0.01" value={form.minOrderUsd} onChange={f("minOrderUsd")} className="bg-muted border-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-display font-bold uppercase text-xs tracking-wider">Max Uses (0 = unlimited)</Label>
              <Input type="number" min={0} value={form.maxUses} onChange={f("maxUses")} className="bg-muted border-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-display font-bold uppercase text-xs tracking-wider">Expires At (optional)</Label>
              <Input type="datetime-local" value={form.expiresAt} onChange={f("expiresAt")} className="bg-muted border-none" />
            </div>
            <div className="flex items-center gap-3 pt-4">
              <input type="checkbox" id="promoActive" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4" />
              <Label htmlFor="promoActive" className="font-display font-bold uppercase text-xs tracking-wider cursor-pointer">Active</Label>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.code || saveMutation.isPending} className="rounded-lg font-display font-bold uppercase tracking-wide text-xs bg-primary text-white">
              {saveMutation.isPending ? "Saving..." : editing ? "Update Code" : "Create Code"}
            </Button>
            <Button onClick={closeForm} variant="ghost" className="rounded-lg font-display font-bold uppercase tracking-wide text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : promos.length === 0 ? (
        <div className="py-24 text-center border-2 border-dashed border-border rounded-xl">
          <Tag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-display font-bold uppercase tracking-wide text-muted-foreground">No promo codes yet</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {["Code", "Discount", "Min Order", "Uses", "Expires", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-display font-bold uppercase tracking-wider text-xs text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {promos.map((p) => (
                  <tr key={p._id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg text-xs">{p.code}</code>
                        <button onClick={() => { navigator.clipboard.writeText(p.code); }} className="text-muted-foreground/40 hover:text-muted-foreground">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">
                      {p.discountType === "percent" ? `${p.discountValue}%` : `$${p.discountValue.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.minOrderUsd > 0 ? `$${p.minOrderUsd.toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">{p.usedCount}{p.maxUses > 0 ? ` / ${p.maxUses}` : ""}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {p.expiresAt ? format(new Date(p.expiresAt), "MMM d, yyyy") : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleMutation.mutate({ id: p._id, isActive: !p.isActive })}>
                        <span className={`text-[9px] font-display font-bold uppercase tracking-widest px-2 py-1 rounded-lg border cursor-pointer ${p.isActive ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"}`}>
                          {p.isActive ? "Active" : "Off"}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => openEdit(p)}><Pencil className="w-3 h-3" /></Button>
                        <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => { if(confirm("Delete this promo code?")) deleteMutation.mutate(p._id); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
