export const MAX_PHOTOS_PER_MEMORY = 6
export const MAX_PHOTO_BYTES = 6 * 1024 * 1024 // 6 MB
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export interface PhotoValidation {
  valid: File[]
  rejected: { name: string; reason: string }[]
}

export function validatePhotoFiles(
  files: File[],
  existingCount = 0,
  maxPhotos: number = MAX_PHOTOS_PER_MEMORY,
): PhotoValidation {
  const valid: File[] = []
  const rejected: { name: string; reason: string }[] = []

  for (const file of files) {
    if (existingCount + valid.length >= maxPhotos) {
      rejected.push({ name: file.name, reason: `Limit of ${maxPhotos} photos per memory reached` })
      continue
    }
    const type = (file.type || '').toLowerCase()
    const looksLikeImage = type.startsWith('image/')
    if (!looksLikeImage || !ACCEPTED_PHOTO_TYPES.includes(type)) {
      const isHeic = /heic|heif/i.test(type) || /\.(heic|heif)$/i.test(file.name)
      rejected.push({
        name: file.name,
        reason: isHeic
          ? 'HEIC/HEIF is not supported by browsers — export as JPEG first'
          : 'Unsupported file type (use JPEG, PNG, WebP or GIF)',
      })
      continue
    }
    if (file.size <= 0) {
      rejected.push({ name: file.name, reason: 'File appears to be empty' })
      continue
    }
    if (file.size > MAX_PHOTO_BYTES) {
      rejected.push({
        name: file.name,
        reason: `Larger than ${Math.round(MAX_PHOTO_BYTES / (1024 * 1024))} MB`,
      })
      continue
    }
    if (valid.some((f) => f.name === file.name && f.size === file.size)) {
      rejected.push({ name: file.name, reason: 'Duplicate of a file already selected' })
      continue
    }
    valid.push(file)
  }

  return { valid, rejected }
}

export interface MemoryInput {
  placeName: string
  caption: string
  note: string
  visitDate: string
}

export function validateMemoryInput(input: MemoryInput): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!input.placeName.trim()) {
    errors.placeName = 'Pick an itinerary stop or enter where this memory was made.'
  }
  if (!input.caption.trim()) {
    errors.caption = 'Add a short caption so the photo makes sense later.'
  } else if (input.caption.trim().length > 120) {
    errors.caption = 'Keep the caption under 120 characters.'
  }
  if (input.note.length > 2000) {
    errors.note = 'Keep your story under 2000 characters.'
  }
  if (!input.visitDate) {
    errors.visitDate = 'Choose the date you visited.'
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.visitDate)) {
    errors.visitDate = 'Use a valid date.'
  } else if (new Date(input.visitDate).getTime() > Date.now() + 86_400_000) {
    errors.visitDate = 'Visit date cannot be in the future.'
  }
  return errors
}

export function parsePositiveNumber(value: string, fallback = 0): number {
  const parsed = Number.parseFloat(value.replace(/[^\d.-]/g, ''))
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return parsed
}

export function parseTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0 && tag.length <= 24),
    ),
  ).slice(0, 8)
}
