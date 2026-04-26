export const TOWN_COORDS = {
  Banff: { latitude: 51.1784, longitude: -115.5708 },
  Canmore: { latitude: 51.0892, longitude: -115.3593 },
  "Lake Louise": { latitude: 51.4254, longitude: -116.1773 },
};

export function getEventBaseCoords(event) {
  const hasExactCoords =
    Number.isFinite(event?.latitude) && Number.isFinite(event?.longitude);

  if (hasExactCoords) {
    return {
      latitude: Number(event.latitude),
      longitude: Number(event.longitude),
    };
  }

  const town = event?.town || "";
  return TOWN_COORDS[town] || null;
}

export function calculateDistanceKm(origin, target) {
  if (!origin || !target) return null;

  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const latDelta = toRadians(target.latitude - origin.latitude);
  const lngDelta = toRadians(target.longitude - origin.longitude);
  const originLat = toRadians(origin.latitude);
  const targetLat = toRadians(target.latitude);

  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(originLat) *
      Math.cos(targetLat) *
      Math.sin(lngDelta / 2) ** 2;

  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusKm * arc;
}

export function getEventDistanceKm(event, origin) {
  const coords = getEventBaseCoords(event);
  if (!coords || !origin) return null;
  return calculateDistanceKm(origin, coords);
}
