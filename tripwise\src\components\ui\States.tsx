import type { ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-sage-300 bg-white/70 px-6 py-14 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-forest-50 text-forest-600">
          {icon}
        </div>
      ) : null}
      <h3 className="text-lg">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-charcoal-500">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
  className,
  children,
}: {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
  children?: ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-clay-100 bg-clay-100/50 px-6 py-10 text-center',
        className,
      )}
      role="alert"
    >
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-white text-clay-500">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="text-lg text-charcoal-900">{title}</h3>
      {message ? <p className="mx-auto mt-2 max-w-md text-sm text-charcoal-600">{message}</p> : null}
      {children ? <div className="mt-3 text-sm text-charcoal-600">{children}</div> : null}
      {onRetry ? (
        <div className="mt-5 flex justify-center">
          <Button variant="secondary" onClick={onRetry} icon={<RefreshCw className="h-4 w-4" />}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
