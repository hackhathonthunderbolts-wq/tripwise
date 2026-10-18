import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/Field'
import { Badge } from '@/components/ui/Badge'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { resolveCenter } from '@/services/api/discover'
import { searchPlaces } from '@/services/api/nominatim'
import { ApiError } from '@/services/api/client'
import type { Place } from '@/types'

interface SearchBoxProps {
  value: string
  onChange: (value: string) => void
  onSelect: (place: Place) => void
  placeholder?: string
  label?: string
}

export function SearchBox({
  value,
  onChange,
  onSelect,
  placeholder = 'Search by city or place...',
  label = 'Destination search',
}: SearchBoxProps) {
  const debounced = useDebouncedValue(value, 400)
  const [suggestions, setSuggestions] = useState<Place[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setSuggestions([])
      setError(null)
      return
    }
    let active = true
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const results = await searchPlaces(debounced, 6)
        if (!active) return
        setSuggestions(results)
        if (results.length === 0) {
          try {
            const center = await resolveCenter(debounced)
            if (!active) return
            setSuggestions([center.place])
          } catch (inner) {
            if (inner instanceof ApiError) {
              setError(inner.userMessage)
            } else setError('Nothing matched this location.')
          }
        }
      } catch (inner) {
        if (inner instanceof ApiError) setError(inner.userMessage)
        else setError('The geocoder is unavailable right now.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void run()
    return () => {
      active = false
    }
  }, [debounced])

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-500" aria-hidden />
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            aria-label={label}
            className="pl-9"
          />
          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setSuggestions([])
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-charcoal-500 hover:bg-sage-100"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
        {loading ? (
          <Badge tone="outline">Searching</Badge>
        ) : suggestions.length > 0 ? (
          <span className="text-xs text-charcoal-500">{suggestions.length} suggestions</span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-2 text-xs text-clay-600" role="alert">
          {error}
        </p>
      ) : null}

      {suggestions.length > 0 && value.trim() ? (
        <div className="absolute z-[850] mt-2 w-full overflow-hidden rounded-2xl border border-sage-200 bg-white shadow-lift">
          <ul className="max-h-80 overflow-y-auto tw-scroll-thin">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(suggestion)
                    onChange(suggestion.name)
                    setSuggestions([])
                  }}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-sage-50"
                >
                  <Search className="mt-1 h-4 w-4 text-charcoal-500" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-charcoal-900">{suggestion.name}</p>
                    <p className="truncate text-xs text-charcoal-500">
                      {suggestion.city ? `${suggestion.city} · ` : ''}
                      {suggestion.country ?? 'Location'}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
