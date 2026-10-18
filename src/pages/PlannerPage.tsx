import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Car,
  CheckCircle2,
  Clock,
  Footprints,
  ListOrdered,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Field, Input, Select } from '@/components/ui/Field'
import { Card, CardHeader } from '@/components/ui/Card'
import { Chip, SegmentedControl } from '@/components/ui/SegmentedControl'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { Skeleton } from '@/components/ui/Skeleton'
import { LeafletMap } from '@/components/map/LeafletMap'
import { SearchBox } from '@/components/destinations/SearchBox'
import { useTrip } from '@/store/TripStore'
import { useToast } from '@/store/ToastStore'
import { discoverPlaces, resolveCenter } from '@/services/api/discover'
import { getTravelMatrix } from '@/services/api/osrm'
import {
  assemblePlan,
  buildPlan,
  type PlannerCandidate,
  type PlannerMatrix,
} from '@/services/planner/planner'
import { ApiError } from '@/services/api/client'
import { CATEGORY_LIST, DEFAULT_EXPLORE_CENTER, radiusForMinutes } from '@/lib/categories'
import { addMinutesToClock, formatDuration, currentClock } from '@/lib/format'
import { categoryVisitMinutes } from '@/lib/categories'
import { clamp } from '@/lib/utils'
import type { Place, PlaceCategory, TravelMode, TripPlan } from '@/types'

const MAX_CANDIDATES = 18

const TIME_PRESETS = [
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '4 hours', minutes: 240 },
  { label: '8 hours', minutes: 480 },
]

