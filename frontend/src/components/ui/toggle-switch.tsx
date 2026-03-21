// frontend/src/components/ui/toggle-switch.tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  className?: string
  id?: string
}

function ToggleSwitch({ checked, onChange, label, disabled = false, className, id }: ToggleSwitchProps) {
  const switchId = id ?? React.useId()

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
          "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-primary" : "bg-border"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm",
            "transition-transform duration-150",
            checked ? "translate-x-5" : "translate-x-0"
          )}
          aria-hidden="true"
        />
      </button>
      {label && (
        <label htmlFor={switchId} className="text-sm text-text-primary cursor-pointer select-none">
          {label}
        </label>
      )}
    </div>
  )
}

export { ToggleSwitch }
