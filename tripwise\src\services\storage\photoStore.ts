import { openDB, type IDBPDatabase } from 'idb'
import { uid } from '@/lib/utils'
import type { PhotoRecord } from '@/types'

const DB_NAME = 'tripwise-media'
const DB_VERSION = 1
const STORE = 'photos'

let dbPromise: Promise<IDBPDatabase<unknown>> | null = null

function getDb(): Promise<IDBPDatabase<unknown>> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' })
          store.createIndex('by-memory', 'memoryId')
        }
      },
    }).catch((error) => {
      dbPromise = null
      throw error
    })
  }
  return dbPromise
}

export async function isPhotoStoreAvailable(): Promise<boolean> {
  try {
    await getDb()
    return true
  } catch {
    return false
  }
}

/** Stores the actual image bytes (never localStorage) and returns metadata. */
export async function putPhoto(memoryId: string, file: File | Blob, name?: string): Promise<PhotoRecord> {
  const db = await getDb()
  const record: PhotoRecord = {
    id: uid('photo'),
    memoryId,
    blob: file,
    name: name ?? (file instanceof File ? file.name : 'photo'),
    type: file.type || 'image/jpeg',
    size: file.size,
    createdAt: new Date().toISOString(),
  }
  await db.put(STORE, record)
  return record
}

export async function getPhoto(id: string): Promise<PhotoRecord | undefined> {
  const db = await getDb()
  return (await db.get(STORE, id)) as PhotoRecord | undefined
}

export async function listPhotosForMemory(memoryId: string): Promise<PhotoRecord[]> {
  const db = await getDb()
  const index = db.transaction(STORE).store.index('by-memory')
  return (await index.getAll(memoryId)) as PhotoRecord[]
}

export async function listAllPhotos(): Promise<PhotoRecord[]> {
  const db = await getDb()
  return (await db.getAll(STORE)) as PhotoRecord[]
}

export async function countPhotos(): Promise<number> {
  const db = await getDb()
  return db.count(STORE)
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE, id)
}

export async function deletePhotosForMemory(memoryId: string): Promise<void> {
  const db = await getDb()
  const records = await listPhotosForMemory(memoryId)
  const tx = db.transaction(STORE, 'readwrite')
  await Promise.all([...records.map((record) => tx.store.delete(record.id)), tx.done])
}

export async function deletePhotos(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = await getDb()
  const tx = db.transaction(STORE, 'readwrite')
  await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done])
}

/** Revokes object URLs safely (no-op when the URL is already released). */
export function revokeUrl(url?: string): void {
  if (!url) return
  try {
    URL.revokeObjectURL(url)
  } catch {
    // ignore
  }
}

export function createObjectUrl(blob: Blob): string | null {
  try {
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}
