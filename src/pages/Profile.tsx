import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Transaction {
  id: string;
  gig_id: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [xp, setXp] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [paymentInfo, setPaymentInfo] = useState("");
  const [saving, setSaving] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tab, setTab] = useState<"profile" | "earnings">("profile");

  useEffect(() => {
    if (!user) { navigate("/"); return; }

    const loadProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setXp(data.xp);
        setDisplayName(data.display_name ?? "");
        setPaymentInfo(data.payment_info ?? "");
      }
    };

    const loadTransactions = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("to_user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setTransactions(data);
    };

    loadProfile();
    loadTransactions();
  }, [user, navigate]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        display_name: displayName,
        payment_info: paymentInfo,
      }).eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Profile saved! 🛡️" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totalEarned = transactions.filter((t) => t.status === "released").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="container flex items-center justify-between h-14 px-4">
          <button onClick={() => navigate("/")} className="font-heading text-lg font-bold text-gradient-primary">
            📍 sideQuest
          </button>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-xs text-muted-foreground">
            Logout
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* XP Banner */}
        <div className="text-center space-y-1">
          <div className="text-4xl">🛡️</div>
          <h2 className="font-heading text-xl font-bold text-foreground">{displayName || "Student"}</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-quest-xp/20 px-4 py-1 text-sm font-heading text-quest-xp">
            ⭐ {xp} XP
          </span>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setTab("profile")}
            className={`flex-1 py-2 text-xs font-heading uppercase tracking-wider transition-colors ${
              tab === "profile" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            ⚙️ Profile
          </button>
          <button
            onClick={() => setTab("earnings")}
            className={`flex-1 py-2 text-xs font-heading uppercase tracking-wider transition-colors ${
              tab === "earnings" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            💰 Earnings
          </button>
        </div>

        {tab === "profile" ? (
          <div className="space-y-4 rounded-lg border border-border bg-card p-4">
            <div className="space-y-2">
              <label className="text-xs font-heading text-muted-foreground uppercase tracking-wider">Display Name</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-heading text-muted-foreground uppercase tracking-wider">Payment Info (UPI ID / Paytm)</label>
              <Input
                value={paymentInfo}
                onChange={(e) => setPaymentInfo(e.target.value)}
                placeholder="yourname@upi or 9876543210"
                className="bg-secondary border-border"
              />
              <p className="text-xs text-muted-foreground">This is where your quest rewards will be sent</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-heading text-muted-foreground uppercase tracking-wider">Email</label>
              <Input value={user?.email ?? ""} disabled className="bg-muted border-border text-muted-foreground" />
            </div>
            <Button variant="gold" className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "💾 Save Profile"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="rounded-lg border border-quest-xp/30 bg-card p-4 text-center glow-primary">
              <p className="text-xs font-heading text-muted-foreground uppercase tracking-wider">Total Earned</p>
              <p className="font-heading text-3xl font-bold text-quest-xp">₹{totalEarned}</p>
              <p className="text-xs text-muted-foreground mt-1">{transactions.filter((t) => t.status === "released").length} quests completed</p>
            </div>

            {/* Transaction list */}
            <div className="space-y-2">
              <h3 className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                Transaction History
              </h3>
              {transactions.length === 0 ? (
                <p className="text-center py-6 text-sm text-muted-foreground">No earnings yet. Accept some quests! ⚔️</p>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">₹{tx.amount}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-heading ${
                      tx.status === "released"
                        ? "bg-quest-xp/20 text-quest-xp"
                        : "bg-accent/20 text-accent"
                    }`}>
                      {tx.status === "released" ? "✅ Paid" : "⏳ Pending"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
