import { approximateLeg, haversineKm } from '@/lib/geo'
import type { Coordinates, Place, PlannedStop, TravelLeg, TripPlan } from '@/types'

export interface PlannerCandidate {
  place: Place
  /** Visit duration estimate, in minutes (editable by the user). */
  visitMinutes: number
}

/** Travel times between every pair of points; index 0 is the start point. */
export interface PlannerMatrix {
  minutes: number[][]
  meters: number[][]
  source: 'osrm' | 'approx'
}

export interface PlanOptions {
  start: { name: string; lat: number; lon: number }
  mode: 'walking' | 'driving'
  availableMinutes: number
  /** Clock time the plan begins, e.g. "09:30". */
  startTime?: string
}

/**
 * Builds the ordered itinerary for an explicit sequence of candidate indexes.
 * Travel legs always come from the supplied matrix (OSRM routing result or a
 * clearly-labelled straight-line approximation) — never invented.
 */
export function assemblePlan(
  orderedIndexes: number[],
  candidates: PlannerCandidate[],
  matrix: PlannerMatrix,
  options: PlanOptions,
): TripPlan {
  const { start, mode, availableMinutes } = options
  const startTime = options.startTime ?? '09:00'
  const stops: PlannedStop[] = []
  const source = matrix.source

  let currentIndex = 0 // 0 === start
  let elapsed = 0

  for (const candidateIndex of orderedIndexes) {
    const candidate = candidates[candidateIndex]
    if (!candidate) continue
    const matrixIndex = candidateIndex + 1
    const travelMinutes = matrix.minutes[currentIndex]?.[matrixIndex] ?? 0
    const travelMeters = matrix.meters[currentIndex]?.[matrixIndex] ?? 0
    const arrival = elapsed + travelMinutes
    const departure = arrival + candidate.visitMinutes

    const leg: TravelLeg = {
      minutes: travelMinutes,
      distanceMeters: travelMeters,
      source: source,
    }

    stops.push({
      place: candidate.place,
      visitMinutes: candidate.visitMinutes,
      travel: leg,
      arrivalMinutes: arrival,
      departureMinutes: departure,
    })

    elapsed = departure
    currentIndex = matrixIndex
  }

  const last = stops[stops.length - 1]
  const totalMinutes = last ? last.departureMinutes : 0

  return {
    start: { name: start.name, lat: start.lat, lon: start.lon },
    mode,
    availableMinutes,
    startTime,
    stops,
    totalMinutes,
    visitedMinutes: stops.reduce((sum, stop) => sum + stop.visitMinutes, 0),
    travelMinutes: stops.reduce((sum, stop) => sum + stop.travel.minutes, 0),
    overflow: totalMinutes > availableMinutes,
  }
}

/**
 * Greedy, time-boxed itinerary builder.
 *
 * From the current position it repeatedly takes the reachable stop with the
 * shortest travel time that still fits inside the remaining budget, until no
 * candidate fits. Straightforward and fast — no AI required.
 */
export function buildPlan(
  candidates: PlannerCandidate[],
  matrix: PlannerMatrix,
  options: PlanOptions,
): number[] {
  const { availableMinutes } = options
  const selected: number[] = []
  const used = new Set<number>()

  let currentIndex = 0
  let elapsed = 0

  while (selected.length < candidates.length) {
    let bestIndex = -1
    let bestTravel = Number.POSITIVE_INFINITY

    for (let index = 0; index < candidates.length; index += 1) {
      if (used.has(index)) continue
      const travel = matrix.minutes[currentIndex]?.[index + 1] ?? 0
      const candidate = candidates[index]
      if (!candidate) continue
      const departure = elapsed + travel + candidate.visitMinutes
      if (departure > availableMinutes) continue
      if (travel < bestTravel) {
        bestTravel = travel
        bestIndex = index
      }
    }

    if (bestIndex === -1) break
    const candidate = candidates[bestIndex]
    if (!candidate) break

    elapsed += (matrix.minutes[currentIndex]?.[bestIndex + 1] ?? 0) + candidate.visitMinutes
    selected.push(bestIndex)
    used.add(bestIndex)
    currentIndex = bestIndex + 1
  }

  return selected
}

/** Fallback matrix built from straight-line distances — always labelled `approx`. */
export function approximateMatrix(points: Coordinates[], mode: 'walking' | 'driving'): PlannerMatrix {
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
  return { minutes, meters, source: 'approx' }
}

export function reachableWithin(
  center: Coordinates,
  places: Place[],
  maxKm: number,
): Place[] {
  return places.filter((place) => haversineKm(center, place) <= maxKm)
}
