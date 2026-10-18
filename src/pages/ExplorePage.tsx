import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageContainer, PageHeader } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Field, Select } from '@/components/ui/Field'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Skeleton'
import { SortControl, type SortMode } from '@/components/destinations/SortControl'
import { CategoryFilter } from '@/components/destinations/CategoryFilter'
import { SearchBox } from '@/components/destinations/SearchBox'
import { DestinationCard } from '@/components/destinations/DestinationCard'
import { WeatherWidget } from '@/components/destinations/WeatherWidget'
import { DEFAULT_EXPLORE_CENTER } from '@/lib/categories'
import { formatDistanceKm } from '@/lib/format'
import { radiusForMinutes } from '@/lib/categories'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { discoverPlaces } from '@/services/api/discover'
import { ApiError } from '@/services/api/client'
import type { DiscoverResult, Place, PlaceCategory } from '@/types'

const PAGE_SIZE = 9

export default function ExplorePage() {
  const [search, setSearch] = useState('')
  const [center, setCenter] = useState(DEFAULT_EXPLORE_CENTER)
  const [selectedCenter, setSelectedCenter] = useState<Place | null>(null)
  const [categories, setCategories] = useState<PlaceCategory[]>([])
  const [sort, setSort] = useState<SortMode>('distance')
  const [available, setAvailable] = useState(120)
  const [result, setResult] = useState<DiscoverResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(PAGE_SIZE)

  const debouncedCenter = useDebouncedValue(center, 300)
  const debouncedCategories = useDebouncedValue(categories, 300)
  const radius = radiusForMinutes(available, 'walking')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const discover = await discoverPlaces({
        center: debouncedCenter,
        categories: debouncedCategories,
        radiusMeters: radius,
        limit: 120,
      })
      setResult(discover)
      setVisible(PAGE_SIZE)
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError('Failed to load places.')
    } finally {
      setLoading(false)
    }
  }, [debouncedCenter, debouncedCategories, radius])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const places = useMemo(() => {
    const list = result?.places ?? []
    const sorted = [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      return (a.distanceKm ?? 0) - (b.distanceKm ?? 0)
    })
    return sorted.slice(0, visible)
  }, [result?.places, sort, visible])

  const handleSearchSelect = useCallback(async (place: Place) => {
    setSearch(place.name)
    setCenter({ label: place.name, lat: place.lat, lon: place.lon })
    setSelectedCenter(place)
    setError(null)
  }, [])

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const centerPlace = {
            label: 'My current location',
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          }
          setCenter(centerPlace)
          setSelectedCenter(null)
          setSearch('My location')
        } catch {
          setError('Could not resolve your location.')
        } finally {
          setLoading(false)
        }
      },
      () => {
        setError('Location access was denied. Showing the default location instead.')
        setLoading(false)
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60_000 },
    )
  }, [])

  const hasMore = (result?.places.length ?? 0) > visible

  return (
    <PageContainer size="wide">
      <PageHeader
        eyebrow="Explore"
        title="Find places worth visiting"
        description="Real places fetched from OpenStreetMap and enriched with Wikipedia. Search a city, apply category filters and see what fits your time."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={useMyLocation}>
              Use my location
            </Button>
            <Button variant="ghost" onClick={fetchData} loading={loading}>
              Refresh results
            </Button>
          </div>
        }
      />

      <Card className="mt-6">
        <CardHeader title="Location &amp; time" description="We use your location (or Chennai) to find nearby real places." />
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SearchBox
              value={search}
              onChange={setSearch}
              onSelect={handleSearchSelect}
              placeholder="e.g. Chennai, Fort St. George, Pondicherry"
            />
          </div>
          <Field label="Time you have" htmlFor="time">
            <Select
              id="time"
              value={String(available)}
              onChange={(event) => setAvailable(Number(event.target.value))}
            >
              <option value={30}>30 min</option>
              <option value={60}>1 hour</option>
              <option value={90}>1½ hours</option>
              <option value={120}>2 hours</option>
              <option value={180}>3 hours</option>
              <option value={240}>4 hours</option>
              <option value={360}>6 hours</option>
              <option value={480}>8 hours</option>
            </Select>
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-charcoal-500">
          <span>Searching around {center.label}</span>
          <span>· Radius {Math.round(radius / 1000)} km ({formatDistanceKm(radius / 1000)})</span>
          {result?.degraded ? (
            <Badge tone="gold">Wikipedia-only fallback — category filters limited</Badge>
          ) : null}
        </div>
      </Card>

      <div className="mt-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CategoryFilter value={categories} onChange={setCategories} />
          <SortControl value={sort} onChange={setSort} />
        </div>
        {result ? (
          <div className="text-sm text-charcoal-500">
            Showing {places.length} of {result.places.length} real places · Source: {result.source === 'openstreetmap' ? 'OpenStreetMap (Overpass)' : 'Wikipedia'}
          </div>
        ) : null}
      </div>

      {loading && !result ? (
        <div className="mt-8">
          <Spinner label="Finding real places near you..." />
        </div>
      ) : null}

      {error ? (
        <div className="mt-6">
          <ErrorState message={error} onRetry={fetchData} />
        </div>
      ) : null}

      {result && places.length === 0 && !loading ? (
        <div className="mt-6">
          <EmptyState
            title="No places found"
            description="Try expanding the radius, clearing filters or searching a different city. The data source may return few results in this area."
            action={<Button onClick={fetchData}>Try again</Button>}
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((place) => (
          <DestinationCard key={place.id} place={place} />
        ))}
      </div>

      {hasMore && !loading ? (
        <div className="mt-8 flex justify-center">
          <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            Load more
          </Button>
        </div>
      ) : null}

      {result && selectedCenter ? (
        <div className="mt-8">
          <WeatherWidget weather={null} />
        </div>
      ) : null}
    </PageContainer>
  )
}
