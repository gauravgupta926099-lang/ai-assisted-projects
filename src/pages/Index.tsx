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

  const visibleGigs = gigs.filter((gig) => {
    if (gig.status === "completed") return false;
    if (gig.status === "open" && gig.expires_at && new Date(gig.expires_at).getTime() < now) return false;
    return true;
  });

  const nearbyGigs = visibleGigs.filter((gig) => {
    if (userLat === null || userLng === null) return true;
    return getDistanceKm(userLat, userLng, gig.latitude, gig.longitude) <= 2;
  });

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

  const openCount = visibleGigs.filter((g) => g.status === "open").length;
  const totalReward = sortedGigs.reduce((sum, g) => sum + g.reward_amount, 0);

  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16 px-4 md:px-6 max-w-7xl">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 border border-primary/30 text-lg">
              📍
            </div>
            <div className="leading-tight">
              <h1 className="font-heading text-base md:text-lg font-bold text-gradient-primary tracking-wide">
                sideQuest
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:block">
                Student Quest Network
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <ProfileBadge userId={user.id} />
                <Button variant="ghost" size="sm" onClick={signOut} className="text-xs text-muted-foreground hidden sm:inline-flex">
                  Logout
                </Button>
                <Button variant="ghost" size="icon" onClick={signOut} className="sm:hidden text-muted-foreground" aria-label="Logout">
                  ⎋
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

      <main className="bg-hero-radial">
        <div className="container px-4 md:px-6 py-6 md:py-10 max-w-7xl">
          {/* Hero */}
          <section className="text-center space-y-3 mb-6 md:mb-10">
            <div className="inline-flex items-center gap-2">
              {locationError ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 border border-destructive/30 px-3 py-1 text-xs font-heading text-destructive">
                  🔴 GPS Denied
                </span>
              ) : userLat !== null ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-quest-xp/15 border border-quest-xp/30 px-3 py-1 text-xs font-heading text-quest-xp animate-pulse-glow">
                  📡 Location Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-3 py-1 text-xs font-heading text-muted-foreground">
                  ⏳ Acquiring GPS...
                </span>
              )}
            </div>
            <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground tracking-tight">
              <span className="text-gradient-primary">Quest Board</span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              Accept quests within <span className="text-foreground font-semibold">2km</span> · Earn ₹ · Help fellow students
            </p>

            {/* Stat strip */}
            <div className="flex items-center justify-center gap-2 md:gap-4 pt-2 flex-wrap">
              <div className="rounded-lg border border-border bg-card/50 backdrop-blur px-4 py-2 min-w-[100px]">
                <div className="text-xs text-muted-foreground font-heading uppercase tracking-wider">Live</div>
                <div className="text-lg md:text-xl font-bold font-heading text-quest-xp">{openCount}</div>
              </div>
              <div className="rounded-lg border border-border bg-card/50 backdrop-blur px-4 py-2 min-w-[100px]">
                <div className="text-xs text-muted-foreground font-heading uppercase tracking-wider">Nearby</div>
                <div className="text-lg md:text-xl font-bold font-heading text-primary">{sortedGigs.length}</div>
              </div>
              <div className="rounded-lg border border-border bg-card/50 backdrop-blur px-4 py-2 min-w-[100px]">
                <div className="text-xs text-muted-foreground font-heading uppercase tracking-wider">Pool</div>
                <div className="text-lg md:text-xl font-bold font-heading text-accent">₹{totalReward}</div>
              </div>
            </div>
          </section>

          {/* Two-column layout on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,1.4fr)] gap-6">
            {/* Left column: Map + Post */}
            <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              {/* Map */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                    🗺️ Quest Map
                  </h3>
                  <span className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground">
                    2km radius
                  </span>
                </div>
                <div className="lg:h-[420px] h-64">
                  <QuestMap userLat={userLat} userLng={userLng} gigs={sortedGigs} />
                </div>
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
                    <Button variant="gold" className="w-full h-12 text-sm md:text-base" onClick={() => setShowForm(true)}>
                      ⚡ Post a New Quest
                    </Button>
                  )}
                </div>
              )}

              {!user && (
                <div className="rounded-lg border border-primary/30 bg-card/50 backdrop-blur p-5 text-center space-y-3">
                  <div className="text-3xl">🎮</div>
                  <h4 className="font-heading text-sm font-bold text-foreground">Join the Network</h4>
                  <p className="text-xs text-muted-foreground">
                    Sign in to post quests, earn ₹, and level up your XP.
                  </p>
                  <Button variant="quest" className="w-full" onClick={() => setShowAuth(true)}>
                    Get Started
                  </Button>
                </div>
              )}
            </div>

            {/* Right column: Quest feed */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
                  Nearby Quests <span className="text-foreground">({sortedGigs.length})</span>
                </h3>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-heading text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  aria-label="Sort quests"
                >
                  <option value="newest">🆕 Newest</option>
                  <option value="nearest" disabled={userLat === null}>📍 Nearest</option>
                  <option value="ending">⏱️ Ending soon</option>
                  <option value="reward">💰 Highest ₹</option>
                </select>
              </div>

              {loadingGigs ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="rounded-lg border border-border bg-card/50 p-4 h-32 animate-pulse" />
                  ))}
                </div>
              ) : sortedGigs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-card/30 p-10 text-center space-y-2">
                  <div className="text-4xl">🗡️</div>
                  <p className="text-sm text-muted-foreground">
                    {userLat === null
                      ? "Enable GPS to see nearby quests"
                      : "No quests within 2km. Be the first to post!"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sortedGigs.map((gig) => (
                    <QuestCard
                      key={gig.id}
                      gig={gig}
                      userLat={userLat}
                      userLng={userLng}
                      currentUserId={user?.id ?? null}
                      onUpdate={fetchGigs}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        <footer className="border-t border-border mt-12 py-6">
          <div className="container max-w-7xl px-4 text-center text-xs text-muted-foreground font-heading uppercase tracking-widest">
            sideQuest · Built for Students, by Students
          </div>
        </footer>
      </main>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
