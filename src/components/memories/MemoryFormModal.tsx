import { useEffect, useMemo, useState } from 'react'
import { ImagePlus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useTrip } from '@/store/TripStore'
import { useMemories, type MemoryDraft } from '@/store/MemoriesStore'
import { useToast } from '@/store/ToastStore'
import { usePhotoUrl } from '@/hooks/usePhotoUrl'
import {
  MAX_PHOTOS_PER_MEMORY,
  parseTags,
  validateMemoryInput,
  validatePhotoFiles,
} from '@/lib/validation'
import { todayISO } from '@/lib/format'
import type { Memory } from '@/types'

const MOODS = ['happy', 'relaxed', 'excited', 'amazed', 'tired', 'thoughtful'] as const

function StoredPhotoThumb({ photoId, onRemove }: { photoId: string; onRemove: () => void }) {
  const url = usePhotoUrl(photoId)
  return (
    <div className="group relative h-20 w-20 overflow-hidden rounded-lg border border-sage-200 bg-ivory-100">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-full bg-charcoal-900/70 p-1 text-ivory-50 opacity-0 transition group-hover:opacity-100 focus:opacity-100"
        aria-label="Remove photo"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function NewPhotoThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])
  return (
    <div className="group relative h-20 w-20 overflow-hidden rounded-lg border border-dashed border-forest-300 bg-forest-50">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 rounded-full bg-charcoal-900/70 p-1 text-ivory-50 opacity-0 transition group-hover:opacity-100 focus:opacity-100"
        aria-label="Remove photo"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface MemoryFormModalProps {
  open: boolean
  onClose: () => void
  memory?: Memory | null
  defaultStopId?: string
  onSaved?: (memory: Memory) => void
}

export function MemoryFormModal({
  open,
  onClose,
  memory,
  defaultStopId,
  onSaved,
}: MemoryFormModalProps) {
  const { stops } = useTrip()
  const { saveMemory, photoStoreReady } = useMemories()
  const { push } = useToast()

  const [placeName, setPlaceName] = useState('')
  const [stopId, setStopId] = useState('')
  const [visitDate, setVisitDate] = useState(todayISO())
  const [caption, setCaption] = useState('')
  const [note, setNote] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [mood, setMood] = useState('')
  const [favourite, setFavourite] = useState(false)
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const existingPhotos = useMemo(
    () => (memory ? memory.photoIds.filter((id) => !removedPhotoIds.includes(id)) : []),
    [memory, removedPhotoIds],
  )
  const totalPhotos = existingPhotos.length + newFiles.length

  useEffect(() => {
    if (!open) return
    if (memory) {
      setPlaceName(memory.placeName)
      setStopId(memory.stopId ?? '')
      setVisitDate(memory.visitDate)
      setCaption(memory.caption)
      setNote(memory.note)
      setTagsText(memory.tags.join(', '))
      setMood(memory.mood ?? '')
      setFavourite(memory.favourite)
    } else {
      const linkedStop = defaultStopId
        ? stops.find((stop) => stop.id === defaultStopId)
        : undefined
      setPlaceName(linkedStop?.place.name ?? '')
      setStopId(linkedStop?.id ?? '')
      setVisitDate(todayISO())
      setCaption('')
      setNote('')
      setTagsText('')
      setMood('')
      setFavourite(false)
    }
    setNewFiles([])
    setRemovedPhotoIds([])
    setErrors({})
  }, [open, memory, defaultStopId, stops])

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return
    const { valid, rejected } = validatePhotoFiles(Array.from(fileList), totalPhotos)
    if (rejected.length > 0) {
      push(
        `${rejected.length} file${rejected.length === 1 ? '' : 's'} skipped: ${rejected[0]?.reason ?? ''}`,
        'warning',
      )
    }
    setNewFiles((current) => [...current, ...valid])
  }

  async function handleSubmit() {
    const validation = validateMemoryInput({ placeName, caption, note, visitDate })
    setErrors(validation)
    if (Object.keys(validation).length > 0) return

    const linkedStop = stopId ? stops.find((stop) => stop.id === stopId) : undefined
    const draft: MemoryDraft = {
      placeName: placeName.trim(),
      lat: linkedStop?.place.lat,
      lon: linkedStop?.place.lon,
      stopId: stopId || undefined,
      caption: caption.trim(),
      note: note.trim(),
      visitDate,
      tags: parseTags(tagsText),
      mood: mood || undefined,
      favourite,
    }

    setSaving(true)
    const result = await saveMemory(draft, newFiles, {
      id: memory?.id,
      removedPhotoIds,
    })
    setSaving(false)

    if (result) {
      push(memory ? 'Memory updated.' : 'Memory saved to your journal.', 'success')
      onSaved?.(result)
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={memory ? 'Edit memory' : 'New memory'}
      description="Everything is stored locally in this browser. Photos live in IndexedDB, text in localStorage."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} loading={saving}>
            {memory ? 'Save changes' : 'Save memory'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Link to an itinerary stop" htmlFor="memory-stop" hint="Optional — fills place and location">
            <Select
              id="memory-stop"
              value={stopId}
              onChange={(event) => {
                const value = event.target.value
                setStopId(value)
                const linked = stops.find((stop) => stop.id === value)
                if (linked) setPlaceName(linked.place.name)
              }}
            >
              <option value="">Not linked</option>
              {stops.map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.place.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Place" htmlFor="memory-place" error={errors.placeName} required>
            <Input
              id="memory-place"
              data-autofocus
              placeholder="e.g. Marina Beach"
              value={placeName}
              onChange={(event) => setPlaceName(event.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Visit date" htmlFor="memory-date" error={errors.visitDate} required>
            <Input
              id="memory-date"
              type="date"
              value={visitDate}
              max={todayISO()}
              onChange={(event) => setVisitDate(event.target.value)}
            />
          </Field>
          <Field label="Mood" htmlFor="memory-mood" hint="Optional">
            <Select id="memory-mood" value={mood} onChange={(event) => setMood(event.target.value)}>
              <option value="">No mood</option>
              {MOODS.map((value) => (
                <option key={value} value={value}>
                  {value[0]?.toUpperCase()}
                  {value.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tags" htmlFor="memory-tags" hint="Comma separated, max 8">
            <Input
              id="memory-tags"
              placeholder="beach, sunset"
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
            />
          </Field>
        </div>

        <Field label="Caption" htmlFor="memory-caption" error={errors.caption} required>
          <Input
            id="memory-caption"
            maxLength={120}
            placeholder="One line you'll remember it by"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
          />
        </Field>

        <Field label="Your story" htmlFor="memory-note" error={errors.note} hint="Optional, up to 2000 characters">
          <Textarea
            id="memory-note"
            rows={4}
            placeholder="What happened? Who were you with? What surprised you?"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>

        <div>
          <p className="text-sm font-medium text-charcoal-700">
            Photos <span className="text-charcoal-400">({totalPhotos}/{MAX_PHOTOS_PER_MEMORY})</span>
          </p>
          {!photoStoreReady ? (
            <p className="mt-1 text-xs text-clay-600">
              IndexedDB is unavailable, so photos cannot be saved in this browser. Text still saves.
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {existingPhotos.map((photoId) => (
              <StoredPhotoThumb
                key={photoId}
                photoId={photoId}
                onRemove={() => setRemovedPhotoIds((current) => [...current, photoId])}
              />
            ))}
            {newFiles.map((file, index) => (
              <NewPhotoThumb
                key={`${file.name}-${index}`}
                file={file}
                onRemove={() => setNewFiles((current) => current.filter((_, i) => i !== index))}
              />
            ))}
            {totalPhotos < MAX_PHOTOS_PER_MEMORY && photoStoreReady ? (
              <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-lg border border-dashed border-sage-300 text-charcoal-500 transition hover:border-forest-400 hover:text-forest-700">
                <span className="flex flex-col items-center gap-1 text-xs">
                  <ImagePlus className="h-5 w-5" />
                  Add
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="sr-only"
                  onChange={(event) => handleFiles(event.target.files)}
                />
              </label>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-charcoal-400">
            JPEG, PNG, WebP or GIF · up to 6 MB each. HEIC isn’t supported by browsers.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-charcoal-700">
          <input
            type="checkbox"
            checked={favourite}
            onChange={(event) => setFavourite(event.target.checked)}
            className="h-4 w-4 rounded border-sage-300 text-forest-600"
          />
          Mark as favourite
        </label>
      </div>
    </Modal>
  )
}

export function MemoryDeleteButton({
  onConfirm,
  label = 'Delete',
}: {
  onConfirm: () => void
  label?: string
}) {
  return (
    <Button variant="danger" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={onConfirm}>
      {label}
    </Button>
  )
}
