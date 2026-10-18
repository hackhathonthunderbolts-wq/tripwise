import { describe, expect, it } from 'vitest'
import {
  MAX_PHOTOS_PER_MEMORY,
  parseTags,
  validateMemoryInput,
  validatePhotoFiles,
} from '@/lib/validation'

function makeFile(name: string, type: string, bytes = 1024): File {
  return new File([new Uint8Array(bytes)], name, { type })
}

describe('validateMemoryInput', () => {
  const valid = {
    placeName: 'Marina Beach',
    caption: 'Golden hour',
    note: 'Walked the whole shoreline.',
    visitDate: '2024-02-10',
  }

  it('accepts a complete memory', () => {
    expect(validateMemoryInput(valid)).toEqual({})
  })

  it('requires a place and a caption', () => {
    const errors = validateMemoryInput({ ...valid, placeName: '  ', caption: '' })
    expect(errors.placeName).toBeDefined()
    expect(errors.caption).toBeDefined()
  })

  it('rejects captions longer than 120 characters', () => {
    const errors = validateMemoryInput({ ...valid, caption: 'x'.repeat(121) })
    expect(errors.caption).toMatch(/120/)
  })

  it('rejects future visit dates', () => {
    const future = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
    const errors = validateMemoryInput({ ...valid, visitDate: future })
    expect(errors.visitDate).toBeDefined()
  })

  it('rejects malformed dates', () => {
    const errors = validateMemoryInput({ ...valid, visitDate: '10/02/2024' })
    expect(errors.visitDate).toBeDefined()
  })
})

describe('parseTags', () => {
  it('lowercases, trims, de-duplicates and caps the list at 8', () => {
    const tags = parseTags(' Beach, beach, SUNSET, , a, b, c, d, e, f, g ')
    expect(tags).toContain('beach')
    expect(tags).toContain('sunset')
    expect(new Set(tags).size).toBe(tags.length)
    expect(tags.length).toBeLessThanOrEqual(8)
  })

  it('drops tags longer than 24 characters', () => {
    const tags = parseTags('ok, ' + 'z'.repeat(25))
    expect(tags).toEqual(['ok'])
  })
})

describe('validatePhotoFiles', () => {
  it('accepts supported image types', () => {
    const { valid, rejected } = validatePhotoFiles([
      makeFile('a.jpg', 'image/jpeg'),
      makeFile('b.png', 'image/png'),
    ])
    expect(valid).toHaveLength(2)
    expect(rejected).toHaveLength(0)
  })

  it('rejects non-image and HEIC files', () => {
    const { valid, rejected } = validatePhotoFiles([
      makeFile('notes.pdf', 'application/pdf'),
      makeFile('photo.heic', 'image/heic'),
    ])
    expect(valid).toHaveLength(0)
    expect(rejected).toHaveLength(2)
    expect(rejected.some((item) => /HEIC/.test(item.reason))).toBe(true)
  })

  it('rejects files larger than the 6 MB cap', () => {
    const { valid, rejected } = validatePhotoFiles([
      makeFile('huge.jpg', 'image/jpeg', 6 * 1024 * 1024 + 1),
    ])
    expect(valid).toHaveLength(0)
    expect(rejected[0]?.reason).toMatch(/MB/)
  })

  it('enforces the per-memory photo limit', () => {
    const files = Array.from({ length: MAX_PHOTOS_PER_MEMORY + 2 }, (_, index) =>
      makeFile(`p${index}.jpg`, 'image/jpeg'),
    )
    const { valid, rejected } = validatePhotoFiles(files, 0)
    expect(valid).toHaveLength(MAX_PHOTOS_PER_MEMORY)
    expect(rejected).toHaveLength(2)
  })

  it('respects remaining capacity when photos already exist', () => {
    const { valid } = validatePhotoFiles(
      [makeFile('x.jpg', 'image/jpeg'), makeFile('y.jpg', 'image/jpeg')],
      MAX_PHOTOS_PER_MEMORY - 1,
    )
    expect(valid).toHaveLength(1)
  })
})
