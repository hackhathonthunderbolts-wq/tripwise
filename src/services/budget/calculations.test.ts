import { describe, expect, it } from 'vitest'
import { budgetAdvice, calculateBudget } from '@/services/budget/calculations'
import type { BudgetSettings, Expense, ItineraryStop, Place } from '@/types'

const settings: BudgetSettings = { total: 2000, daily: 1000, currency: 'INR' }

function expense(partial: Partial<Expense> & { amount: number }): Expense {
  return {
    id: partial.id ?? `exp-${Math.random()}`,
    amount: partial.amount,
    category: partial.category ?? 'food',
    date: partial.date ?? '2026-01-01',
    note: partial.note,
    stopId: partial.stopId,
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
  }
}

const place: Place = {
  id: 'osm:node/1',
  name: 'Fort Museum',
  category: 'museum',
  source: 'openstreetmap',
  lat: 13.0,
  lon: 80.0,
}

function stop(partial: Partial<ItineraryStop>): ItineraryStop {
  return {
    id: partial.id ?? 'stop-1',
    place: partial.place ?? place,
    status: partial.status ?? 'planned',
    estimatedDurationMin: partial.estimatedDurationMin ?? 60,
    estimatedCost: partial.estimatedCost ?? 0,
    day: partial.day,
    note: partial.note,
    visitedAt: partial.visitedAt,
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
  }
}

describe('calculateBudget', () => {
  it('reports the remaining balance: 2000 budget, 1650 spent → 350 left', () => {
    const summary = calculateBudget(settings, [expense({ amount: 1650 })], [])
    expect(summary.spent).toBe(1650)
    expect(summary.plannedEstimate).toBe(0)
    expect(summary.committed).toBe(1650)
    expect(summary.remaining).toBe(350)
    expect(summary.percentUsed).toBeCloseTo(82.5, 5)
    expect(summary.status).toBe('warning')
  })

  it('counts planned estimates that have no recorded expense', () => {
    const summary = calculateBudget(settings, [], [stop({ estimatedCost: 300 })])
    expect(summary.spent).toBe(0)
    expect(summary.plannedEstimate).toBe(300)
    expect(summary.committed).toBe(300)
  })

  it('never double counts a stop whose cost is recorded as a linked expense', () => {
    const linkedStop = stop({ id: 'stop-x', estimatedCost: 500 })
    const summary = calculateBudget(
      settings,
      [expense({ amount: 450, stopId: 'stop-x' })],
      [linkedStop],
    )
    expect(summary.spent).toBe(450)
    expect(summary.plannedEstimate).toBe(0)
    expect(summary.coveredByExpenses).toBe(500)
    expect(summary.committed).toBe(450)
  })

  it('ignores skipped stops when estimating planned cost', () => {
    const summary = calculateBudget(settings, [], [
      stop({ id: 'a', estimatedCost: 200 }),
      stop({ id: 'b', estimatedCost: 900, status: 'skipped' }),
    ])
    expect(summary.plannedEstimate).toBe(200)
  })

  it('flags an over-budget status once committed exceeds the total', () => {
    const summary = calculateBudget(
      { total: 1000, daily: null, currency: 'INR' },
      [expense({ amount: 1200 })],
      [],
    )
    expect(summary.status).toBe('over')
    expect(summary.remaining).toBe(-200)
    expect(budgetAdvice(summary)).toMatch(/over budget/i)
  })

  it('breaks spending down by category with shares that sum to 100', () => {
    const summary = calculateBudget(settings, [
      expense({ amount: 100, category: 'food' }),
      expense({ amount: 300, category: 'transport' }),
    ], [])
    const shareSum = summary.byCategory.reduce((sum, row) => sum + row.share, 0)
    expect(shareSum).toBeCloseTo(100, 5)
    expect(summary.byCategory[0]?.category).toBe('transport')
    expect(summary.largestCategory?.amount).toBe(300)
  })

  it('marks days that go over the daily cap', () => {
    const summary = calculateBudget(settings, [
      expense({ amount: 600, date: '2026-01-01' }),
      expense({ amount: 500, date: '2026-01-01' }),
      expense({ amount: 300, date: '2026-01-02' }),
    ], [])
    const overDay = summary.daily.find((row) => row.overDailyBudget)
    expect(summary.daily).toHaveLength(2)
    expect(overDay?.date).toBe('2026-01-01')
    expect(overDay?.amount).toBe(1100)
    expect(summary.daily.find((row) => row.date === '2026-01-02')?.overDailyBudget).toBe(false)
  })

  it('stays safe when the total budget is not set', () => {
    const summary = calculateBudget(
      { total: 0, daily: null, currency: 'INR' },
      [expense({ amount: 999 })],
      [],
    )
    expect(summary.status).toBe('safe')
    expect(summary.percentUsed).toBe(0)
    expect(budgetAdvice(summary)).toBeNull()
  })
})
