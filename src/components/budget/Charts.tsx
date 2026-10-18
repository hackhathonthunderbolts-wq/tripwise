import { EXPENSE_LABELS, type CategoryBreakdownRow, type DailySpendRow } from '@/services/budget/calculations'
import { formatCurrency, formatDate } from '@/lib/format'
import type { ExpenseCategory } from '@/types'
import { cn } from '@/lib/utils'

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  attraction: '#1e4d3b',
  accommodation: '#2f6b51',
  food: '#4f8a6f',
  transport: '#7fb098',
  shopping: '#c9a227',
  misc: '#b4552d',
}

/**
 * Hand-rolled SVG donut: no chart dependency, fully static markup so the
 * numbers stay readable for screen readers via the accompanying table.
 */
export function CategoryDonut({ rows, total }: { rows: CategoryBreakdownRow[]; total: number }) {
  const radius = 56
  const circumference = 2 * Math.PI * radius
  let offset = 0

  if (rows.length === 0 || total <= 0) {
    return (
      <p className="rounded-xl border border-dashed border-sage-300 px-4 py-8 text-center text-sm text-charcoal-500">
        No expenses recorded yet — add one to see the breakdown.
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <svg viewBox="0 0 140 140" className="h-40 w-40 shrink-0" role="img" aria-label="Expenses by category">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#e8efe9" strokeWidth="18" />
        {rows.map((row) => {
          const length = (row.share / 100) * circumference
          const dash = `${length} ${circumference - length}`
          const element = (
            <circle
              key={row.category}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={CATEGORY_COLORS[row.category]}
              strokeWidth="18"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            />
          )
          offset += length
          return element
        })}
        <text x="70" y="66" textAnchor="middle" className="fill-charcoal-500 text-[9px]">
          Recorded
        </text>
        <text x="70" y="80" textAnchor="middle" className="fill-charcoal-800 text-[11px] font-semibold">
          {formatCurrency(total)}
        </text>
      </svg>

      <table className="w-full text-sm">
        <caption className="sr-only">Expenses by category</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.category} className="border-b border-sage-100 last:border-0">
              <th scope="row" className="py-1.5 text-left font-medium text-charcoal-700">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: CATEGORY_COLORS[row.category] }}
                    aria-hidden
                  />
                  {EXPENSE_LABELS[row.category]}
                </span>
              </th>
              <td className="py-1.5 text-right text-charcoal-600">{row.count}×</td>
              <td className="py-1.5 text-right font-medium text-charcoal-800">
                {formatCurrency(row.amount)}
              </td>
              <td className="py-1.5 pl-3 text-right text-xs text-charcoal-500">
                {Math.round(row.share)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DailySpendChart({
  rows,
  dailyBudget,
}: {
  rows: DailySpendRow[]
  dailyBudget: number | null
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-sage-300 px-4 py-8 text-center text-sm text-charcoal-500">
        No daily spending recorded yet.
      </p>
    )
  }

  const max = Math.max(...rows.map((row) => row.amount), dailyBudget ?? 0, 1)

  return (
    <div>
      <div className="flex h-40 items-end gap-2 overflow-x-auto tw-scroll-thin">
        {rows.map((row) => {
          const height = Math.max(4, Math.round((row.amount / max) * 100))
          return (
            <div key={row.date} className="flex min-w-12 flex-1 flex-col items-center gap-1">
              <span className="text-[0.65rem] text-charcoal-500">{formatCurrency(row.amount)}</span>
              <div className="flex h-28 w-full items-end">
                <div
                  className={cn(
                    'w-full rounded-t-md transition-all',
                    row.overDailyBudget ? 'bg-clay-500' : 'bg-forest-400',
                  )}
                  style={{ height: `${height}%` }}
                  title={`${formatDate(row.date)}: ${formatCurrency(row.amount)}`}
                />
              </div>
              <span className="whitespace-nowrap text-[0.65rem] text-charcoal-500">
                {formatDate(row.date).replace(/,.*/, '')}
              </span>
            </div>
          )
        })}
      </div>
      {dailyBudget !== null && dailyBudget > 0 ? (
        <p className="mt-3 text-xs text-charcoal-500">
          Daily budget {formatCurrency(dailyBudget)} · bars turn red when a day goes over.
        </p>
      ) : (
        <p className="mt-3 text-xs text-charcoal-500">
          Set a daily budget above to flag days that go over.
        </p>
      )}
    </div>
  )
}
