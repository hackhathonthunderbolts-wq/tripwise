import { describe, expect, it } from 'vitest'
import {
  assemblePlan,
  buildPlan,
  approximateMatrix,
  reachableWithin,
  type PlannerCandidate,
  type PlannerMatrix,
} from '@/services/planner/planner'
import type { Place } from '@/types'

function place(id: string, lat: number, lon: number): Place {
  return { id, name: id, category: 'attraction', source: 'openstreetmap', lat, lon }
}

// points: 0 = start, 1 = A, 2 = B, 3 = C
const points = [
  { lat: 13.0, lon: 80.0 },
  { lat: 13.01, lon: 80.01 },
  { lat: 13.02, lon: 80.02 },
  { lat: 13.03, lon: 80.03 },
]

const matrix: PlannerMatrix = {
  minutes: [
    [0, 10, 25, 40],
    [10, 0, 10, 20],
    [25, 10, 0, 15],
    [40, 20, 15, 0],
  ],
  meters: [
    [0, 1000, 2500, 4000],
    [1000, 0, 1000, 2000],
    [2500, 1000, 0, 1500],
    [4000, 2000, 1500, 0],
  ],
  source: 'osrm',
}

const candidates: PlannerCandidate[] = [
  { place: place('A', 13.01, 80.01), visitMinutes: 20 },
  { place: place('B', 13.02, 80.02), visitMinutes: 20 },
  { place: place('C', 13.03, 80.03), visitMinutes: 20 },
]

const start = { name: 'Start', lat: 13.0, lon: 80.0 }

describe('buildPlan', () => {
  it('fits as many stops as the time budget allows, nearest first', () => {
    const selected = buildPlan(candidates, matrix, { start, mode: 'walking', availableMinutes: 100 })
    expect(selected).toEqual([0, 1, 2])
  })

  it('drops the stop that would overflow the budget', () => {
    const selected = buildPlan(candidates, matrix, { start, mode: 'walking', availableMinutes: 80 })
    expect(selected).toEqual([0, 1])
  })

  it('returns an empty plan when nothing fits', () => {
    const selected = buildPlan(candidates, matrix, { start, mode: 'walking', availableMinutes: 5 })
    expect(selected).toEqual([])
  })

  it('never selects the same stop twice', () => {
    const selected = buildPlan(candidates, matrix, { start, mode: 'walking', availableMinutes: 500 })
    expect(new Set(selected).size).toBe(selected.length)
  })
})

describe('assemblePlan', () => {
  it('computes arrival and departure times from the real travel matrix', () => {
    const plan = assemblePlan([0, 1, 2], candidates, matrix, {
      start,
      mode: 'walking',
      availableMinutes: 100,
      startTime: '09:00',
    })

    expect(plan.stops).toHaveLength(3)
    expect(plan.stops[0]?.arrivalMinutes).toBe(10)
    expect(plan.stops[0]?.departureMinutes).toBe(30)
    expect(plan.stops[1]?.arrivalMinutes).toBe(40)
    expect(plan.stops[2]?.arrivalMinutes).toBe(75)
    expect(plan.totalMinutes).toBe(95)
    expect(plan.travelMinutes).toBe(35)
    expect(plan.visitedMinutes).toBe(60)
    expect(plan.overflow).toBe(false)
    expect(plan.stops[0]?.travel.source).toBe('osrm')
  })

  it('flags overflow when the sequence exceeds the available time', () => {
    const plan = assemblePlan([0, 1, 2], candidates, matrix, {
      start,
      mode: 'walking',
      availableMinutes: 50,
    })
    expect(plan.totalMinutes).toBeGreaterThan(50)
    expect(plan.overflow).toBe(true)
  })

  it('honours a custom order and re-derives each leg', () => {
    const plan = assemblePlan([2, 0], candidates, matrix, {
      start,
      mode: 'walking',
      availableMinutes: 200,
    })
    // start -> C is 40, then C -> A is 20
    expect(plan.stops[0]?.place.id).toBe('C')
    expect(plan.stops[0]?.travel.minutes).toBe(40)
    expect(plan.stops[1]?.place.id).toBe('A')
    expect(plan.stops[1]?.travel.minutes).toBe(20)
  })
})

describe('approximateMatrix', () => {
  it('produces a symmetric, zero-diagonal matrix labelled approx', () => {
    const approx = approximateMatrix(points, 'walking')
    expect(approx.source).toBe('approx')
    expect(approx.minutes[0]?.[0]).toBe(0)
    expect(approx.minutes[1]?.[2]).toBe(approx.minutes[2]?.[1])
    expect(approx.minutes[0]?.[1]).toBeGreaterThan(0)
  })
})

describe('reachableWithin', () => {
  it('keeps only places inside the radius', () => {
    const near = reachableWithin(points[0]!, candidates.map((c) => c.place), 2.5)
    expect(near.map((p) => p.id)).toContain('A')
    expect(near.map((p) => p.id)).not.toContain('C')
  })
})
