import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Activity, ChevronRight, Clock3, Gamepad2, Image, LayoutDashboard, LogOut, Megaphone, Package, Radio, ShieldCheck, Tag } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/games", label: "Games", icon: Gamepad2 },
  { href: "/admin/slides", label: "Promo Slides", icon: Image },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/live-events", label: "Live Events", icon: Radio },
  { href: "/admin/promos", label: "Promo Codes", icon: Tag },
  { href: "/admin/products", label: "Products", icon: Package },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const isActive = (href: string, exact?: boolean) =>
    exact ? location === href : location.startsWith(href);

  return (
    <div className="relative flex min-h-[100dvh] overflow-x-hidden bg-background bg-dot-grid">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-52 left-1/3 h-[28rem] w-[28rem] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-accent/5 blur-[120px]" />
      </div>

      {/* Sidebar */}
      <aside className="relative z-10 hidden w-[248px] shrink-0 flex-col bg-[#17283d] text-slate-200 md:flex">
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
                      ? "border-white/10 bg-white/10 text-white"
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
      <div className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-white/10 bg-[#17283d]/95 px-4 shadow-lg backdrop-blur-xl md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark inverse />
        </Link>
        <Button onClick={logout} variant="ghost" size="sm" className="text-slate-300 hover:bg-white/10 hover:text-white">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

      {/* Mobile nav bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex overflow-x-auto border-t border-border bg-[#17283d]/98 shadow-[0_-8px_24px_hsl(219_34%_17%/0.16)] backdrop-blur-xl md:hidden">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link key={href} href={href} className={`min-w-[68px] flex-1 ${active ? "text-amber-300" : "text-slate-400"}`}>
              <div className="flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-1.5">
                <Icon className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wide">{label.split(" ")[0]}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main */}
      <main className="relative z-0 min-w-0 flex-1 overflow-auto pb-24 pt-14 md:pb-0 md:pt-0">
        <div className="mx-auto max-w-[1440px] px-3 py-5 sm:px-5 sm:py-7 md:px-8 md:py-9">
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
