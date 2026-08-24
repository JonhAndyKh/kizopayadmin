import { apiUrl } from "@/lib/api";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio, Plus, Pencil, Trash2, EyeOff, Eye, GripVertical, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LiveEvent {
  _id: string;
  title: string;
  price: string;
  imageUrl: string;
  gameCode?: string;
  ctaText: string;
  isActive: boolean;
  order: number;
}

const EMPTY_EVENT = {
  title: "",
  price: "",
  imageUrl: "",
  gameCode: "",
  ctaText: "Buy Now",
  isActive: true,
  order: 0,
};

function useAdminFetch(token: string | null) {
  return (url: string, options: RequestInit = {}) =>
    fetch(apiUrl(url), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...((options.headers ?? {}) as object),
      },
    });
}

export default function LiveEventsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const authFetch = useAdminFetch(token);
  const [editing, setEditing] = useState<LiveEvent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_EVENT });

  const { data: events = [], isLoading } = useQuery<LiveEvent[]>({
    queryKey: ["admin-live-events"],
    queryFn: () => authFetch("/api/admin/live-events").then((r) => r.json()),
    enabled: !!token,
  });

  const closeForm = () => {
    setEditing(null);
    setIsCreating(false);
    setForm({ ...EMPTY_EVENT });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const isEdit = !!editing;
      const url = isEdit ? `/api/admin/live-events/${editing!._id}` : "/api/admin/live-events";
      const res = await authFetch(url, {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save live event");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-live-events"] });
      qc.invalidateQueries({ queryKey: ["live-events"] });
      toast({ title: editing ? "Live event updated" : "Live event created" });
      closeForm();
    },
    onError: (error: Error) => toast({ title: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authFetch(`/api/admin/live-events/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-live-events"] });
      qc.invalidateQueries({ queryKey: ["live-events"] });
      toast({ title: "Live event deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      authFetch(`/api/admin/live-events/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-live-events"] });
      qc.invalidateQueries({ queryKey: ["live-events"] });
    },
  });

  const openEdit = (event: LiveEvent) => {
    setEditing(event);
    setForm({
      title: event.title,
      price: event.price,
      imageUrl: event.imageUrl,
      gameCode: event.gameCode ?? "",
      ctaText: event.ctaText,
      isActive: event.isActive,
      order: event.order,
    });
    setIsCreating(true);
  };

  const field = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((previous) => ({
      ...previous,
      [key]: key === "order" ? Number(event.target.value) : event.target.value,
    }));

  return (
    <AdminLayout>
      <div className="mb-5 flex flex-col items-stretch gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">Live Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cards shown in the NEW EVENTS LIVE carousel</p>
        </div>
        <Button
          onClick={() => { setEditing(null); setForm({ ...EMPTY_EVENT }); setIsCreating(true); }}
          className="w-full rounded-lg bg-primary font-display text-xs font-bold uppercase tracking-wide text-white sm:w-auto"
        >
          <Plus className="mr-1 h-4 w-4" /> New Live Event
        </Button>
      </div>

      {isCreating && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-card p-3 sm:mb-8 sm:p-6">
          <h2 className="mb-5 font-display text-sm font-black uppercase tracking-wider">
            {editing ? "Edit Live Event" : "New Live Event"}
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="font-display text-xs font-bold uppercase tracking-wider">Title *</Label>
              <Input value={form.title} onChange={field("title")} placeholder="FF Monthly Pass" className="border-none bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-display text-xs font-bold uppercase tracking-wider">Price *</Label>
              <Input value={form.price} onChange={field("price")} placeholder="7.48$" className="border-none bg-muted" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="font-display text-xs font-bold uppercase tracking-wider">Card Image URL *</Label>
              <Input value={form.imageUrl} onChange={field("imageUrl")} placeholder="https://... or /api/uploads/..." className="border-none bg-muted" />
            </div>
            {form.imageUrl && (
              <div className="h-40 overflow-hidden rounded-xl border border-border bg-muted md:col-span-2">
                <img src={form.imageUrl} alt="Live event preview" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="font-display text-xs font-bold uppercase tracking-wider">Game Code (optional)</Label>
              <Input value={form.gameCode} onChange={field("gameCode")} placeholder="freefire" className="border-none bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-display text-xs font-bold uppercase tracking-wider">Button Label</Label>
              <Input value={form.ctaText} onChange={field("ctaText")} placeholder="Buy Now" className="border-none bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="font-display text-xs font-bold uppercase tracking-wider">Display Order</Label>
              <Input type="number" value={form.order} onChange={field("order")} className="border-none bg-muted" />
            </div>
            <label className="flex items-center gap-3 pt-6">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((previous) => ({ ...previous, isActive: event.target.checked }))} className="h-4 w-4" />
              <span className="font-display text-xs font-bold uppercase tracking-wider">Visible on storefront</span>
            </label>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.title || !form.price || !form.imageUrl || saveMutation.isPending} className="rounded-lg bg-primary font-display text-xs font-bold uppercase tracking-wide text-white">
              {saveMutation.isPending ? "Saving..." : editing ? "Update Event" : "Create Event"}
            </Button>
            <Button onClick={closeForm} variant="ghost" className="rounded-lg font-display text-xs font-bold uppercase tracking-wide">Cancel</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-24 w-full rounded-xl" />)}</div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border py-24 text-center">
          <Radio className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="font-display font-bold uppercase tracking-wide text-muted-foreground">No live events yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create a card to show it below the homepage slideshow.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event._id} className="grid grid-cols-[auto_72px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/20 sm:flex sm:p-4">
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/30" />
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                <img src={event.imageUrl} alt="" className="h-full w-full object-cover" onError={(image) => { image.currentTarget.style.display = "none"; }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold uppercase tracking-wide">{event.title}</p>
                <p className="truncate text-xs text-accent">{event.price}{event.gameCode ? ` · ${event.gameCode}` : ""}</p>
              </div>
              <div className="col-span-3 ml-auto flex shrink-0 items-center gap-1.5 sm:col-span-1 sm:gap-2">
                <span className={`rounded-lg border px-2 py-1 font-display text-[9px] font-bold uppercase tracking-widest ${event.isActive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-border bg-muted text-muted-foreground"}`}>
                  {event.isActive ? "Active" : "Hidden"}
                </span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleMutation.mutate({ id: event._id, isActive: !event.isActive })}>
                  {event.isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => window.open(event.imageUrl, "_blank")}><ExternalLink className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(event)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => { if (confirm("Delete this live event?")) deleteMutation.mutate(event._id); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}