// frontend/src/components/ui/password-input.tsx
"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type">

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = React.useState(false)

    return (
      <div className="relative">
        <input
          ref={ref}
          type={show ? "text" : "password"}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-secondary px-3 py-2 pr-10 text-sm text-text-primary",
            "placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-text-tertiary hover:text-text-primary transition-colors"
          aria-label={show ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
