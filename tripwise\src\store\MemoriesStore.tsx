import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/services/storage/localStore'
import { sanitizeMemories } from '@/services/storage/schemas'
import {
  deletePhoto,
  deletePhotosForMemory,
  isPhotoStoreAvailable,
  putPhoto,
} from '@/services/storage/photoStore'
import { uid } from '@/lib/utils'
import { MAX_PHOTOS_PER_MEMORY } from '@/lib/validation'
import { useToast } from '@/store/ToastStore'
import type { Memory, PhotoRecord } from '@/types'

export interface MemoryDraft {
  placeName: string
  lat?: number
  lon?: number
  stopId?: string
  destinationId?: string
  caption: string
  note: string
  visitDate: string
  tags: string[]
  mood?: string
  favourite?: boolean
}

interface MemoriesContextValue {
  memories: Memory[]
  photoStoreReady: boolean
  saveMemory: (
    draft: MemoryDraft,
    files: File[],
    options?: { id?: string; removedPhotoIds?: string[] },
  ) => Promise<Memory | null>
  deleteMemory: (id: string) => Promise<void>
  toggleFavourite: (id: string) => void
  addPhotos: (memoryId: string, files: File[]) => Promise<number>
  removePhoto: (memoryId: string, photoId: string) => Promise<void>
  memoryCount: number
  photoCount: number
}

const MemoriesContext = createContext<MemoriesContextValue | null>(null)

