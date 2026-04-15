import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { PSIT_LAT, PSIT_LNG } from "@/lib/geo";

export function PostQuestForm({ onPosted }: { onPosted: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("gigs").insert({
        title,
        description: description || null,
        reward_amount: parseInt(reward) || 0,
        latitude: PSIT_LAT,
        longitude: PSIT_LNG,
        creator_id: user.id,
      });
      if (error) throw error;
      toast({ title: "Quest posted! ⚔️" });
      setTitle("");
      setDescription("");
      setReward("");
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
      <Input
        placeholder="Quest title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        className="bg-secondary border-border"
      />
      <Input
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="bg-secondary border-border"
      />
      <Input
        type="number"
        placeholder="Reward in ₹"
        value={reward}
        onChange={(e) => setReward(e.target.value)}
        required
        min={1}
        className="bg-secondary border-border"
      />
      <Button type="submit" variant="gold" className="w-full" disabled={loading}>
        {loading ? "Posting..." : "⚡ Post Quest"}
      </Button>
    </form>
  );
}
