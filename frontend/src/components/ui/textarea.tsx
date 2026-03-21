// frontend/src/components/ui/textarea.tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TextAreaProps extends Omit<React.ComponentProps<"textarea">, "ref"> {
  variant?: "fixed" | "autogrow"
  maxLength?: number
  maxHeight?: number
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ variant = "fixed", maxLength, maxHeight = 180, className, onChange, value, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement>(null)
    const resolvedRef = (ref as React.RefObject<HTMLTextAreaElement>) ?? innerRef

    const grow = React.useCallback(() => {
      const el = resolvedRef.current
      if (!el || variant !== "autogrow") return
      el.style.height = "auto"
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
    }, [resolvedRef, variant, maxHeight])

    React.useEffect(() => { grow() }, [value, grow])

    const charCount = typeof value === "string" ? value.length : 0
    const nearLimit = maxLength && charCount >= Math.floor(maxLength * 0.9)

    return (
      <div className="relative">
        <textarea
          ref={resolvedRef}
          value={value}
          maxLength={maxLength}
          onChange={(e) => { grow(); onChange?.(e) }}
          className={cn(
            "flex w-full rounded-md border border-input bg-secondary px-3 py-2.5 text-sm text-text-primary",
            "placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            variant === "autogrow" ? "resize-none overflow-hidden" : "resize-vertical",
            maxLength && "pb-7",
            className
          )}
          {...props}
        />
        {maxLength && (
          <span
            className={cn(
              "absolute bottom-2 right-3 text-xs pointer-events-none",
              nearLimit ? "text-destructive" : "text-text-tertiary"
            )}
          >
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    )
  }
)
TextArea.displayName = "TextArea"

export { TextArea }
