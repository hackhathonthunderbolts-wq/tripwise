import { Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTrip } from '@/store/TripStore'
import { useToast } from '@/store/ToastStore'
import type { ItineraryStop, Place } from '@/types'

interface AddToTripButtonProps {
  place: Place
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'subtle' | 'ghost'
  className?: string
  label?: string
  options?: Partial<
    Pick<ItineraryStop, 'estimatedDurationMin' | 'estimatedCost' | 'day' | 'note'>
  >
}

export function AddToTripButton({
  place,
  size = 'sm',
  variant = 'primary',
  className,
  label = 'Add to My Trip',
  options,
}: AddToTripButtonProps) {
  const { addStop, hasPlace } = useTrip()
  const { push } = useToast()
  const alreadyAdded = hasPlace(place.id)

  if (alreadyAdded) {
    return (
      <Button
        variant="subtle"
        size={size}
        className={className}
        icon={<Check className="h-4 w-4" />}
        onClick={() => push(`${place.name} is already in your trip.`, 'info')}
      >
        In your trip
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      icon={<Plus className="h-4 w-4" />}
      onClick={() => {
        const result = addStop(place, options)
        push(result.message, result.added ? 'success' : 'warning')
      }}
    >
      {label}
    </Button>
  )
}
