import { ApiError } from '@/services/api/client'
import { findPlacesNear } from '@/services/api/overpass'
import { reverseGeocode, searchPlaces, type ReverseResult } from '@/services/api/nominatim'
import {
  commonsImageUrl,
  wikiGeosearch,
  wikiPlacesNear,
  wikiSearchPlaces,
  wikiSummariesByTitle,
  wikiSummary,
  type WikipediaSummary,
} from '@/services/api/wikipedia'
import { getWeather } from '@/services/api/openMeteo'
import { normalizeName } from '@/lib/utils'
import type { Coordinates, DiscoverResult, Place, PlaceCategory, WeatherReport } from '@/types'

const MAX_WIKI_LOOKUPS = 18

export interface CenterResolution {
  place: Place
  source: 'nominatim' | 'wikipedia'
  notice?: string
}

/**
 * Resolves free-text into a real location. Nominatim (OpenStreetMap) is tried
 * first, Wikipedia search is used as a labelled fallback when the geocoder is
 * unreachable. No hardcoded destination list is involved.
 */
export async function resolveCenter(query: string): Promise<CenterResolution> {
  try {
    const places = await searchPlaces(query, 6)
    const first = places[0]
    if (!first) {
      throw new ApiError(`No OpenStreetMap match for “${query}”`, 'empty')
    }
    return { place: first, source: 'nominatim' }
  } catch (error) {
    if (error instanceof ApiError && error.kind === 'empty') {
      // Genuinely no results from the geocoder — try Wikipedia before giving up.
      const wiki = await wikiSearchPlaces(query, 3).catch(() => [])
      if (wiki[0]) {
        return {
          place: wiki[0],
          source: 'wikipedia',
          notice: 'No OpenStreetMap geocoding match — using a Wikipedia article location instead.',
        }
      }
      throw error
    }

    const fallback = await wikiSearchPlaces(query, 3).catch(() => [])
    if (fallback[0]) {
      return {
        place: fallback[0],
        source: 'wikipedia',
        notice:
          'The OpenStreetMap geocoder (Nominatim) is unreachable, so this location was resolved from Wikipedia.',
      }
    }
    throw error
  }
}

function matchSummaryForPlace(
  place: Place,
  geoSummaries: Map<string, WikipediaSummary>,
  geoCoords: Map<string, { lat: number; lon: number }>,
): WikipediaSummary | undefined {
  const direct = geoSummaries.get(normalizeName(place.wikipediaTitle ?? place.name))
  if (direct) return direct

  const target = normalizeName(place.name)
  for (const [title, summary] of geoSummaries) {
    const isNameMatch =
      title === target ||
      title.startsWith(`${target} `) ||
      target.startsWith(`${title} `) ||
      title.includes(target) ||
      target.includes(title)
    if (!isNameMatch) continue
    const coords = geoCoords.get(title)
    if (coords) {
      const distance =
        Math.abs(coords.lat - place.lat) + Math.abs(coords.lon - place.lon)
      if (distance > 0.02) continue // ~2 km guard against wrong matches
    }
    return summary
  }
  return undefined
}

/**
 * Adds Wikipedia descriptions and lead images to OpenStreetMap POIs, and falls
 * back to Wikimedia Commons images referenced by OSM tags.
 */
export async function enrichPlaces(
  places: Place[],
  center: Coordinates,
  radiusMeters: number,
  signal?: AbortSignal,
): Promise<Place[]> {
  if (places.length === 0) return places

  const wanted = new Set<string>()
  for (const place of places.slice(0, MAX_WIKI_LOOKUPS)) {
    if (place.wikipediaTitle) wanted.add(place.wikipediaTitle)
  }

  const geoCoords = new Map<string, { lat: number; lon: number }>()
  try {
    const geo = await wikiGeosearch(center.lat, center.lon, radiusMeters, 50)
    for (const item of geo) {
      geoCoords.set(normalizeName(item.title), { lat: item.lat, lon: item.lon })
      if (wanted.size < MAX_WIKI_LOOKUPS) wanted.add(item.title)
    }
  } catch {
    // Descriptions are an enhancement: keep the OSM results if Wikipedia is down.
  }

  let summaries = new Map<string, WikipediaSummary>()
  if (wanted.size > 0) {
    try {
      summaries = await wikiSummariesByTitle(Array.from(wanted))
    } catch {
      summaries = new Map()
    }
  }

  void signal

  return places.map((place) => {
    const summary = matchSummaryForPlace(place, summaries, geoCoords)
    const commons = place.tags?.wikimedia_commons
    const thumbnail =
      summary?.thumbnail ?? (commons ? commonsImageUrl(commons, 700) : place.thumbnail)
    const credit = summary
      ? 'Wikipedia / Wikimedia Commons'
      : commons
        ? 'Wikimedia Commons (CC BY-SA)'
        : place.thumbnailCredit

    return {
      ...place,
      description: summary?.extract ?? place.description,
      thumbnail,
      thumbnailCredit: credit,
      wikipediaTitle: summary?.title ?? place.wikipediaTitle,
    }
  })
}

