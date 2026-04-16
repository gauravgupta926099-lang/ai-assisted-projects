import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDistanceKm } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Gig {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
  creator_id: string;
  accepted_by: string | null;
}

interface QuestCardProps {
  gig: Gig;
  userLat: number | null;
  userLng: number | null;
  currentUserId: string | null;
  onUpdate: () => void;
}

export function QuestCard({ gig, userLat, userLng, currentUserId, onUpdate }: QuestCardProps) {
  const [loading, setLoading] = useState(false);
  const distance = userLat && userLng ? getDistanceKm(userLat, userLng, gig.latitude, gig.longitude) : null;

  const isCreator = currentUserId === gig.creator_id;
  const isAcceptor = currentUserId === gig.accepted_by;
  const isOpen = gig.status === "open";
  const isAccepted = gig.status === "accepted";
  const isCompleted = gig.status === "completed";

  const handleAccept = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      // Create escrow transaction
      const { error: txError } = await supabase.from("transactions").insert({
        gig_id: gig.id,
        from_user_id: gig.creator_id,
        to_user_id: currentUserId,
        amount: gig.reward_amount,
        status: "pending",
      });
      if (txError) throw txError;

      // Update gig status
      const { error } = await supabase.from("gigs").update({
        status: "accepted",
        accepted_by: currentUserId,
      }).eq("id", gig.id);
      if (error) throw error;

      toast({ title: "Quest Accepted! ⚔️", description: `₹${gig.reward_amount} held in escrow` });
      onUpdate();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Release escrow
      const { error: txError } = await supabase.from("transactions")
        .update({ status: "released" })
        .eq("gig_id", gig.id)
        .eq("status", "pending");
      if (txError) throw txError;

      // Mark gig complete
      const { error } = await supabase.from("gigs").update({ status: "completed" }).eq("id", gig.id);
      if (error) throw error;

      // Award XP to acceptor
      if (gig.accepted_by) {
        await supabase.rpc("award_xp" as any, { target_user_id: gig.accepted_by, points: 10 });
      }

      toast({ title: "Quest Complete! 🎉", description: `₹${gig.reward_amount} released + 10 XP awarded` });
      onUpdate();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = isCompleted ? "✅ Completed" : isAccepted ? "⏳ In Progress" : "🟢 Open";
  const statusClass = isCompleted
    ? "bg-quest-xp/20 text-quest-xp"
    : isAccepted
      ? "bg-accent/20 text-accent"
      : "bg-quest-xp/20 text-quest-xp";

  return (
    <div className="rounded-lg border border-primary/30 bg-card p-4 glow-primary transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">⚔️</span>
            <h3 className="font-heading text-sm font-semibold text-foreground truncate">{gig.title}</h3>
          </div>
          {gig.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{gig.description}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-heading text-accent">
              💰 ₹{gig.reward_amount}
            </span>
            {distance !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-quest-xp/20 px-2.5 py-0.5 text-xs font-heading text-quest-xp">
                📍 {distance.toFixed(1)}km
              </span>
            )}
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-heading ${statusClass}`}>
              {statusLabel}
            </span>
            {isAccepted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-heading text-accent">
                🔒 ₹{gig.reward_amount} Escrowed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {currentUserId && (
        <div className="mt-3">
          {isOpen && !isCreator && (
            <Button variant="quest" size="sm" className="w-full" onClick={handleAccept} disabled={loading}>
              {loading ? "Accepting..." : "⚡ Accept Quest"}
            </Button>
          )}
          {isAccepted && isCreator && (
            <Button variant="gold" size="sm" className="w-full" onClick={handleComplete} disabled={loading}>
              {loading ? "Completing..." : "✅ Mark as Complete"}
            </Button>
          )}
          {isAccepted && isAcceptor && (
            <p className="text-xs text-center text-accent font-heading">⏳ Awaiting poster verification</p>
          )}
        </div>
      )}
    </div>
  );
}
