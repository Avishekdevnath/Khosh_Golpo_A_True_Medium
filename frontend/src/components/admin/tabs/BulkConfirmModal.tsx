"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { UserRole } from "@/types/admin";

type BulkConfirmModalProps = {
  count: number;
  actionType: "role" | "activate" | "deactivate";
  newRole?: UserRole;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function BulkConfirmModal({
  count,
  actionType,
  newRole,
  loading,
  onClose,
  onConfirm,
}: BulkConfirmModalProps) {
  const description =
    actionType === "role"
      ? `Change role to "${newRole}" for ${count} user(s)`
      : actionType === "activate"
        ? `Activate ${count} user(s)`
        : `Deactivate ${count} user(s)`;

  const confirmLabel =
    actionType === "role" ? "Change role" : actionType === "activate" ? "Activate" : "Deactivate";

  return (
    <ConfirmDialog
      open
      onClose={!loading ? onClose : () => {}}
      onConfirm={onConfirm}
      title="Confirm bulk action"
      description={`${description}. This action will be applied immediately to all selected users.`}
      variant={actionType === "deactivate" ? "danger" : "warning"}
      confirmLabel={confirmLabel}
      loading={loading}
    />
  );
}
