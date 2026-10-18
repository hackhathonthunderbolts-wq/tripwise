import { Link } from 'react-router-dom'
import { Camera, CalendarDays, MapPin, Star } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { usePhotoUrl } from '@/hooks/usePhotoUrl'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Memory } from '@/types'

interface MemoryCardProps {
  memory: Memory
  onToggleFavourite?: (id: string) => void
  compact?: boolean
}

export function MemoryCard({ memory, onToggleFavourite, compact = false }: MemoryCardProps) {
  const coverUrl = usePhotoUrl(memory.coverPhotoId ?? memory.photoIds[0])

  return (
    <article className="tw-card overflow-hidden p-0">
      <Link to={`/memories/${memory.id}`} className="group block">
        <div
          className="relative w-full overflow-hidden bg-ivory-200"
          style={{ height: compact ? 144 : 180 }}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={memory.caption}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-charcoal-400">
              <Camera className="h-7 w-7" />
            </div>
          )}
          {memory.photoIds.length > 1 ? (
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-charcoal-900/70 px-2 py-0.5 text-xs text-ivory-50">
              <Camera className="h-3 w-3" /> {memory.photoIds.length}
            </span>
          ) : null}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-base text-charcoal-900">{memory.placeName}</h3>
            {onToggleFavourite ? (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault()
                  onToggleFavourite(memory.id)
                }}
                className={cn(
                  'shrink-0 rounded-full p-1 transition',
                  memory.favourite ? 'text-gold-500' : 'text-charcoal-300 hover:text-gold-500',
                )}
                aria-label={memory.favourite ? 'Remove favourite' : 'Mark favourite'}
                aria-pressed={memory.favourite}
              >
                <Star className={cn('h-4 w-4', memory.favourite && 'fill-current')} />
              </button>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-charcoal-600">{memory.caption}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-charcoal-500">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(memory.visitDate)}
            </span>
            {memory.lat !== undefined && memory.lon !== undefined ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                pinned
              </span>
            ) : null}
            {memory.mood ? <Badge tone="sage">{memory.mood}</Badge> : null}
          </div>
          {!compact && memory.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {memory.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="rounded-full bg-ivory-200 px-2 py-0.5 text-[0.7rem] text-charcoal-600">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </Link>
    </article>
  )
}
