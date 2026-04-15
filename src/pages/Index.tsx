import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { watchUserLocation } from "@/lib/geo";
import { QuestCard } from "@/components/QuestCard";
import { PostQuestForm } from "@/components/PostQuestForm";
import { AuthModal } from "@/components/AuthModal";
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
}

export default function Index() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
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
      }
    );
    return () => stopWatching();
  }, [fetchGigs]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="container flex items-center justify-between h-14 px-4">
          <h1 className="font-heading text-lg font-bold text-gradient-primary">📍 sideQuest</h1>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[120px]">
                  {user.email}
                </span>
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
            Accept quests near PSIT Kanpur • Earn ₹ • Help fellow students
          </p>
          {userLat !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-quest-xp/20 px-3 py-1 text-xs font-heading text-quest-xp animate-pulse-glow">
              📡 Location Active
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

        {/* Quest Feed */}
        <section className="space-y-3">
          <h3 className="font-heading text-xs uppercase tracking-widest text-muted-foreground">
            Active Quests ({gigs.length})
          </h3>
          {loadingGigs ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading quests...</div>
          ) : gigs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No quests available. Be the first to post! 🗡️
            </div>
          ) : (
            gigs.map((gig) => (
              <QuestCard
                key={gig.id}
                title={gig.title}
                description={gig.description}
                reward={gig.reward_amount}
                lat={gig.latitude}
                lng={gig.longitude}
                userLat={userLat}
                userLng={userLng}
                status={gig.status}
                createdAt={gig.created_at}
              />
            ))
          )}
        </section>
      </main>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
