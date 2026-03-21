// frontend/src/components/ui/toast.tsx
"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastType = "success" | "error" | "info"

interface ToastItem {
  id: string
  type: ToastType
  message: string
  duration: number
}

interface ToastContextValue {
  toast: {
    success: (message: string, opts?: { duration?: number }) => void
    error: (message: string, opts?: { duration?: number }) => void
    info: (message: string, opts?: { duration?: number }) => void
  }
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="size-4 text-success" />,
  error: <AlertCircle className="size-4 text-destructive" />,
  info: <Info className="size-4 text-info" />,
}

const MAX_TOASTS = 3

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const add = React.useCallback((type: ToastType, message: string, duration = 3500) => {
    const id = crypto.randomUUID()
    setToasts(prev => {
      const next = [...prev, { id, type, message, duration }]
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next
    })
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const toast = React.useMemo(() => ({
    success: (msg: string, opts?: { duration?: number }) => add("success", msg, opts?.duration),
    error: (msg: string, opts?: { duration?: number }) => add("error", msg, opts?.duration),
    info: (msg: string, opts?: { duration?: number }) => add("info", msg, opts?.duration),
  }), [add])

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted && createPortal(
        <div
          className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
          aria-live="polite"
          role="status"
        >
          {toasts.map(t => (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex items-center gap-2.5 rounded-lg border border-border-subtle bg-surface-elevated px-4 py-3 text-sm text-text-primary shadow-lg",
                "animate-in slide-in-from-right-5 fade-in duration-200"
              )}
            >
              {ICONS[t.type]}
              <span className="flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-sm p-0.5 text-text-tertiary hover:text-text-primary transition-colors"
                aria-label="Dismiss"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}
