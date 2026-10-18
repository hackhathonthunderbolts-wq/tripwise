import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Pencil,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/States'
import { LeafletMap } from '@/components/map/LeafletMap'
import { MemoryFormModal } from '@/components/memories/MemoryFormModal'
import { useMemories } from '@/store/MemoriesStore'
import { useTrip } from '@/store/TripStore'
import { useToast } from '@/store/ToastStore'
import { usePhotoUrl } from '@/hooks/usePhotoUrl'
import { formatDate, formatDateTime } from '@/lib/format'
import { osmLink } from '@/lib/geo'
import { cn } from '@/lib/utils'

function GalleryImage({
  photoId,
  alt,
  active,
  onClick,
}: {
  photoId: string
  alt: string
  active: boolean
  onClick: () => void
}) {
  const url = usePhotoUrl(photoId)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition',
        active ? 'border-forest-500' : 'border-transparent opacity-70 hover:opacity-100',
      )}
      aria-label="Show photo"
    >
      {url ? <img src={url} alt={alt} className="h-full w-full object-cover" /> : null}
    </button>
  )
}

function HeroPhoto({ photoId, alt }: { photoId: string; alt: string }) {
  const url = usePhotoUrl(photoId)
  if (!url) {
    return <div className="grid h-72 w-full place-items-center bg-ivory-200 text-charcoal-400 sm:h-96">No photo</div>
  }
  return <img src={url} alt={alt} className="max-h-[70vh] w-full object-contain" />
}

