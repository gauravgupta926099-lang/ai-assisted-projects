import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { watchUserLocation, getDistanceKm } from "@/lib/geo";
import { QuestCard } from "@/components/QuestCard";
import { PostQuestForm } from "@/components/PostQuestForm";
import { AuthModal } from "@/components/AuthModal";
import { ProfileBadge } from "@/components/ProfileBadge";
import { QuestMap } from "@/components/QuestMap";
import { Button } from "@/components/ui/button";

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
}

export default function Index() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loadingGigs, setLoadingGigs] = useState(true);

  const fetchGigs = useCallback(async () => {
    const { data } = await supabase
      .from("gigs")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setGigs(data);
    setLoadingGigs(false);
  }, []);

  useEffect(() => {
    fetchGigs();
    const stopWatching = watchUserLocation(
      ({ lat, lng }) => {
        setUserLat(lat);
        setUserLng(lng);
        setLocationError(false);
      },
      () => setLocationError(true)
    );
    return () => stopWatching();
  }, [fetchGigs]);

  // Real-time subscription for gigs
  useEffect(() => {
    const channel = supabase
      .channel("gigs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gigs" },
        () => fetchGigs()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchGigs]);

  // Filter gigs to only show within 2km
  const nearbyGigs = gigs.filter((gig) => {
    if (userLat === null || userLng === null) return true; // show all if no location yet
    return getDistanceKm(userLat, userLng, gig.latitude, gig.longitude) <= 2;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="container flex items-center justify-between h-14 px-4">
          <h1 className="font-heading text-lg font-bold text-gradient-primary">📍 sideQuest</h1>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <ProfileBadge userId={user.id} />
                <Button variant="ghost" size="sm" onClick={signOut} className="text-xs text-muted-foreground">
                  Logout
                </Button>
              </>
            ) : (
              <Button variant="quest" size="sm" onClick={() => setShowAuth(true)}>
                Student Login
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Hero */}
        <section className="text-center space-y-2">
          <h2 className="font-heading text-2xl font-bold text-foreground">Quest Board</h2>
          <p className="text-sm text-muted-foreground">
            Accept quests within 2km • Earn ₹ • Help fellow students
          </p>
          {locationError ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/20 px-3 py-1 text-xs font-heading text-destructive">
              🔴 GPS Denied — Enable location
            </span>
          ) : userLat !== null ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-quest-xp/20 px-3 py-1 text-xs font-heading text-quest-xp animate-pulse-glow">
              📡 Location Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-heading text-muted-foreground">
              ⏳ Acquiring GPS...
            </span>
          )}
        </section>

        {/* Post Quest */}
        {user && (
          <div>
            {showForm ? (
              <div className="space-y-2">
                <PostQuestForm onPosted={() => { fetchGigs(); setShowForm(false); }} userLat={userLat} userLng={userLng} />
                <button
                  onClick={() => setShowForm(false)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <Button variant="gold" className="w-full" onClick={() => setShowForm(true)}>
                ⚡ Post a Quest
              </Button>
            )}
          </div>
        )}

        {/* Map View */}
        <section className="space-y-2">
          <h3 className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
            🗺️ Quest Map
          </h3>
          <QuestMap userLat={userLat} userLng={userLng} gigs={nearbyGigs} />
        </section>

        {/* Quest Feed */}
        <section className="space-y-3">
          <h3 className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
            Nearby Quests ({nearbyGigs.length})
          </h3>
          {loadingGigs ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading quests...</div>
          ) : nearbyGigs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {userLat === null ? "Enable GPS to see nearby quests 📍" : "No quests within 2km. Be the first to post! 🗡️"}
            </div>
          ) : (
            nearbyGigs.map((gig) => (
              <QuestCard
                key={gig.id}
                gig={gig}
                userLat={userLat}
                userLng={userLng}
                currentUserId={user?.id ?? null}
                onUpdate={fetchGigs}
              />
            ))
          )}
        </section>
      </main>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
