import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDistanceKm } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { PayoutAnimation } from "@/components/PayoutAnimation";

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
  proof_note: string | null;
  proof_image_url: string | null;
  accepted_at: string | null;
  duration_minutes: number | null;
  expires_at: string | null;
}

function formatTimeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  const remMin = mins % 60;
  if (hrs < 24) return remMin ? `${hrs}h ${remMin}m left` : `${hrs}h left`;
  const days = Math.floor(hrs / 24);
  return `${days}d left`;
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
  const [proofNote, setProofNote] = useState("");
  const [showProofForm, setShowProofForm] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  const [payoutUpi, setPayoutUpi] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const distance = userLat && userLng ? getDistanceKm(userLat, userLng, gig.latitude, gig.longitude) : null;

  const isCreator = currentUserId === gig.creator_id;
  const isAcceptor = currentUserId === gig.accepted_by;
  const isOpen = gig.status === "open";
  const isAccepted = gig.status === "accepted";
  const isProofSubmitted = gig.status === "proof_submitted";
  const isCompleted = gig.status === "completed";

  const handleAccept = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const { error: txError } = await supabase.from("transactions").insert({
        gig_id: gig.id,
        from_user_id: gig.creator_id,
        to_user_id: currentUserId,
        amount: gig.reward_amount,
        status: "pending",
      });
      if (txError) throw txError;

      const { error } = await supabase.from("gigs").update({
        status: "accepted",
        accepted_by: currentUserId,
        accepted_at: new Date().toISOString(),
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

  const handleSubmitProof = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      let imageUrl: string | null = null;
      const file = fileInputRef.current?.files?.[0];
      if (file) {
        const path = `${gig.id}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from("quest-proofs").upload(path, file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("quest-proofs").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("gigs").update({
        status: "proof_submitted",
        proof_note: proofNote || null,
        proof_image_url: imageUrl,
      }).eq("id", gig.id);
      if (error) throw error;

      toast({ title: "Proof submitted! 📸", description: "Waiting for poster to verify" });
      setShowProofForm(false);
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
      // Get worker's payment info for animation
      if (gig.accepted_by) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("payment_info")
          .eq("user_id", gig.accepted_by)
          .single();
        setPayoutUpi(profile?.payment_info || "UPI ID");
      }

      // Release escrow
      const { error: txError } = await supabase.from("transactions")
        .update({ status: "released" })
        .eq("gig_id", gig.id)
        .eq("status", "pending");
      if (txError) throw txError;

      const { error } = await supabase.from("gigs").update({ status: "completed" }).eq("id", gig.id);
      if (error) throw error;

      if (gig.accepted_by) {
        await (supabase.rpc as any)("award_xp", { target_user_id: gig.accepted_by, points: 10 });
      }

      setShowPayout(true);
      onUpdate();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openNavigation = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${gig.latitude},${gig.longitude}`, "_blank");
  };

  const statusLabel = isCompleted ? "✅ Completed" : isProofSubmitted ? "📸 Proof Submitted" : isAccepted ? "⏳ In Progress" : "🟢 Open";
  const statusClass = isCompleted
    ? "bg-quest-xp/20 text-quest-xp"
    : isProofSubmitted
      ? "bg-primary/20 text-primary"
      : isAccepted
        ? "bg-accent/20 text-accent"
        : "bg-quest-xp/20 text-quest-xp";

  return (
    <>
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
            <div className="flex items-center gap-2 flex-wrap">
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
              {(isAccepted || isProofSubmitted) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-heading text-accent">
                  🔒 ₹{gig.reward_amount} Escrowed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Proof display for poster */}
        {isProofSubmitted && isCreator && (
          <div className="mt-3 rounded-md border border-border bg-secondary p-3 space-y-2">
            <p className="text-xs font-heading text-primary">📸 Worker submitted proof:</p>
            {gig.proof_note && <p className="text-sm text-foreground">{gig.proof_note}</p>}
            {gig.proof_image_url && (
              <img src={gig.proof_image_url} alt="Proof" className="w-full max-h-40 object-cover rounded-md" />
            )}
          </div>
        )}

        {/* Action buttons */}
        {currentUserId && (
          <div className="mt-3 space-y-2">
            {/* Accept */}
            {isOpen && !isCreator && (
              <Button variant="quest" size="sm" className="w-full" onClick={handleAccept} disabled={loading}>
                {loading ? "Accepting..." : "⚡ Accept Quest"}
              </Button>
            )}

            {/* Worker: Navigate + Submit proof */}
            {isAccepted && isAcceptor && (
              <>
                <Button variant="quest" size="sm" className="w-full" onClick={openNavigation}>
                  🗺️ Navigate to Quest
                </Button>
                {!showProofForm ? (
                  <Button variant="gold" size="sm" className="w-full" onClick={() => setShowProofForm(true)}>
                    📸 Submit for Approval
                  </Button>
                ) : (
                  <div className="space-y-2 rounded-md border border-border bg-secondary p-3">
                    <Input
                      placeholder="Describe what you did..."
                      value={proofNote}
                      onChange={(e) => setProofNote(e.target.value)}
                      className="bg-background border-border text-sm"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="w-full text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-primary-foreground"
                    />
                    <Button variant="gold" size="sm" className="w-full" onClick={handleSubmitProof} disabled={loading}>
                      {loading ? "Submitting..." : "✅ Submit Proof"}
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Poster: Confirm completion */}
            {isProofSubmitted && isCreator && (
              <Button variant="gold" size="sm" className="w-full" onClick={handleComplete} disabled={loading}>
                {loading ? "Confirming..." : "✅ Confirm Completion & Release ₹" + gig.reward_amount}
              </Button>
            )}

            {/* Status messages */}
            {isAccepted && isCreator && (
              <p className="text-xs text-center text-muted-foreground font-heading">⏳ Worker is on the quest...</p>
            )}
            {isProofSubmitted && isAcceptor && (
              <p className="text-xs text-center text-accent font-heading">⏳ Awaiting poster verification</p>
            )}
          </div>
        )}
      </div>

      {showPayout && (
        <PayoutAnimation
          amount={gig.reward_amount}
          upiId={payoutUpi}
          onClose={() => setShowPayout(false)}
        />
      )}
    </>
  );
}
