const PREFIX = 'tripwise.v1.'

export function storageAvailable(): boolean {
  try {
    const probe = `${PREFIX}__probe`
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

export function storageKey(key: string): string {
  return `${PREFIX}${key}`
}

/**
 * Reads and validates persisted JSON. Malformed or outdated payloads are
 * discarded (returning the fallback) instead of crashing the app.
 */
export function loadJSON<T>(
  key: string,
  fallback: T,
  sanitize?: (value: unknown) => T | null,
): T {
  try {
    const raw = window.localStorage.getItem(storageKey(key))
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (sanitize) {
      const safe = sanitize(parsed)
      return safe === null ? fallback : safe
    }
    return (parsed as T) ?? fallback
  } catch {
    return fallback
  }
}

export interface SaveResult {
  ok: boolean
  error?: string
}

export function saveJSON(key: string, value: unknown): SaveResult {
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value))
    return { ok: true }
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === 'QuotaExceededError'
        ? 'Browser storage is full — remove some saved data to keep syncing.'
        : 'Changes could not be saved to this browser.'
    return { ok: false, error: message }
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(storageKey(key))
  } catch {
    // Ignore: nothing useful can be done if storage is unavailable.
  }
}

export const STORAGE_KEYS = {
  itinerary: 'itinerary',
  expenses: 'expenses',
  budget: 'budget',
  tripMeta: 'trip-meta',
  memories: 'memories',
} as const
