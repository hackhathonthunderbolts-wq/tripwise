import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'li' | 'article' | 'section'
  padded?: boolean
}

export function Card({ as: Tag = 'div', padded = true, className, children, ...rest }: CardProps) {
  return (
    <Tag className={cn('tw-card', padded && 'p-5', className)} {...rest}>
      {children}
    </Tag>
  )
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h3 className="text-lg leading-tight">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-charcoal-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
