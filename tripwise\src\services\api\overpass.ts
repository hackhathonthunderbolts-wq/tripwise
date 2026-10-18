import { ApiError, fetchJson } from '@/services/api/client'
import { categoryFromOsmTags } from '@/services/api/osmCategory'
import { CATEGORY_META } from '@/lib/categories'
import { haversineKm } from '@/lib/geo'
import type { Coordinates, Place, PlaceCategory } from '@/types'

export interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

interface OverpassResponse {
  elements: OverpassElement[]
  remark?: string
  generator?: string
}

const customEndpoint = (import.meta.env?.VITE_OVERPASS_ENDPOINT as string | undefined)?.trim()

/**
 * Public Overpass mirrors. They are tried in order because a single mirror is
 * frequently at capacity. Everything here talks to real OpenStreetMap data.
 */
export const OVERPASS_ENDPOINTS: string[] = [
  ...(customEndpoint ? [customEndpoint] : []),
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

function buildQuery(
  center: Coordinates,
  radiusMeters: number,
  categories: PlaceCategory[],
  limit: number,
): string {
  const active = categories.length > 0 ? categories : (Object.keys(CATEGORY_META) as PlaceCategory[])
  const filters = active
    .flatMap((category) => CATEGORY_META[category]?.overpass ?? [])
    .filter(Boolean)

  const around = `(around:${Math.round(radiusMeters)},${center.lat.toFixed(5)},${center.lon.toFixed(5)})`
  const body = filters.map((filter) => `${filter}${around};`).join('\n  ')

  return `[out:json][timeout:25];
(
  ${body}
);
out center ${Math.max(1, Math.min(200, limit))};`
}

export interface OverpassQueryOptions {
  center: Coordinates
  radiusMeters: number
  categories?: PlaceCategory[]
  limit?: number
  timeoutMs?: number
  signal?: AbortSignal
}

/**
 * Runs an Overpass QL query against the mirror list. Returns the parsed
 * elements of the first mirror that answers successfully. Throws an ApiError
 * when every mirror fails — callers must surface that (never hide it).
 */
export async function runOverpass(
  query: string,
  options: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<OverpassElement[]> {
  const { timeoutMs = 26000, signal } = options
  const errors: string[] = []

  for (const endpoint of OVERPASS_ENDPOINTS) {
    if (signal?.aborted) throw new ApiError('Request cancelled', 'network', { endpoint })
    try {
      const body = new URLSearchParams({ data: query }).toString()
      const data = await fetchJson<OverpassResponse>(endpoint, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        timeoutMs,
        signal,
      })
      if (!data || !Array.isArray(data.elements)) {
        throw new ApiError('Overpass response missing elements', 'parse', { endpoint })
      }
      return data.elements
    } catch (error) {
      if (signal?.aborted) throw error
      const message = error instanceof Error ? error.message : 'unknown error'
      errors.push(`${new URL(endpoint).host}: ${message}`)
    }
  }

  throw new ApiError(
    `Every Overpass mirror failed. Tried ${errors.length} endpoints.`,
    'http',
  )
}

function elementToPlace(
  element: OverpassElement,
  center: Coordinates,
): Place | null {
  const lat = element.lat ?? element.center?.lat
  const lon = element.lon ?? element.center?.lon
  const tags = element.tags ?? {}
  const name = (tags.name ?? tags['name:en'] ?? tags.operator ?? '').trim()
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !name) return null

  const category = categoryFromOsmTags(tags)
  const city = tags['addr:city'] ?? tags['addr:suburb'] ?? undefined
  const address = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:city'],
  ]
    .filter(Boolean)
    .join(' ')

  const wikipediaTag = tags.wikipedia // e.g. "en:Marina Beach"
  const wikipediaTitle = wikipediaTag?.includes(':')
    ? wikipediaTag.split(':').slice(1).join(':')
    : wikipediaTag

  return {
    id: `osm:${element.type}/${element.id}`,
    name,
    lat: lat as number,
    lon: lon as number,
    category,
    source: 'openstreetmap',
    address: address || undefined,
    city,
    description: tags.description,
    openingHours: tags.opening_hours,
    website: tags.website ?? tags['contact:website'],
    wikipediaTitle,
    distanceKm: haversineKm(center, { lat: lat as number, lon: lon as number }),
    tags,
  }
}

/** Real POI discovery based on OpenStreetMap data through Overpass. */
export async function findPlacesNear(options: OverpassQueryOptions): Promise<Place[]> {
  const {
    center,
    radiusMeters,
    categories = [],
    limit = 90,
    timeoutMs,
    signal,
  } = options

  const query = buildQuery(center, radiusMeters, categories, limit)
  const elements = await runOverpass(query, { timeoutMs, signal })

  const places = elements
    .map((element) => elementToPlace(element, center))
    .filter((place): place is Place => place !== null)

  // Some elements are duplicates by name + rounded coordinates (nodes inside ways).
  const seen = new Set<string>()
  const unique: Place[] = []
  for (const place of places) {
    const key = `${place.name.toLowerCase()}|${place.lat.toFixed(4)}|${place.lon.toFixed(4)}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(place)
  }

  unique.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
  return unique.slice(0, limit)
}

export const OVERPASS_ATTRIBUTION = {
  label: 'OpenStreetMap via Overpass API',
  href: 'https://overpass-api.de/',
}
