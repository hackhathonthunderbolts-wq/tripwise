import { fetchJson } from '@/services/api/client'
import { approximateLeg, haversineKm } from '@/lib/geo'
import type { Coordinates, TravelLeg, TravelMode } from '@/types'

/**
 * OSRM public demo server (OpenStreetMap routing engine).
 *
 * The public demo instance is configured with the car profile, so it is used
 * for driving durations directly. For walking we reuse the *real routed
 * distance* and derive walking time at a documented walking speed, which is
 * labelled as an estimate in the UI. If the routing service cannot be reached
 * the caller receives a clearly-labelled straight-line approximation.
 */
const DEFAULT_OSRM = 'https://router.project-osrm.org'
const configuredOsrm = (import.meta.env?.VITE_OSRM_ENDPOINT as string | undefined)?.trim()

const OSRM_BASE = configuredOsrm || DEFAULT_OSRM
const WALKING_SPEED_MPS = 1.35 // ~4.85 km/h

interface OsrmTableResponse {
  code: string
  durations?: (number | null)[][]
  distances?: (number | null)[][]
}

export interface TravelMatrix {
  /** Minutes between every pair of points. */
  minutes: number[][]
  /** Metres between every pair of points. */
  meters: number[][]
  mode: TravelMode
  source: 'osrm' | 'approx'
}

function approxMatrix(points: Coordinates[], mode: TravelMode): TravelMatrix {
  const minutes: number[][] = []
  const meters: number[][] = []
  for (let i = 0; i < points.length; i += 1) {
    minutes[i] = []
    meters[i] = []
    for (let j = 0; j < points.length; j += 1) {
      if (i === j) {
        minutes[i][j] = 0
        meters[i][j] = 0
        continue
      }
      const leg = approximateLeg(points[i], points[j], mode)
      minutes[i][j] = leg.minutes
      meters[i][j] = leg.distanceMeters
    }
  }
  return { minutes, meters, mode, source: 'approx' }
}

/**
 * One table request returns the full duration + distance matrix, which keeps
 * the planner to a single network call.
 */
export async function getTravelMatrix(
  points: Coordinates[],
  mode: TravelMode,
  signal?: AbortSignal,
): Promise<TravelMatrix> {
  if (points.length < 2) {
    return { minutes: [[0]], meters: [[0]], mode, source: 'osrm' }
  }

  const coords = points.map((p) => `${p.lon.toFixed(6)},${p.lat.toFixed(6)}`).join(';')
  const url = `${OSRM_BASE}/table/v1/driving/${coords}?annotations=duration,distance`

  try {
    const data = await fetchJson<OsrmTableResponse>(url, { timeoutMs: 14000, signal })
    if (data.code !== 'Ok' || !data.durations || !data.distances) {
      return approxMatrix(points, mode)
    }

    const minutes: number[][] = []
    const meters: number[][] = []
    for (let i = 0; i < points.length; i += 1) {
      minutes[i] = []
      meters[i] = []
      for (let j = 0; j < points.length; j += 1) {
        const distance = data.distances[i]?.[j] ?? 0
        const duration = data.durations[i]?.[j] ?? 0
        meters[i][j] = Math.round(distance)
        minutes[i][j] =
          mode === 'driving'
            ? Math.max(i === j ? 0 : 1, Math.round(duration / 60))
            : Math.max(i === j ? 0 : 1, Math.round(distance / WALKING_SPEED_MPS / 60))
      }
    }
    return { minutes, meters, mode, source: 'osrm' }
  } catch {
    return approxMatrix(points, mode)
  }
}

/** Single-leg travel time, used where only two points are involved. */
export async function getTravelLeg(
  from: Coordinates,
  to: Coordinates,
  mode: TravelMode,
): Promise<TravelLeg> {
  const matrix = await getTravelMatrix([from, to], mode)
  return {
    minutes: matrix.minutes[0]?.[1] ?? approximateLeg(from, to, mode).minutes,
    distanceMeters: matrix.meters[0]?.[1] ?? approximateLeg(from, to, mode).distanceMeters,
    source: matrix.source,
  }
}

/** Straight-line helper kept public for tests and offline badges. */
export function straightLineKm(from: Coordinates, to: Coordinates): number {
  return haversineKm(from, to)
}

export const OSRM_ATTRIBUTION = {
  label: 'Routing by OSRM (OpenStreetMap data)',
  href: 'https://project-osrm.org/',
}
