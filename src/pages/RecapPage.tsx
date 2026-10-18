import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/States'
import { CategoryDonut } from '@/components/budget/Charts'
import { MemoryCard } from '@/components/memories/MemoryCard'
import { useTrip } from '@/store/TripStore'
import { useMemories } from '@/store/MemoriesStore'
import { EXPENSE_LABELS } from '@/services/budget/calculations'
import { groupByDay } from '@/services/itinerary/calculations'
import { STOP_STATUS_META } from '@/lib/categories'
import { formatCurrency, formatDate, formatDuration } from '@/lib/format'
import type { StopStatus } from '@/types'

const STATUS_TONE: Record<StopStatus, BadgeTone> = {
  planned: 'neutral',
  visited: 'forest',
  skipped: 'clay',
}

export default function RecapPage() {
  const { stops, budget, summary, progress, meta } = useTrip()
  const { memories } = useMemories()

  const groups = useMemo(() => groupByDay(stops), [stops])
  const favouriteMemories = useMemo(
    () => [...memories].sort((a, b) => Number(b.favourite) - Number(a.favourite)).slice(0, 8),
    [memories],
  )

  const hasContent = stops.length > 0 || memories.length > 0

  return (
    <PageContainer size="wide">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 tw-no-print">
        <Link to="/memories" className="inline-flex items-center gap-1.5 text-sm text-forest-700 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to journal
        </Link>
        <Button onClick={() => window.print()} icon={<Printer className="h-4 w-4" />}>
          Print / Save as PDF
        </Button>
      </div>

      {!hasContent ? (
        <EmptyState
          title="Nothing to recap yet"
          description="Add stops to My Trip and save a few memories, then come back for a printable summary of your journey."
          action={
            <Link to="/">
              <Button>Explore places</Button>
            </Link>
          }
        />
      ) : (
        <div className="tw-print-area">
          <header className="border-b border-sage-200 pb-5">
            <p className="text-xs uppercase tracking-[0.2em] text-charcoal-400">TripWise recap</p>
            <h1 className="mt-1 text-3xl text-charcoal-900">{meta.name || 'My trip'}</h1>
            <p className="mt-1 text-sm text-charcoal-500">
              {meta.startDate ? formatDate(meta.startDate) : 'Dates not set'}
              {meta.endDate ? ` → ${formatDate(meta.endDate)}` : ''}
              {` · generated ${formatDate(new Date().toISOString().slice(0, 10))}`}
            </p>
          </header>

          <section className="mt-6 grid gap-4 sm:grid-cols-4">
            <SummaryStat label="Stops planned" value={String(progress.total)} />
            <SummaryStat label="Visited" value={`${progress.visited} (${progress.percentage}%)`} />
            <SummaryStat label="Time visited" value={formatDuration(progress.visitedMinutes)} />
            <SummaryStat label="Spent" value={formatCurrency(summary.spent)} />
          </section>

          {stops.length > 0 ? (
            <section className="mt-8">
              <h2 className="text-xl text-charcoal-900">Route</h2>
              <div className="mt-3 space-y-5">
                {groups.map((group, groupIndex) => (
                  <div key={group.day ?? `day-${groupIndex}`}>
                    <h3 className="text-sm font-semibold text-charcoal-600">
                      {group.day ? formatDate(group.day) : 'Unscheduled'}
                    </h3>
                    <ol className="mt-2 space-y-2">
                      {group.stops.map((stop, index) => {
                        const statusMeta = STOP_STATUS_META[stop.status]
                        return (
                          <li
                            key={stop.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sage-200 bg-ivory-50 px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="grid h-6 w-6 place-items-center rounded-full bg-forest-600 text-xs font-semibold text-ivory-50">
                                {index + 1}
                              </span>
                              <div>
                                <p className="font-medium text-charcoal-900">{stop.place.name}</p>
                                <p className="text-xs text-charcoal-500">
                                  {stop.place.city ? `${stop.place.city} · ` : ''}
                                  {formatDuration(stop.estimatedDurationMin)} · est.{' '}
                                  {formatCurrency(stop.estimatedCost)}
                                  {stop.visitedAt ? ` · visited ${formatDate(stop.visitedAt.slice(0, 10))}` : ''}
                                </p>
                              </div>
                            </div>
                            <Badge tone={STATUS_TONE[stop.status]}>{statusMeta.label}</Badge>
                          </li>
                        )
                      })}
                    </ol>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-xl text-charcoal-900">Budget</h2>
              {budget.total <= 0 && summary.spent <= 0 ? (
                <p className="mt-2 text-sm text-charcoal-500">No budget set.</p>
              ) : (
                <>
                  <dl className="mt-3 space-y-2 text-sm">
                    <RecapRow label="Total budget" value={formatCurrency(summary.total)} />
                    <RecapRow label="Recorded spend" value={formatCurrency(summary.spent)} />
                    <RecapRow label="Planned (estimates)" value={formatCurrency(summary.plannedEstimate)} />
                    <RecapRow label="Remaining" value={formatCurrency(summary.remaining)} />
                  </dl>
                  {summary.byCategory.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-sm text-charcoal-600">
                      {summary.byCategory.map((row) => (
                        <li key={row.category} className="flex justify-between">
                          <span>{EXPENSE_LABELS[row.category]}</span>
                          <span>{formatCurrency(row.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </div>
            <div>
              <h2 className="text-xl text-charcoal-900">Where it went</h2>
              <div className="mt-3">
                <CategoryDonut rows={summary.byCategory} total={summary.spent} />
              </div>
            </div>
          </section>

          {favouriteMemories.length > 0 ? (
            <section className="mt-8">
              <h2 className="text-xl text-charcoal-900">Memories</h2>
              <p className="mt-1 text-sm text-charcoal-500">
                {memories.length} saved in total{favouriteMemories.some((m) => m.favourite) ? ', favourites first' : ''}.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {favouriteMemories.map((memory) => (
                  <MemoryCard key={memory.id} memory={memory} compact />
                ))}
              </div>
            </section>
          ) : null}

          <footer className="mt-8 border-t border-sage-200 pt-4 text-xs text-charcoal-400">
            Generated by TripWise. Place data © OpenStreetMap contributors; summaries from Wikipedia;
            weather from Open-Meteo. All durations and costs are user-editable estimates, not official figures.
          </footer>
        </div>
      )}
    </PageContainer>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="tw-card p-4">
      <p className="text-xs text-charcoal-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-charcoal-900">{value}</p>
    </div>
  )
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-sage-100 pb-1">
      <dt className="text-charcoal-600">{label}</dt>
      <dd className="font-medium text-charcoal-800">{value}</dd>
    </div>
  )
}
