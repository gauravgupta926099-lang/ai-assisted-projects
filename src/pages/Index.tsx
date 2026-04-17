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

type SortMode = "newest" | "nearest" | "ending" | "reward";

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

export default function Index() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loadingGigs, setLoadingGigs] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("newest");

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

  const now = Date.now();

  // Hide completed quests from board; hide expired open quests
  const visibleGigs = gigs.filter((gig) => {
    if (gig.status === "completed") return false;
    if (gig.status === "open" && gig.expires_at && new Date(gig.expires_at).getTime() < now) return false;
    return true;
  });

  // Filter to only show within 2km
  const nearbyGigs = visibleGigs.filter((gig) => {
    if (userLat === null || userLng === null) return true;
    return getDistanceKm(userLat, userLng, gig.latitude, gig.longitude) <= 2;
  });

  // Sorting
  const sortedGigs = [...nearbyGigs].sort((a, b) => {
    switch (sortMode) {
      case "nearest": {
        if (userLat === null || userLng === null) return 0;
        const da = getDistanceKm(userLat, userLng, a.latitude, a.longitude);
        const db = getDistanceKm(userLat, userLng, b.latitude, b.longitude);
        return da - db;
      }
      case "ending": {
        const ea = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
        const eb = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
        return ea - eb;
      }
      case "reward":
        return b.reward_amount - a.reward_amount;
      case "newest":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
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
          <QuestMap userLat={userLat} userLng={userLng} gigs={sortedGigs} />
        </section>

        {/* Quest Feed */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
              Nearby Quests ({sortedGigs.length})
            </h3>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="rounded-md border border-border bg-secondary px-2 py-1 text-xs font-heading text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Sort quests"
            >
              <option value="newest">🆕 Newest</option>
              <option value="nearest" disabled={userLat === null}>📍 Nearest</option>
              <option value="ending">⏱️ Ending soon</option>
              <option value="reward">💰 Highest ₹</option>
            </select>
          </div>
          {loadingGigs ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading quests...</div>
          ) : sortedGigs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {userLat === null ? "Enable GPS to see nearby quests 📍" : "No quests within 2km. Be the first to post! 🗡️"}
            </div>
          ) : (
            sortedGigs.map((gig) => (
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
