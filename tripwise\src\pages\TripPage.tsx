import { TripProgressPanel } from '@/components/itinerary/TripSummary'
import { ItineraryList } from '@/components/itinerary/ItineraryList'
import { PageContainer, PageHeader } from '@/components/layout/PageContainer'
import { Link } from 'react-router-dom'
import { CalendarRange, NotebookPen } from 'lucide-react'

export default function TripPage() {
  return (
    <PageContainer size="default">
      <PageHeader
        eyebrow="My Trip"
        title="What have I missed?"
        description="Track your itinerary, mark places as planned, visited or skipped, and watch your progress in real time."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/memories" className="inline-flex h-10 items-center gap-2 rounded-xl border border-sage-200 bg-white px-4 text-sm font-medium text-charcoal-800">
              <NotebookPen className="h-4 w-4" />
              Memories
            </Link>
            <Link to="/planner" className="inline-flex h-10 items-center gap-2 rounded-xl bg-forest-600 px-4 text-sm font-medium text-ivory-50">
              <CalendarRange className="h-4 w-4" />
              Plan a new itinerary
            </Link>
          </div>
        }
      />
      <div className="mt-6 space-y-6">
        <TripProgressPanel />
        <ItineraryList />
      </div>
    </PageContainer>
  )
}
