import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  CircleDot,
  CircleSlash,
  Clock,
  GripVertical,
  IndianRupee,
  Info,
  MapPin,
  Pencil,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Textarea } from '@/components/ui/Field'
import { MemoryFormModal } from '@/components/memories/MemoryFormModal'
import { useTrip } from '@/store/TripStore'
import { useMemories } from '@/store/MemoriesStore'
import { useToast } from '@/store/ToastStore'
import { formatCurrency, formatDuration } from '@/lib/format'
import { clamp } from '@/lib/utils'
import type { ItineraryStop, StopStatus } from '@/types'

const STATUS_META: Record<
  StopStatus,
  { label: string; tone: 'neutral' | 'forest' | 'clay'; icon: typeof CircleDot }
> = {
  planned: { label: 'Planned', tone: 'neutral', icon: CircleDot },
  visited: { label: 'Visited', tone: 'forest', icon: CheckCircle2 },
  skipped: { label: 'Skipped', tone: 'clay', icon: CircleSlash },
}

function StopEditor({ stop, onDone }: { stop: ItineraryStop; onDone: () => void }) {
  const { updateStop } = useTrip()
  const { push } = useToast()

  const [duration, setDuration] = useState(String(stop.estimatedDurationMin))
  const [cost, setCost] = useState(String(stop.estimatedCost))
  const [day, setDay] = useState(stop.day ?? '')
  const [note, setNote] = useState(stop.note ?? '')

  function save() {
    const durationValue = clamp(Math.round(Number(duration) || 0), 0, 1440)
    const costValue = clamp(Math.round(Number(cost) || 0), 0, 10_000_000)
    updateStop(stop.id, {
      estimatedDurationMin: durationValue,
      estimatedCost: costValue,
      day: day || undefined,
      note: note.trim() || undefined,
    })
    push(`${stop.place.name} updated.`, 'success')
    onDone()
  }

  return (
    <div className="rounded-xl border border-sage-200 bg-ivory-50 p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm text-charcoal-600">
          Visit estimate (min)
          <Input
            type="number"
            min={0}
            max={1440}
            step={5}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className="mt-1"
          />
        </label>
        <label className="text-sm text-charcoal-600">
          Cost estimate (₹)
          <Input
            type="number"
            min={0}
            max={10_000_000}
            step={10}
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            className="mt-1"
          />
        </label>
        <label className="text-sm text-charcoal-600">
          Planned day
          <Input
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
            className="mt-1"
          />
        </label>
      </div>
      <label className="mt-4 block text-sm text-charcoal-600">
        Note
        <Textarea
          rows={2}
          placeholder="Booking details, meeting point, reminder…"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="mt-1"
        />
      </label>
      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" onClick={save}>
          Save changes
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone} icon={<X className="h-4 w-4" />}>
          Cancel
        </Button>
        <span className="text-xs text-charcoal-400">Estimates only — never official prices.</span>
      </div>
    </div>
  )
}

interface StopCardProps {
  stop: ItineraryStop
  index: number
  total: number
  onRemove: () => void
  onStatus: (status: StopStatus) => void
  onMove: (direction: -1 | 1) => void
  showControls?: boolean
}

