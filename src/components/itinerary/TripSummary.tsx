import { cn } from '@/lib/utils'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDuration } from '@/lib/format'
import { useTrip } from '@/store/TripStore'
import { budgetAdvice } from '@/services/budget/calculations'

export function TripSummaryChip({ compact = true }: { compact?: boolean }) {
  const { progress, summary } = useTrip()

  if (progress.total === 0) {
    return compact ? (
      <Badge tone="outline">No stops yet</Badge>
    ) : (
      <p className="text-sm text-charcoal-500">Your itinerary is empty.</p>
    )
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-3', compact ? 'text-xs' : 'text-sm')}>
      <Badge tone="forest">
        {progress.total} {progress.total === 1 ? 'stop' : 'stops'} · {progress.visited} visited
      </Badge>
      <Badge tone="outline">
        Time: {formatDuration(progress.remainingMinutes)} remaining
      </Badge>
      <Badge tone={summary.status === 'over' ? 'clay' : summary.status === 'warning' ? 'gold' : 'outline'}>
        Budget: {formatCurrency(summary.committed)} committed of {formatCurrency(summary.total)}
      </Badge>
    </div>
  )
}

export function TripProgressPanel() {
  const { progress, summary } = useTrip()
  const advice = budgetAdvice(summary)

  if (progress.total === 0) return null

  return (
    <div className="tw-card p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="tw-label">Trip progress</p>
          <h3 className="mt-2 text-2xl">{progress.percentage}% of stops visited</h3>
        </div>
        <div className="text-right text-sm text-charcoal-500">
          <p>{progress.visited} of {progress.total} completed</p>
          <p>{formatDuration(progress.visitedMinutes)} visited · {formatDuration(progress.remainingMinutes)} left</p>
        </div>
      </div>
      <div className="mt-5">
        <ProgressBar
          value={progress.percentage}
          label="Stops visited"
          description={`${progress.planned} planned · ${progress.skipped} skipped`}
        />
      </div>
      <div className="mt-5 flex flex-wrap gap-4 text-sm text-charcoal-600">
        <span>Estimated spend (stops): {formatCurrency(progress.plannedCost)}</span>
        <span>Spent so far: {formatCurrency(summary.spent)}</span>
        <span>Committed: {formatCurrency(summary.committed)}</span>
      </div>
      {advice ? (
        <div className="mt-4 rounded-xl bg-clay-100 px-4 py-3 text-sm text-clay-600">{advice}</div>
      ) : null}
    </div>
  )
}
