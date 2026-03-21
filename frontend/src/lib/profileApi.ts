// frontend/src/lib/profileApi.ts
import { api } from "@/lib/api";
import type { ThreadListResponse } from "@/components/profile/useUserProfile";

export type { ThreadListResponse };

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
    // Fire-and-forget — intentionally silent
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
