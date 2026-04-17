import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

export function QuestMap({ userLat, userLng, gigs }: QuestMapProps) {
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
      const userIcon = L.divIcon({
        className: "",
        html: `<div style="width:18px;height:18px;border-radius:50%;background:hsl(263 90% 60%);box-shadow:0 0 0 6px hsla(263 90% 60% / 0.25);border:2px solid white;"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker([userLat, userLng], { icon: userIcon }).addTo(layer).bindPopup("📍 You are here");
      // 2km radius circle
      L.circle([userLat, userLng], {
        radius: 2000,
        color: "hsl(263 90% 60%)",
        fillColor: "hsl(263 90% 60%)",
        fillOpacity: 0.05,
        weight: 1,
      }).addTo(layer);
      map.setView([userLat, userLng], 14);
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
  }, [userLat, userLng, gigs]);

  return (
    <div
      ref={containerRef}
      className="w-full h-64 rounded-lg border border-primary/30 overflow-hidden glow-primary"
      style={{ zIndex: 0 }}
    />
  );
}
