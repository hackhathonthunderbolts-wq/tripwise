import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  tone?: 'forest' | 'clay' | 'gold'
  size?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
  description?: ReactNode
}

export function ProgressBar({
  value,
  max = 100,
  label = 'Progress',
  tone = 'forest',
  size = 'md',
  showLabel = true,
  className,
  description,
}: ProgressBarProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const percent = Math.round(ratio * 100)
  const tones = {
    forest: 'bg-forest-500',
    clay: 'bg-clay-500',
    gold: 'bg-gold-400',
  } as const

  return (
    <div className={cn('w-full', className)}>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn(
          'w-full overflow-hidden rounded-full bg-sage-100',
          size === 'sm' ? 'h-1.5' : 'h-2.5',
        )}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', tones[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel ? (
        <div className="mt-1.5 flex items-center justify-between text-xs text-charcoal-500">
          <span>{label}</span>
          <span className="font-medium text-charcoal-700">{percent}%</span>
        </div>
      ) : null}
      {description ? <div className="mt-1 text-xs text-charcoal-500">{description}</div> : null}
    </div>
  )
}
