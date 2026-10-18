import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { MapPinOff } from 'lucide-react'
import { boundsFor, osmLink } from '@/lib/geo'
import { cn } from '@/lib/utils'
import type { Coordinates } from '@/types'

export interface MapMarker {
  id: string
  lat: number
  lon: number
  label?: string
  description?: string
  tone?: 'default' | 'accent' | 'start'
  onSelect?: () => void
}

interface LeafletMapProps {
  center: Coordinates
  zoom?: number
  markers?: MapMarker[]
  onPick?: (coords: Coordinates) => void
  fitMarkers?: boolean
  className?: string
  ariaLabel?: string
}

function markerIcon(tone: MapMarker['tone']): L.DivIcon {
  const toneClass =
    tone === 'accent'
      ? ' tw-marker__pin--accent'
      : tone === 'start'
        ? ' tw-marker__pin--start'
        : ''
  return L.divIcon({
    className: 'tw-marker',
    html: `<span class="tw-marker__pin${toneClass}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 20],
    popupAnchor: [0, -18],
  })
}

/**
 * Thin Leaflet wrapper using OpenStreetMap tiles.
 * Tiles/markers degrade gracefully: if tiles fail to load the map area shows a
 * notice and an "open in OpenStreetMap" link while the rest of the page works.
 */
export function LeafletMap({
  center,
  zoom = 14,
  markers = [],
  onPick,
  fitMarkers = false,
  className,
  ariaLabel = 'Map',
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const onPickRef = useRef(onPick)
  const [tilesFailed, setTilesFailed] = useState(false)

  onPickRef.current = onPick

  const markerSignature = useMemo(
    () => markers.map((marker) => `${marker.id}:${marker.lat}:${marker.lon}:${marker.tone ?? 'default'}`).join('|'),
    [markers],
  )

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lon],
      zoom,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    })

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    })
    tiles.on('tileerror', () => setTilesFailed(true))
    tiles.addTo(map)

    const layer = L.layerGroup().addTo(map)
    map.on('click', (event: L.LeafletMouseEvent) => {
      onPickRef.current?.({ lat: event.latlng.lat, lon: event.latlng.lng })
    })

    mapRef.current = map
    layerRef.current = layer

    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 180)

    return () => {
      window.clearTimeout(resizeTimer)
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
    // Map is created once; subsequent updates are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setView([center.lat, center.lon], map.getZoom() ?? zoom, { animate: true })
  }, [center.lat, center.lon, zoom])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()
    markers.forEach((marker) => {
      const leafletMarker = L.marker([marker.lat, marker.lon], { icon: markerIcon(marker.tone) })
      const popupLines = [
        marker.label ? `<strong>${escapeHtml(marker.label)}</strong>` : '',
        marker.description ? `<span>${escapeHtml(marker.description)}</span>` : '',
      ]
        .filter(Boolean)
        .join('<br/>')
      if (popupLines) leafletMarker.bindPopup(popupLines)
      if (marker.onSelect) {
        leafletMarker.bindTooltip(marker.label ?? 'Open', { direction: 'top' })
        leafletMarker.on('click', () => marker.onSelect?.())
      }
      leafletMarker.addTo(layer)
    })

    if (fitMarkers && markers.length > 0) {
      const points: Coordinates[] = [
        ...markers.map((marker) => ({ lat: marker.lat, lon: marker.lon })),
        center,
      ]
      if (points.length > 1) {
        const [southWest, northEast] = boundsFor(points, 0.6)
        map.fitBounds([southWest, northEast], { padding: [28, 28], maxZoom: 15 })
      }
    } else if (markers.length === 0) {
      map.setView([center.lat, center.lon], zoom)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerSignature, fitMarkers])

  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-sage-200', className)}>
      <div
        ref={containerRef}
        className="h-full w-full"
        role="application"
        aria-label={ariaLabel}
      />
      {tilesFailed ? (
        <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2 rounded-xl border border-sage-200 bg-white/95 px-3 py-2 text-xs text-charcoal-600 shadow-card">
          <MapPinOff className="h-4 w-4 text-clay-500" aria-hidden />
          <span>Map tiles could not be loaded.</span>
          <a
            className="font-medium text-forest-600 underline"
            href={osmLink(center.lat, center.lon)}
            target="_blank"
            rel="noreferrer noopener"
          >
            Open this location in OpenStreetMap
          </a>
        </div>
      ) : null}
    </div>
  )
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
