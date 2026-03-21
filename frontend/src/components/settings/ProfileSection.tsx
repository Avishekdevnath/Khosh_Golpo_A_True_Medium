"use client";

import { Check, Save } from "lucide-react";

import { FormField } from "@/components/ui/form-field";
import { TextArea } from "@/components/ui/textarea";
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
          ? "bg-[rgba(61,214,140,0.08)] border border-[rgba(61,214,140,0.2)] text-[#3dd68c]"
          : "bg-[rgba(240,107,107,0.08)] border border-[rgba(240,107,107,0.2)] text-[#f06b6b]",
      ].join(" ")}
    >
      {msg.type === "ok" && <Check size={13} />}
      {msg.text}
    </div>
  );
}

// ── Gender pill selector ──────────────────────────────────────────────────────

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"] as const;

interface GenderPickerProps {
  value: string;
  onChange: (v: string) => void;
}

function GenderPicker({ value, onChange }: GenderPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {GENDER_OPTIONS.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(value === opt ? "" : opt)}
          className={[
            "rounded-full px-3 py-1.5 text-xs font-medium border transition-all duration-150 font-[inherit]",
            value === opt
              ? "border-accent-orange bg-[rgba(240,131,74,0.1)] text-accent-orange"
              : "border-app-border bg-app-input text-muted-foreground hover:border-accent-orange hover:text-foreground",
          ].join(" ")}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── Slug status badge ─────────────────────────────────────────────────────────

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

function SlugStatusBadge({ status, message }: { status: SlugStatus; message: string }) {
  if (status === "idle") return null;
  const colorCls =
    status === "available"
      ? "text-[#3dd68c]"
      : status === "checking"
      ? "text-accent-purple"
      : "text-[#f06b6b]";
  const label = status === "checking" ? "Checking..." : message;
  return (
    <span className={`text-xs font-semibold px-3 whitespace-nowrap shrink-0 ${colorCls}`}>
      {label}
    </span>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProfileSectionProps {
  username: string | undefined;
  // Profile form
  firstName: string;
  lastName: string;
  gender: string;
  bio: string;
  profileSaving: boolean;
  profileMsg: Msg;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  setGender: (v: string) => void;
  setBio: (v: string) => void;
  onProfileSave: () => void;
  // Slug
  slugLocked: boolean;
  slugCooldownLeft: number;
  slugDraft: string;
  slugStatus: SlugStatus;
  slugMessage: string;
  slugSaving: boolean;
  slugMsg: Msg;
  setSlugDraft: (v: string) => void;
  onSlugSave: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProfileSection({
  username,
  firstName, lastName, gender, bio,
  profileSaving, profileMsg,
  setFirstName, setLastName, setGender, setBio,
  onProfileSave,
  slugLocked, slugCooldownLeft,
  slugDraft, slugStatus, slugMessage,
  slugSaving, slugMsg,
  setSlugDraft, onSlugSave,
}: ProfileSectionProps) {
  return (
    <div className="w-full space-y-0">
      <h2 className="font-serif text-[18px] font-bold mb-1">Edit Profile</h2>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        Update your name, gender, and bio. Your display name is derived from first + last name.
      </p>

      {/* Name row */}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="First Name" htmlFor="first-name">
          <input
            id="first-name"
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            maxLength={50}
            placeholder="First name"
            className="flex h-10 w-full rounded-md border border-app-border bg-app-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent-orange/40 focus:border-accent-orange transition-colors"
          />
        </FormField>
        <FormField label="Last Name" htmlFor="last-name">
          <input
            id="last-name"
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            maxLength={50}
            placeholder="Last name"
            className="flex h-10 w-full rounded-md border border-app-border bg-app-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent-orange/40 focus:border-accent-orange transition-colors"
          />
        </FormField>
      </div>

      {/* Gender */}
      <FormField
        label="Gender"
        htmlFor="gender"
        className="mt-4"
        hint="optional"
      >
        <GenderPicker value={gender} onChange={setGender} />
      </FormField>

      {/* Bio */}
      <FormField label="Bio" htmlFor="bio" className="mt-4">
        <TextArea
          id="bio"
          value={bio}
          onChange={e => setBio(e.target.value)}
          maxLength={280}
          rows={3}
          placeholder="Tell us about yourself..."
          variant="fixed"
        />
      </FormField>

      <MsgBanner msg={profileMsg} />

      <button
        type="button"
        disabled={profileSaving}
        onClick={onProfileSave}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-accent-orange to-[#e06c30] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save size={14} />
        {profileSaving ? "Saving..." : "Save Changes"}
      </button>

      {/* Slug section */}
      <Divider className="mt-6 mb-5" />

      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Profile URL
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wide bg-[rgba(124,115,240,0.12)] text-accent-purple rounded px-1.5 py-0.5">
            once per 30 days
          </span>
        </div>
        <p className="text-xs text-muted-foreground/60 mt-1 mb-3 leading-relaxed">
          Shareable profile link. Your @{username} handle stays permanent.
        </p>

        {slugLocked ? (
          <div className="rounded-lg border border-[#2a2f50] bg-[#13162a] px-3.5 py-2.5 text-xs text-accent-purple">
            Profile URL locked for {slugCooldownLeft} more day{slugCooldownLeft === 1 ? "" : "s"}.
          </div>
        ) : (
          <>
            <div
              className={[
                "flex items-center rounded-lg overflow-hidden border bg-app-input",
                slugStatus === "taken" || slugStatus === "invalid"
                  ? "border-[#f06b6b]"
                  : "border-app-border",
              ].join(" ")}
            >
              <span className="shrink-0 border-r border-app-border bg-[#0e111a] px-3 py-2.5 text-xs text-muted-foreground/60 select-none">
                khoshgolpo.com/
              </span>
              <input
                type="text"
                value={slugDraft}
                onChange={e => setSlugDraft(e.target.value)}
                maxLength={30}
                placeholder={username ?? "your-slug"}
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent px-2.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
              />
              <SlugStatusBadge status={slugStatus} message={slugMessage} />
            </div>

            <MsgBanner msg={slugMsg} />

            <button
              type="button"
              disabled={
                slugSaving ||
                slugStatus === "taken" ||
                slugStatus === "invalid" ||
                slugStatus === "checking"
              }
              onClick={onSlugSave}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-accent-orange to-[#e06c30] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              {slugSaving ? "Saving..." : "Update URL"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
