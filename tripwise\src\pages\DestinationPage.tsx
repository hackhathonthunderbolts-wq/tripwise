import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarRange,
  Clock,
  IndianRupee,
  Info,
  MapPin,
  NotebookPen,
  Save,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Card, CardHeader } from '@/components/ui/Card'
import { ErrorState, EmptyState } from '@/components/ui/States'
import { Skeleton, Spinner } from '@/components/ui/Skeleton'
import { PlaceImage } from '@/components/destinations/PlaceImage'
import { WeatherWidget } from '@/components/destinations/WeatherWidget'
import { LeafletMap } from '@/components/map/LeafletMap'
import { DestinationCard } from '@/components/destinations/DestinationCard'
import { useTrip } from '@/store/TripStore'
import { useToast } from '@/store/ToastStore'
import { useMemories } from '@/store/MemoriesStore'
import { loadDestinationDetails, type DestinationDetails } from '@/services/api/discover'
import { ApiError } from '@/services/api/client'
import { CATEGORY_META, categoryCost, categoryVisitMinutes, categoryLabel } from '@/lib/categories'
import { formatCoords, formatCurrency, formatDuration, todayISO } from '@/lib/format'
import { isValidLatLon, osmLink } from '@/lib/geo'
import { clamp, truncate } from '@/lib/utils'
import type { Place, PlaceCategory } from '@/types'

interface ParsedCoords {
  lat: number
  lon: number
}

function parseCoords(raw?: string): ParsedCoords | null {
  if (!raw) return null
  const match = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(raw.trim())
  if (!match) return null
  const lat = Number.parseFloat(match[1])
  const lon = Number.parseFloat(match[2])
  if (!isValidLatLon(lat, lon)) return null
  return { lat, lon }
}