export default function MemoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { memories, toggleFavourite, deleteMemory, photoStoreReady } = useMemories()
  const { stops } = useTrip()
  const { push } = useToast()

  const memory = useMemo(() => memories.find((item) => item.id === id) ?? null, [memories, id])

  const [activeIndex, setActiveIndex] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    setActiveIndex(0)
  }, [id])

  // Keyboard navigation inside the lightbox.
  useEffect(() => {
    if (!lightbox || !memory) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(false)
      if (event.key === 'ArrowRight') setActiveIndex((i) => (i + 1) % memory.photoIds.length)
      if (event.key === 'ArrowLeft')
        setActiveIndex((i) => (i - 1 + memory.photoIds.length) % memory.photoIds.length)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [lightbox, memory])

  if (!memory) {
    return (
      <PageContainer>
        <EmptyState
          title="Memory not found"
          description="It may have been deleted, or the link is out of date."
          action={
            <Link to="/memories">
              <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />}>
                Back to journal
              </Button>
            </Link>
          }
        />
      </PageContainer>
    )
  }

  const linkedStop = memory.stopId ? stops.find((stop) => stop.id === memory.stopId) : undefined
  const activePhotoId = memory.photoIds[activeIndex]

  return (
    <PageContainer size="wide">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/memories" className="inline-flex items-center gap-1.5 text-sm text-forest-700 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          All memories
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Star className={cn('h-4 w-4', memory.favourite && 'fill-current text-gold-500')} />}
            onClick={() => toggleFavourite(memory.id)}
          >
            {memory.favourite ? 'Favourite' : 'Favourite'}
          </Button>
          <Button variant="secondary" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <Card padded={false} className="overflow-hidden">
            <div className="bg-charcoal-900/95">
              {activePhotoId ? (
                <HeroPhoto photoId={activePhotoId} alt={memory.caption} />
              ) : (
                <div className="grid h-72 place-items-center text-ivory-200 sm:h-96">
                  <p className="text-sm">No photos attached to this memory.</p>
                </div>
              )}
            </div>
            {memory.photoIds.length > 1 ? (
              <div className="flex items-center gap-3 border-t border-sage-200 p-3">
                <div className="tw-scroll-thin flex flex-1 gap-2 overflow-x-auto">
                  {memory.photoIds.map((photoId, index) => (
                    <GalleryImage
                      key={photoId}
                      photoId={photoId}
                      alt={`${memory.caption} ${index + 1}`}
                      active={index === activeIndex}
                      onClick={() => setActiveIndex(index)}
                    />
                  ))}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setLightbox(true)}>
                  View full
                </Button>
              </div>
            ) : activePhotoId ? (
              <div className="border-t border-sage-200 p-3 text-right">
                <Button variant="ghost" size="sm" onClick={() => setLightbox(true)}>
                  View full
                </Button>
              </div>
            ) : null}
          </Card>

          {!photoStoreReady ? (
            <p className="mt-3 rounded-xl bg-clay-100 px-3 py-2 text-sm text-clay-600">
              Photos are stored in IndexedDB, which this browser blocked — images may not display here.
            </p>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-center gap-2 text-xs text-charcoal-500">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(memory.visitDate)}
              </span>
              {memory.mood ? <Badge tone="sage">{memory.mood}</Badge> : null}
              {memory.favourite ? <Badge tone="gold">Favourite</Badge> : null}
            </div>
            <h1 className="mt-2 text-2xl text-charcoal-900">{memory.placeName}</h1>
            <p className="mt-1 text-charcoal-600">{memory.caption}</p>

            {memory.note ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-charcoal-700">{memory.note}</p>
            ) : null}

            {memory.tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {memory.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-ivory-200 px-2.5 py-0.5 text-xs text-charcoal-600">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}

            <p className="mt-5 text-xs text-charcoal-400">
              Saved {formatDateTime(memory.createdAt)} · updated {formatDateTime(memory.updatedAt)}
            </p>
          </Card>

          {linkedStop ? (
            <Card>
              <h2 className="text-sm font-semibold text-charcoal-700">Linked itinerary stop</h2>
              <p className="mt-1 text-sm text-charcoal-600">{linkedStop.place.name}</p>
              <Link to="/trip" className="mt-2 inline-flex items-center gap-1 text-sm text-forest-700 hover:underline">
                Open in My Trip <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Card>
          ) : null}

          {memory.lat !== undefined && memory.lon !== undefined ? (
            <Card padded={false} className="overflow-hidden">
              <LeafletMap
                className="h-56"
                ariaLabel={`Map showing ${memory.placeName}`}
                center={{ lat: memory.lat, lon: memory.lon }}
                zoom={14}
                markers={[{ id: memory.id, lat: memory.lat, lon: memory.lon, label: memory.placeName }]}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs">
                <span className="inline-flex items-center gap-1 text-charcoal-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {memory.lat.toFixed(4)}, {memory.lon.toFixed(4)}
                </span>
                <a
                  href={osmLink(memory.lat, memory.lon)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium text-forest-600 underline"
                >
                  Open in OpenStreetMap
                </a>
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      {lightbox && activePhotoId ? (
        <div className="fixed inset-0 z-[1100] flex flex-col bg-charcoal-900/95">
          <div className="flex items-center justify-between p-3 text-ivory-100">
            <span className="text-sm">
              {activeIndex + 1} / {memory.photoIds.length} · {memory.placeName}
            </span>
            <button
              type="button"
              onClick={() => setLightbox(false)}
              className="rounded-lg p-2 hover:bg-white/10"
              aria-label="Close viewer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center gap-3 px-3 pb-6">
            {memory.photoIds.length > 1 ? (
              <button
                type="button"
                onClick={() => setActiveIndex((i) => (i - 1 + memory.photoIds.length) % memory.photoIds.length)}
                className="rounded-full bg-white/10 p-3 text-ivory-50 hover:bg-white/20"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            ) : null}
            <div className="flex max-h-full max-w-4xl items-center justify-center">
              <HeroPhoto photoId={activePhotoId} alt={memory.caption} />
            </div>
            {memory.photoIds.length > 1 ? (
              <button
                type="button"
                onClick={() => setActiveIndex((i) => (i + 1) % memory.photoIds.length)}
                className="rounded-full bg-white/10 p-3 text-ivory-50 hover:bg-white/20"
                aria-label="Next photo"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <MemoryFormModal open={editOpen} onClose={() => setEditOpen(false)} memory={memory} />

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete this memory?"
        description="The photos and story will be permanently removed from this browser."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                void deleteMemory(memory.id)
                push('Memory deleted.', 'info')
                navigate('/memories')
              }}
            >
              Delete memory
            </Button>
          </>
        }
      >
        <p className="text-sm text-charcoal-600">
          “{memory.caption}” at {memory.placeName} on {formatDate(memory.visitDate)} will be deleted. This cannot be undone.
        </p>
      </Modal>
    </PageContainer>
  )
}
