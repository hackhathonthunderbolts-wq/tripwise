import { Cloud, CloudDrizzle, CloudRain, CloudSun, Haze, Snowflake, Sun, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { describeWeather } from '@/lib/weather'
import { formatDate } from '@/lib/format'
import type { WeatherReport } from '@/types'

const ICONS = {
  sun: Sun,
  'cloud-sun': CloudSun,
  cloud: Cloud,
  fog: Haze,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: Snowflake,
  storm: Zap,
} as const

export function WeatherWidget({
  weather,
  showForecast = false,
  className,
}: {
  weather?: WeatherReport | null
  showForecast?: boolean
  className?: string
}) {
  if (!weather?.now) {
    return (
      <div className={className}>
        <Badge tone="outline">Weather unavailable (service unreachable)</Badge>
      </div>
    )
  }

  const descriptor = describeWeather(weather.now.code)
  const Icon = ICONS[descriptor.icon] ?? Cloud

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-sage-200 bg-white px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-forest-50 text-forest-600">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium text-charcoal-800">{descriptor.label}</p>
            <p className="text-xs text-charcoal-500">
              {weather.now.temperature.toFixed(0)}°C · Wind {Math.round(weather.now.windSpeed)} km/h
            </p>
          </div>
        </div>
        <p className="text-xs text-charcoal-500">
          Source: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer noopener" className="underline">Open-Meteo</a>
        </p>
      </div>
      {showForecast && weather.days.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {weather.days.slice(0, 3).map((day) => {
            const d = describeWeather(day.code)
            const DIcon = ICONS[d.icon] ?? Cloud
            return (
              <div key={day.date} className="rounded-2xl border border-sage-200 bg-ivory-50 px-3 py-3 text-center">
                <p className="text-xs font-medium text-charcoal-700">{formatDate(day.date)}</p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <DIcon className="h-4 w-4 text-forest-600" aria-hidden />
                  <span className="text-xs text-charcoal-600">{d.label}</span>
                </div>
                <p className="mt-1 text-xs text-charcoal-500">
                  {Math.round(day.min)}° / {Math.round(day.max)}°C
                  {day.precipitationProbability !== null ? ` · ${day.precipitationProbability}% rain` : ''}
                </p>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