export interface DiscoverOptions {
  center: { label: string; lat: number; lon: number }
  categories: PlaceCategory[]
  radiusMeters: number
  limit?: number
  signal?: AbortSignal
}

/**
 * The Explore data pipeline:
 *  1. real POIs from OpenStreetMap (Overpass),
 *  2. enriched with Wikipedia summaries/images,
 *  3. Wikipedia-only nearby articles when every Overpass mirror fails
 *     (clearly flagged as degraded in the result).
 */
export async function discoverPlaces(options: DiscoverOptions): Promise<DiscoverResult> {
  const { center, categories, radiusMeters, limit = 90, signal } = options

  const base = {
    center,
    radiusMeters,
  }

  try {
    const places = await findPlacesNear({
      center: { lat: center.lat, lon: center.lon },
      radiusMeters,
      categories,
      limit,
      signal,
    })

    const enriched = await enrichPlaces(places, center, radiusMeters, signal)
    return {
      places: enriched,
      source: 'openstreetmap',
      degraded: false,
      ...base,
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error'
    const wikiPlaces = await wikiPlacesNear(center.lat, center.lon, radiusMeters, Math.min(60, limit)).catch(
      () => [] as Place[],
    )

    if (wikiPlaces.length === 0) {
      throw error instanceof ApiError
        ? error
        : new ApiError(reason, 'network', { endpoint: 'overpass' })
    }

    return {
      places: wikiPlaces,
      source: 'wikipedia',
      degraded: true,
      notice:
        'OpenStreetMap POI service is unavailable right now, so nearby places are being read from Wikipedia. Category filters are not available in this mode.',
      ...base,
    }
  }
}

export interface DestinationDetails {
  summary: WikipediaSummary | null
  weather: WeatherReport | null
  reverse: ReverseResult | null
  nearby: Place[]
  errors: string[]
}

/**
 * Loads everything the destination page needs. Each dependency is isolated so a
 * single failing service never takes down the screen.
 */
export async function loadDestinationDetails(
  place: { name: string; lat: number; lon: number; wikipediaTitle?: string },
  signal?: AbortSignal,
): Promise<DestinationDetails> {
  const errors: string[] = []

  const reversePromise = reverseGeocode(place.lat, place.lon).catch((error) => {
    errors.push(error instanceof Error ? error.message : 'Reverse geocoding failed')
    return null
  })

  const summaryPromise = (async () => {
    if (place.wikipediaTitle) {
      const direct = await wikiSummary(place.wikipediaTitle)
      if (direct) return direct
    }
    try {
      const geo = await wikiGeosearch(place.lat, place.lon, 1500, 25)
      const target = normalizeName(place.name)
      const best =
        geo.find((item) => normalizeName(item.title) === target) ??
        geo.find((item) => normalizeName(item.title).includes(target)) ??
        geo.find((item) => target.includes(normalizeName(item.title)))
      if (!best) return null
      return await wikiSummary(best.title)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Wikipedia lookup failed')
      return null
    }
  })()

  const weatherPromise = getWeather(place.lat, place.lon, signal).catch((error) => {
    errors.push(error instanceof Error ? error.message : 'Weather lookup failed')
    return null
  })

  const nearbyPromise = findPlacesNear({
    center: { lat: place.lat, lon: place.lon },
    radiusMeters: 1800,
    limit: 12,
    signal,
  }).catch(() => [] as Place[])

  const [reverse, summary, weather, nearbyRaw] = await Promise.all([
    reversePromise,
    summaryPromise,
    weatherPromise,
    nearbyPromise,
  ])

  const nearby = nearbyRaw.filter(
    (item) => normalizeName(item.name) !== normalizeName(place.name),
  )

  return { summary, weather, reverse, nearby: nearby.slice(0, 6), errors }
}
