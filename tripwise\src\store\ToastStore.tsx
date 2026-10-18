import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uid } from '@/lib/utils'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  push: (message: string, variant?: ToastVariant) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'border-forest-200 bg-forest-50 text-forest-800',
  error: 'border-clay-500/40 bg-clay-100 text-clay-600',
  warning: 'border-gold-400/50 bg-ivory-200 text-charcoal-800',
  info: 'border-sage-200 bg-white text-charcoal-800',
}

function VariantIcon({ variant }: { variant: ToastVariant }) {
  const className = 'h-5 w-5 shrink-0'
  switch (variant) {
    case 'success':
      return <CheckCircle2 className={cn(className, 'text-forest-500')} aria-hidden />
    case 'error':
      return <XCircle className={cn(className, 'text-clay-500')} aria-hidden />
    case 'warning':
      return <TriangleAlert className={cn(className, 'text-gold-400')} aria-hidden />
    default:
      return <Info className={cn(className, 'text-forest-500')} aria-hidden />
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback<ToastContextValue['push']>(
    (message, variant = 'success') => {
      const toast: Toast = { id: uid('toast'), message, variant }
      setToasts((current) => [...current.slice(-3), toast])
      window.setTimeout(() => dismiss(toast.id), 4200)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[1200] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lift',
              VARIANT_STYLES[toast.variant],
            )}
            role="status"
          >
            <VariantIcon variant={toast.variant} />
            <p className="flex-1 leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="rounded-md p-1 text-charcoal-500 transition hover:bg-black/5"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}
