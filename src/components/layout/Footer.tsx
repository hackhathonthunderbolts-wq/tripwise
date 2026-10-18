import { Link } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'

const DATA_SOURCES = [
  {
    label: 'OpenStreetMap — place & POI data',
    href: 'https://www.openstreetmap.org/copyright',
  },
  { label: 'Nominatim — geocoding', href: 'https://nominatim.org/' },
  { label: 'Overpass API — POI queries', href: 'https://overpass-api.de/' },
  { label: 'Wikipedia & Wikimedia Commons — descriptions, photos (CC BY-SA)', href: 'https://www.wikipedia.org/' },
  { label: 'Open-Meteo — weather (CC BY 4.0)', href: 'https://open-meteo.com/' },
  { label: 'OSRM — travel-time routing', href: 'https://project-osrm.org/' },
  { label: 'Leaflet — maps', href: 'https://leafletjs.com/' },
]

export function Footer() {
  return (
    <footer className="mt-20 border-t border-sage-200 bg-white">
      <PageContainer className="grid gap-8 py-12 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-display text-2xl text-charcoal-900">TripWise</p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-charcoal-600">
            Plan a trip, track what you have actually seen, keep an eye on your budget and turn the
            good bits into a private travel journal. Everything you save stays in this browser —
            it is not synced across devices.
          </p>
          <nav className="mt-5 flex flex-wrap gap-4 text-sm" aria-label="Footer">
            <Link to="/" className="text-forest-700 underline-offset-4 hover:underline">
              Explore
            </Link>
            <Link to="/planner" className="text-forest-700 underline-offset-4 hover:underline">
              Time planner
            </Link>
            <Link to="/trip" className="text-forest-700 underline-offset-4 hover:underline">
              My Trip
            </Link>
            <Link to="/budget" className="text-forest-700 underline-offset-4 hover:underline">
              Budget
            </Link>
            <Link to="/memories" className="text-forest-700 underline-offset-4 hover:underline">
              Memories
            </Link>
          </nav>
        </div>
        <div>
          <p className="tw-label">Data sources &amp; attribution</p>
          <ul className="mt-3 space-y-2 text-sm text-charcoal-600">
            {DATA_SOURCES.map((source) => (
              <li key={source.href}>
                <a
                  href={source.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline-offset-4 hover:text-forest-700 hover:underline"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </PageContainer>
      <div className="border-t border-sage-200 py-5 text-center text-xs text-charcoal-500">
        Built for the AWS Student Builder Group · VIT Chennai recruitment task — TripWise demo build.
      </div>
    </footer>
  )
}
