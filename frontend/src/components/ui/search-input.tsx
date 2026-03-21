// frontend/src/components/ui/search-input.tsx
"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  size?: "sm" | "md"
  debounceMs?: number
  className?: string
}

function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
  size = "md",
  debounceMs = 0,
  className,
}: SearchInputProps) {
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    onChange(v)
    if (onSearch && debounceMs > 0) {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => onSearch(v), debounceMs)
    } else if (onSearch) {
      onSearch(v)
    }
  }

  React.useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-lg border border-border bg-input/30 transition-colors duration-[150ms]",
      "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
      size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm",
      className
    )}>
      <Search className={cn("shrink-0 text-text-tertiary", size === "sm" ? "size-3.5" : "size-4")} />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none placeholder:text-text-tertiary"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            if (timerRef.current) clearTimeout(timerRef.current)
            onChange("")
            onSearch?.("")
          }}
          className="shrink-0 rounded-sm p-0.5 text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="Clear search"
        >
          <X className={size === "sm" ? "size-3" : "size-3.5"} />
        </button>
      )}
    </div>
  )
}

export { SearchInput }
