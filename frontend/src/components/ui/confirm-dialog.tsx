// frontend/src/components/ui/confirm-dialog.tsx
import * as React from "react"
import { Modal } from "./modal"
import { Button } from "./button"
import { Spinner } from "./spinner"

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  variant?: "danger" | "warning"
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
}

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  variant = "danger",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "destructive" : "default"}
            size="sm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Spinner size="sm" />}
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-secondary">{description}</p>
    </Modal>
  )
}

export { ConfirmDialog }
