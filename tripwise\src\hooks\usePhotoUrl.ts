import { getPhoto } from '@/services/storage/photoStore'
import { useEffect, useState } from 'react'

/**
 * Creates an object URL for a stored photo and revokes it when the component
 * unmounts or the photo id changes, so blob URLs never leak.
 */
export function usePhotoUrl(photoId?: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let revoked = false
    let created: string | null = null

    if (!photoId) {
      setUrl(null)
      return
    }

    getPhoto(photoId)
      .then((record) => {
        if (revoked || !record) return
        created = URL.createObjectURL(record.blob)
        setUrl(created)
      })
      .catch(() => setUrl(null))

    return () => {
      revoked = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [photoId])

  return url
}
