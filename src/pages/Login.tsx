import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldAlert } from "lucide-react";
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
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 bg-grid-subtle" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        <Link href="/" className="flex items-center gap-3 justify-center mb-10 group">
          <BrandMark size="login" className="transition-transform group-hover:scale-[1.02]" />
        </Link>

        <div className="bg-card border border-white/5 rounded-2xl p-8 shadow-2xl">
          <div className="mb-8">
            <h1 className="text-2xl font-display font-black tracking-tight text-foreground">Admin Login</h1>
            <p className="text-sm text-muted-foreground mt-1.5 font-medium">Access the command center</p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <p className="text-xs font-bold font-display uppercase tracking-wider">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="font-display font-bold uppercase text-[10px] tracking-wider text-muted-foreground">Email</Label>
              <Input
                type="email"
                placeholder="admin@kizopay.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="bg-background border-border h-12 font-medium rounded-lg focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-display font-bold uppercase text-[10px] tracking-wider text-muted-foreground">Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background border-border h-12 font-medium rounded-lg focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              size="lg"
              className="w-full h-12 text-xs font-display font-bold uppercase tracking-widest rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground mt-4 shadow-lg shadow-primary/20 transition-all"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 w-4 h-4 animate-spin" /> Authenticating...</>
              ) : (
                "Enter Command Center"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 font-medium">
          <Link href="/" className="hover:text-foreground transition-colors">← Back to store</Link>
        </p>
      </div>
    </div>
  );
}