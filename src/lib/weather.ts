/**
 * Weather code descriptions (WMO codes) used by Open-Meteo.
 * https://open-meteo.com/en/docs
 */
export interface WeatherDescriptor {
  label: string
  icon:
    | 'sun'
    | 'cloud-sun'
    | 'cloud'
    | 'fog'
    | 'drizzle'
    | 'rain'
    | 'snow'
    | 'storm'
}

const CODES: Record<number, WeatherDescriptor> = {
  0: { label: 'Clear sky', icon: 'sun' },
  1: { label: 'Mainly clear', icon: 'sun' },
  2: { label: 'Partly cloudy', icon: 'cloud-sun' },
  3: { label: 'Overcast', icon: 'cloud' },
  45: { label: 'Fog', icon: 'fog' },
  48: { label: 'Depositing rime fog', icon: 'fog' },
  51: { label: 'Light drizzle', icon: 'drizzle' },
  53: { label: 'Drizzle', icon: 'drizzle' },
  55: { label: 'Dense drizzle', icon: 'drizzle' },
  56: { label: 'Freezing drizzle', icon: 'drizzle' },
  57: { label: 'Dense freezing drizzle', icon: 'drizzle' },
  61: { label: 'Slight rain', icon: 'rain' },
  63: { label: 'Rain', icon: 'rain' },
  65: { label: 'Heavy rain', icon: 'rain' },
  66: { label: 'Freezing rain', icon: 'rain' },
  67: { label: 'Heavy freezing rain', icon: 'rain' },
  71: { label: 'Slight snow', icon: 'snow' },
  73: { label: 'Snow', icon: 'snow' },
  75: { label: 'Heavy snow', icon: 'snow' },
  77: { label: 'Snow grains', icon: 'snow' },
  80: { label: 'Rain showers', icon: 'rain' },
  81: { label: 'Rain showers', icon: 'rain' },
  82: { label: 'Violent rain showers', icon: 'rain' },
  85: { label: 'Snow showers', icon: 'snow' },
  86: { label: 'Heavy snow showers', icon: 'snow' },
  95: { label: 'Thunderstorm', icon: 'storm' },
  96: { label: 'Thunderstorm with hail', icon: 'storm' },
  99: { label: 'Thunderstorm with heavy hail', icon: 'storm' },
}

export function describeWeather(code: number | undefined): WeatherDescriptor {
  if (code === undefined) return { label: 'Unknown conditions', icon: 'cloud' }
  return CODES[code] ?? { label: `Weather code ${code}`, icon: 'cloud' }
}
