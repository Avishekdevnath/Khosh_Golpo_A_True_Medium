// frontend/src/components/ui/form-field.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

function FormField({ label, htmlFor, error, hint, required, children, className }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-semibold uppercase tracking-wider text-text-secondary"
      >
        {label}
        {required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-tertiary">{hint}</p>
      ) : null}
    </div>
  )
}

export { FormField }
