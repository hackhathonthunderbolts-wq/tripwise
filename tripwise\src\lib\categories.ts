import type { PlaceCategory } from '@/types'

export interface CategoryMeta {
  value: PlaceCategory
  label: string
  /** Overpass tag filter for this category (see services/api/overpass.ts). */
  overpass: string[]
  /** Default visit duration estimate, in minutes. Always presented as an estimate. */
  defaultVisitMinutes: number
  /** Default cost estimate in rupees. User editable, never official pricing. */
  defaultCost: number
  blurb: string
}

export const CATEGORY_META: Record<PlaceCategory, CategoryMeta> = {
  attraction: {
    value: 'attraction',
    label: 'Attractions',
    overpass: ['nwr[tourism~"^(attraction|theme_park|zoo|aquarium|artwork)$"]'],
    defaultVisitMinutes: 90,
    defaultCost: 300,
    blurb: 'Landmarks, theme parks, zoos and public art',
  },
  museum: {
    value: 'museum',
    label: 'Museums & galleries',
    overpass: ['nwr[tourism~"^(museum|gallery)$"]'],
    defaultVisitMinutes: 105,
    defaultCost: 250,
    blurb: 'Museums, galleries and exhibitions',
  },
  park: {
    value: 'park',
    label: 'Parks & gardens',
    overpass: ['nwr[leisure~"^(park|garden|nature_reserve)$"]'],
    defaultVisitMinutes: 60,
    defaultCost: 0,
    blurb: 'Urban parks, gardens and nature reserves',
  },
  beach: {
    value: 'beach',
    label: 'Beaches',
    overpass: ['nwr[natural=beach]', 'nwr[leisure=beach_resort]'],
    defaultVisitMinutes: 75,
    defaultCost: 0,
    blurb: 'Beaches and waterfronts',
  },
  historical: {
    value: 'historical',
    label: 'Historical',
    overpass: ['nwr[historic]'],
    defaultVisitMinutes: 60,
    defaultCost: 100,
    blurb: 'Forts, monuments, ruins and heritage sites',
  },
  viewpoint: {
    value: 'viewpoint',
    label: 'Viewpoints',
    overpass: ['nwr[tourism=viewpoint]'],
    defaultVisitMinutes: 30,
    defaultCost: 0,
    blurb: 'Lookouts and scenic points',
  },
  food: {
    value: 'food',
    label: 'Food & cafés',
    overpass: ['nwr[amenity~"^(restaurant|cafe)$"]'],
    defaultVisitMinutes: 60,
    defaultCost: 400,
    blurb: 'Restaurants and cafés',
  },
  other: {
    value: 'other',
    label: 'Other places',
    overpass: [],
    defaultVisitMinutes: 45,
    defaultCost: 0,
    blurb: 'Places that could not be categorised',
  },
}

export const FILTERABLE_CATEGORIES: PlaceCategory[] = [
  'attraction',
  'museum',
  'park',
  'beach',
  'historical',
  'viewpoint',
  'food',
]

export const CATEGORY_LIST: CategoryMeta[] = FILTERABLE_CATEGORIES.map(
  (key) => CATEGORY_META[key],
)

export function categoryLabel(category: PlaceCategory): string {
  return CATEGORY_META[category]?.label ?? CATEGORY_META.other.label
}

export function categoryVisitMinutes(category: PlaceCategory): number {
  return CATEGORY_META[category]?.defaultVisitMinutes ?? CATEGORY_META.other.defaultVisitMinutes
}

export function categoryCost(category: PlaceCategory): number {
  return CATEGORY_META[category]?.defaultCost ?? 0
}

/** Default exploration radius (metres) for a given available time budget. */
export function radiusForMinutes(minutes: number, mode: 'walking' | 'driving'): number {
  const speedKmh = mode === 'walking' ? 4.6 : 28
  const reachKm = (speedKmh * (minutes / 60)) / 2.2
  const clamped = Math.max(0.8, Math.min(25, reachKm))
  return Math.round(clamped * 1000)
}

export const DEFAULT_EXPLORE_CENTER = {
  label: 'Chennai, Tamil Nadu, India (default)',
  lat: 13.0827,
  lon: 80.2707,
}

export const CURRENCY_CODE = 'INR'

export const STOP_STATUS_META: Record<
  'planned' | 'visited' | 'skipped',
  { label: string; description: string }
> = {
  planned: { label: 'Planned', description: 'Still on the list' },
  visited: { label: 'Visited', description: 'You made it' },
  skipped: { label: 'Skipped', description: 'Missed or passed on this stop' },
}
