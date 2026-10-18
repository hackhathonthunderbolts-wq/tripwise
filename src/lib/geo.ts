import type { Coordinates } from '@/types'

const EARTH_RADIUS_KM = 6371

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function isValidLatLon(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  )
}

/**
 * Straight-line fallback used only when the routing service is unavailable.
 * Distance is adjusted by an average road factor and clearly labelled as an
 * approximation in the UI.
 */
export function approximateLeg(
  from: Coordinates,
  to: Coordinates,
  mode: 'walking' | 'driving',
): { minutes: number; distanceMeters: number } {
  const roadFactor = mode === 'walking' ? 1.25 : 1.35
  const speedKmh = mode === 'walking' ? 4.8 : 26
  const km = haversineKm(from, to) * roadFactor
  return {
    distanceMeters: Math.round(km * 1000),
    minutes: Math.max(1, Math.round((km / speedKmh) * 60)),
  }
}

export function boundsFor(coords: Coordinates[], paddingKm = 0.5): [[number, number], [number, number]] {
  const lats = coords.map((c) => c.lat)
  const lons = coords.map((c) => c.lon)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)
  const latPad = paddingKm / 111
  const lonPad = paddingKm / (111 * Math.max(0.2, Math.cos(toRad((minLat + maxLat) / 2))))
  return [
    [minLat - latPad, minLon - lonPad],
    [maxLat + latPad, maxLon + lonPad],
  ]
}

export function osmLink(lat: number, lon: number, zoom = 16): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`
}
