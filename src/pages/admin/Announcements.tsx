import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Pencil, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";

interface Announcement {
  _id: string;
  message: string;
  linkUrl?: string;
  isActive: boolean;
  order: number;
}

const EMPTY = { message: "", linkUrl: "", isActive: true, order: 0 };

export default function AnnouncementsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState(EMPTY);
  const authFetch = (url: string, options: RequestInit = {}) => fetch(apiUrl(url), {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...((options.headers ?? {}) as object) },
  });
  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["admin-announcements"],
    queryFn: () => authFetch("/api/admin/announcements").then((r) => r.json()),
    enabled: !!token,
  });
  const save = useMutation({
    mutationFn: async () => {
      const url = editing ? `/api/admin/announcements/${editing._id}` : "/api/admin/announcements";
      const response = await authFetch(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(form) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Save failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-announcements"] }); qc.invalidateQueries({ queryKey: ["announcements"] }); setEditing(null); setForm(EMPTY); toast({ title: editing ? "Announcement updated" : "Announcement created" }); },
    onError: (error) => toast({ title: "Could not save announcement", description: error.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => authFetch(`/api/admin/announcements/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-announcements"] }); qc.invalidateQueries({ queryKey: ["announcements"] }); toast({ title: "Announcement deleted" }); },
  });
  const toggle = useMutation({
    mutationFn: (item: Announcement) => authFetch(`/api/admin/announcements/${item._id}`, { method: "PUT", body: JSON.stringify({ isActive: !item.isActive }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-announcements"] }); qc.invalidateQueries({ queryKey: ["announcements"] }); },
  });

  const openNew = () => { setEditing(null); setForm(EMPTY); };
  const openEdit = (item: Announcement) => { setEditing(item); setForm({ message: item.message, linkUrl: item.linkUrl ?? "", isActive: item.isActive, order: item.order }); };

  return (
    <AdminLayout>
      <div className="admin-reveal mb-5 flex flex-col items-stretch justify-between gap-3 sm:mb-8 sm:flex-row sm:items-start">
        <div>
          <p className="eyebrow text-primary">Storefront content</p>
          <h1 className="mt-2 text-2xl font-display font-bold tracking-tight sm:text-3xl">Announcements</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage the live left-to-right announcement ticker.</p>
        </div>
        <Button onClick={openNew} className="w-full bg-primary font-display text-xs font-bold uppercase tracking-wide text-white sm:w-auto"><Plus className="mr-1 h-4 w-4" /> New Announcement</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
         <div className="admin-reveal admin-reveal-delay-1 space-y-3">
          {isLoading ? <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading announcements...</div> : announcements.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border py-20 text-center"><Megaphone className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" /><p className="font-display font-bold uppercase tracking-wide text-muted-foreground">No announcements yet</p></div>
          ) : announcements.map((item) => (
            <div key={item._id} className="rounded-xl border border-border bg-card p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent"><Megaphone className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold text-foreground">{item.message}</p>{item.linkUrl && <p className="mt-1 truncate text-xs text-primary">{item.linkUrl}</p>}<p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Order {item.order} · {item.isActive ? "Live" : "Hidden"}</p></div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggle.mutate(item)}>{item.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm("Delete this announcement?")) remove.mutate(item._id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>

         <div className="admin-panel admin-reveal admin-reveal-delay-2 h-fit rounded-xl border border-primary/25 p-4 sm:p-5">
          <h2 className="mb-4 font-display text-sm font-black uppercase tracking-widest">{editing ? "Edit announcement" : "New announcement"}</h2>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className="font-display text-xs font-bold uppercase tracking-wider">Message</Label><textarea value={form.message} maxLength={240} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} placeholder="New events live — check out our latest offers!" className="min-h-24 w-full resize-none rounded-lg border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary" /><p className="text-right text-[10px] text-muted-foreground">{form.message.length}/240</p></div>
            <div className="space-y-1.5"><Label className="font-display text-xs font-bold uppercase tracking-wider">Optional link</Label><Input value={form.linkUrl} onChange={(e) => setForm((p) => ({ ...p, linkUrl: e.target.value }))} placeholder="https://..." className="bg-muted" /></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label className="font-display text-xs font-bold uppercase tracking-wider">Order</Label><Input type="number" value={form.order} onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) }))} className="bg-muted" /></div><label className="flex items-end gap-2 pb-2 text-xs font-medium"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} /> Live now</label></div>
            <div className="flex gap-2"><Button onClick={() => save.mutate()} disabled={!form.message.trim() || save.isPending} className="bg-primary font-display text-xs font-bold uppercase text-white">{save.isPending ? "Saving..." : editing ? "Update" : "Create"}</Button>{editing && <Button variant="ghost" onClick={openNew} className="font-display text-xs font-bold uppercase">Cancel</Button>}</div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}