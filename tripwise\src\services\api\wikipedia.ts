import { fetchJson } from '@/services/api/client'
import { normalizeName } from '@/lib/utils'
import type { Place } from '@/types'

const API = 'https://en.wikipedia.org/w/api.php'
const REST = 'https://en.wikipedia.org/api/rest_v1'

export interface WikipediaSummary {
  title: string
  extract?: string
  description?: string
  thumbnail?: string
  originalImage?: string
  pageUrl?: string
  coordinates?: { lat: number; lon: number }
}

interface MediaWikiPage {
  index?: number
  pageid: number
  title: string
  extract?: string
  description?: string
  thumbnail?: { source: string; width: number; height: number }
  original?: { source: string; width: number; height: number }
  coordinates?: { lat: number; lon: number }[]
  fullurl?: string
  missing?: boolean
}

interface MediaWikiQueryResponse {
  query?: {
    pages?: Record<string, MediaWikiPage> | MediaWikiPage[]
    geosearch?: { pageid: number; title: string; lat: number; lon: number; dist: number }[]
  }
}

function apiUrl(params: Record<string, string>): string {
  const query = new URLSearchParams({ format: 'json', origin: '*', ...params })
  return `${API}?${query.toString()}`
}

function pagesArray(response: MediaWikiQueryResponse): MediaWikiPage[] {
  const pages = response.query?.pages
  if (!pages) return []
  return Array.isArray(pages) ? pages : Object.values(pages)
}

function toSummary(page: MediaWikiPage): WikipediaSummary {
  const coord = page.coordinates?.[0]
  return {
    title: page.title,
    extract: page.extract?.trim() || undefined,
    description: page.description,
    thumbnail: page.thumbnail?.source,
    originalImage: page.original?.source,
    pageUrl: page.fullurl,
    coordinates: coord ? { lat: coord.lat, lon: coord.lon } : undefined,
  }
}

/** Nearby Wikipedia articles — used for descriptions/photos and as a fallback source. */
export async function wikiGeosearch(
  lat: number,
  lon: number,
  radiusMeters = 10000,
  limit = 50,
): Promise<{ pageid: number; title: string; lat: number; lon: number; dist: number }[]> {
  const url = apiUrl({
    action: 'query',
    list: 'geosearch',
    gscoord: `${lat}|${lon}`,
    gsradius: String(Math.min(10000, Math.round(radiusMeters))),
    gsrlimit: String(limit),
  })
  const data = await fetchJson<MediaWikiQueryResponse>(url, { timeoutMs: 12000 })
  return data.query?.geosearch ?? []
}

/**
 * Batch summary lookup (extract + lead image) for up to 20 titles per request.
 * Returns a lookup keyed by the normalised title so callers can match fuzzy
 * OSM names against Wikipedia article names.
 */
export async function wikiSummariesByTitle(
  titles: string[],
): Promise<Map<string, WikipediaSummary>> {
  const map = new Map<string, WikipediaSummary>()
  const chunks: string[][] = []
  for (let i = 0; i < titles.length; i += 18) chunks.push(titles.slice(i, i + 18))

  for (const chunk of chunks) {
    const url = apiUrl({
      action: 'query',
      prop: 'extracts|pageimages|info|coordinates',
      exintro: '1',
      explaintext: '1',
      exlimit: 'max',
      piprop: 'thumbnail|original',
      pithumbsize: '900',
      inprop: 'url',
      redirects: '1',
      titles: chunk.join('|'),
    })
    const pages = pagesArray(await fetchJson<MediaWikiQueryResponse>(url, { timeoutMs: 14000 }))
    for (const page of pages) {
      if (page.missing) continue
      map.set(normalizeName(page.title), toSummary(page))
    }
  }

  return map
}

/** Single-title summary used on the destination details screen. */
export async function wikiSummary(title: string): Promise<WikipediaSummary | null> {
  try {
    const data = await fetchJson<{
      title: string
      extract?: string
      description?: string
      thumbnail?: { source: string }
      originalimage?: { source: string }
      content_urls?: { desktop?: { page?: string } }
      coordinates?: { lat: number; lon: number }
    }>(`${REST}/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`, {
      timeoutMs: 12000,
    })
    return {
      title: data.title,
      extract: data.extract?.trim() || undefined,
      description: data.description,
      thumbnail: data.thumbnail?.source,
      originalImage: data.originalimage?.source,
      pageUrl: data.content_urls?.desktop?.page,
      coordinates: data.coordinates,
    }
  } catch {
    return null
  }
}

interface GeoSearchGeneratorResponse extends MediaWikiQueryResponse {
  query?: MediaWikiQueryResponse['query'] & {
    pages?: Record<string, MediaWikiPage & { index?: number }>
  }
}

/**
 * Wikipedia-backed place search. Used as the resilience path when the
 * Nominatim geocoder is unavailable and to discover real places near a point
 * when the Overpass mirrors are down.
 */
export async function wikiSearchPlaces(query: string, limit = 6): Promise<Place[]> {
  const url = apiUrl({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: String(limit),
    prop: 'coordinates|pageimages|extracts',
    exintro: '1',
    explaintext: '1',
    exlimit: 'max',
    piprop: 'thumbnail',
    pithumbsize: '600',
  })
  const data = await fetchJson<GeoSearchGeneratorResponse>(url, { timeoutMs: 14000 })
  const pages = Object.values(data.query?.pages ?? {})
  pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))

  return pages
    .filter((page) => page.coordinates?.[0] && !page.missing)
    .map((page): Place => {
      const coord = page.coordinates![0]
      return {
        id: `wiki:${page.pageid}`,
        name: page.title,
        lat: coord.lat,
        lon: coord.lon,
        category: 'other',
        source: 'wikipedia',
        description: page.extract?.trim() || undefined,
        thumbnail: page.thumbnail?.source,
        thumbnailCredit: 'Wikipedia / Wikimedia Commons',
        wikipediaTitle: page.title,
      }
    })
}

/** Wikipedia articles near a point, converted into places (fallback discovery). */
export async function wikiPlacesNear(
  lat: number,
  lon: number,
  radiusMeters: number,
  limit = 60,
): Promise<Place[]> {
  const results = await wikiGeosearch(lat, lon, radiusMeters, limit)
  if (results.length === 0) return []

  const summaries = await wikiSummariesByTitle(results.slice(0, 18).map((r) => r.title))

  return results.map((result): Place => {
    const summary = summaries.get(normalizeName(result.title))
    return {
      id: `wiki:${result.pageid}`,
      name: result.title,
      lat: result.lat,
      lon: result.lon,
      category: 'other',
      source: 'wikipedia',
      description: summary?.extract,
      thumbnail: summary?.thumbnail,
      thumbnailCredit: 'Wikipedia / Wikimedia Commons',
      wikipediaTitle: result.title,
      distanceKm: result.dist / 1000,
    }
  })
}

/** Builds a stable Wikimedia Commons image URL for an OSM image tag. */
export function commonsImageUrl(file: string, width = 900): string {
  const name = file.replace(/^File:/i, '').trim()
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=${width}`
}

export const WIKIPEDIA_ATTRIBUTION = {
  label: 'Wikipedia / Wikimedia Commons (CC BY-SA)',
  href: 'https://www.wikipedia.org/',
}
