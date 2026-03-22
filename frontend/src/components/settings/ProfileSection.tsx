"use client";

import Link from "next/link";
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
          ? "bg-[rgba(61,214,140,0.08)] border border-[rgba(61,214,140,0.2)] text-green-700 dark:text-[#3dd68c]"
          : "bg-[rgba(240,107,107,0.08)] border border-[rgba(240,107,107,0.2)] text-red-700 dark:text-[#f06b6b]",
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
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-app-border bg-card text-text-secondary hover:border-primary/30 hover:text-foreground",
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
      ? "text-green-700 dark:text-[#3dd68c]"
      : status === "checking"
      ? "text-primary"
      : "text-red-700 dark:text-[#f06b6b]";
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
      <div className="mb-5 rounded-[20px] border border-border bg-card px-5 py-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
          Professional Profile
        </div>
        <h2 className="mt-2 font-serif text-[22px] font-bold text-foreground">Manage your public profile separately</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Headline, about, experience, projects, skills, certifications, contact links, visibility, and layout now live
          in the dedicated profile workspace.
        </p>
        <div className="mt-4">
          <Link
            href="/profile/manage"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open Manage Profile
          </Link>
        </div>
      </div>

      <h2 className="font-serif text-[18px] font-bold mb-1">Account Identity</h2>
      <p className="text-sm text-text-secondary mb-5 leading-relaxed">
        Keep your account details up to date here. Your professional public profile is managed in the dedicated
        workspace above.
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
            className="flex h-10 w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
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
            className="flex h-10 w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
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
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <span className="text-[9px] font-bold uppercase tracking-wide bg-primary/10 text-primary rounded px-1.5 py-0.5">
            once per 30 days
          </span>
        </div>
        <p className="text-xs text-text-secondary mt-1 mb-3 leading-relaxed">
          Shareable profile link. Your @{username} handle stays permanent.
        </p>

        {slugLocked ? (
          <div className="rounded-lg border border-primary/20 bg-primary/10 px-3.5 py-2.5 text-xs text-primary">
            Profile URL locked for {slugCooldownLeft} more day{slugCooldownLeft === 1 ? "" : "s"}.
          </div>
        ) : (
          <>
            <div
              className={[
                "flex items-center rounded-lg overflow-hidden border bg-card",
                slugStatus === "taken" || slugStatus === "invalid"
                  ? "border-[#f06b6b]"
                  : "border-app-border",
              ].join(" ")}
            >
              <span className="shrink-0 border-r border-app-border bg-card-hover px-3 py-2.5 text-xs text-text-secondary select-none">
                khoshgolpo.com/
              </span>
              <input
                type="text"
                value={slugDraft}
                onChange={e => setSlugDraft(e.target.value)}
                maxLength={30}
                placeholder={username ?? "your-slug"}
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent px-2.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none"
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
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