export function MemoriesProvider({ children }: { children: ReactNode }) {
  const { push } = useToast()
  const [memories, setMemories] = useState<Memory[]>(() =>
    loadJSON(STORAGE_KEYS.memories, [], sanitizeMemories),
  )
  const [photoStoreReady, setPhotoStoreReady] = useState(true)
  const [photoCount, setPhotoCount] = useState(0)
  const hydrated = useRef(false)

  useEffect(() => {
    let active = true
    isPhotoStoreAvailable().then((available) => {
      if (!active) return
      setPhotoStoreReady(available)
      if (!available) {
        push(
          'This browser blocked IndexedDB, so photos cannot be stored locally. Notes and captions still work.',
          'error',
        )
      }
    })
    return () => {
      active = false
    }
  }, [push])

  useEffect(() => {
    const result = saveJSON(STORAGE_KEYS.memories, memories)
    if (hydrated.current && !result.ok) {
      push(result.error ?? 'Memories could not be saved.', 'error')
    }
    hydrated.current = true
  }, [memories, push])

  const refreshPhotoCount = useCallback(() => {
    setPhotoCount(memories.reduce((sum, memory) => sum + memory.photoIds.length, 0))
  }, [memories])

  useEffect(() => {
    refreshPhotoCount()
  }, [refreshPhotoCount])

  const saveMemory = useCallback<MemoriesContextValue['saveMemory']>(
    async (draft, files, options = {}) => {
      const memoryId = options.id ?? uid('mem')
      const now = new Date().toISOString()
      const existing = memories.find((memory) => memory.id === memoryId)

      try {
        const storedIds: string[] = []
        if (files.length > 0) {
          if (!photoStoreReady) {
            push('Photo storage is unavailable in this browser — the memory was saved without photos.', 'warning')
          } else {
            for (const file of files.slice(0, MAX_PHOTOS_PER_MEMORY)) {
              const record = await putPhoto(memoryId, file, file.name)
              storedIds.push(record.id)
            }
          }
        }

        if (options.removedPhotoIds?.length) {
          await Promise.all(options.removedPhotoIds.map((id) => deletePhoto(id)))
        }

        const remainingPhotos = existing
          ? existing.photoIds.filter((id) => !(options.removedPhotoIds ?? []).includes(id))
          : []
        const photoIds = [...remainingPhotos, ...storedIds]

        const memory: Memory = {
          id: memoryId,
          placeName: draft.placeName,
          lat: draft.lat,
          lon: draft.lon,
          stopId: draft.stopId,
          destinationId: draft.destinationId,
          caption: draft.caption,
          note: draft.note,
          visitDate: draft.visitDate,
          tags: draft.tags,
          mood: draft.mood,
          photoIds,
          coverPhotoId:
            existing?.coverPhotoId && photoIds.includes(existing.coverPhotoId)
              ? existing.coverPhotoId
              : photoIds[0],
          favourite: draft.favourite ?? existing?.favourite ?? false,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        }

        setMemories((current) =>
          current.some((item) => item.id === memoryId)
            ? current.map((item) => (item.id === memoryId ? memory : item))
            : [memory, ...current],
        )

        return memory
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'The memory could not be saved.'
        push(`Saving failed: ${message}`, 'error')
        return null
      }
    },
    [memories, photoStoreReady, push],
  )

  const deleteMemory = useCallback<MemoriesContextValue['deleteMemory']>(
    async (id) => {
      try {
        await deletePhotosForMemory(id)
      } catch {
        push('Photos could not be removed from browser storage.', 'warning')
      }
      setMemories((current) => current.filter((memory) => memory.id !== id))
    },
    [push],
  )

  const toggleFavourite = useCallback((id: string) => {
    setMemories((current) =>
      current.map((memory) =>
        memory.id === id
          ? { ...memory, favourite: !memory.favourite, updatedAt: new Date().toISOString() }
          : memory,
      ),
    )
  }, [])

  const addPhotos = useCallback<MemoriesContextValue['addPhotos']>(
    async (memoryId, files) => {
      if (!photoStoreReady || files.length === 0) return 0
      const existing = memories.find((memory) => memory.id === memoryId)
      const room = MAX_PHOTOS_PER_MEMORY - (existing?.photoIds.length ?? 0)
      const accepted = files.slice(0, Math.max(0, room))
      if (accepted.length === 0) {
        push(`Each memory can hold up to ${MAX_PHOTOS_PER_MEMORY} photos.`, 'warning')
        return 0
      }
      try {
        const records: PhotoRecord[] = []
        for (const file of accepted) {
          records.push(await putPhoto(memoryId, file, file.name))
        }
        setMemories((current) =>
          current.map((memory) => {
            if (memory.id !== memoryId) return memory
            const photoIds = [...memory.photoIds, ...records.map((record) => record.id)]
            return {
              ...memory,
              photoIds,
              coverPhotoId: memory.coverPhotoId ?? photoIds[0],
              updatedAt: new Date().toISOString(),
            }
          }),
        )
        return records.length
      } catch {
        push('The photos could not be stored in this browser.', 'error')
        return 0
      }
    },
    [memories, photoStoreReady, push],
  )

  const removePhoto = useCallback<MemoriesContextValue['removePhoto']>(
    async (memoryId, photoId) => {
      try {
        await deletePhoto(photoId)
      } catch {
        push('The photo could not be deleted from browser storage.', 'warning')
      }
      setMemories((current) =>
        current.map((memory) => {
          if (memory.id !== memoryId) return memory
          const photoIds = memory.photoIds.filter((id) => id !== photoId)
          return {
            ...memory,
            photoIds,
            coverPhotoId: memory.coverPhotoId === photoId ? photoIds[0] : memory.coverPhotoId,
            updatedAt: new Date().toISOString(),
          }
        }),
      )
    },
    [push],
  )

  const value = useMemo<MemoriesContextValue>(
    () => ({
      memories,
      photoStoreReady,
      saveMemory,
      deleteMemory,
      toggleFavourite,
      addPhotos,
      removePhoto,
      memoryCount: memories.length,
      photoCount,
    }),
    [
      memories,
      photoStoreReady,
      saveMemory,
      deleteMemory,
      toggleFavourite,
      addPhotos,
      removePhoto,
      photoCount,
    ],
  )

  return <MemoriesContext.Provider value={value}>{children}</MemoriesContext.Provider>
}

export function useMemories(): MemoriesContextValue {
  const context = useContext(MemoriesContext)
  if (!context) throw new Error('useMemories must be used inside <MemoriesProvider>')
  return context
}
