"use client";

import { Check, Key, Lock } from "lucide-react";

import { FormField } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";
import { Divider } from "@/components/ui/divider";
import type { Msg } from "./useSettingsPage";

// ── Inline message banner ─────────────────────────────────────────────────────

function MsgBanner({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <div
      className={[
        "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm mt-3.5",
        msg.type === "ok"
          ? "bg-[rgba(61,214,140,0.08)] border border-[rgba(61,214,140,0.2)] text-green-700 dark:text-[#3dd68c]"
          : "bg-[rgba(240,107,107,0.08)] border border-[rgba(240,107,107,0.2)] text-red-700 dark:text-[#f06b6b]",
      ].join(" ")}
    >
      {msg.type === "ok" && <Check size={13} />}
      {msg.text}
    </div>
  );
}

// ── Base text input (non-password) ────────────────────────────────────────────

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className="flex h-10 w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
    />
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface PasswordSectionProps {
  currentPassword: string;
  recoveryCode: string;
  favAnimal: string;
  favPerson: string;
  newPassword: string;
  confirmPassword: string;
  pwSaving: boolean;
  pwMsg: Msg;
  setCurrentPassword: (v: string) => void;
  setRecoveryCode: (v: string) => void;
  setFavAnimal: (v: string) => void;
  setFavPerson: (v: string) => void;
  setNewPassword: (v: string) => void;
  setConfirmPassword: (v: string) => void;
  onPasswordChange: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PasswordSection({
  currentPassword, recoveryCode, favAnimal, favPerson,
  newPassword, confirmPassword,
  pwSaving, pwMsg,
  setCurrentPassword, setRecoveryCode, setFavAnimal, setFavPerson,
  setNewPassword, setConfirmPassword,
  onPasswordChange,
}: PasswordSectionProps) {
  return (
    <div className="w-full space-y-0">
      <h2 className="font-serif text-[18px] font-bold mb-1">Change Password</h2>
      <p className="text-sm text-text-secondary mb-5 leading-relaxed">
        Enter your current password, or provide a security answer (recovery code, favorite animal, or favorite person).
      </p>

      <FormField label="Current Password" htmlFor="current-password">
        <div className="flex items-center gap-1.5 text-text-secondary mb-1">
          <Lock size={12} />
        </div>
        <PasswordInput
          id="current-password"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          placeholder="Your current password"
          autoComplete="current-password"
        />
      </FormField>

      <Divider label="or use a security answer" className="my-5" />

      <div className="space-y-4">
        <FormField label="Recovery Code" htmlFor="recovery-code">
          <TextInput
            id="recovery-code"
            value={recoveryCode}
            onChange={setRecoveryCode}
            placeholder="Your recovery code"
            autoComplete="off"
          />
        </FormField>

        <FormField label="Favorite Animal" htmlFor="fav-animal">
          <TextInput
            id="fav-animal"
            value={favAnimal}
            onChange={setFavAnimal}
            placeholder="Your answer"
            autoComplete="off"
          />
        </FormField>

        <FormField label="Favorite Person" htmlFor="fav-person">
          <TextInput
            id="fav-person"
            value={favPerson}
            onChange={setFavPerson}
            placeholder="Your answer"
            autoComplete="off"
          />
        </FormField>
      </div>

      <Divider className="my-5" />

      <div className="space-y-4">
        <FormField label="New Password" htmlFor="new-password">
          <PasswordInput
            id="new-password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Min 6 characters"
            autoComplete="new-password"
          />
        </FormField>

        <FormField label="Confirm New Password" htmlFor="confirm-password">
          <PasswordInput
            id="confirm-password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            autoComplete="new-password"
          />
        </FormField>
      </div>

      <MsgBanner msg={pwMsg} />

      <button
        type="button"
        disabled={pwSaving || !newPassword}
        onClick={onPasswordChange}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Key size={14} />
        {pwSaving ? "Changing..." : "Change Password"}
      </button>
    </div>
  );
}
