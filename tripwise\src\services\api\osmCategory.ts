import type { PlaceCategory } from '@/types'

/**
 * Maps OpenStreetMap tags (as used by Overpass and Nominatim) onto the small
 * set of categories TripWise can filter by. Anything unknown becomes `other`
 * instead of being guessed.
 */
export function categoryFromOsmTags(tags: Record<string, string>): PlaceCategory {
  if (tags.tourism === 'viewpoint') return 'viewpoint'
  if (tags.tourism === 'museum' || tags.tourism === 'gallery') return 'museum'
  if (
    tags.tourism === 'attraction' ||
    tags.tourism === 'theme_park' ||
    tags.tourism === 'zoo' ||
    tags.tourism === 'aquarium' ||
    tags.tourism === 'artwork'
  ) {
    return 'attraction'
  }
  if (tags.natural === 'beach') return 'beach'
  if (tags.leisure === 'beach_resort') return 'beach'
  if (tags.leisure === 'park' || tags.leisure === 'garden' || tags.leisure === 'nature_reserve') {
    return 'park'
  }
  if (tags.historic) return 'historical'
  if (tags.amenity === 'restaurant' || tags.amenity === 'cafe') return 'food'
  return 'other'
}

export function categoryFromOsmFields(
  osmCategory?: string,
  osmType?: string,
): PlaceCategory {
  return categoryFromOsmTags({
    ...(osmCategory ? { [osmCategory]: osmType ?? '' } : {}),
  })
}
