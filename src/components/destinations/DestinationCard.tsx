import { Link } from 'react-router-dom'
import { ArrowRight, Clock, MapPin } from 'lucide-react'
import { PlaceImage } from '@/components/destinations/PlaceImage'
import { AddToTripButton } from '@/components/destinations/AddToTripButton'
import { Badge } from '@/components/ui/Badge'
import { categoryLabel, categoryVisitMinutes } from '@/lib/categories'
import { formatDistanceKm, formatDuration } from '@/lib/format'
import { truncate } from '@/lib/utils'
import type { Place } from '@/types'

export function destinationHref(place: Place): string {
  const params = new URLSearchParams({
    name: place.name,
    category: place.category,
  })
  if (place.wikipediaTitle) params.set('wiki', place.wikipediaTitle)
  return `/destination/${place.lat.toFixed(5)},${place.lon.toFixed(5)}?${params.toString()}`
}

export function DestinationCard({ place }: { place: Place }) {
  const sourceLabel =
    place.source === 'wikipedia' ? 'Wikipedia' : place.source === 'nominatim' ? 'OSM search' : 'OpenStreetMap'

  return (
    <article className="tw-card group flex h-full flex-col overflow-hidden p-0 transition-shadow duration-200 hover:shadow-lift">
      <Link to={destinationHref(place)} className="block" aria-label={`Open details for ${place.name}`}>
        <PlaceImage
          src={place.thumbnail}
          alt={place.name}
          category={place.category}
          credit={place.thumbnailCredit}
          className="h-44 w-full"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="forest">{categoryLabel(place.category)}</Badge>
          {place.distanceKm !== undefined ? (
            <Badge tone="outline" icon={<MapPin className="h-3 w-3" aria-hidden />}>
              {formatDistanceKm(place.distanceKm)}
            </Badge>
          ) : null}
        </div>

        <h3 className="mt-3 text-lg leading-snug">
          <Link to={destinationHref(place)} className="hover:text-forest-700">
            {place.name}
          </Link>
        </h3>

        <p className="mt-1 text-xs text-charcoal-500">
          {place.city ? `${place.city} · ` : ''}
          {sourceLabel}
        </p>

        {place.description ? (
          <p className="mt-3 text-sm leading-relaxed text-charcoal-600">
            {truncate(place.description, 150)}
          </p>
        ) : (
          <p className="mt-3 text-sm italic text-charcoal-500">
            No description available from the data source for this place.
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-xs text-charcoal-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            Suggested {formatDuration(categoryVisitMinutes(place.category))}
            <span className="text-charcoal-500/80">(estimate)</span>
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            to={destinationHref(place)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sage-200 bg-white px-3 text-sm font-medium text-charcoal-800 transition hover:bg-sage-50"
          >
            View details
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <AddToTripButton place={place} label="Add to trip" />
        </div>
      </div>
    </article>
  )
}
