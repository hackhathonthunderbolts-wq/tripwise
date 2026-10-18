import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  CalendarRange,
  Compass,
  Menu,
  NotebookPen,
  Route,
  Wallet,
  X,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { buttonClass } from '@/components/ui/Button'
import { useTrip } from '@/store/TripStore'
import { useMemories } from '@/store/MemoriesStore'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Explore', icon: Compass, end: true },
  { to: '/trip', label: 'My Trip', icon: Route, end: false },
  { to: '/memories', label: 'Memories', icon: NotebookPen, end: false },
  { to: '/budget', label: 'Budget', icon: Wallet, end: false },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { progress } = useTrip()
  const { memoryCount } = useMemories()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  const tripChip =
    progress.total > 0
      ? `${progress.total} ${progress.total === 1 ? 'stop' : 'stops'} · ${progress.visited} visited`
      : 'No stops yet'

  return (
    <header className="sticky top-0 z-[900] border-b border-sage-200 bg-ivory-50/92 backdrop-blur">
      <PageContainer className="flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5" aria-label="TripWise home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-forest-600 text-ivory-50">
            <CalendarRange className="h-5 w-5" aria-hidden />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl font-semibold tracking-tight text-charcoal-900">
              TripWise
            </span>
            <span className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-charcoal-500">
              Travel planner
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-forest-50 text-forest-700'
                    : 'text-charcoal-600 hover:bg-sage-100 hover:text-charcoal-800',
                )
              }
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
              {item.to === '/memories' && memoryCount > 0 ? (
                <span className="rounded-full bg-forest-100 px-1.5 text-xs font-semibold text-forest-700">
                  {memoryCount}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/trip"
            className="rounded-xl border border-sage-200 bg-white px-3 py-2 text-xs text-charcoal-600 transition hover:border-forest-200 hover:text-forest-700"
          >
            <span className="font-semibold text-charcoal-800">{tripChip}</span>
          </Link>
          <Link to="/planner" className={buttonClass('primary', 'md')}>
            Plan a Trip
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl border border-sage-200 bg-white p-2 text-charcoal-700 md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </PageContainer>

      {open ? (
        <div id="mobile-nav" className="border-t border-sage-200 bg-white md:hidden">
          <PageContainer className="flex flex-col gap-1 py-4">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium',
                    isActive ? 'bg-forest-50 text-forest-700' : 'text-charcoal-700 hover:bg-sage-100',
                  )
                }
              >
                <span className="flex items-center gap-2.5">
                  <item.icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </span>
                {item.to === '/memories' && memoryCount > 0 ? (
                  <span className="rounded-full bg-forest-100 px-2 text-xs font-semibold text-forest-700">
                    {memoryCount}
                  </span>
                ) : null}
              </NavLink>
            ))}
            <div className="mt-2 flex items-center justify-between rounded-xl bg-ivory-100 px-3 py-3 text-xs text-charcoal-600">
              <span>Trip summary</span>
              <span className="font-semibold text-charcoal-800">{tripChip}</span>
            </div>
            <Link to="/planner" className={buttonClass('primary', 'lg', 'mt-2 w-full justify-center')}>
              Plan a Trip
            </Link>
          </PageContainer>
        </div>
      ) : null}
    </header>
  )
}
