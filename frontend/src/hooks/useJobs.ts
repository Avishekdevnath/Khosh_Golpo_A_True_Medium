import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { api } from "@/lib/api";
import type {
  ApplicationListResponse,
  ApplicationStage,
  JobFilters,
  JobListResponse,
  JobPostOut,
  MyApplicationOut,
} from "@/lib/jobsApi";
import {
  applyToJob,
  listApplications,
  listJobs,
  listMyApplications,
  listMyJobs,
  listSavedJobs,
  moveApplicationStage,
  saveJob,
  unsaveJob,
  withdrawApplication,
} from "@/lib/jobsApi";

// ── Job listings ──────────────────────────────────────────────────────────────

export function useJobs(filters: JobFilters = {}) {
  const key = ["jobs", filters];
  const { data, error, isLoading, mutate } = useSWR<JobListResponse>(key, () =>
    listJobs(filters),
  );
  return { jobs: data?.data ?? [], total: data?.total ?? 0, isLoading, error, mutate };
}

export function useJob(jobId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<JobPostOut>(
    jobId ? `jobs/${jobId}` : null,
    () => api.get(`jobs/${jobId}`).json<JobPostOut>(),
  );
  return { job: data ?? null, isLoading, error, mutate };
}

export function useMyJobs(page = 1) {
  const { data, error, isLoading, mutate } = useSWR<JobListResponse>(
    ["jobs/my", page],
    () => listMyJobs(page),
  );
  return { jobs: data?.data ?? [], total: data?.total ?? 0, isLoading, error, mutate };
}

export function useSavedJobs(page = 1) {
  const { data, error, isLoading, mutate } = useSWR<JobListResponse>(
    ["jobs/saved", page],
    () => listSavedJobs(page),
  );
  return { jobs: data?.data ?? [], total: data?.total ?? 0, isLoading, error, mutate };
}

// ── Candidate: my applications ────────────────────────────────────────────────

export function useMyApplications() {
  const { data, error, isLoading, mutate } = useSWR<MyApplicationOut[]>(
    "jobs/applications/me",
    () => listMyApplications(),
  );
  return { applications: data ?? [], isLoading, error, mutate };
}

// ── Employer: applications for a job ─────────────────────────────────────────

export function useApplications(jobId: string | null, stage?: ApplicationStage) {
  const { data, error, isLoading, mutate } = useSWR<ApplicationListResponse>(
    jobId ? ["jobs/applications", jobId, stage] : null,
    () => listApplications(jobId!, stage),
  );
  return { applications: data?.data ?? [], total: data?.total ?? 0, isLoading, error, mutate };
}

// ── Save / unsave mutations ───────────────────────────────────────────────────

export function useSaveJob(jobId: string) {
  const { trigger: save, isMutating: saving } = useSWRMutation(
    `jobs/${jobId}/save`,
    () => saveJob(jobId),
  );
  const { trigger: unsave, isMutating: unsaving } = useSWRMutation(
    `jobs/${jobId}/unsave`,
    () => unsaveJob(jobId),
  );
  return { save, unsave, saving, unsaving };
}

// ── Apply mutation ────────────────────────────────────────────────────────────

export function useApply(jobId: string) {
  const { trigger, isMutating, error } = useSWRMutation(
    `jobs/${jobId}/apply`,
    (
      _key: string,
      { arg }: { arg: { cover_letter?: string; resume_url?: string; custom_answers?: Record<string, unknown> } },
    ) =>
      applyToJob(jobId, arg),
  );
  return { apply: trigger, isApplying: isMutating, applyError: error };
}

// ── Stage move mutation ───────────────────────────────────────────────────────

export function useMoveStage(jobId: string, appId: string) {
  const { trigger, isMutating } = useSWRMutation(
    `jobs/${jobId}/applications/${appId}/move`,
    (_key: string, { arg }: { arg: { stage: ApplicationStage; note?: string } }) =>
      moveApplicationStage(jobId, appId, arg.stage, arg.note),
  );
  return { moveStage: trigger, isMoving: isMutating };
}

// ── Withdraw mutation ─────────────────────────────────────────────────────────

export function useWithdraw(jobId: string, appId: string) {
  const { trigger, isMutating } = useSWRMutation(
    `jobs/${jobId}/applications/${appId}/withdraw`,
    () => withdrawApplication(jobId, appId),
  );
  return { withdraw: trigger, isWithdrawing: isMutating };
}
