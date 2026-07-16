const MAX_RANGE_KM = 2;

export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinRange(userLat: number, userLng: number, gigLat: number, gigLng: number): boolean {
  return getDistanceKm(userLat, userLng, gigLat, gigLng) <= MAX_RANGE_KM;
}

export function watchUserLocation(
  onUpdate: (pos: { lat: number; lng: number }) => void,
  onError?: (err: GeolocationPositionError) => void
): () => void {
  if (!navigator.geolocation) {
    onError?.({ code: 2, message: "Geolocation not supported" } as GeolocationPositionError);
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    (err) => onError?.(err),
    { enableHighAccuracy: true }
  );
  return () => navigator.geolocation.clearWatch(id);
}

export { MAX_RANGE_KM };
