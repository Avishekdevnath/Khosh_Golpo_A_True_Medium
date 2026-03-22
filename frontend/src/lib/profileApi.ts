import { api, apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type { SignedProfileMediaUpload } from "@/lib/profileMedia";
import type {
  ProfileBasics,
  ProfileContactLink,
  ProfileEducation,
  ProfileExperience,
  ProfileLayout,
  ProfileProject,
  ProfileSections,
  ProfileUserSummary,
  ProfileViewerState,
} from "@/lib/profileViewModel";

export type ThreadOut = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  author_id: string;
  post_count: number;
  status: "open" | "closed" | "archived";
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

export type ThreadListResponse = {
  data: ThreadOut[];
  page: number;
  limit: number;
  total: number;
};

export type PublicProfilePayload = {
  user: ProfileUserSummary;
  basics: ProfileBasics;
  layout: ProfileLayout;
  sections: ProfileSections;
  viewer: ProfileViewerState;
};

export type ProfileVisibility = {
  show_about: boolean;
  show_experience: boolean;
  show_education: boolean;
  show_projects: boolean;
  show_skills: boolean;
  show_certifications: boolean;
  show_contact: boolean;
};

export type ProfileSkill = {
  id: string;
  name: string;
  sort_order: number;
  is_visible: boolean;
};

export type ProfileCertification = {
  id: string;
  name: string;
  issuer: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  credential_id?: string | null;
  credential_url?: string | null;
  sort_order: number;
  is_visible: boolean;
};

export type ManageProfilePayload = {
  user: ProfileUserSummary;
  basics: ProfileBasics;
  visibility: ProfileVisibility;
  layout: ProfileLayout;
  sections: {
    experience: ProfileExperience[];
    education: ProfileEducation[];
    projects: ProfileProject[];
    skills: ProfileSkill[];
    certifications: ProfileCertification[];
    contact_links: ProfileContactLink[];
  };
};

export type ProfileBasicsUpdateInput = {
  display_name?: string | null;
  bio?: string | null;
  headline?: string | null;
  about?: string | null;
  avatar_url?: string | null;
  avatar_public_id?: string | null;
  banner_url?: string | null;
  banner_public_id?: string | null;
  location?: string | null;
  website?: string | null;
  is_private?: boolean;
};

export type ProfileSectionKey =
  | "experience"
  | "education"
  | "projects"
  | "skills"
  | "certifications"
  | "contact_links";

const SECTION_PATHS: Record<ProfileSectionKey, string> = {
  experience: "experience",
  education: "education",
  projects: "projects",
  skills: "skills",
  certifications: "certifications",
  contact_links: "contact-links",
};

export async function saveThread(threadId: string): Promise<void> {
  await api.post(`threads/${encodeURIComponent(threadId)}/save`);
}

export async function unsaveThread(threadId: string): Promise<void> {
  await api.delete(`threads/${encodeURIComponent(threadId)}/save`);
}

export async function markThreadRead(threadId: string): Promise<void> {
  try {
    await api.post(`threads/${encodeURIComponent(threadId)}/mark-read`);
  } catch {
    // Fire-and-forget.
  }
}

export async function getSavedThreads(page = 1, limit = 10): Promise<ThreadListResponse> {
  return api.get("users/me/saved-threads", { searchParams: { page, limit } }).json();
}

export async function getReadHistory(page = 1, limit = 10): Promise<ThreadListResponse> {
  return api.get("users/me/read-history", { searchParams: { page, limit } }).json();
}

export async function getUserReplies(userId: string, page = 1, limit = 10): Promise<ThreadListResponse> {
  return api.get(`users/${encodeURIComponent(userId)}/replies`, { searchParams: { page, limit } }).json();
}

export async function setProfilePrivacy(isPrivate: boolean): Promise<void> {
  await api.patch("users/me", { json: { is_private: isPrivate } });
}

export async function getPublicProfile(identifier: string): Promise<PublicProfilePayload> {
  return apiGet<PublicProfilePayload>(`profiles/${encodeURIComponent(identifier)}`);
}

export async function getManageProfile(): Promise<ManageProfilePayload> {
  return apiGet<ManageProfilePayload>("profiles/me/manage");
}

export async function updateProfileBasics(payload: ProfileBasicsUpdateInput): Promise<ManageProfilePayload> {
  return apiPatch<ManageProfilePayload>("profiles/me/basics", payload);
}

export async function requestProfileMediaSignature(
  kind: "avatar" | "banner",
): Promise<SignedProfileMediaUpload> {
  return apiPost<SignedProfileMediaUpload>("profiles/me/media/signature", { kind });
}

export async function deleteProfileMedia(kind: "avatar" | "banner"): Promise<ManageProfilePayload> {
  return api.delete(`profiles/me/media/${kind}`).json<ManageProfilePayload>();
}

export async function updateProfileVisibility(payload: Partial<ProfileVisibility>): Promise<ManageProfilePayload> {
  return apiPatch<ManageProfilePayload>("profiles/me/visibility", payload);
}

export async function updateProfileLayout(payload: { middle_order: string[] }): Promise<ManageProfilePayload> {
  return apiPatch<ManageProfilePayload>("profiles/me/layout", payload);
}

export async function createProfileSectionItem<T>(
  section: ProfileSectionKey,
  payload: Record<string, unknown>,
): Promise<T> {
  return apiPost<T>(`profiles/me/${SECTION_PATHS[section]}`, payload);
}

export async function updateProfileSectionItem<T>(
  section: ProfileSectionKey,
  itemId: string,
  payload: Record<string, unknown>,
): Promise<T> {
  return apiPatch<T>(`profiles/me/${SECTION_PATHS[section]}/${encodeURIComponent(itemId)}`, payload);
}

export async function deleteProfileSectionItem(section: ProfileSectionKey, itemId: string): Promise<void> {
  await apiDelete(`profiles/me/${SECTION_PATHS[section]}/${encodeURIComponent(itemId)}`);
}

export async function checkProfileSlug(slug: string): Promise<{ available: boolean; reason?: string }> {
  return apiGet<{ available: boolean; reason?: string }>(
    `users/me/profile-slug/check?slug=${encodeURIComponent(slug)}`
  );
}

export async function saveProfileSlug(slug: string): Promise<{ profile_slug?: string | null; profile_slug_changed_at?: string | null }> {
  return apiPost("users/me/profile-slug", { slug });
}
