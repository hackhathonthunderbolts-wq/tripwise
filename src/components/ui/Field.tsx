import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from 'react'
import { useId } from 'react'
import { cn } from '@/lib/utils'

const controlBase =
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-charcoal-800 shadow-sm transition placeholder:text-charcoal-500/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-400/60 disabled:bg-ivory-200 disabled:text-charcoal-500'

function controlClass(error?: boolean, className?: string) {
  return cn(
    controlBase,
    error ? 'border-clay-500 focus-visible:ring-clay-500/40' : 'border-sage-200',
    className,
  )
}

interface FieldProps {
  label: string
  htmlFor?: string
  hint?: ReactNode
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}

export function Field({ label, htmlFor, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-charcoal-700">
        {label}
        {required ? <span className="ml-0.5 text-clay-500">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-clay-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-charcoal-500">{hint}</p>
      ) : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export function Input({ error, className, ...rest }: InputProps) {
  return <input className={controlClass(error, className)} {...rest} />
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export function Textarea({ error, className, ...rest }: TextareaProps) {
  return <textarea className={controlClass(error, cn('min-h-24 resize-y', className))} {...rest} />
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

export function Select({ error, className, children, ...rest }: SelectProps) {
  return (
    <select className={controlClass(error, cn('appearance-none pr-9', className))} {...rest}>
      {children}
    </select>
  )
}

/** Simple labelled control without the wrapping Field component. */
export function LabeledInput({
  label,
  hint,
  error,
  ...rest
}: InputProps & { label: string; hint?: ReactNode; error?: string }) {
  const id = useId()
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <Input id={id} error={Boolean(error)} {...rest} />
    </Field>
  )
}