function StopCard({ stop, index, total, onRemove, onStatus, onMove, showControls = true }: StopCardProps) {
  const meta = STATUS_META[stop.status]
  const Icon = meta.icon
  const { memories } = useMemories()
  const [editing, setEditing] = useState(false)
  const [memoryOpen, setMemoryOpen] = useState(false)

  const linkedMemories = memories.filter((memory) => memory.stopId === stop.id)

  return (
    <article className="tw-card flex flex-col gap-4 p-5 md:flex-row md:items-start">
      <div className="flex items-start gap-3">
        <GripVertical className="mt-1 hidden h-5 w-5 text-charcoal-500 md:block" aria-hidden />
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-100 text-sm font-semibold text-forest-700">
          {index + 1}
        </span>
      </div>
      <div className="flex-1 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg">{stop.place.name}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-charcoal-500">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {stop.place.city ?? stop.place.address ?? 'Location'}
              </span>
              {stop.day ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  {stop.day}
                </span>
              ) : null}
              {stop.visitedAt ? (
                <span className="inline-flex items-center gap-1 text-forest-700">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  visited {stop.visitedAt.slice(0, 10)}
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={meta.tone} icon={<Icon className="h-3.5 w-3.5" aria-hidden />}>
              {meta.label}
            </Badge>
            {showControls && total > 1 ? (
              <div className="flex items-center rounded-full border border-sage-200">
                <button
                  type="button"
                  onClick={() => onMove(-1)}
                  disabled={index === 0}
                  className="rounded-l-full px-2 py-1 text-xs text-charcoal-600 transition hover:bg-sage-100 disabled:opacity-40"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onMove(1)}
                  disabled={index === total - 1}
                  className="rounded-r-full border-l border-sage-200 px-2 py-1 text-xs text-charcoal-600 transition hover:bg-sage-100 disabled:opacity-40"
                  aria-label="Move down"
                >
                  ↓
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm text-charcoal-600">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4 text-charcoal-500" aria-hidden />
            {formatDuration(stop.estimatedDurationMin)} <span className="text-charcoal-500">(estimate)</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <IndianRupee className="h-4 w-4 text-charcoal-500" aria-hidden />
            {formatCurrency(stop.estimatedCost)} <span className="text-charcoal-500">(estimate)</span>
          </span>
        </div>

        {stop.note ? (
          <p className="flex items-start gap-2 text-sm leading-relaxed text-charcoal-600">
            <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-charcoal-400" aria-hidden />
            {stop.note}
          </p>
        ) : null}

        {linkedMemories.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-charcoal-500">
            <Camera className="h-3.5 w-3.5" aria-hidden />
            {linkedMemories.length} linked {linkedMemories.length === 1 ? 'memory' : 'memories'}:
            {linkedMemories.map((memory) => (
              <Link key={memory.id} to={`/memories/${memory.id}`} className="text-forest-700 underline">
                {memory.placeName}
              </Link>
            ))}
          </div>
        ) : null}

        {editing ? <StopEditor stop={stop} onDone={() => setEditing(false)} /> : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStatus('visited')}
            disabled={stop.status === 'visited'}
          >
            Mark visited
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStatus('skipped')}
            disabled={stop.status === 'skipped'}
          >
            Mark skipped
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStatus('planned')}
            disabled={stop.status === 'planned'}
          >
            Reset to planned
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Pencil className="h-4 w-4" aria-hidden />}
            onClick={() => setEditing((current) => !current)}
          >
            {editing ? 'Close editor' : 'Edit'}
          </Button>
          <Button variant="ghost" size="sm" icon={<Camera className="h-4 w-4" aria-hidden />} onClick={() => setMemoryOpen(true)}>
            Add memory
          </Button>
          <Link
            to={`/destination/${stop.place.lat.toFixed(5)},${stop.place.lon.toFixed(5)}?name=${encodeURIComponent(stop.place.name)}&category=${stop.place.category}`}
            className="inline-flex h-9 items-center rounded-xl px-3 text-sm text-charcoal-600 transition hover:bg-sage-100"
          >
            View place
          </Link>
          <Button variant="ghost" size="sm" onClick={onRemove} icon={<Trash2 className="h-4 w-4" aria-hidden />}>
            Remove
          </Button>
        </div>
      </div>

      <MemoryFormModal
        open={memoryOpen}
        onClose={() => setMemoryOpen(false)}
        defaultStopId={stop.id}
      />
    </article>
  )
}

export function ItineraryList() {
  const { stops, removeStop, setStatus, moveStop } = useTrip()
  const { push } = useToast()

  if (stops.length === 0) {
    return (
      <div className="tw-card p-10 text-center">
        <h3>Your itinerary is empty</h3>
        <p className="mt-2 text-sm text-charcoal-500">
          Add a place from Explore or use the Smart Time Planner to build a plan.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to="/" className="inline-flex h-10 items-center rounded-xl border border-sage-200 bg-white px-4 text-sm font-medium text-charcoal-800">
            Explore places
          </Link>
          <Link to="/planner" className="inline-flex h-10 items-center rounded-xl bg-forest-600 px-4 text-sm font-medium text-ivory-50">
            Plan a trip
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-charcoal-500">
          Mark stops as planned, visited or skipped, edit estimates, and attach memories.
        </p>
        <Badge tone="outline" icon={<Info className="h-3.5 w-3.5" />}>
          Order preserved after refresh
        </Badge>
      </div>
      {stops.map((stop, index) => (
        <StopCard
          key={stop.id}
          stop={stop}
          index={index}
          total={stops.length}
          onRemove={() => {
            removeStop(stop.id)
            push(`${stop.place.name} removed from your trip.`, 'info')
          }}
          onStatus={(status) => setStatus(stop.id, status)}
          onMove={(direction) => moveStop(stop.id, direction)}
        />
      ))}
    </div>
  )
}
