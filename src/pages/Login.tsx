import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, ArrowLeft, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { BrandMark } from "@/components/BrandMark";

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
      setLocation("/admin");
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-grid-subtle opacity-70" />
      <div className="pointer-events-none absolute -right-32 top-0 h-[30rem] w-[30rem] rounded-full bg-primary/5 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-20 h-80 w-80 rounded-full bg-accent/10 blur-[100px]" />

      <div className="relative z-10 grid w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card admin-shadow md:grid-cols-[1fr_1.1fr]">
        <div className="hidden flex-col justify-between bg-[#17283d] p-9 text-slate-200 md:flex">
          <div>
            <BrandMark size="md" inverse />
            <div className="mt-20 max-w-xs">
              <p className="eyebrow text-amber-300">Operator access</p>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-white">Keep every top-up moving.</h2>
              <p className="mt-4 text-sm leading-6 text-slate-300/70">Monitor your balance, manage the storefront, and resolve order flow from one quiet workspace.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-white/10 pt-5 text-xs text-slate-400">
            <Activity className="h-3.5 w-3.5 text-emerald-400" /> KizoPay systems operational
          </div>
        </div>

        <div className="p-6 sm:p-9">
          <div className="mb-8 md:hidden">
            <BrandMark size="md" />
          </div>
          <div className="mb-8">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <p className="eyebrow text-primary">Secure operator portal</p>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">Sign in to KizoPay</h1>
            <p className="mt-1.5 text-sm font-medium text-muted-foreground">Use your reseller credentials to continue.</p>
          </div>
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="eyebrow text-muted-foreground">Email</Label>
              <Input
                type="email"
                placeholder="admin@kizopay.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                autoFocus
                className="h-11 rounded-lg border-border bg-background font-medium focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="eyebrow text-muted-foreground">Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="h-11 rounded-lg border-border bg-background font-medium focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              size="lg"
              className="mt-4 h-11 w-full rounded-lg bg-primary text-xs font-display font-bold uppercase tracking-[0.14em] text-primary-foreground shadow-md shadow-primary/15 transition-colors hover:bg-primary/90"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> Authenticating...</>
              ) : (
                "Enter Command Center"
              )}
            </Button>
          </form>
          <div className="mt-7 flex items-center justify-between border-t border-border pt-5 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Protected session</span>
            <Link href="/" className="flex items-center gap-1 hover:text-foreground transition-colors"><ArrowLeft className="h-3.5 w-3.5" /> Back to store</Link>
          </div>
        </div>
      </div>
    </div>
  );
}