"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, PencilLine, Plus, Trash2 } from "lucide-react";

import WorkspaceShell from "@/components/app/WorkspaceShell";
import PageLoader from "@/components/shared/PageLoader";
import { Modal } from "@/components/ui/modal";
import {
  createProfileSectionItem,
  deleteProfileMedia,
  deleteProfileSectionItem,
  getManageProfile,
  requestProfileMediaSignature,
  saveProfileSlug,
  type ManageProfilePayload,
  type ProfileSectionKey,
  updateProfileBasics,
  updateProfileLayout,
  updateProfileSectionItem,
  updateProfileVisibility,
} from "@/lib/profileApi";
import { getManageProfileCoverLayout } from "@/lib/profileCoverLayout";
import { PROFILE_MEDIA_ACCEPT, uploadProfileMedia } from "@/lib/profileMedia";
import { formatCertificationTimeline, formatTimelineRange, getRenderableOverviewSections } from "@/lib/profileViewModel";
import { avatarSeed, initials } from "@/lib/workspaceUtils";

type EditorSection =
  | "basics"
  | "experience"
  | "education"
  | "projects"
  | "skills"
  | "certifications"
  | "contact"
  | "visibility"
  | "layout";

type ModalField = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "checkbox" | "select" | "month";
  options?: Array<{ value: string; label: string }>;
};

const SECTION_NAV: Array<{ key: EditorSection; label: string }> = [
  { key: "basics", label: "Profile Basics" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "projects", label: "Projects" },
  { key: "skills", label: "Skills" },
  { key: "certifications", label: "Certifications" },
  { key: "contact", label: "Contact" },
  { key: "visibility", label: "Visibility" },
  { key: "layout", label: "Layout" },
];

const SECTION_TO_API: Record<Exclude<EditorSection, "basics" | "visibility" | "layout">, ProfileSectionKey> = {
  experience: "experience",
  education: "education",
  projects: "projects",
  skills: "skills",
  certifications: "certifications",
  contact: "contact_links",
};

const SECTION_FIELDS: Record<Exclude<EditorSection, "basics" | "visibility" | "layout">, ModalField[]> = {
  experience: [
    { key: "title", label: "Title", kind: "text" },
    { key: "company", label: "Company", kind: "text" },
    { key: "start_date", label: "Start Date", kind: "month" },
    { key: "end_date", label: "End Date", kind: "month" },
    { key: "description", label: "Description", kind: "textarea" },
    { key: "is_current", label: "Currently here", kind: "checkbox" },
    { key: "is_visible", label: "Show publicly", kind: "checkbox" },
  ],
  education: [
    { key: "school", label: "School", kind: "text" },
    { key: "degree", label: "Degree", kind: "text" },
    { key: "start_date", label: "Start Date", kind: "month" },
    { key: "end_date", label: "End Date", kind: "month" },
    { key: "description", label: "Description", kind: "textarea" },
    { key: "is_current", label: "Currently studying", kind: "checkbox" },
    { key: "is_visible", label: "Show publicly", kind: "checkbox" },
  ],
  projects: [
    { key: "name", label: "Project Name", kind: "text" },
    { key: "role", label: "Role", kind: "text" },
    { key: "start_date", label: "Start Date", kind: "month" },
    { key: "end_date", label: "End Date", kind: "month" },
    { key: "project_url", label: "Project URL", kind: "text" },
    { key: "description", label: "Description", kind: "textarea" },
    { key: "is_ongoing", label: "Still ongoing", kind: "checkbox" },
    { key: "is_visible", label: "Show publicly", kind: "checkbox" },
  ],
  skills: [
    { key: "name", label: "Skill Name", kind: "text" },
    { key: "is_visible", label: "Show publicly", kind: "checkbox" },
  ],
  certifications: [
    { key: "name", label: "Certification", kind: "text" },
    { key: "issuer", label: "Issuer", kind: "text" },
    { key: "issue_date", label: "Issue Date", kind: "month" },
    { key: "expiry_date", label: "Expiry Date", kind: "month" },
    { key: "credential_url", label: "Credential URL", kind: "text" },
    { key: "is_visible", label: "Show publicly", kind: "checkbox" },
  ],
  contact: [
    {
      key: "type",
      label: "Type",
      kind: "select",
      options: [
        { value: "website", label: "Website" },
        { value: "portfolio", label: "Portfolio" },
        { value: "github", label: "GitHub" },
        { value: "linkedin", label: "LinkedIn" },
        { value: "email", label: "Email" },
        { value: "phone", label: "Phone" },
        { value: "other", label: "Other" },
      ],
    },
    { key: "label", label: "Label", kind: "text" },
    { key: "value", label: "Value", kind: "text" },
    { key: "is_public", label: "Publicly visible", kind: "checkbox" },
    { key: "is_visible", label: "Enable item", kind: "checkbox" },
  ],
};