export default function PlannerPage() {
  const navigate = useNavigate()
  const { addStop } = useTrip()
  const { push } = useToast()

  const [startQuery, setStartQuery] = useState('')
  const [start, setStart] = useState({
    name: DEFAULT_EXPLORE_CENTER.label,
    lat: DEFAULT_EXPLORE_CENTER.lat,
    lon: DEFAULT_EXPLORE_CENTER.lon,
  })
  const [minutes, setMinutes] = useState(120)
  const [categories, setCategories] = useState<PlaceCategory[]>(['attraction', 'historical', 'viewpoint'])
  const [mode, setMode] = useState<TravelMode>('walking')
  const [startTime, setStartTime] = useState(currentClock())

  const [candidates, setCandidates] = useState<PlannerCandidate[] | null>(null)
  const [matrix, setMatrix] = useState<PlannerMatrix | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [radiusUsed, setRadiusUsed] = useState(0)

  const plan: TripPlan | null = useMemo(() => {
    if (!matrix || !candidates || selected.length === 0) return null
    return assemblePlan(selected, candidates, matrix, {
      start,
      mode,
      availableMinutes: minutes,
      startTime,
    })
  }, [matrix, candidates, selected, start, mode, minutes, startTime])

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      push('Geolocation is not supported in this browser.', 'error')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStart({
          name: 'My current location',
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        })
        setStartQuery('My current location')
        push('Using your current location as the starting point.', 'success')
      },
      () => push('Location access was denied.', 'error'),
      { enableHighAccuracy: false, timeout: 12000 },
    )
  }, [push])

  const findPlaces = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let centre = start
      if (startQuery.trim() && startQuery !== start.name) {
        const resolved = await resolveCenter(startQuery)
        centre = { name: resolved.place.name, lat: resolved.place.lat, lon: resolved.place.lon }
        setStart(centre)
        if (resolved.notice) push(resolved.notice, 'warning')
      }

      const radius = radiusForMinutes(minutes, mode)
      setRadiusUsed(radius)

      const result = await discoverPlaces({
        center: { label: centre.name, lat: centre.lat, lon: centre.lon },
        categories,
        radiusMeters: radius,
        limit: MAX_CANDIDATES,
      })

      const places: Place[] = result.places
        .filter((place) => !(place.lat === centre.lat && place.lon === centre.lon))
        .slice(0, MAX_CANDIDATES)

      if (places.length === 0) {
        setCandidates([])
        setSelected([])
        setMatrix(null)
        setError(
          `No matching places were returned within ${Math.round(radius / 1000)} km. Try a larger time budget, other interests, or a different starting point.`,
        )
        return
      }

      const built: PlannerCandidate[] = places.map((place) => ({
        place,
        visitMinutes: categoryVisitMinutes(place.category),
      }))
      setCandidates(built)
      setMatrix(null)
      setSelected([])

      const travel = await getTravelMatrix(
        [{ lat: centre.lat, lon: centre.lon }, ...places.map((place) => ({ lat: place.lat, lon: place.lon }))],
        mode,
      )
      const plannerMatrix: PlannerMatrix = {
        minutes: travel.minutes,
        meters: travel.meters,
        source: travel.source,
      }
      setMatrix(plannerMatrix)

      const picked = buildPlan(built, plannerMatrix, {
        start: centre,
        mode,
        availableMinutes: minutes,
        startTime,
      })
      setSelected(picked)

      if (picked.length === 0) {
        push(
          'Nothing fits in the selected time budget â€” increase the time or pick closer places.',
          'warning',
        )
      } else {
        push(`Suggested ${picked.length} stop${picked.length === 1 ? '' : 's'} that fit your time.`, 'success')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : 'Could not build a plan right now.')
    } finally {
      setLoading(false)
    }
  }, [start, startQuery, minutes, mode, categories, startTime, push])

  const toggleCandidate = useCallback((index: number) => {
    setSelected((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    )
  }, [])

  const moveSelected = useCallback(
    (position: number, direction: -1 | 1) => {
      setSelected((current) => {
        const target = position + direction
        if (target < 0 || target >= current.length) return current
        const next = [...current]
        const a = next[position]
        const b = next[target]
        if (a === undefined || b === undefined) return current
        next[position] = b
        next[target] = a
        return next
      })
      if (direction === -1 && position === 0) {
        push('First stop now departs straight from your starting point.', 'info')
      }
    },
    [push],
  )

  const setVisitMinutes = useCallback((index: number, value: number) => {
    setCandidates((current) => {
      if (!current) return current
      return current.map((candidate, position) =>
        position === index
          ? { ...candidate, visitMinutes: clamp(Math.round(value), 5, 480) }
          : candidate,
      )
    })
  }, [])

  const addToTrip = useCallback(() => {
    if (!plan || plan.stops.length === 0) return
    let added = 0
    let skipped = 0
    for (const stop of plan.stops) {
      const result = addStop(stop.place, {
        estimatedDurationMin: stop.visitMinutes,
        estimatedCost: 0,
        day: undefined,
      })
      if (result.added) added += 1
      else skipped += 1
    }
    if (added > 0) {
      push(`Added ${added} stop${added === 1 ? '' : 's'} to My Trip.`, 'success')
      if (skipped > 0) push(`${skipped} stop${skipped === 1 ? ' was' : 's were'} already in your trip.`, 'info')
      navigate('/trip')
    } else {
      push('All planned stops are already in your trip.', 'warning')
    }
  }, [plan, addStop, push, navigate])

  const overCapacity = plan ? plan.totalMinutes > plan.availableMinutes : false

  return (
    <PageContainer size="wide">
      <PageHeader
        eyebrow="Smart time planner"
        title="I have just two hours"
        description="Tell TripWise where you start, how long you have and what you enjoy. We fetch real places nearby, use OSRM routing for travel times and assemble a plan that fits."
        actions={
          <Link
            to="/trip"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-sage-200 bg-white px-4 text-sm font-medium text-charcoal-800"
          >
            <ListOrdered className="h-4 w-4" />
            Open My Trip
          </Link>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Inputs ------------------------------------------------------ */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Plan inputs" description="All numbers below are estimates you can change." />
            <div className="mt-4 space-y-4">
              <div>
                <SearchBox
                  value={startQuery}
                  onChange={setStartQuery}
                  onSelect={(place) => {
                    setStart({ name: place.name, lat: place.lat, lon: place.lon })
                    setStartQuery(place.name)
                  }}
                  placeholder="Starting city or place"
                  label="Starting location"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-charcoal-500">
                  <span className="truncate">Start: {start.name}</span>
                  <button
                    type="button"
                    onClick={useMyLocation}
                    className="ml-2 inline-flex items-center gap-1 text-forest-700 hover:underline"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    Use my location
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-charcoal-700">Available time</p>
                <div className="flex flex-wrap gap-2">
                  {TIME_PRESETS.map((preset) => (
                    <Chip
                      key={preset.minutes}
                      active={minutes === preset.minutes}
                      onClick={() => setMinutes(preset.minutes)}
                    >
                      {preset.label}
                    </Chip>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <label htmlFor="custom-minutes" className="text-sm text-charcoal-600">
                    Custom minutes
                  </label>
                  <Input
                    id="custom-minutes"
                    type="number"
                    min={15}
                    max={720}
                    step={15}
                    value={minutes}
                    onChange={(event) => setMinutes(clamp(Number(event.target.value), 15, 720))}
                    className="w-28"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start time" htmlFor="start-time">
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                  />
                </Field>
                <Field label="Travel mode" htmlFor="travel-mode">
                  <Select
                    id="travel-mode"
                    value={mode}
                    onChange={(event) => setMode(event.target.value as TravelMode)}
                  >
                    <option value="walking">Walking</option>
                    <option value="driving">Driving</option>
                  </Select>
                </Field>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-charcoal-700">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_LIST.map((category) => {
                    const active = categories.includes(category.value)
                    return (
                      <Chip
                        key={category.value}
                        active={active}
                        onClick={() =>
                          setCategories((current) =>
                            active
                              ? current.filter((value) => value !== category.value)
                              : [...current, category.value],
                          )
                        }
                      >
                        {category.label}
                      </Chip>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-ivory-100 px-3 py-2.5 text-xs text-charcoal-600">
                <Clock className="h-4 w-4 shrink-0 text-charcoal-500" />
                Search radius â‰ˆ {Math.round(radiusForMinutes(minutes, mode) / 1000)} km
                {radiusUsed > 0 ? ` (last search: ${Math.round(radiusUsed / 1000)} km)` : ''}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void findPlaces()}
                  loading={loading}
                  icon={<RefreshCw className="h-4 w-4" />}
                  className="flex-1 justify-center"
                  size="lg"
                >
                  Find places &amp; build plan
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <SegmentedControl
                  label="Travel mode"
                  value={mode}
                  onChange={setMode}
                  size="sm"
                  options={[
                    { value: 'walking', label: 'Walk', icon: <Footprints className="h-3.5 w-3.5" /> },
                    { value: 'driving', label: 'Drive', icon: <Car className="h-3.5 w-3.5" /> },
                  ]}
                />
                <Link to="/" className="text-sm text-forest-700 underline underline-offset-4">
                  Open full Explore
                </Link>
              </div>
            </div>
          </Card>

          <Card padded={false} className="overflow-hidden">
            <LeafletMap
              center={{ lat: start.lat, lon: start.lon }}
              zoom={13}
              markers={[
                ...(plan?.stops ?? []).map((stop, index) => ({
                  id: stop.place.id,
                  lat: stop.place.lat,
                  lon: stop.place.lon,
                  label: `${index + 1}. ${stop.place.name}`,
                  tone: 'default' as const,
                  onSelect: () =>
                    navigate(
                      `/destination/${stop.place.lat.toFixed(5)},${stop.place.lon.toFixed(5)}?name=${encodeURIComponent(stop.place.name)}`,
                    ),
                })),
                {
                  id: 'start',
                  lat: start.lat,
                  lon: start.lon,
                  label: `Start: ${start.name}`,
                  tone: 'start' as const,
                },
              ]}
              fitMarkers
              className="h-72"
              ariaLabel="Planner map"
            />
          </Card>
        </div>

        {/* Results ----------------------------------------------------- */}
        <div className="space-y-6">
          {error ? <ErrorState message={error} onRetry={() => void findPlaces()} /> : null}

          {loading ? (
            <Card>
              <div className="space-y-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <p className="text-sm text-charcoal-500">Fetching real places and routing travel timesâ€¦</p>
              </div>
            </Card>
          ) : null}

          {!loading && !candidates && !error ? (
            <EmptyState
              icon={<MapPin className="h-6 w-6" />}
              title="Start with your available time"
              description="Pick a starting point, choose how many hours you have and press â€œFind places & build planâ€. Travel times come from OSRM routing; visit durations are editable estimates."
              action={<Button onClick={() => void findPlaces()}>Build my plan</Button>}
            />
          ) : null}

          {candidates && candidates.length === 0 && !loading ? (
            <EmptyState
              title="No candidate places nearby"
              description="Try a bigger time budget, other interests, or a different starting location."
              action={<Button onClick={() => void findPlaces()}>Search again</Button>}
            />
          ) : null}

          {/* Suggested plan ------------------------------------------- */}
          {plan && plan.stops.length > 0 ? (
            <Card>
              <CardHeader
                title={`Suggested itinerary Â· ${formatDuration(plan.totalMinutes)} used`}
                description={`Leaves ${plan.startTime} from ${plan.start.name} Â· ${formatDuration(plan.availableMinutes)} available`}
                action={
                  <Badge tone={plan.overflow ? 'clay' : 'forest'}>
                    {plan.overflow ? 'Over capacity' : `${formatDuration(plan.availableMinutes - plan.totalMinutes)} spare`}
                  </Badge>
                }
              />
              {matrix?.source === 'approx' ? (
                <p className="mt-3 rounded-xl bg-ivory-200 px-3 py-2 text-xs text-charcoal-600">
                  Routing service was unavailable, so travel times below are <strong>straight-line
                  approximations</strong> â€” treat them as rough estimates, not verified routes.
                </p>
              ) : (
                <p className="mt-3 rounded-xl bg-forest-50 px-3 py-2 text-xs text-forest-700">
                  Travel times from OSRM routing on OpenStreetMap. Visit durations are your estimates.
                </p>
              )}
              {overCapacity ? (
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-clay-100 px-3 py-2 text-sm text-clay-600">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  This plan needs {formatDuration(plan.totalMinutes)} but you only have{' '}
                  {formatDuration(plan.availableMinutes)}. Remove a stop or raise the time budget.
                </p>
              ) : null}

              <ol className="mt-4 space-y-3">
                {plan.stops.map((stop, index) => (
                  <li key={stop.place.id} className="rounded-xl border border-sage-200 bg-ivory-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-forest-600 text-xs font-semibold text-ivory-50">
                            {index + 1}
                          </span>
                          <h4 className="text-base">{stop.place.name}</h4>
                        </div>
                        <p className="mt-2 flex flex-wrap gap-3 text-xs text-charcoal-600">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Arrive {addMinutesToClock(plan.startTime, stop.arrivalMinutes)} Â· visit{' '}
                            {formatDuration(stop.visitMinutes)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Navigation className="h-3.5 w-3.5" />
                            {formatDuration(stop.travel.minutes)} travel Â·{' '}
                            {(stop.travel.distanceMeters / 1000).toFixed(1)} km
                          </span>
                          <span
                            className={
                              stop.travel.source === 'osrm'
                                ? 'text-forest-700'
                                : 'text-clay-600'
                            }
                          >
                            {stop.travel.source === 'osrm' ? 'routed' : 'approx. (no routing)'}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 rounded-full border border-sage-200 bg-white px-1">
                          <button
                            type="button"
                            className="rounded-l-full px-2 py-1 text-xs hover:bg-sage-100 disabled:opacity-40"
                            disabled={index === 0}
                            onClick={() => moveSelected(index, -1)}
                            aria-label={`Move ${stop.place.name} earlier`}
                          >
                            â†‘
                          </button>
                          <button
                            type="button"
                            className="border-l border-sage-200 px-2 py-1 text-xs hover:bg-sage-100 disabled:opacity-40"
                            disabled={index === plan.stops.length - 1}
                            onClick={() => moveSelected(index, 1)}
                            aria-label={`Move ${stop.place.name} later`}
                          >
                            â†“
                          </button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 className="h-4 w-4" />}
                          onClick={() =>
                            setSelected((current) => current.filter((item) => item !== selected[index]))
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-sage-200 pt-4 text-sm text-charcoal-600">
                <span>
                  {plan.stops.length} stops Â· {formatDuration(plan.visitedMinutes)} visiting Â·{' '}
                  {formatDuration(plan.travelMinutes)} travelling
                </span>
                <Button
                  onClick={addToTrip}
                  icon={<Plus className="h-4 w-4" />}
                  size="lg"
                  disabled={plan.stops.length === 0}
                >
                  Add plan to My Trip
                </Button>
              </div>
            </Card>
          ) : null}

          {/* Candidate picker ------------------------------------------ */}
          {candidates && candidates.length > 0 ? (
            <Card>
              <CardHeader
                title={`Candidate places (${candidates.length})`}
                description="Tick or untick places â€” the itinerary above rebuilds instantly with real travel times."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => {
                      if (!matrix) return
                      setSelected(
                        buildPlan(candidates, matrix, { start, mode, availableMinutes: minutes, startTime }),
                      )
                    }}
                    disabled={!matrix}
                  >
                    Re-suggest for my time
                  </Button>
                }
              />
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {candidates.map((candidate, index) => {
                  const active = selected.includes(index)
                  return (
                    <li
                      key={candidate.place.id}
                      className={`rounded-xl border p-4 transition ${
                        active ? 'border-forest-300 bg-forest-50/60' : 'border-sage-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-charcoal-900">{candidate.place.name}</p>
                          <p className="mt-1 text-xs text-charcoal-500">
                            {candidate.place.city ?? candidate.place.category}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCandidate(index)}
                          className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                            active
                              ? 'border-forest-600 bg-forest-600 text-ivory-50'
                              : 'border-sage-200 bg-white text-charcoal-600 hover:bg-sage-50'
                          }`}
                          aria-pressed={active}
                        >
                          {active ? 'In plan' : 'Add'}
                        </button>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <label className="text-xs text-charcoal-500" htmlFor={`visit-${index}`}>
                          Visit (min)
                        </label>
                        <Input
                          id={`visit-${index}`}
                          type="number"
                          min={5}
                          max={480}
                          step={5}
                          value={candidate.visitMinutes}
                          onChange={(event) => setVisitMinutes(index, Number(event.target.value))}
                          className="w-20 py-1.5"
                        />
                        <Link
                          to={`/destination/${candidate.place.lat.toFixed(5)},${candidate.place.lon.toFixed(5)}?name=${encodeURIComponent(candidate.place.name)}&category=${candidate.place.category}`}
                          className="ml-auto inline-flex items-center gap-1 text-xs text-forest-700 hover:underline"
                        >
                          Details <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                      <p className="mt-2 text-[0.7rem] text-charcoal-500">
                        Note: TripWise never claims entries are free or official â€” costs are added on My Trip.
                      </p>
                    </li>
                  )
                })}
              </ul>
            </Card>
          ) : null}

          {candidates && candidates.length > 0 && selected.length === 0 && !loading ? (
            <EmptyState
              title="Nothing selected yet"
              description="Choose candidate places above, or press â€œRe-suggest for my timeâ€ to let the planner pick a combination that fits."
              action={<Button onClick={() => void findPlaces()}>Re-run planner</Button>}
            />
          ) : null}
        </div>
      </div>
    </PageContainer>
  )
}
