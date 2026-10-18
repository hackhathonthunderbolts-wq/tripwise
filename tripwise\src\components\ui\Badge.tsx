import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type BadgeTone = 'neutral' | 'forest' | 'sage' | 'clay' | 'gold' | 'outline'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ivory-200 text-charcoal-700 border-transparent',
  forest: 'bg-forest-50 text-forest-700 border-forest-100',
  sage: 'bg-sage-100 text-charcoal-700 border-sage-200',
  clay: 'bg-clay-100 text-clay-600 border-clay-100',
  gold: 'bg-ivory-200 text-charcoal-800 border-gold-400/50',
  outline: 'bg-transparent text-charcoal-600 border-sage-200',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
  icon,
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
  icon?: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
