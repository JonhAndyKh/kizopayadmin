import { apiUrl } from "@/lib/api";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Eye, EyeOff, Pencil, RotateCcw, Search, ImagePlus, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminProduct {
  productCode: string;
  name: string;
  originalName: string;
  price: string;
  originalPrice: string;
  imageUrl: string;
  isVisible: boolean;
  requiresZoneId: boolean;
  notes: string;
  hasOverride: boolean;
  overrideId: string | null;
}

interface Game { gameCode: string; name: string; imageUrl: string; }

function useAdminFetch(token: string | null) {
  return (url: string, options: RequestInit = {}) =>
    fetch(apiUrl(url), {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...((options.headers ?? {}) as object) },
    });
}

export default function ProductsPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const authFetch = useAdminFetch(token);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ code: string; name: string; price: string; imageUrl: string; notes: string; requiresZoneId: boolean } | null>(null);
  const [imgEditing, setImgEditing] = useState<string | null>(null); // productCode being image-edited
  const [imgDraft, setImgDraft] = useState<Record<string, string>>({});

  const { data: games = [], isLoading: isLoadingGames } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: () => fetch(apiUrl("/api/games")).then((r) => r.json()),
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery<AdminProduct[]>({
    queryKey: ["admin-products", selectedGame],
    queryFn: () => authFetch(`/api/admin/products/${selectedGame}`).then((r) => r.json()),
    enabled: !!selectedGame && !!token,
  });

  const overrideMutation = useMutation({
    mutationFn: async (data: { gameCode: string; productCode: string; customName?: string; customPrice?: string; imageUrl?: string; isVisible?: boolean; notes?: string; requiresZoneId?: boolean }) => {
      const res = await authFetch("/api/admin/products/override", { method: "POST", body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-products", selectedGame] }); toast({ title: "Override saved" }); setEditing(null); },
    onError: () => toast({ title: "Failed to save override", variant: "destructive" }),
  });

  const resetMutation = useMutation({
    mutationFn: async (overrideId: string) => {
      await authFetch(`/api/admin/products/override/${overrideId}`, { method: "DELETE" });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-products", selectedGame] }); toast({ title: "Override removed" }); },
  });

  const filteredGames = games.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));
  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.productCode.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <div className="mb-7 sm:mb-8">
        <h1 className="text-3xl font-display font-black uppercase tracking-tight">Products</h1>
        <p className="text-muted-foreground text-sm mt-1">Override names, prices and visibility per product</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game list */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-muted/60 border-b border-border px-4 py-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-accent" />
              <span className="font-display font-black uppercase tracking-widest text-xs">Select Game</span>
            </div>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search games..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-muted border-none h-9 text-sm" />
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {isLoadingGames ? (
                <div className="p-3 space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : filteredGames.map((game) => (
                <button
                  key={game.gameCode}
                  onClick={() => { setSelectedGame(game.gameCode); setSearch(""); setEditing(null); }}
                  className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors border-b border-border/30 last:border-0 ${selectedGame === game.gameCode ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                >
                  {game.imageUrl && <img src={game.imageUrl} alt="" className="w-6 h-6 object-cover rounded rounded-lg shrink-0" />}
                  <span className="text-sm font-medium truncate">{game.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product list */}
        <div className="lg:col-span-2">
          {!selectedGame ? (
            <div className="h-full flex items-center justify-center py-24 border-2 border-dashed border-border rounded-xl">
              <div className="text-center">
                <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-display font-bold uppercase tracking-wide text-muted-foreground">Select a game to manage products</p>
              </div>
            </div>
          ) : isLoadingProducts ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/60 border-b border-border px-4 py-3 flex items-center justify-between">
                <span className="font-display font-black uppercase tracking-widest text-xs">Products ({filteredProducts.length})</span>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
                  <input placeholder="Filter..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-background/30 border border-border/40 rounded pl-7 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground w-36" />
                </div>
              </div>
              <div className="divide-y divide-border/50 max-h-[600px] overflow-y-auto">
                {filteredProducts.map((p) => (
                  <div key={p.productCode} className={`p-4 transition-colors ${!p.isVisible ? "opacity-50 bg-muted/20" : "hover:bg-muted/10"}`}>
                    {editing?.code === p.productCode ? (
                      <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="font-display font-bold uppercase text-[10px] tracking-wider">Custom Name</Label>
                            <Input value={editing.name} onChange={(e) => setEditing((prev) => prev && ({ ...prev, name: e.target.value }))} placeholder={p.originalName} className="bg-muted border-none h-9 text-sm" />
                          </div>
                          <div className="space-y-1">
                            <Label className="font-display font-bold uppercase text-[10px] tracking-wider">Custom Price (USD)</Label>
                            <Input value={editing.price} onChange={(e) => setEditing((prev) => prev && ({ ...prev, price: e.target.value }))} placeholder={p.originalPrice} className="bg-muted border-none h-9 text-sm" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="font-display font-bold uppercase text-[10px] tracking-wider">Package Image URL</Label>
                          <div className="flex gap-2 items-center">
                            {editing.imageUrl && (
                              <img src={editing.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 border border-border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            )}
                            <Input value={editing.imageUrl} onChange={(e) => setEditing((prev) => prev && ({ ...prev, imageUrl: e.target.value }))} placeholder="https://..." className="bg-muted border-none h-9 text-sm" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => overrideMutation.mutate({ gameCode: selectedGame, productCode: p.productCode, customName: editing.name || undefined, customPrice: editing.price || undefined, imageUrl: editing.imageUrl || undefined, notes: editing.notes || undefined, isVisible: p.isVisible, requiresZoneId: editing.requiresZoneId })} disabled={overrideMutation.isPending} className="text-xs rounded-lg bg-primary text-white font-bold uppercase tracking-wide">Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="text-xs rounded-lg font-bold uppercase tracking-wide">Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                      {/* Inline image editor */}
                      {imgEditing === p.productCode ? (
                        <div className="flex items-center gap-2">
                          {imgDraft[p.productCode] && (
                            <img src={imgDraft[p.productCode]} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 border border-border" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          )}
                          <Input
                            autoFocus
                            placeholder="https://example.com/image.png"
                            value={imgDraft[p.productCode] ?? ""}
                            onChange={(e) => setImgDraft((d) => ({ ...d, [p.productCode]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                overrideMutation.mutate({ gameCode: selectedGame, productCode: p.productCode, customName: p.hasOverride ? p.name : undefined, customPrice: p.hasOverride && p.price !== p.originalPrice ? p.price : undefined, imageUrl: imgDraft[p.productCode] || undefined, isVisible: p.isVisible });
                                setImgEditing(null);
                              }
                              if (e.key === "Escape") setImgEditing(null);
                            }}
                            className="bg-muted border-none h-8 text-xs flex-1"
                          />
                          <Button size="icon" variant="ghost" className="w-7 h-7 text-emerald-500 shrink-0" onClick={() => {
                            overrideMutation.mutate({ gameCode: selectedGame, productCode: p.productCode, customName: p.hasOverride ? p.name : undefined, customPrice: p.hasOverride && p.price !== p.originalPrice ? p.price : undefined, imageUrl: imgDraft[p.productCode] || undefined, isVisible: p.isVisible });
                            setImgEditing(null);
                          }}>
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="w-7 h-7 shrink-0" onClick={() => setImgEditing(null)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Clickable image slot */}
                        <button
                          title="Set package image"
                          onClick={() => { setImgEditing(p.productCode); setImgDraft((d) => ({ ...d, [p.productCode]: p.imageUrl ?? "" })); }}
                          className="w-10 h-10 rounded-lg shrink-0 border border-dashed border-border hover:border-primary/50 overflow-hidden flex items-center justify-center bg-muted transition-colors group relative"
                        >
                          {p.imageUrl
                            ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            : <ImagePlus className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                          }
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Pencil className="w-3 h-3 text-white" />
                          </div>
                        </button>
                         <div className="min-w-0 flex-1 basis-[calc(100%-5rem)]">
                          <div className="flex items-center gap-2">
                            <p className="font-display font-bold text-sm uppercase tracking-wide">{p.name}</p>
                            {p.hasOverride && <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-lg font-bold uppercase tracking-wide">Modified</span>}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.productCode}</p>
                        </div>
                         <div className="ml-auto text-right shrink-0">
                          <p className="font-display font-black text-sm text-primary">${parseFloat(p.price).toFixed(2)}</p>
                          {p.price !== p.originalPrice && <p className="text-xs text-muted-foreground line-through">${parseFloat(p.originalPrice).toFixed(2)}</p>}
                        </div>
                         <div className="ml-auto flex items-center gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => overrideMutation.mutate({ gameCode: selectedGame, productCode: p.productCode, isVisible: !p.isVisible })}>
                            {p.isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setEditing({ code: p.productCode, name: p.hasOverride ? p.name : "", price: p.hasOverride && p.price !== p.originalPrice ? p.price : "", imageUrl: p.imageUrl ?? "", notes: p.notes, requiresZoneId: p.requiresZoneId })}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {p.hasOverride && (
                            <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-foreground" title="Reset override" onClick={() => { if(confirm("Remove override?")) resetMutation.mutate(p.overrideId!); }}>
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
