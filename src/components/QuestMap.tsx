import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "@/hooks/useAuth";

const DEV_EMAIL = "gauravgupta926099@gmail.com";

interface Gig {
  id: string;
  title: string;
  reward_amount: number;
  latitude: number;
  longitude: number;
  status: string;
}

interface QuestMapProps {
  userLat: number | null;
  userLng: number | null;
  gigs: Gig[];
}

// Deterministic small offset (~within ~300m) so the blurred marker stays put across renders
function jitter(seed: number, range = 0.003) {
  const x = Math.sin(seed * 9999) * 10000;
  return (x - Math.floor(x) - 0.5) * 2 * range;
}

export function QuestMap({ userLat, userLng, gigs }: QuestMapProps) {
  const { user } = useAuth();
  const isDev = user?.email === DEV_EMAIL;
  const [blurred, setBlurred] = useState(false);

  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const center: [number, number] = userLat && userLng ? [userLat, userLng] : [26.4499, 80.3319];
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false }).setView(center, 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    if (userLat !== null && userLng !== null) {
      const showBlurred = isDev && blurred;
      const displayLat = showBlurred ? userLat + jitter(userLat) : userLat;
      const displayLng = showBlurred ? userLng + jitter(userLng + 1) : userLng;

      if (showBlurred) {
        // Fuzzy approximate area instead of exact pin
        L.circle([displayLat, displayLng], {
          radius: 400,
          color: "hsl(263 90% 60%)",
          fillColor: "hsl(263 90% 60%)",
          fillOpacity: 0.25,
          weight: 2,
          dashArray: "6 6",
        })
          .addTo(layer)
          .bindPopup("🕶️ Approximate location (blurred)");
      } else {
        const userIcon = L.divIcon({
          className: "",
          html: `<div style="width:18px;height:18px;border-radius:50%;background:hsl(263 90% 60%);box-shadow:0 0 0 6px hsla(263 90% 60% / 0.25);border:2px solid white;"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        L.marker([userLat, userLng], { icon: userIcon }).addTo(layer).bindPopup("📍 You are here");
      }

      // 2km radius circle (always centered on real location for accurate gig matching visualization)
      L.circle([userLat, userLng], {
        radius: 2000,
        color: "hsl(263 90% 60%)",
        fillColor: "hsl(263 90% 60%)",
        fillOpacity: 0.05,
        weight: 1,
      }).addTo(layer);
      map.setView([displayLat, displayLng], 14);
    }

    gigs.forEach((g) => {
      const color = g.status === "open" ? "#22c55e" : g.status === "completed" ? "#6b7280" : "#f59e0b";
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${color};color:white;font-size:11px;font-weight:bold;padding:4px 8px;border-radius:12px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;">⚔️ ₹${g.reward_amount}</div>`,
        iconSize: [60, 24],
        iconAnchor: [30, 12],
      });
      L.marker([g.latitude, g.longitude], { icon })
        .addTo(layer)
        .bindPopup(`<b>${g.title}</b><br/>₹${g.reward_amount} • ${g.status}`);
    });
  }, [userLat, userLng, gigs, isDev, blurred]);

  return (
    <div className="relative w-full h-full min-h-[16rem]">
      <div
        ref={containerRef}
        className="w-full h-full min-h-[16rem] rounded-lg border border-primary/30 overflow-hidden glow-primary"
        style={{ zIndex: 0 }}
      />
      {isDev && (
        <button
          type="button"
          onClick={() => setBlurred((b) => !b)}
          className="absolute top-2 right-2 z-[1000] rounded-md border border-primary/40 bg-background/90 backdrop-blur px-2.5 py-1.5 text-[10px] font-heading uppercase tracking-widest text-foreground hover:bg-primary/15 transition-colors shadow-md"
          title="Dev only: toggle location blur"
        >
          {blurred ? "🕶️ Blurred" : "📍 Precise"}
          <span className="ml-1 text-[8px] text-muted-foreground">(dev)</span>
        </button>
      )}
    </div>
  );
}
