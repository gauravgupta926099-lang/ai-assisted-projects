import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        toast({ title: "Welcome back, adventurer! ⚔️" });
      } else {
        await signUp(email, password);
        toast({ title: "Account created! Check email to verify 📧" });
      }
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 glow-primary">
        <h2 className="font-heading text-xl text-center text-foreground mb-1">
          {isLogin ? "⚔️ Student Login" : "🛡️ Join the Guild"}
        </h2>
        <p className="text-muted-foreground text-center text-sm mb-6">
          {isLogin ? "Enter your credentials" : "Create your adventurer profile"}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="student@psit.ac.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-secondary border-border"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="bg-secondary border-border"
          />
          <Button type="submit" variant="quest" className="w-full" disabled={loading}>
            {loading ? "Loading..." : isLogin ? "Enter the Realm" : "Create Account"}
          </Button>
        </form>
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full text-center text-sm text-muted-foreground mt-4 hover:text-primary transition-colors"
        >
          {isLogin ? "New here? Create account" : "Already have an account? Login"}
        </button>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
