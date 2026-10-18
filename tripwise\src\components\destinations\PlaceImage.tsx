import { useState } from 'react'
import {
  Castle,
  Landmark,
  Mountain,
  Store,
  TreePine,
  UtensilsCrossed,
  ImageOff,
  Waves,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { categoryLabel } from '@/lib/categories'
import type { PlaceCategory } from '@/types'

const CATEGORY_ICONS: Record<PlaceCategory, typeof Landmark> = {
  attraction: Landmark,
  museum: Store,
  park: TreePine,
  beach: Waves,
  historical: Castle,
  viewpoint: Mountain,
  food: UtensilsCrossed,
  other: Landmark,
}

export function PlaceImage({
  src,
  alt,
  category,
  credit,
  className,
  sizes,
}: {
  src?: string
  alt: string
  category: PlaceCategory
  credit?: string
  className?: string
  sizes?: string
}) {
  const [failed, setFailed] = useState(false)
  const Icon = CATEGORY_ICONS[category] ?? Landmark
  const showImage = Boolean(src) && !failed

  return (
    <div className={cn('relative overflow-hidden bg-sage-100', className)}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          sizes={sizes}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
        />
      ) : (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[linear-gradient(140deg,#e8efe9_0%,#d5e1d8_55%,#b9cbbd_100%)] text-forest-700"
          role="img"
          aria-label={`${alt} — no photo available from the data source`}
        >
          <Icon className="h-8 w-8" aria-hidden />
          <span className="px-4 text-center text-[0.7rem] font-medium uppercase tracking-wider text-forest-700/80">
            {categoryLabel(category)} · no photo from source
          </span>
        </div>
      )}
      {showImage && credit ? (
        <span className="absolute bottom-1 right-1 rounded bg-charcoal-900/60 px-1.5 py-0.5 text-[0.6rem] text-ivory-50">
          {credit}
        </span>
      ) : null}
    </div>
  )
}

export function NoImageNote({ category }: { category: PlaceCategory }) {
  const Icon = CATEGORY_ICONS[category] ?? ImageOff
  return (
    <span className="inline-flex items-center gap-1 text-xs text-charcoal-500">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      No photo provided by the source
    </span>
  )
}
