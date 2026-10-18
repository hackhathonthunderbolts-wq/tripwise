import { CURRENCY_CODE } from '@/lib/categories'
import type { BudgetSettings, Expense, ExpenseCategory, ItineraryStop } from '@/types'

export type BudgetStatus = 'safe' | 'warning' | 'over'

export interface CategoryBreakdownRow {
  category: ExpenseCategory
  amount: number
  count: number
  share: number
}

export interface DailySpendRow {
  date: string
  amount: number
  overDailyBudget: boolean
}

export interface BudgetSummary {
  currency: string
  total: number
  /** Recorded expenses only. */
  spent: number
  /** Estimated costs of itinerary stops that have no matching recorded expense. */
  plannedEstimate: number
  /** Estimates that were already recorded as expenses (never added twice). */
  coveredByExpenses: number
  /** spent + plannedEstimate */
  committed: number
  remaining: number
  /** spent / total, 0-100 */
  percentUsed: number
  /** committed / total, 0-100 */
  percentCommitted: number
  status: BudgetStatus
  byCategory: CategoryBreakdownRow[]
  daily: DailySpendRow[]
  largestCategory: CategoryBreakdownRow | null
}

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  attraction: 'Attractions',
  accommodation: 'Stay',
  food: 'Food',
  transport: 'Transport',
  shopping: 'Shopping',
  misc: 'Miscellaneous',
}

function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0
}

export function calculateBudget(
  settings: BudgetSettings,
  expenses: Expense[],
  stops: ItineraryStop[],
): BudgetSummary {
  const currency = settings.currency || CURRENCY_CODE
  const total = Math.max(0, safeNumber(settings.total))

  const spent = expenses.reduce((sum, expense) => sum + Math.max(0, safeNumber(expense.amount)), 0)
  const recordedStopIds = new Set(
    expenses.map((expense) => expense.stopId).filter((id): id is string => Boolean(id)),
  )

  let plannedEstimate = 0
  let coveredByExpenses = 0
  for (const stop of stops) {
    if (stop.status === 'skipped') continue
    const cost = Math.max(0, safeNumber(stop.estimatedCost))
    if (recordedStopIds.has(stop.id)) coveredByExpenses += cost
    else plannedEstimate += cost
  }

  const committed = spent + plannedEstimate
  const remaining = total - committed
  const percentUsed = total > 0 ? (spent / total) * 100 : 0
  const percentCommitted = total > 0 ? (committed / total) * 100 : 0

  let status: BudgetStatus = 'safe'
  if (total > 0 && committed > total) status = 'over'
  else if (total > 0 && percentCommitted >= 80) status = 'warning'

  const categoryTotals = new Map<ExpenseCategory, { amount: number; count: number }>()
  for (const expense of expenses) {
    const bucket = categoryTotals.get(expense.category) ?? { amount: 0, count: 0 }
    bucket.amount += Math.max(0, safeNumber(expense.amount))
    bucket.count += 1
    categoryTotals.set(expense.category, bucket)
  }

  const byCategory: CategoryBreakdownRow[] = Array.from(categoryTotals.entries())
    .map(([category, bucket]) => ({
      category,
      amount: bucket.amount,
      count: bucket.count,
      share: spent > 0 ? (bucket.amount / spent) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  const dailyTotals = new Map<string, number>()
  for (const expense of expenses) {
    dailyTotals.set(expense.date, (dailyTotals.get(expense.date) ?? 0) + Math.max(0, safeNumber(expense.amount)))
  }

  const daily: DailySpendRow[] = Array.from(dailyTotals.entries())
    .map(([date, amount]) => ({
      date,
      amount,
      overDailyBudget: settings.daily !== null && settings.daily > 0 ? amount > settings.daily : false,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    currency,
    total,
    spent,
    plannedEstimate,
    coveredByExpenses,
    committed,
    remaining,
    percentUsed,
    percentCommitted,
    status,
    byCategory,
    daily,
    largestCategory: byCategory[0] ?? null,
  }
}

export function budgetAdvice(summary: BudgetSummary): string | null {
  if (summary.total <= 0) return null
  if (summary.status === 'over') {
    return `You are over budget by ${Math.abs(summary.remaining).toFixed(0)} ${summary.currency} once planned costs are included.`
  }
  if (summary.status === 'warning') {
    return `Careful — ${Math.round(summary.percentCommitted)}% of the budget is already committed.`
  }
  return null
}