export default function DestinationPage() {
  const { coords } = useParams()
  const [searchParams] = useSearchParams()
  const parsed = parseCoords(coords)
  const { addStop, stops, updateStop } = useTrip()
  const { push } = useToast()
  const { memories, saveMemory } = useMemories()

  const name = searchParams.get('name') ?? 'Selected place'
  const categoryParam = searchParams.get('category')
  const category: PlaceCategory =
    categoryParam && categoryParam in CATEGORY_META ? (categoryParam as PlaceCategory) : 'other'
  const wikiTitle = searchParams.get('wiki') ?? undefined

  const place: Place | null = useMemo(() => {
    if (!parsed) return null
    return {
      id: `geo:${parsed.lat.toFixed(5)},${parsed.lon.toFixed(5)}`,
      name,
      lat: parsed.lat,
      lon: parsed.lon,
      category,
      source: 'nominatim',
      wikipediaTitle: wikiTitle,
    }
  }, [parsed, name, category, wikiTitle])

  const [details, setDetails] = useState<DestinationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [durationMin, setDurationMin] = useState(categoryVisitMinutes(category))
  const [cost, setCost] = useState(categoryCost(category))
  const [day, setDay] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    if (!parsed) return
    setLoading(true)
    setError(null)
    try {
      const data = await loadDestinationDetails({
        name,
        lat: parsed.lat,
        lon: parsed.lon,
        wikipediaTitle: wikiTitle,
      })
      setDetails(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : 'Destination details could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [parsed, name, wikiTitle])

  useEffect(() => {
    void load()
  }, [load])

  const stopForPlace = place ? stops.find((item) => item.place.id === place.id) : undefined

  useEffect(() => {
    if (stopForPlace) {
      setDurationMin(stopForPlace.estimatedDurationMin)
      setCost(stopForPlace.estimatedCost)
      setDay(stopForPlace.day ?? '')
      setNote(stopForPlace.note ?? '')
    }
  }, [stopForPlace?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!place) {
    return (
      <PageContainer>
        <ErrorState
          title="Destination link is invalid"
          message="This URL does not contain valid coordinates. Use Explore to pick a place."
        >
          <Link to="/" className="underline">
            Back to Explore
          </Link>
        </ErrorState>
      </PageContainer>
    )
  }

  const handleAdd = () => {
    if (!place) return
    const safeDuration = clamp(Math.round(durationMin), 5, 720)
    const safeCost = clamp(Math.round(cost), 0, 1_000_000)

    if (stopForPlace) {
      updateStop(stopForPlace.id, {
        estimatedDurationMin: safeDuration,
        estimatedCost: safeCost,
        day: day || undefined,
        note: note.trim() || undefined,
      })
      push(`Itinerary estimates updated for ${place.name}.`, 'success')
      return
    }

    const result = addStop(place, {
      estimatedDurationMin: safeDuration,
      estimatedCost: safeCost,
      day: day || undefined,
      note: note.trim() || undefined,
    })
    push(result.message, result.added ? 'success' : 'warning')
  }

  const handleQuickMemory = () => {
    const saved = saveMemory(
      {
        placeName: place.name,
        lat: place.lat,
        lon: place.lon,
        destinationId: place.id,
        caption: `Visited ${place.name}`,
        note: '',
        visitDate: todayISO(),
        tags: [],
      },
      [],
    )
    void saved
    push('Quick memory started â€” add a photo and note in Memories.', 'success')
  }

  const nearby = details?.nearby ?? []
  const placeMemories = memories.filter(
    (memory) => memory.placeName === place.name || (memory.lat === place.lat && memory.lon === place.lon),
  )

  const description = details?.summary?.extract ?? place.description

  return (
    <PageContainer>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-charcoal-600 hover:text-forest-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to Explore
      </Link>

      <div className="mt-4 overflow-hidden rounded-3xl border border-sage-200 bg-white shadow-card">
        <PlaceImage
          src={details?.summary?.thumbnail ?? place.thumbnail}
          alt={place.name}
          category={place.category}
          credit={
            details?.summary?.thumbnail
              ? 'Wikipedia / Wikimedia Commons'
              : place.thumbnailCredit
          }
          className="h-56 w-full md:h-80"
          sizes="100vw"
        />
        <div className="grid gap-6 p-6 md:grid-cols-[1.4fr_1fr] md:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="forest">{categoryLabel(place.category)}</Badge>
              <Badge tone="outline" icon={<MapPin className="h-3 w-3" />}>
                {formatCoords(place.lat, place.lon)}
              </Badge>
              <Badge tone="sage">Source: Wikipedia + OpenStreetMap</Badge>
            </div>
            <h1 className="mt-4 text-3xl md:text-4xl">{place.name}</h1>

            {loading ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ) : description ? (
              <p className="mt-4 leading-relaxed text-charcoal-600">{truncate(description, 900)}</p>
            ) : (
              <p className="mt-4 italic text-charcoal-500">
                No description is available from the data source for this place.
              </p>
            )}

            {details?.reverse?.address ? (
              <p className="mt-3 text-sm text-charcoal-500">
                Address: {details.reverse.address}
                {details.reverse.categoryLabel ? ` Â· ${details.reverse.categoryLabel}` : ''}
              </p>
            ) : null}

            {details?.errors.length ? (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-ivory-200 px-3 py-2 text-xs text-charcoal-600">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Some optional data (weather, nearby places, reverse geocode) could not be loaded.
                Everything else on this page still works.
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-4 text-sm text-charcoal-600">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-charcoal-500" aria-hidden />
                Visit time: {formatDuration(durationMin)}
                <span className="text-charcoal-500">(estimate)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IndianRupee className="h-4 w-4 text-charcoal-500" aria-hidden />
                Cost: {formatCurrency(cost)}
                <span className="text-charcoal-500">(estimate)</span>
              </span>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                onClick={handleAdd}
                variant="primary"
                size="lg"
                icon={stopForPlace ? <Save className="h-4 w-4" /> : <CalendarRange className="h-4 w-4" />}
              >
                {stopForPlace ? 'Update itinerary estimates' : 'Add to itinerary'}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={handleQuickMemory}
                icon={<NotebookPen className="h-4 w-4" />}
              >
                Save a quick memory
              </Button>
              <a
                href={osmLink(place.lat, place.lon)}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-sage-200 bg-white px-5 text-base text-charcoal-700 hover:bg-sage-50"
              >
                Open in OpenStreetMap
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <Card padded={false} className="overflow-hidden">
              <LeafletMap
                center={{ lat: place.lat, lon: place.lon }}
                zoom={15}
                markers={[
                  {
                    id: 'selected',
                    lat: place.lat,
                    lon: place.lon,
                    label: place.name,
                    tone: 'accent',
                  },
                ]}
                className="h-56"
                ariaLabel={`Map of ${place.name}`}
              />
            </Card>

            <WeatherWidget weather={details?.weather ?? null} showForecast />

            <Card>
              <CardHeader title="Editable estimates" description="These are your own estimates, not official figures." />
              <div className="mt-4 grid gap-3">
                <Field label="Visit duration (minutes)" htmlFor="est-duration">
                  <Input
                    id="est-duration"
                    type="number"
                    min={5}
                    max={720}
                    step={5}
                    value={durationMin}
                    onChange={(event) => setDurationMin(Number(event.target.value))}
                  />
                </Field>
                <Field label="Estimated cost (â‚¹)" htmlFor="est-cost">
                  <Input
                    id="est-cost"
                    type="number"
                    min={0}
                    max={1000000}
                    step={50}
                    value={cost}
                    onChange={(event) => setCost(Number(event.target.value))}
                  />
                </Field>
                <Field label="Planned day (optional)" htmlFor="est-day">
                  <Input
                    id="est-day"
                    type="date"
                    value={day}
                    onChange={(event) => setDay(event.target.value)}
                  />
                </Field>
                <Field label="Note (optional)" htmlFor="est-note">
                  <Textarea
                    id="est-note"
                    rows={3}
                    value={note}
                    placeholder="What you want to remember about this stop"
                    onChange={(event) => setNote(event.target.value)}
                  />
                </Field>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {placeMemories.length > 0 ? (
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="tw-label">Your memories</p>
              <h2 className="mt-2 text-xl">{placeMemories.length} saved here</h2>
            </div>
            <Link to="/memories" className="text-sm text-forest-700 underline">
              Open journal
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {placeMemories.slice(0, 3).map((memory) => (
              <Link
                key={memory.id}
                to={`/memories/${memory.id}`}
                className="tw-card block p-4 transition hover:shadow-lift"
              >
                <p className="text-sm font-medium">{memory.caption || memory.placeName}</p>
                <p className="mt-1 line-clamp-3 text-xs text-charcoal-500">
                  {truncate(memory.note || 'No note added.', 120)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {nearby.length > 0 ? (
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="tw-label">Nearby</p>
              <h2 className="mt-2 text-xl">Other real places around {place.name}</h2>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {nearby.map((item) => (
              <DestinationCard key={item.id} place={item} />
            ))}
          </div>
        </section>
      ) : null}

      {!loading && !error && nearby.length === 0 ? (
        <section className="mt-10">
          <EmptyState
            title="No nearby places returned"
            description="The POI service returned no other points of interest within 1.8 km. That is normal in sparse areas."
          />
        </section>
      ) : null}

      {error ? (
        <div className="mt-6">
          <ErrorState message={error} onRetry={load} />
        </div>
      ) : null}

      {loading && !details ? (
        <div className="mt-6 flex justify-center">
          <Spinner label="Loading destination details..." />
        </div>
      ) : null}
    </PageContainer>
  )
}
