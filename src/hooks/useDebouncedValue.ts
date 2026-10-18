import { useEffect, useRef, useState } from 'react'

export function useDebouncedValue<T>(value: T, delayMs = 450): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

/** Persists a value to localStorage-style storage whenever it changes. */
export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delayMs = 400,
): (...args: Parameters<T>) => void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef(callback)
  latest.current = callback

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return (...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => latest.current(...args), delayMs)
  }
}