function buildPreview(profile: ManageProfilePayload) {
  return {
    ...profile,
    viewer: { is_owner: true, is_admin: false, can_view_activity: true },
  };
}

function emptyDraftFor(section: Exclude<EditorSection, "basics" | "visibility" | "layout">): Record<string, unknown> {
  if (section === "contact") return { type: "website", is_public: true, is_visible: true };
  return { is_visible: true };
}

function sanitizeDraft(section: Exclude<EditorSection, "basics" | "visibility" | "layout">, draft: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(draft)) {
    if (typeof value === "string") {
      payload[key] = value.trim() || null;
    } else {
      payload[key] = value;
    }
  }
  if (section === "contact" && payload.is_public == null) {
    payload.is_public = !["email", "phone"].includes(String(payload.type ?? ""));
  }
  if (section === "experience" || section === "education") {
    if (payload.is_current) payload.end_date = null;
  }
  if (section === "projects" && payload.is_ongoing) {
    payload.end_date = null;
  }
  return payload;
}

function renderItemTitle(item: Record<string, unknown>) {
  return String(item.title ?? item.school ?? item.name ?? item.label ?? item.type ?? "Untitled");
}

function renderItemSubtitle(item: Record<string, unknown>) {
  return String(item.company ?? item.degree ?? item.role ?? item.issuer ?? item.value ?? "");
}

function renderItemTimeline(item: Record<string, unknown>) {
  const issueDate = typeof item.issue_date === "string" ? item.issue_date : null;
  const expiryDate = typeof item.expiry_date === "string" ? item.expiry_date : null;
  if (issueDate || expiryDate) {
    return formatCertificationTimeline(issueDate, expiryDate);
  }

  const startDate = typeof item.start_date === "string" ? item.start_date : null;
  const endDate = typeof item.end_date === "string" ? item.end_date : null;
  const isCurrent = Boolean(item.is_current ?? item.is_ongoing);
  return formatTimelineRange(startDate, endDate, isCurrent);
}

