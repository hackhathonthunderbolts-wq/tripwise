import { CURRENCY_CODE } from '@/lib/categories'
import type {
  BudgetSettings,
  Expense,
  ExpenseCategory,
  ItineraryStop,
  Memory,
  Place,
  PlaceCategory,
  StopStatus,
  TripMeta,
} from '@/types'

/**
 * Defensive parsers for anything read back from localStorage. Stored data can
 * be stale, partially written or hand-edited, so every field is validated and
 * unknown shapes are dropped rather than trusted.
 */

const PLACE_CATEGORIES: PlaceCategory[] = [
  'attraction',
  'museum',
  'park',
  'beach',
  'historical',
  'viewpoint',
  'food',
  'other',
]

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'attraction',
  'accommodation',
  'food',
  'transport',
  'shopping',
  'misc',
]

const STATUSES: StopStatus[] = ['planned', 'visited', 'skipped']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function strArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string').slice(0, max)
}

function sanitizePlace(value: unknown): Place | null {
  if (!isRecord(value)) return null
  const lat = num(value.lat, Number.NaN)
  const lon = num(value.lon, Number.NaN)
  const name = str(value.name).trim()
  const id = str(value.id).trim()
  if (!id || !name || !Number.isFinite(lat) || !Number.isFinite(lon)) return null
  const category = PLACE_CATEGORIES.includes(value.category as PlaceCategory)
    ? (value.category as PlaceCategory)
    : 'other'
  return {
    id,
    name,
    lat,
    lon,
    category,
    source:
      value.source === 'wikipedia' || value.source === 'nominatim'
        ? value.source
        : 'openstreetmap',
    address: str(value.address) || undefined,
    city: str(value.city) || undefined,
    country: str(value.country) || undefined,
    description: str(value.description) || undefined,
    thumbnail: str(value.thumbnail) || undefined,
    thumbnailCredit: str(value.thumbnailCredit) || undefined,
    wikipediaTitle: str(value.wikipediaTitle) || undefined,
    distanceKm: Number.isFinite(num(value.distanceKm, Number.NaN))
      ? num(value.distanceKm)
      : undefined,
    openingHours: str(value.openingHours) || undefined,
    website: str(value.website) || undefined,
    tags: isRecord(value.tags)
      ? Object.fromEntries(
          Object.entries(value.tags).filter((entry): entry is [string, string] => {
            return typeof entry[1] === 'string'
          }),
        )
      : undefined,
  }
}

export function sanitizeStops(value: unknown): ItineraryStop[] | null {
  if (!Array.isArray(value)) return null
  const stops: ItineraryStop[] = []
  const seen = new Set<string>()

  for (const item of value) {
    if (!isRecord(item)) continue
    const place = sanitizePlace(item.place)
    if (!place) continue
    if (seen.has(place.id)) continue
    seen.add(place.id)
    stops.push({
      id: str(item.id) || `stop_${place.id}`,
      place,
      status: STATUSES.includes(item.status as StopStatus) ? (item.status as StopStatus) : 'planned',
      estimatedDurationMin: Math.max(0, Math.round(num(item.estimatedDurationMin, 60))),
      estimatedCost: Math.max(0, num(item.estimatedCost, 0)),
      day: str(item.day) || undefined,
      note: str(item.note) || undefined,
      visitedAt: str(item.visitedAt) || undefined,
      createdAt: str(item.createdAt) || new Date().toISOString(),
    })
  }
  return stops
}

export function sanitizeExpenses(value: unknown): Expense[] | null {
  if (!Array.isArray(value)) return null
  const expenses: Expense[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const amount = num(item.amount, Number.NaN)
    if (!Number.isFinite(amount) || amount < 0) continue
    expenses.push({
      id: str(item.id) || `exp_${expenses.length}`,
      amount,
      category: EXPENSE_CATEGORIES.includes(item.category as ExpenseCategory)
        ? (item.category as ExpenseCategory)
        : 'misc',
      date: /^\d{4}-\d{2}-\d{2}$/.test(str(item.date)) ? str(item.date) : new Date().toISOString().slice(0, 10),
      note: str(item.note) || undefined,
      stopId: str(item.stopId) || undefined,
      createdAt: str(item.createdAt) || new Date().toISOString(),
    })
  }
  return expenses
}

export function sanitizeBudget(value: unknown): BudgetSettings | null {
  if (!isRecord(value)) return null
  const total = num(value.total, 0)
  const daily = value.daily === null || value.daily === undefined ? null : num(value.daily, 0)
  return {
    total: Math.max(0, total),
    daily: daily === null ? null : Math.max(0, daily),
    currency: str(value.currency, CURRENCY_CODE) || CURRENCY_CODE,
  }
}

export function sanitizeTripMeta(value: unknown): TripMeta | null {
  if (!isRecord(value)) return null
  return {
    name: str(value.name, 'My trip'),
    startDate: str(value.startDate) || undefined,
    endDate: str(value.endDate) || undefined,
  }
}

export function sanitizeMemories(value: unknown): Memory[] | null {
  if (!Array.isArray(value)) return null
  const memories: Memory[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    const photoIds = strArray(item.photoIds, 12)
    const placeName = str(item.placeName).trim()
    if (!placeName) continue
    memories.push({
      id: str(item.id) || `mem_${memories.length}`,
      placeName,
      lat: Number.isFinite(num(item.lat, Number.NaN)) ? num(item.lat) : undefined,
      lon: Number.isFinite(num(item.lon, Number.NaN)) ? num(item.lon) : undefined,
      stopId: str(item.stopId) || undefined,
      destinationId: str(item.destinationId) || undefined,
      caption: str(item.caption),
      note: str(item.note),
      visitDate: /^\d{4}-\d{2}-\d{2}$/.test(str(item.visitDate))
        ? str(item.visitDate)
        : new Date().toISOString().slice(0, 10),
      tags: strArray(item.tags),
      mood: str(item.mood) || undefined,
      photoIds,
      coverPhotoId: str(item.coverPhotoId) || photoIds[0],
      favourite: bool(item.favourite),
      createdAt: str(item.createdAt) || new Date().toISOString(),
      updatedAt: str(item.updatedAt) || str(item.createdAt) || new Date().toISOString(),
    })
  }
  return memories
}
