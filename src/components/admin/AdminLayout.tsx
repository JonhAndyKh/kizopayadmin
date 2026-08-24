import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Image, Tag, Package, LogOut, ChevronRight, Gamepad2, Megaphone } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/games", label: "Games", icon: Gamepad2 },
  { href: "/admin/slides", label: "Promo Slides", icon: Image },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/promos", label: "Promo Codes", icon: Tag },
  { href: "/admin/products", label: "Products", icon: Package },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const isActive = (href: string, exact?: boolean) =>
    exact ? location === href : location.startsWith(href);

  return (
    <div className="relative min-h-[100dvh] flex overflow-x-hidden bg-background bg-dot-grid">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/4 h-96 w-96 rounded-full bg-primary/8 blur-[130px]" />
        <div className="absolute top-1/3 -right-40 h-80 w-80 rounded-full bg-accent/6 blur-[120px]" />
      </div>

      {/* Sidebar */}
      <aside className="relative z-10 hidden w-64 shrink-0 flex-col border-r border-white/8 bg-card/70 backdrop-blur-xl md:flex">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 border-b border-white/8 px-6 py-5">
          <BrandMark size="md" />
        </Link>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-5">
          <p className="px-3 pt-2 pb-1 text-[10px] font-display font-bold uppercase tracking-widest text-white/30">
            Management
          </p>
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link key={href} href={href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-none rounded-lg transition-all cursor-pointer group ${
                    active
                      ? "border border-primary/25 bg-primary/12 text-primary shadow-lg shadow-primary/5"
                      : "border border-transparent text-white/55 hover:border-white/8 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="font-display font-bold text-sm uppercase tracking-wide flex-1">{label}</span>
                  {active && <ChevronRight className="w-3 h-3 opacity-70" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-white/8 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/12 text-xs font-black uppercase text-primary">
              {user?.name?.charAt(0) ?? "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-white/40 truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            onClick={logout}
            variant="ghost"
            size="sm"
            className="w-full rounded-lg border border-transparent font-display text-xs uppercase tracking-wide text-white/45 hover:border-white/8 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="w-3 h-3 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-white/8 bg-card/92 px-4 backdrop-blur-xl md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark />
        </Link>
        <Button onClick={logout} variant="ghost" size="sm" className="text-white/60 hover:text-white">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

      {/* Mobile nav bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex overflow-x-auto border-t border-white/8 bg-card/92 backdrop-blur-xl md:hidden">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link key={href} href={href} className="min-w-[68px] flex-1">
              <div className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-1.5 ${active ? "text-primary" : "text-white/40"}`}>
                <Icon className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-wide">{label.split(" ")[0]}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main */}
      <main className="relative z-0 min-w-0 flex-1 overflow-auto pb-24 pt-14 md:pb-0 md:pt-0">
        <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-7 md:px-8 md:py-9">
          {children}
        </div>
      </main>
    </div>
  );
}
