import { apiUrl } from "@/lib/api";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Image, Plus, Pencil, Trash2, EyeOff, Eye, GripVertical, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PromoSlide {
  _id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  gameCode?: string;
  ctaText: string;
  isActive: boolean;
  order: number;
}

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

const EMPTY_SLIDE = {
  title: "", subtitle: "", imageUrl: "", gameCode: "", ctaText: "Top Up Now", isActive: true, order: 0,
};

export default function SlidesPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const authFetch = useAdminFetch(token);
  const [editing, setEditing] = useState<PromoSlide | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_SLIDE });

  const { data: slides = [], isLoading } = useQuery<PromoSlide[]>({
    queryKey: ["admin-slides"],
    queryFn: () => authFetch("/api/admin/slides").then((r) => r.json()),
    enabled: !!token,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<PromoSlide>) => {
      const isEdit = !!editing;
      const url = isEdit ? `/api/admin/slides/${editing!._id}` : "/api/admin/slides";
      const res = await authFetch(url, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-slides"] });
      qc.invalidateQueries({ queryKey: ["promo-slides"] });
      toast({ title: editing ? "Slide updated" : "Slide created" });
      closeForm();
    },
    onError: () => toast({ title: "Failed to save slide", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await authFetch(`/api/admin/slides/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-slides"] });
      qc.invalidateQueries({ queryKey: ["promo-slides"] });
      toast({ title: "Slide deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await authFetch(`/api/admin/slides/${id}`, { method: "PUT", body: JSON.stringify({ isActive }) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-slides"] });
      qc.invalidateQueries({ queryKey: ["promo-slides"] });
    },
  });

  const openEdit = (s: PromoSlide) => { setEditing(s); setForm({ title: "", subtitle: "", imageUrl: s.imageUrl, gameCode: "", ctaText: "Top Up Now", isActive: s.isActive, order: s.order }); setIsCreating(true); };
  const closeForm = () => { setEditing(null); setIsCreating(false); setForm({ ...EMPTY_SLIDE }); };
  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [key]: key === "order" ? Number(e.target.value) : key === "isActive" ? e.target.checked : e.target.value }));

  return (
    <AdminLayout>
      <div className="admin-reveal flex flex-col items-stretch gap-3 mb-5 sm:flex-row sm:items-start sm:justify-between sm:mb-8">
        <div>
          <p className="eyebrow text-primary">Storefront content</p>
          <h1 className="mt-2 text-2xl font-display font-bold tracking-tight sm:text-3xl">Promo Slides</h1>
          <p className="text-muted-foreground text-sm mt-1">Homepage banner carousel</p>
        </div>
        <Button onClick={() => { setIsCreating(true); setEditing(null); setForm({ ...EMPTY_SLIDE }); }} className="w-full rounded-lg font-display font-bold uppercase tracking-wide text-xs bg-primary text-white sm:w-auto">
          <Plus className="w-4 h-4 mr-1" /> New Slide
        </Button>
      </div>

      {/* Form */}
      {isCreating && (
        <div className="admin-panel mb-6 rounded-xl border border-primary/30 p-3 sm:mb-8 sm:p-6">
          <h2 className="font-display font-black uppercase tracking-wider text-sm mb-5">{editing ? "Edit Slide" : "New Slide"}</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="font-display font-bold uppercase text-xs tracking-wider">Image URL <span className="text-primary">*</span></Label>
              <Input value={form.imageUrl} onChange={f("imageUrl")} placeholder="https://example.com/banner.jpg" className="bg-muted border-none" />
            </div>
            {form.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-border h-36 bg-muted">
                <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.imageUrl || saveMutation.isPending} className="rounded-lg font-display font-bold uppercase tracking-wide text-xs bg-primary text-white">
              {saveMutation.isPending ? "Saving..." : editing ? "Update Slide" : "Create Slide"}
            </Button>
            <Button onClick={closeForm} variant="ghost" className="rounded-lg font-display font-bold uppercase tracking-wide text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : slides.length === 0 ? (
        <div className="py-24 text-center border-2 border-dashed border-border rounded-xl">
          <Image className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-display font-bold uppercase tracking-wide text-muted-foreground">No slides yet — create your first banner</p>
        </div>
      ) : (
         <div className="admin-reveal admin-reveal-delay-1 space-y-3">
             {slides.map((slide) => (
              <div key={slide._id} className="grid grid-cols-[auto_48px_minmax(0,1fr)] items-center gap-2 bg-card border border-border rounded-xl p-3 sm:flex sm:gap-3 sm:p-4 hover:bg-muted/20 transition-colors">
              <GripVertical className="w-4 h-4 text-muted-foreground/30 shrink-0" />
              <div className="w-16 h-10 bg-muted rounded-xl overflow-hidden shrink-0">
                {slide.imageUrl && <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-sm uppercase tracking-wide truncate">{slide.title}</p>
                <p className="text-xs text-muted-foreground truncate">{slide.subtitle}</p>
              </div>
                <div className="col-span-3 ml-auto flex items-center gap-1.5 shrink-0 sm:col-span-1 sm:gap-2">
                <span className={`text-[9px] font-display font-bold uppercase tracking-widest px-2 py-1 rounded-lg border ${slide.isActive ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"}`}>
                  {slide.isActive ? "Active" : "Hidden"}
                </span>
                <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => toggleMutation.mutate({ id: slide._id, isActive: !slide.isActive })}>
                  {slide.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
                <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => window.open(slide.imageUrl, "_blank")}><ExternalLink className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => openEdit(slide)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { if(confirm("Delete this slide?")) deleteMutation.mutate(slide._id); }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
