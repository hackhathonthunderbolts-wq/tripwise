import { fetchJson } from '@/services/api/client'
import type { WeatherReport } from '@/types'

interface OpenMeteoResponse {
  timezone?: string
  current?: {
    time: string
    temperature_2m: number
    weather_code: number
    wind_speed_10m: number
  }
  daily?: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max?: (number | null)[]
  }
}

/**
 * Real weather from Open-Meteo (no API key required, CORS enabled).
 * Weather is a supplementary signal — the UI must keep working if it fails.
 */
export async function getWeather(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<WeatherReport> {
  const query = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    current: 'temperature_2m,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: '5',
  })
  const url = `https://api.open-meteo.com/v1/forecast?${query.toString()}`
  const data = await fetchJson<OpenMeteoResponse>(url, { timeoutMs: 12000, signal })

  const days =
    data.daily?.time?.map((date, index) => ({
      date,
      code: data.daily?.weather_code?.[index] ?? 0,
      max: data.daily?.temperature_2m_max?.[index] ?? 0,
      min: data.daily?.temperature_2m_min?.[index] ?? 0,
      precipitationProbability: data.daily?.precipitation_probability_max?.[index] ?? null,
    })) ?? []

  return {
    now: data.current
      ? {
          temperature: data.current.temperature_2m,
          windSpeed: data.current.wind_speed_10m,
          code: data.current.weather_code,
          time: data.current.time,
        }
      : null,
    days,
    timezone: data.timezone ?? 'UTC',
    source: 'open-meteo',
  }
}

export const OPEN_METEO_ATTRIBUTION = {
  label: 'Weather by Open-Meteo (CC BY 4.0)',
  href: 'https://open-meteo.com/',
}
