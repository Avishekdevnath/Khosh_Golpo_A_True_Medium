// frontend/src/components/profile/AdminEditModal.tsx
"use client";

import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

interface AdminEditModalProps {
  open: boolean;
  onClose: () => void;
  displayName: string;
  bio: string;
  saving: boolean;
  msg: { type: "ok" | "err"; text: string } | null;
  onDisplayNameChange: (v: string) => void;
  onBioChange: (v: string) => void;
  onSave: () => void;
}

export default function AdminEditModal({
  open,
  onClose,
  displayName,
  bio,
  saving,
  msg,
  onDisplayNameChange,
  onBioChange,
  onSave,
}: AdminEditModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit User Profile"
      size="sm"
      footer={
        <button
          type="button"
          disabled={saving || !displayName.trim()}
          onClick={onSave}
          className={cn(
            "w-full rounded-lg border-none px-4 py-2.5",
            "bg-gradient-to-br from-accent-orange to-[#e06c30] text-white",
            "text-[13px] font-bold transition-opacity duration-150 font-sans cursor-pointer",
            "hover:not-disabled:opacity-90",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      }
    >
      <div className="flex flex-col gap-1">
        {/* Display name */}
        <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-text-tertiary mb-1.5 mt-1">
          Display Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={e => onDisplayNameChange(e.target.value)}
          maxLength={80}
          className={cn(
            "w-full rounded-lg border border-app-border bg-app-input px-3 py-2.5",
            "text-[13px] text-foreground outline-none font-sans",
            "transition-colors duration-150",
            "focus:border-accent-orange"
          )}
        />

        {/* Bio */}
        <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-text-tertiary mb-1.5 mt-3">
          Bio
        </label>
        <textarea
          value={bio}
          onChange={e => onBioChange(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="User bio..."
          className={cn(
            "w-full resize-y rounded-lg border border-app-border bg-app-input px-3 py-2.5",
            "text-[13px] text-foreground outline-none font-sans min-h-[60px]",
            "transition-colors duration-150",
            "focus:border-accent-orange"
          )}
        />
        <div className="text-[11px] text-app-border text-right mt-1">{bio.length}/280</div>

        {/* Message */}
        {msg && (
          <div
            className={cn(
              "rounded-md px-3 py-2 text-xs mt-1",
              msg.type === "ok"
                ? "bg-success/10 border border-success/25 text-success"
                : "bg-destructive/10 border border-destructive/25 text-destructive"
            )}
          >
            {msg.text}
          </div>
        )}
      </div>
    </Modal>
  );
}
