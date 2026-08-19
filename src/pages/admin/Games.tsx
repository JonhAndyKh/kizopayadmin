import { apiUrl } from "@/lib/api";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Gamepad2, Eye, EyeOff, Search, ChevronDown, ChevronUp, Check, X, Plus, Trash2, Pin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminGame {
  gameCode: string;
  name: string;
  imageUrl: string;
  isVisible: boolean;
  isPinned: boolean;
  requiresZoneId: boolean;
  volseverRoute: string;
  description: string;
  notes: string;
  hasOverride: boolean;
  overrideId: string | null;
  isCustom?: boolean;
}

interface CustomProductDraft {
  productCode: string;
  name: string;
  price: string;
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

export default function GamesPage() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const authFetch = useAdminFetch(token);
  const [search, setSearch] = useState("");

  const { data: games = [], isLoading } = useQuery<AdminGame[]>({
    queryKey: ["admin-games"],
    queryFn: () => authFetch("/api/admin/games").then((r) => r.json()),
    enabled: !!token,
  });

  const [expanded, setExpanded] = useState<string | null>(null);
  const [descDraft, setDescDraft] = useState<Record<string, string>>({});
  const [routeDraft, setRouteDraft] = useState<Record<string, string>>({});
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customGame, setCustomGame] = useState({
    gameCode: "",
    name: "",
    description: "",
    imageUrl: "",
    category: "Other",
    providerGameCode: "",
    volseverRoute: "",
    requiresZoneId: false,
  });
  const [customProducts, setCustomProducts] = useState<CustomProductDraft[]>([
    { productCode: "", name: "", price: "" },
  ]);

  const customGameMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/admin/custom-games", {
        method: "POST",
        body: JSON.stringify({ ...customGame, products: customProducts }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Failed to create custom game");
      return payload;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-games"] });
      qc.invalidateQueries({ queryKey: ["games"] });
      setShowCustomForm(false);
      setCustomGame({
        gameCode: "",
        name: "",
        description: "",
        imageUrl: "",
        category: "Other",
        providerGameCode: "",
        volseverRoute: "",
        requiresZoneId: false,
      });
      setCustomProducts([{ productCode: "", name: "", price: "" }]);
      toast({ title: "Custom game added" });
    },
    onError: (error) => toast({ title: error instanceof Error ? error.message : "Failed to create custom game", variant: "destructive" }),
  });

  const customVisibilityMutation = useMutation({
    mutationFn: async ({ gameCode, isVisible }: { gameCode: string; isVisible: boolean }) => {
      const res = await authFetch(
        isVisible ? `/api/admin/custom-games/${gameCode}/restore` : `/api/admin/custom-games/${gameCode}`,
        { method: isVisible ? "POST" : "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to update custom game");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-games"] });
      qc.invalidateQueries({ queryKey: ["games"] });
      toast({ title: "Custom game visibility updated" });
    },
    onError: () => toast({ title: "Failed to update custom game", variant: "destructive" }),
  });

  const customDeleteMutation = useMutation({
    mutationFn: async (gameCode: string) => {
      const res = await authFetch(`/api/admin/custom-games/${gameCode}/permanent`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete custom game");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-games"] });
      qc.invalidateQueries({ queryKey: ["games"] });
      toast({ title: "Custom game permanently deleted" });
    },
    onError: () => toast({ title: "Failed to delete custom game", variant: "destructive" }),
  });

  const customPinMutation = useMutation({
    mutationFn: async ({ gameCode, isPinned }: { gameCode: string; isPinned: boolean }) => {
      const res = await authFetch(`/api/admin/custom-games/${gameCode}/pin`, {
        method: "POST",
        body: JSON.stringify({ isPinned }),
      });
      if (!res.ok) throw new Error("Failed to update pin");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-games"] });
      qc.invalidateQueries({ queryKey: ["games"] });
      toast({ title: "Pin updated" });
    },
    onError: () => toast({ title: "Failed to update pin", variant: "destructive" }),
  });

  const customRouteMutation = useMutation({
    mutationFn: async ({ gameCode, volseverRoute }: { gameCode: string; volseverRoute: string }) => {
      const res = await authFetch(`/api/admin/custom-games/${gameCode}/volsever-route`, {
        method: "POST",
        body: JSON.stringify({ volseverRoute }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to update Volsever route");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-games"] });
      qc.invalidateQueries({ queryKey: ["games"] });
      toast({ title: "Volsever route updated" });
    },
    onError: (error) => toast({ title: error instanceof Error ? error.message : "Failed to update Volsever route", variant: "destructive" }),
  });

  const restoreApiCheckMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/admin/games/restore-api-check", { method: "POST" });
      if (!res.ok) throw new Error("Failed to restore API-check games");
      return res.json() as Promise<{ restoredCount: number }>;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["admin-games"] });
      qc.invalidateQueries({ queryKey: ["games"] });
      toast({ title: `${result.restoredCount} API-check game${result.restoredCount === 1 ? "" : "s"} restored` });
    },
    onError: () => toast({ title: "Failed to restore API-check games", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ gameCode, isVisible, isPinned, requiresZoneId, volseverRoute, description }: { gameCode: string; isVisible?: boolean; isPinned?: boolean; requiresZoneId?: boolean; volseverRoute?: string; description?: string }) => {
      const res = await authFetch("/api/admin/games/override", {
        method: "POST",
        body: JSON.stringify({ gameCode, isVisible, isPinned, requiresZoneId, volseverRoute, description }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to update game");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-games"] });
      qc.invalidateQueries({ queryKey: ["games"] });
      toast({ title: "Game settings updated" });
    },
    onError: (error) => toast({ title: error instanceof Error ? error.message : "Failed to update game", variant: "destructive" }),
  });

  const filtered = games.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.gameCode.toLowerCase().includes(search.toLowerCase())
  );

  const visibleCount = games.filter((g) => g.isVisible).length;
  const hiddenCount = games.filter((g) => !g.isVisible).length;

  return (
    <AdminLayout>
      <div className="mb-7 sm:mb-8">
        <h1 className="text-3xl font-display font-black uppercase tracking-tight">Games</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Control which games are visible in the store.
          Hidden games won't appear for customers.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() => restoreApiCheckMutation.mutate()}
            disabled={restoreApiCheckMutation.isPending}
          >
            <Check className="w-4 h-4 mr-2" />
            {restoreApiCheckMutation.isPending ? "Restoring…" : "Show API-check games"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowCustomForm((open) => !open)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {showCustomForm ? "Close custom game form" : "Add custom game"}
          </Button>
        </div>
      </div>

      {showCustomForm && (
        <div className="mb-8 rounded-xl border border-primary/20 bg-card p-5">
          <h2 className="font-display font-bold text-lg">Add custom game</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-5">
            Map each package to the exact Bay2Game product code used for fulfillment.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder="Game code, e.g. my_custom_game"
              value={customGame.gameCode}
              onChange={(e) => setCustomGame((game) => ({ ...game, gameCode: e.target.value }))}
            />
            <Input
              placeholder="Game name"
              value={customGame.name}
              onChange={(e) => setCustomGame((game) => ({ ...game, name: e.target.value }))}
            />
            <Input
              placeholder="Category, e.g. RPG"
              value={customGame.category}
              onChange={(e) => setCustomGame((game) => ({ ...game, category: e.target.value }))}
            />
            <Input
              placeholder="Provider game code (optional for lookup)"
              value={customGame.providerGameCode}
              onChange={(e) => setCustomGame((game) => ({ ...game, providerGameCode: e.target.value }))}
            />
            <Input
              placeholder="Volsever route, e.g. mobile-legend-mp (optional)"
              value={customGame.volseverRoute}
              onChange={(e) => setCustomGame((game) => ({ ...game, volseverRoute: e.target.value }))}
            />
            <Input
              placeholder="Image URL (optional)"
              value={customGame.imageUrl}
              onChange={(e) => setCustomGame((game) => ({ ...game, imageUrl: e.target.value }))}
            />
            <label className="flex items-center gap-2 rounded-md border border-border px-3 text-sm">
              <input
                type="checkbox"
                checked={customGame.requiresZoneId}
                onChange={(e) => setCustomGame((game) => ({ ...game, requiresZoneId: e.target.checked }))}
              />
              Require Zone / Server ID
            </label>
          </div>
          <textarea
            rows={2}
            placeholder="Description (optional)"
            className="w-full mt-3 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 resize-none"
            value={customGame.description}
            onChange={(e) => setCustomGame((game) => ({ ...game, description: e.target.value }))}
          />

          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Packages</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCustomProducts((products) => [...products, { productCode: "", name: "", price: "" }])}
              >
                <Plus className="w-3 h-3 mr-1" /> Add package
              </Button>
            </div>
            <div className="space-y-2">
              {customProducts.map((product, index) => (
                <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.5fr_100px_32px]">
                  <Input
                    placeholder="Bay2Game code"
                    value={product.productCode}
                    onChange={(e) => setCustomProducts((items) => items.map((item, i) => i === index ? { ...item, productCode: e.target.value } : item))}
                  />
                  <Input
                    placeholder="Package name"
                    value={product.name}
                    onChange={(e) => setCustomProducts((items) => items.map((item, i) => i === index ? { ...item, name: e.target.value } : item))}
                  />
                  <Input
                    placeholder="Price"
                    inputMode="decimal"
                    value={product.price}
                    onChange={(e) => setCustomProducts((items) => items.map((item, i) => i === index ? { ...item, price: e.target.value } : item))}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={customProducts.length === 1}
                    onClick={() => setCustomProducts((items) => items.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Button variant="ghost" onClick={() => setShowCustomForm(false)}>Cancel</Button>
            <Button
              onClick={() => customGameMutation.mutate()}
              disabled={customGameMutation.isPending}
            >
              {customGameMutation.isPending ? "Adding…" : "Add game"}
            </Button>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Games</p>
          <p className="text-3xl font-black font-display text-foreground">{games.length}</p>
        </div>
        <div className="bg-card border border-emerald-500/20 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Visible</p>
          <p className="text-3xl font-black font-display text-emerald-500">{visibleCount}</p>
        </div>
        <div className="bg-card border border-destructive/20 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Hidden</p>
          <p className="text-3xl font-black font-display text-destructive">{hiddenCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search games..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
          data-testid="input-search-games"
        />
      </div>

      {/* Games grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center border-2 border-dashed border-border rounded-xl">
          <Gamepad2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-display font-bold uppercase tracking-wide text-muted-foreground">
            No games found
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((game) => (
            <div key={game.gameCode} className="flex flex-col rounded-xl border overflow-hidden transition-all bg-card border-border">
            <div
              data-testid={`row-game-${game.gameCode}`}
              className={`flex items-center gap-4 p-4 transition-all ${
                !game.isVisible ? "opacity-60" : ""
              }`}
            >
              {/* Thumbnail */}
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                {game.imageUrl ? (
                  <img
                    src={game.imageUrl}
                    alt={game.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Gamepad2 className="w-6 h-6 text-muted-foreground/40" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-sm truncate text-foreground">{game.name}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{game.gameCode}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {!game.isVisible && (
                    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                      Hidden
                    </span>
                  )}
                  <button
                    onClick={() => toggleMutation.mutate({ gameCode: game.gameCode, isVisible: game.isVisible, isPinned: game.isPinned, requiresZoneId: !game.requiresZoneId, volseverRoute: game.volseverRoute, description: game.description })}
                    disabled={toggleMutation.isPending}
                    className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border transition-colors ${game.requiresZoneId ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border hover:border-primary/20 hover:text-primary"}`}
                  >
                    {game.requiresZoneId ? "Zone ID ✓" : "Zone ID"}
                  </button>
                  {game.isCustom && (
                    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      Custom
                    </span>
                  )}
                  {game.isPinned && (
                    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300">
                      Pinned
                    </span>
                  )}
                </div>
              </div>

              {/* Right buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon" variant="ghost"
                  className="w-8 h-8 text-muted-foreground hover:text-foreground"
                  title="Edit description"
                  onClick={() => {
                    if (expanded === game.gameCode) { setExpanded(null); }
                    else {
                      setExpanded(game.gameCode);
                      setDescDraft((d) => ({ ...d, [game.gameCode]: game.description ?? "" }));
                      setRouteDraft((d) => ({ ...d, [game.gameCode]: game.volseverRoute ?? "" }));
                    }
                  }}
                >
                  {expanded === game.gameCode ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
                <Button
                  size="icon" variant="ghost"
                  className={`w-8 h-8 ${game.isVisible ? "text-muted-foreground hover:text-destructive" : "text-muted-foreground hover:text-emerald-500"}`}
                  title={game.isVisible ? "Hide game" : "Show game"}
                  data-testid={`btn-toggle-${game.gameCode}`}
                  onClick={() => game.isCustom
                    ? customVisibilityMutation.mutate({ gameCode: game.gameCode, isVisible: !game.isVisible })
                    : toggleMutation.mutate({ gameCode: game.gameCode, isVisible: !game.isVisible, isPinned: game.isPinned, requiresZoneId: game.requiresZoneId, volseverRoute: game.volseverRoute, description: game.description })}
                  disabled={toggleMutation.isPending || customVisibilityMutation.isPending || customPinMutation.isPending || customDeleteMutation.isPending}
                >
                  {game.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className={`w-8 h-8 ${game.isPinned ? "text-amber-300 bg-amber-400/10" : "text-muted-foreground hover:text-amber-300"}`}
                  title={game.isPinned ? "Unpin game" : "Pin game"}
                  data-testid={`btn-pin-${game.gameCode}`}
                  onClick={() => game.isCustom
                    ? customPinMutation.mutate({ gameCode: game.gameCode, isPinned: !game.isPinned })
                    : toggleMutation.mutate({ gameCode: game.gameCode, isVisible: game.isVisible, isPinned: !game.isPinned, requiresZoneId: game.requiresZoneId, volseverRoute: game.volseverRoute, description: game.description })}
                  disabled={toggleMutation.isPending || customPinMutation.isPending || customVisibilityMutation.isPending || customDeleteMutation.isPending}
                >
                  <Pin className="w-4 h-4" />
                </Button>
                {game.isCustom && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-8 h-8 text-muted-foreground hover:text-destructive"
                    title="Permanently delete custom game"
                    data-testid={`btn-delete-${game.gameCode}`}
                    disabled={customDeleteMutation.isPending}
                    onClick={() => {
                      if (window.confirm(`Permanently delete ${game.name} and all its packages?`)) {
                        customDeleteMutation.mutate(game.gameCode);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Description editor */}
            {expanded === game.gameCode && (
              <div className="px-4 pb-4 pt-0 border-t border-border mt-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 mt-3">Description</p>
                <textarea
                  rows={3}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 resize-none"
                  placeholder="Enter a short description shown on the game page…"
                  value={descDraft[game.gameCode] ?? ""}
                  onChange={(e) => setDescDraft((d) => ({ ...d, [game.gameCode]: e.target.value }))}
                />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 mt-4">Volsever check-user route</p>
                <Input
                  placeholder="e.g. mobile-legend-mp (leave empty to use the built-in route)"
                  value={routeDraft[game.gameCode] ?? ""}
                  onChange={(e) => setRouteDraft((d) => ({ ...d, [game.gameCode]: e.target.value }))}
                  data-testid={`input-volsever-route-${game.gameCode}`}
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  The store calls gate.volsever.com/proxy/api/game/&lt;route&gt; with the player ID (and Zone / Server ID when entered) to verify the account. The API key stays on the server.
                </p>
                <div className="flex gap-2 mt-3 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setExpanded(null)}>
                    <X className="w-3 h-3 mr-1" /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={toggleMutation.isPending || customRouteMutation.isPending}
                    data-testid={`btn-save-settings-${game.gameCode}`}
                    onClick={() => {
                      if (game.isCustom) {
                        customRouteMutation.mutate({ gameCode: game.gameCode, volseverRoute: routeDraft[game.gameCode] ?? "" });
                      } else {
                        toggleMutation.mutate({ gameCode: game.gameCode, isVisible: game.isVisible, isPinned: game.isPinned, requiresZoneId: game.requiresZoneId, volseverRoute: routeDraft[game.gameCode] ?? "", description: descDraft[game.gameCode] ?? "" });
                      }
                      setExpanded(null);
                    }}
                  >
                    <Check className="w-3 h-3 mr-1" /> Save
                  </Button>
                </div>
              </div>
            )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
