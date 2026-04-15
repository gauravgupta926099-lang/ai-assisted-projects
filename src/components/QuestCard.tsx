import { getDistanceKm } from "@/lib/geo";

interface QuestCardProps {
  title: string;
  description: string | null;
  reward: number;
  lat: number;
  lng: number;
  userLat: number | null;
  userLng: number | null;
  status: string;
  createdAt: string;
}

export function QuestCard({ title, description, reward, lat, lng, userLat, userLng, status, createdAt }: QuestCardProps) {
  const distance = userLat && userLng ? getDistanceKm(userLat, userLng, lat, lng) : null;
  const inRange = distance !== null && distance <= 2;

  return (
    <div className={`relative rounded-lg border p-4 transition-all duration-300 ${
      inRange
        ? "border-primary/50 bg-card glow-primary hover:border-primary"
        : "border-border bg-card/50 opacity-60"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">⚔️</span>
            <h3 className="font-heading text-sm font-semibold text-foreground truncate">{title}</h3>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{description}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-heading text-accent">
              💰 ₹{reward}
            </span>
            {distance !== null && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-heading ${
                inRange ? "bg-quest-xp/20 text-quest-xp" : "bg-destructive/20 text-destructive"
              }`}>
                📍 {distance.toFixed(1)}km
              </span>
            )}
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-heading ${
              status === "open" ? "bg-quest-xp/20 text-quest-xp" : "bg-muted text-muted-foreground"
            }`}>
              {status === "open" ? "🟢 Open" : "🔴 Closed"}
            </span>
          </div>
        </div>
      </div>
      {!inRange && distance !== null && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[1px]">
          <span className="font-heading text-xs text-muted-foreground">🔒 Out of Range</span>
        </div>
      )}
    </div>
  );
}
