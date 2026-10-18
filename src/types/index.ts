export type PlaceCategory =
  | 'attraction'
  | 'museum'
  | 'park'
  | 'beach'
  | 'historical'
  | 'viewpoint'
  | 'food'
  | 'other'

export type DataSource = 'openstreetmap' | 'wikipedia' | 'nominatim'

export interface Coordinates {
  lat: number
  lon: number
}

export interface Place extends Coordinates {
  /** Stable identifier, e.g. `osm:node/123`, `wiki:Marina_Beach`, `geo:13.08,80.27` */
  id: string
  name: string
  category: PlaceCategory
  source: DataSource
  address?: string
  city?: string
  country?: string
  description?: string
  thumbnail?: string
  /** Attribution string that must be shown next to the image. */
  thumbnailCredit?: string
  wikipediaTitle?: string
  distanceKm?: number
  openingHours?: string
  website?: string
  tags?: Record<string, string>
}

export type StopStatus = 'planned' | 'visited' | 'skipped'

export interface ItineraryStop {
  id: string
  place: Place
  status: StopStatus
  /** User-editable estimate, in minutes. Never presented as official data. */
  estimatedDurationMin: number
  /** User-editable estimate, in the trip currency (INR minor unit = rupees). */
  estimatedCost: number
  /** Optional planned date (yyyy-mm-dd). */
  day?: string
  note?: string
  visitedAt?: string
  createdAt: string
}

export type ExpenseCategory =
  | 'attraction'
  | 'accommodation'
  | 'food'
  | 'transport'
  | 'shopping'
  | 'misc'

export interface Expense {
  id: string
  amount: number
  category: ExpenseCategory
  /** yyyy-mm-dd */
  date: string
  note?: string
  /** Links an actual expense to an itinerary stop so estimates are not double counted. */
  stopId?: string
  createdAt: string
}

export interface BudgetSettings {
  /** Total trip budget in whole rupees. */
  total: number
  /** Optional per-day cap in whole rupees. */
  daily: number | null
  currency: string
}

export interface TripMeta {
  name: string
  startDate?: string
  endDate?: string
}

export interface Memory {
  id: string
  placeName: string
  lat?: number
  lon?: number
  /** Alternatively linked to an itinerary stop / destination route. */
  stopId?: string
  destinationId?: string
  caption: string
  note: string
  /** yyyy-mm-dd */
  visitDate: string
  tags: string[]
  mood?: string
  photoIds: string[]
  coverPhotoId?: string
  favourite: boolean
  createdAt: string
  updatedAt: string
}

export interface PhotoRecord {
  id: string
  memoryId: string
  blob: Blob
  name: string
  type: string
  size: number
  createdAt: string
}

export type TravelMode = 'walking' | 'driving'

export interface TravelLeg {
  minutes: number
  distanceMeters: number
  /** `osrm` = real routing service, `approx` = clearly-labelled straight-line estimate. */
  source: 'osrm' | 'approx'
}

export interface PlannedStop {
  place: Place
  visitMinutes: number
  travel: TravelLeg
  /** Minutes from the plan start. */
  arrivalMinutes: number
  departureMinutes: number
}

export interface TripPlan {
  start: { name: string; lat: number; lon: number }
  mode: TravelMode
  availableMinutes: number
  /** Clock time the plan begins, e.g. "09:30". */
  startTime: string
  stops: PlannedStop[]
  totalMinutes: number
  visitedMinutes: number
  travelMinutes: number
  overflow: boolean
}

export interface WeatherNow {
  temperature: number
  windSpeed: number
  code: number
  time: string
}

export interface WeatherDay {
  date: string
  code: number
  max: number
  min: number
  precipitationProbability: number | null
}

export interface WeatherReport {
  now: WeatherNow | null
  days: WeatherDay[]
  timezone: string
  source: 'open-meteo'
}

export interface DiscoverResult {
  places: Place[]
  /** Which real data source produced the list. */
  source: 'openstreetmap' | 'wikipedia'
  /** True when the OSM POI service was unavailable and Wikipedia was used instead. */
  degraded: boolean
  notice?: string
  center: { label: string; lat: number; lon: number }
  radiusMeters: number
}
