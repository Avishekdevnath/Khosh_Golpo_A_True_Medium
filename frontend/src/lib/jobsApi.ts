import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type JobType = "full_time" | "part_time" | "contract" | "internship" | "freelance";
export type ExperienceLevel = "entry" | "mid" | "senior" | "lead";
export type JobStatus = "draft" | "pending_review" | "active" | "closed" | "rejected";
export type ApplicationStage =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "hired"
  | "rejected"
  | "withdrawn";

/** Valid stage transitions — mirrors backend STAGE_TRANSITIONS */
export const STAGE_TRANSITIONS: Record<ApplicationStage, ApplicationStage[]> = {
  applied: ["screening", "rejected"],
  screening: ["interview", "rejected"],
  interview: ["offer", "rejected"],
  offer: ["hired", "rejected"],
  hired: [],
  rejected: [],
  withdrawn: [],
};

export const TERMINAL_STAGES: ApplicationStage[] = ["hired", "rejected", "withdrawn"];

export type ReportReason = "fake_job" | "misleading" | "spam" | "inappropriate" | "scam" | "other";
export type QuestionType = "short_text" | "url" | "yes_no" | "single_select" | "multi_select";

export interface CustomQuestionInput {
  id?: string;
  label: string;
  type: QuestionType;
  required?: boolean;
  options?: string[];
}

export interface CustomQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options: string[];
}

export interface JobPosterOut {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export interface JobPostOut {
  id: string;
  slug: string;
  title: string;
  description: string;
  company_name: string;
  company_logo_url: string | null;
  poster_id: string;
  poster: JobPosterOut | null;
  location: string | null;
  is_remote: boolean;
  job_type: JobType;
  experience_level: ExperienceLevel;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  salary_visible: boolean;
  required_skills: string[];
  tags: string[];
  application_deadline: string | null;
  status: JobStatus;
  application_count: number;
  save_count: number;
  custom_questions: CustomQuestion[];
  external_apply_url: string | null;
  is_saved: boolean;
  has_applied: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobListResponse {
  data: JobPostOut[];
  total: number;
  page: number;
  page_size: number;
}

export interface StageHistoryEntry {
  stage: ApplicationStage;
  changed_at: string;
  changed_by: string;
  note: string | null;
}

export interface ApplicantUserOut {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  headline: string | null;
}

export interface ApplicationOut {
  id: string;
  job_id: string;
  applicant_id: string;
  applicant: ApplicantUserOut | null;
  cover_letter: string | null;
  resume_url: string | null;
  profile_snapshot: Record<string, unknown>;
  stage: ApplicationStage;
  stage_history: StageHistoryEntry[];
  employer_note: string | null;
  is_read_by_employer: boolean;
  is_read_by_candidate: boolean;
  custom_answers: Record<string, unknown>;
  is_external_redirect: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApplicationListResponse {
  data: ApplicationOut[];
  total: number;
}

export interface MyApplicationOut {
  id: string;
  job_id: string;
  job_title: string;
  company_name: string;
  stage: ApplicationStage;
  stage_history: StageHistoryEntry[];
  employer_note: string | null;
  is_external_redirect: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobFilters {
  search?: string;
  job_type?: JobType;
  experience_level?: ExperienceLevel;
  is_remote?: boolean;
  tag?: string;
  salary_min?: number;
  salary_max?: number;
  page?: number;
  page_size?: number;
}

// ── Job Posts ─────────────────────────────────────────────────────────────────

export async function listJobs(filters: JobFilters = {}): Promise<JobListResponse> {
  const params: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== "") {
      params[k] = v;
    }
  }
  return api.get("jobs", { searchParams: params }).json();
}

export async function getJob(jobId: string): Promise<JobPostOut> {
  return api.get(`jobs/${jobId}`).json();
}

export async function createJob(data: {
  title: string;
  description: string;
  company_name: string;
  company_logo_url?: string;
  location?: string;
  is_remote?: boolean;
  job_type?: JobType;
  experience_level?: ExperienceLevel;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_visible?: boolean;
  required_skills?: string[];
  tags?: string[];
  application_deadline?: string;
  custom_questions?: CustomQuestionInput[];
  external_apply_url?: string;
}): Promise<JobPostOut> {
  return api.post("jobs", { json: data }).json();
}

export async function updateJob(jobId: string, data: Record<string, unknown>): Promise<JobPostOut> {
  return api.patch(`jobs/${jobId}`, { json: data }).json();
}

export async function deleteJob(jobId: string): Promise<void> {
  await api.delete(`jobs/${jobId}`);
}

export async function closeJob(jobId: string): Promise<JobPostOut> {
  return api.post(`jobs/${jobId}/close`).json();
}

export async function listMyJobs(page = 1, page_size = 20): Promise<JobListResponse> {
  return api.get("jobs/my", { searchParams: { page, page_size } }).json();
}

// ── Saved Jobs ────────────────────────────────────────────────────────────────

export async function saveJob(jobId: string): Promise<void> {
  await api.post(`jobs/${jobId}/save`);
}

export async function unsaveJob(jobId: string): Promise<void> {
  await api.delete(`jobs/${jobId}/save`);
}

export async function listSavedJobs(page = 1, page_size = 20): Promise<JobListResponse> {
  return api.get("jobs/saved/list", { searchParams: { page, page_size } }).json();
}

// ── Applications ──────────────────────────────────────────────────────────────

export async function applyToJob(
  jobId: string,
  data: { cover_letter?: string; resume_url?: string; custom_answers?: Record<string, unknown> },
): Promise<ApplicationOut> {
  return api.post(`jobs/${jobId}/apply`, { json: data }).json();
}

export async function redirectToJob(jobId: string): Promise<ApplicationOut> {
  return api.post(`jobs/${jobId}/redirect`).json();
}

export async function listApplications(
  jobId: string,
  stage?: ApplicationStage,
): Promise<ApplicationListResponse> {
  const params: Record<string, string> = {};
  if (stage) params.stage = stage;
  return api.get(`jobs/${jobId}/applications`, { searchParams: params }).json();
}

export async function moveApplicationStage(
  jobId: string,
  appId: string,
  stage: ApplicationStage,
  note?: string,
): Promise<ApplicationOut> {
  return api.post(`jobs/${jobId}/applications/${appId}/move`, { json: { stage, note } }).json();
}

export async function withdrawApplication(
  jobId: string,
  appId: string,
): Promise<ApplicationOut> {
  return api.post(`jobs/${jobId}/applications/${appId}/withdraw`).json();
}

export async function listMyApplications(): Promise<MyApplicationOut[]> {
  return api.get("jobs/applications/me").json();
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function reportJob(
  jobId: string,
  reason: ReportReason,
  details?: string,
): Promise<void> {
  await api.post(`jobs/${jobId}/report`, { json: { reason, details } });
}
