import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        toast({ title: "Welcome back, adventurer! ⚔️" });
        onClose();
      } else if (mode === "signup") {
        await signUp(email, password);
        toast({ title: "Account created! Check email to verify 📧" });
        onClose();
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({ title: "Reset link sent! 📧", description: "Check your Gmail inbox" });
        setMode("login");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    login: "⚔️ Student Login",
    signup: "🛡️ Join the Guild",
    forgot: "🔐 Reset Password",
  };
  const subtitles = {
    login: "Enter your credentials",
    signup: "Create your adventurer profile",
    forgot: "We'll email you a reset link",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-lg border border-border bg-card p-6 glow-primary">
        <h2 className="font-heading text-xl text-center text-foreground mb-1">{titles[mode]}</h2>
        <p className="text-muted-foreground text-center text-sm mb-6">{subtitles[mode]}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="student@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-secondary border-border"
          />
          {mode !== "forgot" && (
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-secondary border-border"
            />
          )}
          <Button type="submit" variant="quest" className="w-full" disabled={loading}>
            {loading
              ? "Loading..."
              : mode === "login"
                ? "Enter the Realm"
                : mode === "signup"
                  ? "Create Account"
                  : "Send Reset Link"}
          </Button>
        </form>
        <div className="mt-4 space-y-1 text-center text-sm">
          {mode === "login" && (
            <>
              <button onClick={() => setMode("forgot")} className="block w-full text-muted-foreground hover:text-primary transition-colors">
                Forgot password?
              </button>
              <button onClick={() => setMode("signup")} className="block w-full text-muted-foreground hover:text-primary transition-colors">
                New here? Create account
              </button>
            </>
          )}
          {mode === "signup" && (
            <button onClick={() => setMode("login")} className="block w-full text-muted-foreground hover:text-primary transition-colors">
              Already have an account? Login
            </button>
          )}
          {mode === "forgot" && (
            <button onClick={() => setMode("login")} className="block w-full text-muted-foreground hover:text-primary transition-colors">
              ← Back to login
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
