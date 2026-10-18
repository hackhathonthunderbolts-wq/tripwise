import { Suspense, lazy } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Skeleton'
import { AppShell } from '@/components/layout/AppShell'
import { TripProvider } from '@/store/TripStore'
import { MemoriesProvider } from '@/store/MemoriesStore'
import { ToastProvider } from '@/store/ToastStore'

import ExplorePage from '@/pages/ExplorePage'

// Leaflet is large; load map-heavy routes only when the user visits them.
const DestinationPage = lazy(() => import('@/pages/DestinationPage'))
const TripPage = lazy(() => import('@/pages/TripPage'))
const PlannerPage = lazy(() => import('@/pages/PlannerPage'))
const BudgetPage = lazy(() => import('@/pages/BudgetPage'))
const MemoriesPage = lazy(() => import('@/pages/MemoriesPage'))
const MemoryDetailPage = lazy(() => import('@/pages/MemoryDetailPage'))
const RecapPage = lazy(() => import('@/pages/RecapPage'))

function PageFallback() {
  return (
    <div className="tw-container flex min-h-[40vh] items-center justify-center py-16">
      <Spinner label="Loading page…" />
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="tw-container py-16 text-center">
      <h1 className="text-3xl text-charcoal-900">Page not found</h1>
      <p className="mt-3 text-charcoal-500">That route does not exist. Try going back to Explore.</p>
      <div className="mt-6 flex justify-center">
        <Link to="/">
          <Button>Back to Explore</Button>
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <TripProvider>
        <MemoriesProvider>
          <AppShell>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<ExplorePage />} />
                <Route path="/trip" element={<TripPage />} />
                <Route path="/planner" element={<PlannerPage />} />
                <Route path="/budget" element={<BudgetPage />} />
                <Route path="/memories" element={<MemoriesPage />} />
                <Route path="/memories/recap" element={<RecapPage />} />
                <Route path="/memories/:id" element={<MemoryDetailPage />} />
                <Route path="/destination/:coords" element={<DestinationPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </AppShell>
        </MemoriesProvider>
      </TripProvider>
    </ToastProvider>
  )
}
