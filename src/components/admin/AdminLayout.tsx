import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Activity, ChevronRight, Clock3, Gamepad2, Image, LayoutDashboard, LogOut, Megaphone, Menu, Package, Radio, ShieldCheck, Tag, X } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/games", label: "Catalogue", icon: Gamepad2 },
  { href: "/admin/slides", label: "Promo Slides", icon: Image },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/live-events", label: "Live Events", icon: Radio },
  { href: "/admin/promos", label: "Promo Codes", icon: Tag },
  { href: "/admin/products", label: "Products", icon: Package },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? location === href : location.startsWith(href);

  return (
    <div className="relative flex min-h-[100dvh] overflow-x-hidden bg-background bg-dot-grid">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-52 left-1/3 h-[28rem] w-[28rem] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-accent/5 blur-[120px]" />
      </div>

      {/* Sidebar */}
      <aside className="relative z-10 hidden w-[260px] shrink-0 flex-col bg-[#092653] text-slate-200 md:flex">
        <Link href="/" className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <BrandMark size="md" inverse />
        </Link>

        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Operations online
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-300/70">Reseller control room</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          <p className="eyebrow px-3 pb-2 text-slate-500">
            Workspace
          </p>
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link key={href} href={href} className={`group flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors ${
                    active
                      ? "border-primary/40 bg-primary text-white shadow-lg shadow-primary/20"
                      : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-slate-100"
                  }`}>
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-amber-300" : "text-slate-500 group-hover:text-slate-300"}`} />
                <span className="flex-1 text-sm font-semibold">{label}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 text-amber-300" />}
              </Link>
            );
          })}
        </nav>

        <div className="mx-3 mb-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
            Secure session
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/10 text-xs font-black uppercase text-amber-200">
              {user?.name?.charAt(0) ?? "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-bold text-slate-100">{user?.name}</p>
              <p className="truncate text-[10px] text-slate-400">{user?.email}</p>
            </div>
          </div>
          <Button
            onClick={logout}
            variant="ghost"
            size="sm"
            className="w-full rounded-md border border-white/10 font-display text-xs uppercase tracking-wide text-slate-400 hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="w-3 h-3 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 shadow-sm backdrop-blur-xl md:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <Button onClick={() => setMobileNavOpen((open) => !open)} variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-foreground hover:bg-muted" aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}>
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <span className="truncate font-display text-lg font-semibold text-foreground">
            {location === "/admin" ? "Overview" : NAV.find((item) => isActive(item.href, item.exact))?.label ?? "Admin"}
          </span>
        </div>
        <button type="button" onClick={() => setMobileNavOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#0c4ca8] text-sm font-bold text-white shadow-md shadow-primary/20" aria-label="Open account menu">
          {(user?.name ?? "A").charAt(0).toUpperCase()}
        </button>
      </div>

      {/* Mobile navigation drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 bg-[#0d1b2a]/45 md:hidden" onClick={() => setMobileNavOpen(false)}>
          <aside className="flex h-full w-[min(82vw,300px)] flex-col bg-[#092653] pt-16 text-slate-200 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-white/10 px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-base font-semibold text-white">KizoPay</p>
                  <p className="text-xs text-slate-300/70">Reseller Portal</p>
                </div>
              </div>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-5">
              <p className="eyebrow px-3 pb-2 text-slate-500">Workspace</p>
              {NAV.map(({ href, label, icon: Icon, exact }) => {
                const active = isActive(href, exact);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileNavOpen(false)}
                    className={`group flex items-center gap-3 rounded-md border px-3 py-3 transition-colors ${
                      active
                         ? "border-primary/40 bg-primary text-white shadow-lg shadow-black/10"
                        : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-slate-100"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-amber-300" : "text-slate-500 group-hover:text-slate-300"}`} />
                    <span className="flex-1 text-sm font-semibold">{label}</span>
                    {active && <ChevronRight className="h-3.5 w-3.5 text-amber-300" />}
                  </Link>
                );
              })}
            </nav>
            <div className="mx-3 mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
                Secure session
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/10 text-xs font-black uppercase text-amber-200">
                  {user?.name?.charAt(0) ?? "A"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-100">{user?.name}</p>
                  <p className="truncate text-[10px] text-slate-400">{user?.email}</p>
                </div>
              </div>
              <Button onClick={logout} variant="ghost" size="sm" className="mt-4 w-full rounded-xl border border-white/10 font-display text-xs uppercase tracking-wide text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white">
                <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="relative z-0 min-w-0 flex-1 overflow-auto pb-6 pt-14 md:pb-0 md:pt-0">
        <div className="mx-auto max-w-[1440px] px-3 py-5 sm:px-5 sm:py-7 md:px-8 md:py-9">
          <div className="mb-5 flex items-center justify-between border-b border-border/80 pb-3 md:hidden">
            <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
              <Activity className="h-3.5 w-3.5 shrink-0 text-accent" />
              <span className="truncate font-semibold">KizoPay operations</span>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span className="truncate font-mono text-[10px]">{location === "/admin" ? "overview" : location.replace("/admin/", "")}</span>
            </div>
            <div className="ml-3 flex shrink-0 items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">Live</span>
            </div>
          </div>
          <div className="mb-6 hidden items-center justify-between border-b border-border/80 pb-4 md:flex">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-accent" />
              <span className="font-semibold">KizoPay operations</span>
              <ChevronRight className="h-3 w-3" />
              <span className="font-mono text-[11px]">{location === "/admin" ? "overview" : location.replace("/admin/", "")}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              Auto-refresh enabled
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
