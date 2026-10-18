import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  BookHeart,
  CalendarHeart,
  Images,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  Plus,
  Printer,
  Search,
  Star,
} from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Field'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { EmptyState } from '@/components/ui/States'
import { LeafletMap } from '@/components/map/LeafletMap'
import { MemoryCard } from '@/components/memories/MemoryCard'
import { MemoryFormModal } from '@/components/memories/MemoryFormModal'
import { useMemories } from '@/store/MemoriesStore'
import { formatDate, pluralize } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Memory } from '@/types'

type ViewMode = 'gallery' | 'timeline'

function isOnThisDay(memory: Memory): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(memory.visitDate)) return false
  const today = new Date()
  const [, month, day] = memory.visitDate.split('-')
  return Number(month) === today.getMonth() + 1 && Number(day) === today.getDate()
}

export default function MemoriesPage() {
  const { memories, toggleFavourite, memoryCount, photoCount } = useMemories()
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [favouritesOnly, setFavouritesOnly] = useState(false)
  const [view, setView] = useState<ViewMode>('gallery')
  const [showMap, setShowMap] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const memory of memories) {
      for (const tag of memory.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag]) => tag)
  }, [memories])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return memories
      .filter((memory) => (favouritesOnly ? memory.favourite : true))
      .filter((memory) => (activeTag ? memory.tags.includes(activeTag) : true))
      .filter((memory) => {
        if (!needle) return true
        return (
          memory.placeName.toLowerCase().includes(needle) ||
          memory.caption.toLowerCase().includes(needle) ||
          memory.note.toLowerCase().includes(needle) ||
          memory.tags.some((tag) => tag.includes(needle))
        )
      })
      .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
  }, [memories, query, activeTag, favouritesOnly])

  const onThisDay = useMemo(() => filtered.filter(isOnThisDay), [filtered])
  const pinned = useMemo(
    () => memories.filter((memory) => memory.lat !== undefined && memory.lon !== undefined),
    [memories],
  )

  const grouped = useMemo(() => {
    const map = new Map<string, Memory[]>()
    for (const memory of filtered) {
      const year = memory.visitDate.slice(0, 4) || 'Undated'
      const bucket = map.get(year) ?? []
      bucket.push(memory)
      map.set(year, bucket)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  return (
    <PageContainer size="wide">
      <PageHeader
        eyebrow="Memory journal"
        title="Your trips, remembered"
        description="Photos, captions and stories stored privately in this browser — in localStorage for text and IndexedDB for images. Nothing is uploaded to a server."
        actions={
          <>
            <Link
              to="/memories/recap"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-sage-200 bg-white px-4 text-sm font-medium text-charcoal-800"
            >
              <Printer className="h-4 w-4" />
              Trip recap
            </Link>
            <Button onClick={() => setFormOpen(true)} icon={<Plus className="h-4 w-4" />}>
              New memory
            </Button>
          </>
        }
      />

      {memoryCount > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard icon={<BookHeart className="h-5 w-5" />} label="Memories" value={memoryCount} />
          <StatCard icon={<Images className="h-5 w-5" />} label="Photos" value={photoCount} />
          <StatCard
            icon={<MapPin className="h-5 w-5" />}
            label="Pinned places"
            value={pinned.length}
          />
        </div>
      ) : null}

      {memoryCount === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<BookHeart className="h-6 w-6" />}
            title="Your journal is empty"
            description="Save a photo, a caption and the story behind it. You can link memories to itinerary stops so they appear beside the place in My Trip."
            action={
              <Button onClick={() => setFormOpen(true)} icon={<Plus className="h-4 w-4" />}>
                Create your first memory
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {onThisDay.length > 0 ? (
            <Card className="mt-6 border-gold-400/50 bg-ivory-100">
              <div className="flex items-center gap-2 text-forest-700">
                <CalendarHeart className="h-5 w-5" />
                <h2 className="text-lg">On this day</h2>
              </div>
              <p className="mt-1 text-sm text-charcoal-600">
                {onThisDay.length === 1
                  ? 'A memory from a past trip shares today’s date.'
                  : `${onThisDay.length} memories share today’s date from past trips.`}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {onThisDay.map((memory) => (
                  <MemoryCard key={memory.id} memory={memory} onToggleFavourite={toggleFavourite} compact />
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="mt-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" />
                <Input
                  className="pl-9"
                  placeholder="Search places, captions, tags…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search memories"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFavouritesOnly((current) => !current)}
                  className={cn(
                    'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition',
                    favouritesOnly
                      ? 'border-gold-400 bg-ivory-200 text-charcoal-800'
                      : 'border-sage-200 bg-white text-charcoal-600 hover:bg-sage-50',
                  )}
                  aria-pressed={favouritesOnly}
                >
                  <Star className={cn('h-4 w-4', favouritesOnly && 'fill-current text-gold-500')} />
                  Favourites
                </button>
                {pinned.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowMap((current) => !current)}
                    className={cn(
                      'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition',
                      showMap
                        ? 'border-forest-400 bg-forest-50 text-forest-700'
                        : 'border-sage-200 bg-white text-charcoal-600 hover:bg-sage-50',
                    )}
                    aria-pressed={showMap}
                  >
                    <MapIcon className="h-4 w-4" />
                    Map
                  </button>
                ) : null}
                <SegmentedControl
                  label="View"
                  value={view}
                  onChange={setView}
                  options={[
                    { value: 'gallery', label: 'Gallery', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
                    { value: 'timeline', label: 'Timeline', icon: <CalendarHeart className="h-3.5 w-3.5" /> },
                  ]}
                />
              </div>
            </div>

            {allTags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag((current) => (current === tag ? null : tag))}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs transition',
                      activeTag === tag
                        ? 'bg-forest-600 text-ivory-50'
                        : 'bg-ivory-200 text-charcoal-600 hover:bg-sage-100',
                    )}
                    aria-pressed={activeTag === tag}
                  >
                    #{tag}
                  </button>
                ))}
                {activeTag ? (
                  <button
                    type="button"
                    onClick={() => setActiveTag(null)}
                    className="rounded-full px-2.5 py-1 text-xs text-clay-600 underline"
                  >
                    Clear filter
                  </button>
                ) : null}
              </div>
            ) : null}
          </Card>

          {showMap && pinned.length > 0 ? (
            <Card className="mt-6 overflow-hidden" padded={false}>
              <LeafletMap
                className="h-80"
                ariaLabel="Map of pinned memories"
                center={{ lat: pinned[0]?.lat ?? 0, lon: pinned[0]?.lon ?? 0 }}
                fitMarkers
                markers={pinned.map((memory) => ({
                  id: memory.id,
                  lat: memory.lat as number,
                  lon: memory.lon as number,
                  label: memory.placeName,
                }))}
              />
            </Card>
          ) : null}

          <p className="mt-6 text-sm text-charcoal-500">
            {pluralize(filtered.length, 'memory', 'memories')}
            {activeTag ? ` tagged #${activeTag}` : ''}
            {favouritesOnly ? ' · favourites only' : ''}
          </p>

          {filtered.length === 0 ? (
            <div className="mt-2">
              <EmptyState
                title="No memories match your filters"
                description="Try a different search term or clear the filters."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery('')
                      setActiveTag(null)
                      setFavouritesOnly(false)
                    }}
                  >
                    Clear all filters
                  </Button>
                }
              />
            </div>
          ) : view === 'gallery' ? (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((memory) => (
                <MemoryCard key={memory.id} memory={memory} onToggleFavourite={toggleFavourite} />
              ))}
            </div>
          ) : (
            <div className="mt-4 space-y-8">
              {grouped.map(([year, items]) => (
                <section key={year}>
                  <h2 className="mb-3 flex items-center gap-3 text-lg text-charcoal-800">
                    {year}
                    <span className="h-px flex-1 bg-sage-200" />
                    <span className="text-xs font-normal text-charcoal-400">
                      {items.length} {items.length === 1 ? 'memory' : 'memories'}
                    </span>
                  </h2>
                  <ol className="relative space-y-4 border-l border-sage-200 pl-5">
                    {items.map((memory) => (
                      <li key={memory.id} className="relative">
                        <span className="absolute -left-[1.65rem] top-6 h-3 w-3 rounded-full border-2 border-ivory-50 bg-forest-500" />
                        <div className="flex items-center gap-2 text-xs text-charcoal-500">
                          <CalendarHeart className="h-3.5 w-3.5" />
                          {formatDate(memory.visitDate)}
                          {memory.favourite ? <Star className="h-3.5 w-3.5 fill-current text-gold-500" /> : null}
                        </div>
                        <div className="mt-2 max-w-md">
                          <MemoryCard memory={memory} onToggleFavourite={toggleFavourite} compact />
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <MemoryFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </PageContainer>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: number
}) {
  return (
    <div className="tw-card flex items-center gap-4 p-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-forest-50 text-forest-700">
        {icon}
      </span>
      <div>
        <p className="text-2xl font-semibold text-charcoal-900">{value}</p>
        <p className="text-xs text-charcoal-500">{label}</p>
      </div>
    </div>
  )
}
