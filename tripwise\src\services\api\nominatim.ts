import { ApiError, fetchJson } from '@/services/api/client'
import { categoryFromOsmFields } from '@/services/api/osmCategory'
import type { Place } from '@/types'

interface NominatimPlace {
  place_id: number | string
  osm_type?: string
  osm_id?: number | string
  lat: string
  lon: string
  name?: string
  display_name: string
  category?: string
  type?: string
  address?: Record<string, string>
  addresstype?: string
}

interface NominatimReverse {
  name?: string
  display_name?: string
  category?: string
  type?: string
  address?: Record<string, string>
  addresstype?: string
}

const BASE = 'https://nominatim.openstreetmap.org'
const email = (import.meta.env?.VITE_NOMINATIM_EMAIL as string | undefined) ?? ''

function buildSearchUrl(params: Record<string, string>): string {
  const query = new URLSearchParams({ format: 'jsonv2', ...params })
  if (email) query.set('email', email)
  return `${BASE}/search?${query.toString()}`
}

function cityFromAddress(address?: Record<string, string>): string | undefined {
  if (!address) return undefined
  return (
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.county ??
    address.state_district ??
    address.state
  )
}

/**
 * Forward geocoding for the destination search box. Nominatim is a real
 * OpenStreetMap service and returns genuine places with coordinates,
 * categories and addresses.
 */
export async function searchPlaces(query: string, limit = 6): Promise<Place[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const url = buildSearchUrl({ q: trimmed, limit: String(limit), addressdetails: '1' })
  const rows = await fetchJson<NominatimPlace[]>(url, { timeoutMs: 12000 })

  if (!Array.isArray(rows)) {
    throw new ApiError('Unexpected Nominatim response', 'parse', { endpoint: url })
  }

  return rows
    .map((row): Place | null => {
      const lat = Number.parseFloat(row.lat)
      const lon = Number.parseFloat(row.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
      const name = row.name?.trim() || row.display_name.split(',')[0]?.trim() || 'Unnamed place'
      return {
        id: `osm:${row.osm_type ?? 'place'}/${row.osm_id ?? row.place_id}`,
        name,
        lat,
        lon,
        category: categoryFromOsmFields(row.category, row.type),
        source: 'nominatim',
        address: row.display_name,
        city: cityFromAddress(row.address),
        country: row.address?.country,
        tags: row.type ? { osmCategory: row.category ?? '', osmType: row.type } : undefined,
      }
    })
    .filter((place): place is Place => place !== null)
}

export interface ReverseResult {
  address?: string
  city?: string
  country?: string
  categoryLabel?: string
}

/** Reverse geocoding for destination details (used to fill in missing metadata). */
export async function reverseGeocode(lat: number, lon: number): Promise<ReverseResult> {
  const query = new URLSearchParams({
    format: 'jsonv2',
    lat: String(lat),
    lon: String(lon),
    addressdetails: '1',
    zoom: '16',
  })
  if (email) query.set('email', email)
  const url = `${BASE}/reverse?${query.toString()}`
  const row = await fetchJson<NominatimReverse>(url, { timeoutMs: 10000 })
  return {
    address: row.display_name,
    city: cityFromAddress(row.address),
    country: row.address?.country,
    categoryLabel: row.type ? `${row.category ?? 'place'} · ${row.type}` : undefined,
  }
}

export const NOMINATIM_ATTRIBUTION = {
  label: 'Nominatim / OpenStreetMap',
  href: 'https://nominatim.org/',
}
