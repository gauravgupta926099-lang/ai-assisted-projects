import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface PostQuestFormProps {
  onPosted: () => void;
  userLat: number | null;
  userLng: number | null;
}

const DURATION_OPTIONS: { label: string; minutes: number | null }[] = [
  { label: "No limit", minutes: null },
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "4 hours", minutes: 240 },
  { label: "8 hours", minutes: 480 },
  { label: "24 hours", minutes: 1440 },
];

export function PostQuestForm({ onPosted, userLat, userLng }: PostQuestFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (userLat === null || userLng === null) {
      toast({ title: "Location required", description: "Enable GPS to post a quest", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const expiresAt =
        durationMinutes !== null
          ? new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()
          : null;

      const { error } = await supabase.from("gigs").insert({
        title,
        description: description || null,
        reward_amount: parseInt(reward) || 0,
        latitude: userLat,
        longitude: userLng,
        creator_id: user.id,
        duration_minutes: durationMinutes,
        expires_at: expiresAt,
      });
      if (error) throw error;
      toast({ title: "Quest posted! ⚔️" });
      setTitle("");
      setDescription("");
      setReward("");
      setDurationMinutes(null);
      onPosted();
    } catch (err: any) {
      toast({ title: "Failed to post", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h3 className="font-heading text-sm font-semibold text-foreground">📜 Post a New Quest</h3>
      <Input placeholder="Quest title" value={title} onChange={(e) => setTitle(e.target.value)} required className="bg-secondary border-border" />
      <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-secondary border-border" />
      <Input type="number" placeholder="Reward in ₹" value={reward} onChange={(e) => setReward(e.target.value)} required min={1} className="bg-secondary border-border" />

      <div className="space-y-1.5">
        <label className="text-xs font-heading uppercase tracking-wider text-muted-foreground">⏱️ Duration (optional)</label>
        <div className="flex flex-wrap gap-1.5">
          {DURATION_OPTIONS.map((opt) => {
            const active = durationMinutes === opt.minutes;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => setDurationMinutes(opt.minutes)}
                className={`rounded-full px-3 py-1 text-xs font-heading transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <Button type="submit" variant="gold" className="w-full" disabled={loading}>
        {loading ? "Posting..." : "⚡ Post Quest"}
      </Button>
    </form>
  );
}
