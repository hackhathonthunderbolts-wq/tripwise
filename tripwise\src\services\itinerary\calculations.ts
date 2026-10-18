import type { ItineraryStop, StopStatus } from '@/types'

export interface TripProgress {
  total: number
  visited: number
  planned: number
  skipped: number
  /** Visited / total, 0-100. */
  percentage: number
  visitedMinutes: number
  remainingMinutes: number
  plannedCost: number
}

export function calculateProgress(stops: ItineraryStop[]): TripProgress {
  const total = stops.length
  let visited = 0
  let planned = 0
  let skipped = 0
  let visitedMinutes = 0
  let remainingMinutes = 0
  let plannedCost = 0

  for (const stop of stops) {
    const duration = Number.isFinite(stop.estimatedDurationMin) ? stop.estimatedDurationMin : 0
    const cost = Number.isFinite(stop.estimatedCost) ? stop.estimatedCost : 0
    if (stop.status === 'visited') {
      visited += 1
      visitedMinutes += duration
    } else if (stop.status === 'skipped') {
      skipped += 1
    } else {
      planned += 1
      remainingMinutes += duration
    }
    if (stop.status !== 'skipped') plannedCost += cost
  }

  return {
    total,
    visited,
    planned,
    skipped,
    percentage: total === 0 ? 0 : Math.round((visited / total) * 100),
    visitedMinutes,
    remainingMinutes,
    plannedCost,
  }
}

export function hasPlace(stops: ItineraryStop[], placeId: string): boolean {
  return stops.some((stop) => stop.place.id === placeId)
}

export function findStopByPlaceId(stops: ItineraryStop[], placeId: string): ItineraryStop | undefined {
  return stops.find((stop) => stop.place.id === placeId)
}

/** Immutably moves an item from one index to another. */
export function reorder<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = [...list]
  const [moved] = next.splice(from, 1)
  if (moved === undefined) return list
  next.splice(to, 0, moved)
  return next
}

export function moveBy<T>(list: T[], index: number, direction: -1 | 1): T[] {
  return reorder(list, index, index + direction)
}

export interface StatusCounts {
  planned: number
  visited: number
  skipped: number
}

export function countByStatus(stops: ItineraryStop[]): StatusCounts {
  const counts: StatusCounts = { planned: 0, visited: 0, skipped: 0 }
  for (const stop of stops) counts[stop.status as StopStatus] += 1
  return counts
}

/** Groups stops by their optional planned day, preserving itinerary order. */
export function groupByDay(stops: ItineraryStop[]): { day: string | null; stops: ItineraryStop[] }[] {
  const groups = new Map<string | null, ItineraryStop[]>()
  for (const stop of stops) {
    const key = stop.day && /^\d{4}-\d{2}-\d{2}$/.test(stop.day) ? stop.day : null
    const bucket = groups.get(key)
    if (bucket) bucket.push(stop)
    else groups.set(key, [stop])
  }
  return Array.from(groups.entries()).map(([day, items]) => ({ day, stops: items }))
}