export default function ManageProfileWorkspace() {
  const [profile, setProfile] = useState<ManageProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [selectedSection, setSelectedSection] = useState<EditorSection>("basics");
  const [mobilePane, setMobilePane] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState<"avatar" | "banner" | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [shortBio, setShortBio] = useState("");
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [slugDraft, setSlugDraft] = useState("");
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSection, setEditorSection] = useState<Exclude<EditorSection, "basics" | "visibility" | "layout"> | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editorDraft, setEditorDraft] = useState<Record<string, unknown>>({});

  async function loadProfile() {
    setLoading(true);
    try {
      const payload = await getManageProfile();
      setProfile(payload);
      setDisplayName(payload.user.display_name);
      setShortBio(payload.user.bio ?? "");
      setHeadline(payload.basics.headline ?? "");
      setAbout(payload.basics.about ?? "");
      setLocation(payload.basics.location ?? "");
      setWebsite(payload.basics.website ?? "");
      setIsPrivate(payload.user.is_private);
      setSlugDraft(payload.user.profile_slug ?? payload.user.username);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function saveBasics() {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateProfileBasics({
        display_name: displayName,
        bio: shortBio || null,
        headline: headline || null,
        about: about || null,
        location: location || null,
        website: website || null,
        is_private: isPrivate,
      });
      setProfile(updated);
      setMessage({ type: "ok", text: "Profile basics saved." });
    } catch (error) {
      setMessage({ type: "err", text: error instanceof Error ? error.message : "Failed to save profile basics." });
    } finally {
      setSaving(false);
    }
  }

  async function saveVisibility() {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateProfileVisibility(profile.visibility);
      setProfile(updated);
      setMessage({ type: "ok", text: "Visibility updated." });
    } catch (error) {
      setMessage({ type: "err", text: error instanceof Error ? error.message : "Failed to save visibility." });
    } finally {
      setSaving(false);
    }
  }

  async function saveLayout() {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateProfileLayout({ middle_order: profile.layout.middle_order });
      setProfile(updated);
      setMessage({ type: "ok", text: "Section order updated." });
    } catch (error) {
      setMessage({ type: "err", text: error instanceof Error ? error.message : "Failed to save order." });
    } finally {
      setSaving(false);
    }
  }

  async function saveSlug() {
    setSaving(true);
    setMessage(null);
    try {
      await saveProfileSlug(slugDraft.trim().toLowerCase());
      await loadProfile();
      setMessage({ type: "ok", text: "Profile URL updated." });
    } catch (error) {
      setMessage({ type: "err", text: error instanceof Error ? error.message : "Failed to update profile URL." });
    } finally {
      setSaving(false);
    }
  }

  async function persistProfileMedia(kind: "avatar" | "banner", file: File) {
    setUploadingMedia(kind);
    setMessage(null);
    try {
      const signedUpload = await requestProfileMediaSignature(kind);
      const uploaded = await uploadProfileMedia(file, signedUpload);
      const updated = await updateProfileBasics(
        kind === "avatar"
          ? {
              avatar_url: uploaded.secure_url,
              avatar_public_id: uploaded.public_id,
            }
          : {
              banner_url: uploaded.secure_url,
              banner_public_id: uploaded.public_id,
            },
      );
      setProfile(updated);
      setMessage({ type: "ok", text: `${kind === "avatar" ? "Avatar" : "Banner"} updated.` });
    } catch (error) {
      setMessage({
        type: "err",
        text: error instanceof Error ? error.message : `Failed to upload ${kind}.`,
      });
    } finally {
      setUploadingMedia(null);
      if (kind === "avatar" && avatarInputRef.current) avatarInputRef.current.value = "";
      if (kind === "banner" && bannerInputRef.current) bannerInputRef.current.value = "";
    }
  }

  async function removeProfileMediaAsset(kind: "avatar" | "banner") {
    if (!window.confirm(`Remove your ${kind} image?`)) return;
    setUploadingMedia(kind);
    setMessage(null);
    try {
      const updated = await deleteProfileMedia(kind);
      setProfile(updated);
      setMessage({ type: "ok", text: `${kind === "avatar" ? "Avatar" : "Banner"} removed.` });
    } catch (error) {
      setMessage({
        type: "err",
        text: error instanceof Error ? error.message : `Failed to remove ${kind}.`,
      });
    } finally {
      setUploadingMedia(null);
    }
  }

  function openItemEditor(section: Exclude<EditorSection, "basics" | "visibility" | "layout">, item?: Record<string, unknown>) {
    setEditorSection(section);
    setEditingItemId((item?.id as string | undefined) ?? null);
    setEditorDraft(item ? { ...item } : emptyDraftFor(section));
    setEditorOpen(true);
  }

  async function saveItem() {
    if (!editorSection) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload = sanitizeDraft(editorSection, editorDraft);
      const apiSection = SECTION_TO_API[editorSection];
      if (editingItemId) await updateProfileSectionItem(apiSection, editingItemId, payload);
      else await createProfileSectionItem(apiSection, payload);
      await loadProfile();
      setEditorOpen(false);
      setMessage({ type: "ok", text: "Section item saved." });
    } catch (error) {
      setMessage({ type: "err", text: error instanceof Error ? error.message : "Failed to save item." });
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(section: Exclude<EditorSection, "basics" | "visibility" | "layout">, itemId: string) {
    if (!window.confirm("Delete this item permanently?")) return;
    setSaving(true);
    setMessage(null);
    try {
      await deleteProfileSectionItem(SECTION_TO_API[section], itemId);
      await loadProfile();
      setMessage({ type: "ok", text: "Item deleted." });
    } catch (error) {
      setMessage({ type: "err", text: error instanceof Error ? error.message : "Failed to delete item." });
    } finally {
      setSaving(false);
    }
  }

  function moveLayout(index: number, direction: -1 | 1) {
    if (!profile) return;
    const next = index + direction;
    if (next < 0 || next >= profile.layout.middle_order.length) return;
    const order = [...profile.layout.middle_order];
    const [item] = order.splice(index, 1);
    order.splice(next, 0, item!);
    setProfile({ ...profile, layout: { middle_order: order } });
  }

  if (loading && !profile) return <PageLoader />;
  if (!profile) return null;

  const preview = buildPreview(profile);
  const [accentA, accentB] = avatarSeed(profile.user.id);
  const coverLayout = getManageProfileCoverLayout();
  const bannerFallbackStyle = {
    background: `linear-gradient(135deg, ${accentA}24 0%, ${accentB}18 56%, rgba(255,255,255,0) 100%), var(--card-hover)`,
  };
  const sectionItems =
    editorSection && profile.sections[SECTION_TO_API[editorSection] as keyof ManageProfilePayload["sections"]];
  const isBusy = saving || uploadingMedia !== null;

  return (
    <WorkspaceShell wrapPanel={false}>
      <section className="ws-panel flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto ws-scroll">
          <div className="border-b border-border px-6 py-5 max-sm:px-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Manage Profile</div>
            <h1 className="mt-2 font-serif text-[32px] leading-tight text-foreground max-sm:text-[26px]">Professional profile editor</h1>
            <p className="mt-2 max-w-[720px] text-[14px] leading-7 text-text-secondary">
              Save updates live, then preview the public result here before you share it.
            </p>
          </div>

          <div className="border-b border-border px-4 py-3 xl:hidden">
            <div className="grid grid-cols-2 gap-2 rounded-[16px] border border-border bg-card p-1">
              <button type="button" onClick={() => setMobilePane("edit")} className={`rounded-[12px] px-3 py-2 text-[13px] ${mobilePane === "edit" ? "bg-background text-foreground" : "text-text-secondary"}`}>Edit</button>
              <button type="button" onClick={() => setMobilePane("preview")} className={`rounded-[12px] px-3 py-2 text-[13px] ${mobilePane === "preview" ? "bg-background text-foreground" : "text-text-secondary"}`}>Preview</button>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 xl:grid-cols-[220px_minmax(0,1fr)_360px] max-sm:px-4">
            <aside className={`${mobilePane === "preview" ? "hidden xl:block" : "block"} rounded-[22px] border border-border bg-background p-4`}>
              <div className="flex flex-col gap-1">
                {SECTION_NAV.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelectedSection(item.key)}
                    className={`rounded-[14px] px-3 py-2.5 text-left text-[13px] ${selectedSection === item.key ? "bg-primary/10 font-semibold text-primary" : "text-text-secondary hover:bg-card hover:text-foreground"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </aside>

            <main className={`${mobilePane === "preview" ? "hidden xl:block" : "block"} rounded-[22px] border border-border bg-background p-5`}>
              {message && <div className={`mb-4 rounded-[16px] border px-4 py-3 text-[13px] ${message.type === "ok" ? "border-success/20 bg-success/10 text-success" : "border-destructive/20 bg-destructive/10 text-destructive"}`}>{message.text}</div>}

              {selectedSection === "basics" && (
                <div className="grid gap-4">
                  <label className="grid gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Display Name<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded-[16px] border border-border bg-card px-4 py-3 text-[14px] text-foreground" /></label>
                  <label className="grid gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Headline<input value={headline} onChange={(e) => setHeadline(e.target.value)} className="rounded-[16px] border border-border bg-card px-4 py-3 text-[14px] text-foreground" /></label>
                  <label className="grid gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Short Bio<textarea value={shortBio} onChange={(e) => setShortBio(e.target.value)} rows={3} className="rounded-[16px] border border-border bg-card px-4 py-3 text-[14px] text-foreground" /></label>
                  <label className="grid gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">About<textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={6} className="rounded-[16px] border border-border bg-card px-4 py-3 text-[14px] text-foreground" /></label>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[18px] border border-border bg-card p-4">
                      <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Avatar</div>
                      <div className="mt-4 flex items-center gap-4">
                        {profile.user.avatar_url ? (
                          <img src={profile.user.avatar_url} alt={profile.user.display_name} className="size-20 rounded-[20px] border border-border object-cover" />
                        ) : (
                          <div className="grid size-20 place-items-center rounded-[20px] font-serif text-[24px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${accentA}, ${accentB})` }}>
                            {initials(profile.user.display_name)}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-[13px] leading-6 text-text-secondary">PNG, JPG, or WEBP up to 5MB.</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" disabled={isBusy} onClick={() => avatarInputRef.current?.click()} className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground disabled:opacity-50">
                              {uploadingMedia === "avatar" ? "Uploading..." : profile.user.avatar_url ? "Replace Avatar" : "Upload Avatar"}
                            </button>
                            {profile.user.avatar_url && (
                              <button type="button" disabled={isBusy} onClick={() => void removeProfileMediaAsset("avatar")} className="rounded-full border border-border px-4 py-2 text-[13px] text-text-secondary disabled:opacity-50">
                                Remove
                              </button>
                            )}
                          </div>
                          <input
                            ref={avatarInputRef}
                            type="file"
                            accept={PROFILE_MEDIA_ACCEPT}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void persistProfileMedia("avatar", file);
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-border bg-card p-4">
                      <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Banner</div>
                      <div
                        className={`mt-4 border border-border bg-card-hover ${coverLayout.frameClassName}`}
                        style={profile.basics.banner_url ? undefined : bannerFallbackStyle}
                      >
                        {profile.basics.banner_url && (
                          <img
                            src={profile.basics.banner_url}
                            alt=""
                            className={coverLayout.imageClassName}
                          />
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button type="button" disabled={isBusy} onClick={() => bannerInputRef.current?.click()} className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground disabled:opacity-50">
                          {uploadingMedia === "banner" ? "Uploading..." : profile.basics.banner_url ? "Replace Banner" : "Upload Banner"}
                        </button>
                        {profile.basics.banner_url && (
                          <button type="button" disabled={isBusy} onClick={() => void removeProfileMediaAsset("banner")} className="rounded-full border border-border px-4 py-2 text-[13px] text-text-secondary disabled:opacity-50">
                            Remove
                          </button>
                        )}
                        <span className="text-[12px] text-text-secondary">PNG, JPG, or WEBP up to 5MB.</span>
                        <input
                          ref={bannerInputRef}
                          type="file"
                          accept={PROFILE_MEDIA_ACCEPT}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void persistProfileMedia("banner", file);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <label className="grid gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Location<input value={location} onChange={(e) => setLocation(e.target.value)} className="rounded-[16px] border border-border bg-card px-4 py-3 text-[14px] text-foreground" /></label>
                  <label className="grid gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Website<input value={website} onChange={(e) => setWebsite(e.target.value)} className="rounded-[16px] border border-border bg-card px-4 py-3 text-[14px] text-foreground" /></label>
                  <div className="rounded-[18px] border border-border bg-card p-4">
                    <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">Profile URL</div>
                    <div className="flex gap-2 max-sm:flex-col">
                      <input value={slugDraft} onChange={(e) => setSlugDraft(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))} className="flex-1 rounded-[16px] border border-border bg-background px-4 py-3 text-[14px] text-foreground" />
                      <button type="button" disabled={isBusy} onClick={() => void saveSlug()} className="rounded-full border border-border px-4 py-2 text-[13px] text-text-secondary disabled:opacity-50">Save URL</button>
                    </div>
                  </div>
                  <label className="flex items-center justify-between rounded-[18px] border border-border bg-card px-4 py-4">
                    <span className="text-[14px] text-foreground">Private account</span>
                    <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="size-4" />
                  </label>
                  <div className="flex justify-between">
                    <Link href={`/${encodeURIComponent(profile.user.profile_slug ?? profile.user.username)}`} className="rounded-full border border-border px-4 py-2 text-[13px] text-text-secondary">View Public Profile</Link>
                    <button type="button" disabled={isBusy} onClick={() => void saveBasics()} className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground disabled:opacity-50">Save Basics</button>
                  </div>
                </div>
              )}

              {selectedSection === "visibility" && (
                <div className="grid gap-3">
                  {Object.entries(profile.visibility).map(([key, value]) => (
                    <label key={key} className="flex items-center justify-between rounded-[18px] border border-border bg-card px-4 py-3">
                      <span className="text-[14px] capitalize text-foreground">{key.replace("show_", "").replaceAll("_", " ")}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => setProfile({ ...profile, visibility: { ...profile.visibility, [key]: e.target.checked } })}
                        className="size-4"
                      />
                    </label>
                  ))}
                  <div className="flex justify-end">
                    <button type="button" disabled={saving} onClick={() => void saveVisibility()} className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground disabled:opacity-50">Save Visibility</button>
                  </div>
                </div>
              )}

              {selectedSection === "layout" && (
                <div className="grid gap-3">
                  {profile.layout.middle_order.map((item, index) => (
                    <div key={item} className="flex items-center justify-between rounded-[18px] border border-border bg-card px-4 py-3">
                      <span className="text-[14px] font-medium capitalize text-foreground">{item}</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => moveLayout(index, -1)} className="rounded-full border border-border p-2 text-text-secondary"><ArrowUp size={14} /></button>
                        <button type="button" onClick={() => moveLayout(index, 1)} className="rounded-full border border-border p-2 text-text-secondary"><ArrowDown size={14} /></button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <button type="button" disabled={saving} onClick={() => void saveLayout()} className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground disabled:opacity-50">Save Order</button>
                  </div>
                </div>
              )}

              {(["experience", "education", "projects", "skills", "certifications", "contact"] as const).includes(selectedSection as never) && (
                <div className="grid gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-serif text-[28px] capitalize text-foreground">{selectedSection}</h2>
                    <button type="button" onClick={() => openItemEditor(selectedSection as Exclude<EditorSection, "basics" | "visibility" | "layout">)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground"><Plus size={14} />Add</button>
                  </div>
                  <div className="grid gap-3">
                    {Array.isArray(sectionItems) && sectionItems.length > 0 ? (
                      sectionItems.map((item) => (
                        <div key={String(item.id)} className="rounded-[18px] border border-border bg-card px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[15px] font-semibold text-foreground">{renderItemTitle(item as Record<string, unknown>)}</div>
                              <div className="mt-1 text-[13px] text-text-secondary">{renderItemSubtitle(item as Record<string, unknown>)}</div>
                              {renderItemTimeline(item as Record<string, unknown>) && (
                                <div className="mt-2 text-[12px] font-medium text-text-tertiary">
                                  {renderItemTimeline(item as Record<string, unknown>)}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => openItemEditor(selectedSection as Exclude<EditorSection, "basics" | "visibility" | "layout">, item as Record<string, unknown>)} className="rounded-full border border-border p-2 text-text-secondary"><PencilLine size={14} /></button>
                              <button type="button" onClick={() => void deleteItem(selectedSection as Exclude<EditorSection, "basics" | "visibility" | "layout">, String(item.id))} className="rounded-full border border-border p-2 text-text-secondary hover:text-destructive"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[18px] border border-dashed border-border bg-card px-5 py-12 text-center text-[13px] text-text-secondary">No items yet.</div>
                    )}
                  </div>
                </div>
              )}
            </main>

            <aside className={`${mobilePane === "edit" ? "hidden xl:block" : "block"} rounded-[22px] border border-border bg-background p-4`}>
              <div
                className={`${coverLayout.frameClassName} bg-card-hover`}
                style={profile.basics.banner_url ? undefined : bannerFallbackStyle}
              >
                {profile.basics.banner_url && (
                  <img
                    src={profile.basics.banner_url}
                    alt=""
                    className={coverLayout.imageClassName}
                  />
                )}
              </div>
              <div className={`${coverLayout.avatarOverlapClassName} mb-4 flex items-end gap-3 px-2`}>
                {profile.user.avatar_url ? (
                  <img src={profile.user.avatar_url} alt={profile.user.display_name} className="size-[72px] rounded-[20px] border-4 border-background object-cover" />
                ) : (
                  <div className="grid size-[72px] place-items-center rounded-[20px] border-4 border-background font-serif text-[24px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${accentA}, ${accentB})` }}>{initials(profile.user.display_name)}</div>
                )}
              </div>
              <div className="px-2">
                <h2 className="font-serif text-[28px] leading-tight text-foreground">{profile.user.display_name}</h2>
                <p className="mt-1 text-[13px] text-text-tertiary">@{profile.user.username}</p>
                {profile.basics.headline && <p className="mt-3 text-[15px] leading-7 text-foreground">{profile.basics.headline}</p>}
                {profile.user.bio && <p className="mt-3 text-[13px] leading-6 text-text-secondary">{profile.user.bio}</p>}
                <div className="mt-5 flex flex-col gap-3">
                  {getRenderableOverviewSections(preview).map((section) => (
                    <div key={section.key} className="rounded-[18px] border border-border bg-card px-4 py-4">
                      <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">{section.title}</div>
                      {section.key === "about" && <p className="text-[13px] leading-6 text-text-secondary">{section.body}</p>}
                      {"items" in section && (
                        <div className="grid gap-2">
                          {section.items.map((item) => (
                            <div key={item.id} className="grid gap-1 text-[13px] text-text-secondary">
                              <div>
                                <span className="font-medium text-foreground">{renderItemTitle(item as Record<string, unknown>)}</span>
                                {renderItemSubtitle(item as Record<string, unknown>) && (
                                  <span> - {renderItemSubtitle(item as Record<string, unknown>)}</span>
                                )}
                              </div>
                              {renderItemTimeline(item as Record<string, unknown>) && (
                                <div className="text-[12px] font-medium text-text-tertiary">
                                  {renderItemTimeline(item as Record<string, unknown>)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editingItemId ? `Edit ${editorSection}` : `Add ${editorSection}`}
        size="lg"
        footer={
          <button type="button" disabled={saving} onClick={() => void saveItem()} className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground disabled:opacity-50">
            {editingItemId ? "Save changes" : "Add item"}
          </button>
        }
      >
        {editorSection && (
          <div className="grid gap-4">
            {SECTION_FIELDS[editorSection].map((field) => (
              <label key={field.key} className="grid gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                {field.label}
                {field.kind === "textarea" && (
                  <textarea value={String(editorDraft[field.key] ?? "")} onChange={(e) => setEditorDraft({ ...editorDraft, [field.key]: e.target.value })} rows={5} className="rounded-[16px] border border-border bg-card px-4 py-3 text-[14px] text-foreground" />
                )}
                {field.kind === "text" && (
                  <input value={String(editorDraft[field.key] ?? "")} onChange={(e) => setEditorDraft({ ...editorDraft, [field.key]: e.target.value })} className="rounded-[16px] border border-border bg-card px-4 py-3 text-[14px] text-foreground" />
                )}
                {field.kind === "month" && (
                  <input
                    type="month"
                    value={String(editorDraft[field.key] ?? "")}
                    onChange={(e) => setEditorDraft({ ...editorDraft, [field.key]: e.target.value })}
                    disabled={field.key === "end_date" && Boolean(editorDraft.is_current ?? editorDraft.is_ongoing)}
                    className="rounded-[16px] border border-border bg-card px-4 py-3 text-[14px] text-foreground"
                  />
                )}
                {field.kind === "checkbox" && (
                  <div className="flex items-center justify-between rounded-[16px] border border-border bg-card px-4 py-3">
                    <span className="text-[14px] normal-case tracking-normal text-foreground">{Boolean(editorDraft[field.key]) ? "Enabled" : "Disabled"}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(editorDraft[field.key])}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const nextDraft = { ...editorDraft, [field.key]: checked };
                        if ((field.key === "is_current" || field.key === "is_ongoing") && checked) {
                          nextDraft.end_date = null;
                        }
                        setEditorDraft(nextDraft);
                      }}
                      className="size-4"
                    />
                  </div>
                )}
                {field.kind === "select" && (
                  <select value={String(editorDraft[field.key] ?? "website")} onChange={(e) => setEditorDraft({ ...editorDraft, [field.key]: e.target.value })} className="rounded-[16px] border border-border bg-card px-4 py-3 text-[14px] text-foreground">
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                )}
              </label>
            ))}
          </div>
        )}
      </Modal>
    </WorkspaceShell>
  );
}
