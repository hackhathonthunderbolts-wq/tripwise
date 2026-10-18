import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageContainer({
  children,
  className,
  size = 'default',
}: {
  children: ReactNode
  className?: string
  size?: 'default' | 'narrow' | 'wide'
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 md:px-8',
        size === 'narrow' ? 'max-w-3xl' : size === 'wide' ? 'max-w-[92rem]' : 'max-w-[78rem]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-col gap-4 md:flex-row md:items-end md:justify-between', className)}>
      <div className="max-w-2xl">
        {eyebrow ? <p className="tw-label mb-2">{eyebrow}</p> : null}
        <h1 className="text-3xl md:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-3 text-base leading-relaxed text-charcoal-600">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        <h2 className="text-xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-charcoal-500">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
