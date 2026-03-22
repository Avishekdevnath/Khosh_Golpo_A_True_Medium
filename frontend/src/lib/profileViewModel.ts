export type ProfileTabKey = "overview" | "threads" | "replies" | "saved";
export type OverviewSectionKey =
  | "about"
  | "experience"
  | "education"
  | "projects"
  | "skills"
  | "certifications"
  | "contact";

export type ProfileUserSummary = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  profile_slug: string | null;
  is_private: boolean;
  is_bot: boolean;
  created_at: string;
};

export type ProfileBasics = {
  headline: string | null;
  about: string | null;
  banner_url: string | null;
  location: string | null;
  website: string | null;
  completion_percent: number;
};

export type ProfileLayout = {
  middle_order: string[];
};

export type ProfileExperience = {
  id: string;
  title: string;
  company: string;
  employment_type?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  description?: string | null;
  sort_order: number;
  is_visible: boolean;
};

export type ProfileEducation = {
  id: string;
  school: string;
  degree?: string | null;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean;
  description?: string | null;
  sort_order: number;
  is_visible: boolean;
};

export type ProfileProject = {
  id: string;
  name: string;
  role?: string | null;
  description?: string | null;
  project_url?: string | null;
  repo_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_ongoing?: boolean;
  sort_order: number;
  is_visible: boolean;
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
  issuer?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  credential_id?: string | null;
  credential_url?: string | null;
  sort_order: number;
  is_visible: boolean;
};

export type ProfileContactLink = {
  id: string;
  type: string;
  value: string;
  sort_order: number;
  is_visible: boolean;
  is_public: boolean;
  label?: string | null;
};

export type ProfileSections = {
  experience: ProfileExperience[];
  education: ProfileEducation[];
  projects: ProfileProject[];
  skills: ProfileSkill[];
  certifications: ProfileCertification[];
  contact_links: ProfileContactLink[];
};

export type ProfileViewerState = {
  is_owner: boolean;
  is_admin: boolean;
  can_view_activity: boolean;
};

export type PublicProfilePayload = {
  user: ProfileUserSummary;
  basics: ProfileBasics;
  layout: ProfileLayout;
  sections: ProfileSections;
  viewer: ProfileViewerState;
};

export type RenderableOverviewSection =
  | { key: "about"; title: "About"; body: string }
  | { key: "experience"; title: "Experience"; items: ProfileExperience[] }
  | { key: "education"; title: "Education"; items: ProfileEducation[] }
  | { key: "projects"; title: "Projects"; items: ProfileProject[] }
  | { key: "skills"; title: "Skills"; items: ProfileSkill[] }
  | { key: "certifications"; title: "Certifications"; items: ProfileCertification[] }
  | { key: "contact"; title: "Contact"; items: ProfileContactLink[] };

type MiddleOverviewSectionKey = "projects" | "skills" | "certifications";

const MIDDLE_SECTION_KEYS: MiddleOverviewSectionKey[] = ["projects", "skills", "certifications"];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatProfileDate(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  if (/^\d{4}$/.test(value)) return value;

  const monthMatch = /^(\d{4})-(\d{2})$/.exec(value);
  if (monthMatch) {
    const monthIndex = Number(monthMatch[2]) - 1;
    if (monthIndex >= 0 && monthIndex < MONTH_NAMES.length) {
      return `${MONTH_NAMES[monthIndex]} ${monthMatch[1]}`;
    }
  }

  const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dayMatch) {
    const monthIndex = Number(dayMatch[2]) - 1;
    if (monthIndex >= 0 && monthIndex < MONTH_NAMES.length) {
      return `${MONTH_NAMES[monthIndex]} ${dayMatch[1]}`;
    }
  }

  return value;
}

export function getProfileTabs(isOwnProfile: boolean): ProfileTabKey[] {
  return isOwnProfile ? ["overview", "threads", "replies", "saved"] : ["overview", "threads", "replies"];
}

export function buildOverviewSectionOrder(middleOrder: string[]): OverviewSectionKey[] {
  const normalizedMiddle: MiddleOverviewSectionKey[] = middleOrder
    .map((key) => key.trim().toLowerCase())
    .filter((key, index, source): key is MiddleOverviewSectionKey =>
      (MIDDLE_SECTION_KEYS as string[]).includes(key) && source.indexOf(key) === index,
    );

  for (const key of MIDDLE_SECTION_KEYS) {
    if (!normalizedMiddle.includes(key)) {
      normalizedMiddle.push(key);
    }
  }

  return ["about", "experience", "education", ...normalizedMiddle, "contact"];
}

export function getRenderableOverviewSections(payload: PublicProfilePayload): RenderableOverviewSection[] {
  const orderedKeys = buildOverviewSectionOrder(payload.layout.middle_order);
  const sections: RenderableOverviewSection[] = [];

  for (const key of orderedKeys) {
    if (key === "about") {
      if (payload.basics.about?.trim()) {
        sections.push({ key: "about", title: "About", body: payload.basics.about });
      }
      continue;
    }

    if (key === "experience" && payload.sections.experience.length > 0) {
      sections.push({ key: "experience", title: "Experience", items: payload.sections.experience });
      continue;
    }

    if (key === "education" && payload.sections.education.length > 0) {
      sections.push({ key: "education", title: "Education", items: payload.sections.education });
      continue;
    }

    if (key === "projects" && payload.sections.projects.length > 0) {
      sections.push({ key: "projects", title: "Projects", items: payload.sections.projects });
      continue;
    }

    if (key === "skills" && payload.sections.skills.length > 0) {
      sections.push({ key: "skills", title: "Skills", items: payload.sections.skills });
      continue;
    }

    if (key === "certifications" && payload.sections.certifications.length > 0) {
      sections.push({ key: "certifications", title: "Certifications", items: payload.sections.certifications });
      continue;
    }

    if (key === "contact" && payload.sections.contact_links.length > 0) {
      sections.push({ key: "contact", title: "Contact", items: payload.sections.contact_links });
    }
  }

  return sections;
}


export function formatTimelineRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  isCurrent = false,
): string | null {
  const start = formatProfileDate(startDate);
  const end = formatProfileDate(endDate);

  if (start && isCurrent) return `${start} - Present`;
  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  if (end) return end;
  return null;
}


export function formatCertificationTimeline(
  issueDate: string | null | undefined,
  expiryDate: string | null | undefined,
): string | null {
  const issued = formatProfileDate(issueDate);
  const expires = formatProfileDate(expiryDate);

  if (issued && expires) return `Issued ${issued} · Expires ${expires}`;
  if (issued) return `Issued ${issued}`;
  if (expires) return `Expires ${expires}`;
  return null;
}
