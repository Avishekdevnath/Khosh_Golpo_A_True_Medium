"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  bulkUpdateUserRole,
  bulkUpdateUserStatus,
  deletePostByAdmin,
  deleteThreadByAdmin,
  editAdminContentItem,
  getAdminStats,
  getAdminUsers,
  getModerationQueue,
  listAppeals,
  listAuditLogs,
  listContent,
  moderateBulk,
  notifyAdminContentAuthor,
  rereportAdminContentItem,
  resolveAppeal,
  rereportMissingContentByAdmin,
  updateAdminContentFlag,
  updateAdminUserRole,
  updateAdminUserStatus,
  updateThreadPinByAdmin,
  updateThreadStatusByAdmin,
} from "@/lib/adminApi";
import { getAdminFeedAIHealth, getAdminFeedConfig } from "@/lib/adminFeedApi";
import { profilePathFromUsername, toProfilePath } from "@/lib/profileRouting";
import { downloadCsv, downloadJson } from "@/lib/workspaceUtils";
import { useAuthStore } from "@/store/authStore";
import type {
  AdminContentItem,
  AdminAppealItem,
  AdminStats,
  AdminUserItem,
  AppealStatus,
  AuditLogItem,
  ModerationAction,
  ModerationItem,
  ThreadStatus,
  UserRole,
  UserSortOption,
} from "@/types/admin";
import type { FeedAIHealth, FeedConfig } from "@/types/feed";

export type AdminTab =
  | "overview"
  | "moderation"
  | "appeals"
  | "users"
  | "content"
  | "removed"
  | "audit"
  | "bot";

type BoolFilter = "" | "true" | "false";

function toBool(value: BoolFilter): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}
function parseAuditPage(value: string | null): number {
  if (!value) return 1;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}
function parseAuditSeverity(value: string | null): "" | "info" | "warning" | "critical" {
  if (value === "info" || value === "warning" || value === "critical") return value;
  return "";
}
function parseAuditResult(value: string | null): "" | "success" | "failed" {
  if (value === "success" || value === "failed") return value;
  return "";
}
function parseAuditDate(value: string | null): string {
  if (!value) return "";
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? "";
}
function parseUserRole(value: string | null): UserRole | "" {
  if (value === "admin" || value === "moderator" || value === "member") return value;
  return "";
}
function parseUserSort(value: string | null): UserSortOption {
  if (value === "oldest" || value === "name_az" || value === "name_za") return value;
  return "newest";
}
function parseUserStatus(value: string | null): "active" | "inactive" | "" {
  if (value === "active" || value === "inactive") return value;
  return "";
}
function moderationItemKey(item: Pick<ModerationItem, "type" | "id">): string {
  return `${item.type}:${item.id}`;
}

export function useAdminPage(initialTab: AdminTab = "overview") {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [tab, setTab] = useState<AdminTab>(initialTab);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Overview
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [feedConfig, setFeedConfig] = useState<FeedConfig | null>(null);
  const [feedAIHealth, setFeedAIHealth] = useState<FeedAIHealth | null>(null);
  const [feedReadError, setFeedReadError] = useState<string | null>(null);

  // Moderation
  const [modItems, setModItems] = useState<ModerationItem[]>([]);
  const [modTotal, setModTotal] = useState(0);
  const [modFlaggedPosts, setModFlaggedPosts] = useState(0);
  const [modFlaggedThreads, setModFlaggedThreads] = useState(0);
  const [modSelectedIds, setModSelectedIds] = useState<string[]>([]);
  const [modActionLoading, setModActionLoading] = useState<string | null>(null);
  const [modBulkLoading, setModBulkLoading] = useState(false);
  const [modRefreshing, setModRefreshing] = useState(false);

  // Appeals
  const [appeals, setAppeals] = useState<AdminAppealItem[]>([]);
  const [appealsTotal, setAppealsTotal] = useState(0);
  const [appealsPending, setAppealsPending] = useState(0);
  const [appealsLoading, setAppealsLoading] = useState(false);
  const [appealsStatus, setAppealsStatus] = useState<"" | AppealStatus>("pending");
  const [appealsActionLoading, setAppealsActionLoading] = useState<string | null>(null);
  const [appealRejectTarget, setAppealRejectTarget] = useState<AdminAppealItem | null>(null);

  // Users
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userSearch, setUserSearch] = useState(() => searchParams.get("u_search") ?? "");
  const [userSort, setUserSort] = useState<UserSortOption>(() => parseUserSort(searchParams.get("u_sort")));
  const [userRole, setUserRole] = useState<UserRole | "">(() => parseUserRole(searchParams.get("u_role")));
  const [userIsActive, setUserIsActive] = useState<"active" | "inactive" | "">(() => parseUserStatus(searchParams.get("u_status")));
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);
  const [userBulkLoading, setUserBulkLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [userDetailId, setUserDetailId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<{ type: "role" | "activate" | "deactivate"; role?: UserRole } | null>(null);

  // Content
  const [contentItems, setContentItems] = useState<AdminContentItem[]>([]);
  const [contentTotal, setContentTotal] = useState(0);
  const [removedTotal, setRemovedTotal] = useState(0);
  const [contentMissingAiReports, setContentMissingAiReports] = useState(0);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentSearch, setContentSearch] = useState("");
  const [contentType, setContentType] = useState<"all" | "thread" | "post">("all");
  const [contentStatus, setContentStatus] = useState<"" | ThreadStatus>("");
  const [contentDeleted, setContentDeleted] = useState<BoolFilter>(initialTab === "removed" ? "true" : "");
  const [contentFlagged, setContentFlagged] = useState<BoolFilter>("");
  const [contentActionLoading, setContentActionLoading] = useState<string | null>(null);

  // Audit
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const auditLimit = 20;
  const [auditPage, setAuditPage] = useState(() => parseAuditPage(searchParams.get("page")));
  const [auditAction, setAuditAction] = useState(() => searchParams.get("action") ?? "");
  const [auditTargetType, setAuditTargetType] = useState(() => searchParams.get("target_type") ?? "");
  const [auditSeverity, setAuditSeverity] = useState<"" | "info" | "warning" | "critical">(() =>
    parseAuditSeverity(searchParams.get("severity")),
  );
  const [auditResult, setAuditResult] = useState<"" | "success" | "failed">(() => parseAuditResult(searchParams.get("result")));
  const [auditActorId, setAuditActorId] = useState(() => searchParams.get("actor_id") ?? "");
  const [auditRequestId, setAuditRequestId] = useState(() => searchParams.get("request_id") ?? "");
  const [auditDateFrom, setAuditDateFrom] = useState(() => parseAuditDate(searchParams.get("date_from")));
  const [auditDateTo, setAuditDateTo] = useState(() => parseAuditDate(searchParams.get("date_to")));
  const auditTotalPages = Math.max(1, Math.ceil(auditTotal / auditLimit));

  const contentFilters = useMemo(
    () => ({
      type: contentType,
      search: contentSearch.trim() || undefined,
      status: contentStatus || undefined,
      is_deleted: toBool(contentDeleted),
      is_flagged: toBool(contentFlagged),
    }),
    [contentDeleted, contentFlagged, contentSearch, contentStatus, contentType],
  );

  const auditFilters = useMemo(
    () => ({
      page: auditPage,
      limit: auditLimit,
      action: auditAction.trim() || undefined,
      target_type: auditTargetType.trim() || undefined,
      severity: auditSeverity || undefined,
      result: auditResult || undefined,
      actor_id: auditActorId.trim() || undefined,
      request_id: auditRequestId.trim() || undefined,
      date_from: auditDateFrom ? `${auditDateFrom}T00:00:00Z` : undefined,
      date_to: auditDateTo ? `${auditDateTo}T23:59:59Z` : undefined,
    }),
    [auditAction, auditActorId, auditDateFrom, auditDateTo, auditPage, auditRequestId, auditResult, auditSeverity, auditTargetType],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    setTab(initialTab);
    if (initialTab === "removed") setContentDeleted("true");
  }, [initialTab]);

  // Audit URL sync — read
  useEffect(() => {
    if (tab !== "audit") return;
    setAuditPage(prev => { const v = parseAuditPage(searchParams.get("page")); return prev === v ? prev : v; });
    setAuditAction(prev => { const v = searchParams.get("action") ?? ""; return prev === v ? prev : v; });
    setAuditTargetType(prev => { const v = searchParams.get("target_type") ?? ""; return prev === v ? prev : v; });
    setAuditSeverity(prev => { const v = parseAuditSeverity(searchParams.get("severity")); return prev === v ? prev : v; });
    setAuditResult(prev => { const v = parseAuditResult(searchParams.get("result")); return prev === v ? prev : v; });
    setAuditActorId(prev => { const v = searchParams.get("actor_id") ?? ""; return prev === v ? prev : v; });
    setAuditRequestId(prev => { const v = searchParams.get("request_id") ?? ""; return prev === v ? prev : v; });
    setAuditDateFrom(prev => { const v = parseAuditDate(searchParams.get("date_from")); return prev === v ? prev : v; });
    setAuditDateTo(prev => { const v = parseAuditDate(searchParams.get("date_to")); return prev === v ? prev : v; });
  }, [searchParams, tab]);

  // Audit URL sync — write
  useEffect(() => {
    if (tab !== "audit") return;
    const params = new URLSearchParams(searchParams.toString());
    const setOrDelete = (key: string, value: string) => { if (value) params.set(key, value); else params.delete(key); };
    if (auditPage > 1) params.set("page", String(auditPage)); else params.delete("page");
    setOrDelete("action", auditAction.trim());
    setOrDelete("target_type", auditTargetType.trim());
    setOrDelete("severity", auditSeverity);
    setOrDelete("result", auditResult);
    setOrDelete("actor_id", auditActorId.trim());
    setOrDelete("request_id", auditRequestId.trim());
    setOrDelete("date_from", auditDateFrom);
    setOrDelete("date_to", auditDateTo);
    const currentQuery = searchParams.toString();
    const nextQuery = params.toString();
    if (currentQuery === nextQuery) return;
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [auditAction, auditActorId, auditDateFrom, auditDateTo, auditPage, auditRequestId, auditResult, auditSeverity, auditTargetType, pathname, router, searchParams, tab]);

  // Users URL sync — read
  useEffect(() => {
    if (tab !== "users") return;
    setUserSearch(prev => { const v = searchParams.get("u_search") ?? ""; return prev === v ? prev : v; });
    setUserSort(prev => { const v = parseUserSort(searchParams.get("u_sort")); return prev === v ? prev : v; });
    setUserRole(prev => { const v = parseUserRole(searchParams.get("u_role")); return prev === v ? prev : v; });
    setUserIsActive(prev => { const v = parseUserStatus(searchParams.get("u_status")); return prev === v ? prev : v; });
  }, [searchParams, tab]);

  // Users URL sync — write
  useEffect(() => {
    if (tab !== "users") return;
    const params = new URLSearchParams(searchParams.toString());
    const setOrDelete = (key: string, value: string) => { if (value) params.set(key, value); else params.delete(key); };
    setOrDelete("u_search", userSearch.trim());
    setOrDelete("u_sort", userSort === "newest" ? "" : userSort);
    setOrDelete("u_role", userRole);
    setOrDelete("u_status", userIsActive);
    const currentQuery = searchParams.toString();
    const nextQuery = params.toString();
    if (currentQuery === nextQuery) return;
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [userSearch, userSort, userRole, userIsActive, tab, pathname, router, searchParams]);

  const openTab = useCallback(
    (nextTab: AdminTab) => {
      if (nextTab === tab) return;
      if (nextTab === "removed") {
        setContentType("all");
        setContentStatus("");
        setContentFlagged("");
        setContentDeleted("true");
      } else if (tab === "removed" && nextTab === "content") {
        setContentDeleted("");
      }
      setTab(nextTab);
      router.push(`/admin/${nextTab}`);
    },
    [router, tab],
  );

  const loadStats = useCallback(async () => {
    const res = await getAdminStats();
    setStats(res);
  }, []);

  const loadFeedReadSurface = useCallback(async () => {
    setFeedReadError(null);
    try {
      const [config, health] = await Promise.all([getAdminFeedConfig(), getAdminFeedAIHealth()]);
      setFeedConfig(config);
      setFeedAIHealth(health);
    } catch {
      setFeedReadError("Feed config endpoints are unavailable.");
      setFeedConfig(null);
      setFeedAIHealth(null);
    }
  }, []);

  const loadModeration = useCallback(async () => {
    const pageSize = 100;
    const first = await getModerationQueue(1, pageSize);
    const totalPages = Math.max(1, Math.ceil(first.total / pageSize));
    let allItems = first.data;
    if (totalPages > 1) {
      const remaining = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, idx) => getModerationQueue(idx + 2, pageSize)),
      );
      allItems = [...first.data, ...remaining.flatMap(page => page.data)];
    }
    setModItems(allItems);
    setModTotal(first.total);
    setModFlaggedPosts(first.flagged_posts);
    setModFlaggedThreads(first.flagged_threads);
    setModSelectedIds(prev => prev.filter(id => allItems.some(item => moderationItemKey(item) === id)));
  }, []);

  const loadUsers = useCallback(async (search: string, sort: UserSortOption, role: UserRole | "" = "", isActive: "active" | "inactive" | "" = "") => {
    const res = await getAdminUsers({
      page: 1,
      limit: 50,
      search: search.trim() || undefined,
      sort,
      role: role || undefined,
      is_active: isActive === "active" ? true : isActive === "inactive" ? false : undefined,
    });
    setUsers(res.data);
    setUsersTotal(res.total);
    setSelectedUserIds(prev => {
      const next = new Set<string>();
      const currentIds = new Set(res.data.map((item: AdminUserItem) => item.id));
      prev.forEach(id => { if (currentIds.has(id)) next.add(id); });
      return next;
    });
  }, []);

  const loadContent = useCallback(async () => {
    setContentLoading(true);
    try {
      const [res, removedRes] = await Promise.all([
        listContent({ page: 1, limit: 40, ...contentFilters }),
        listContent({ page: 1, limit: 1, type: "all", is_deleted: true }),
      ]);
      setContentItems(res.data);
      setContentTotal(res.total);
      setContentMissingAiReports(res.missing_ai_reports);
      setRemovedTotal(removedRes.total);
    } finally {
      setContentLoading(false);
    }
  }, [contentFilters]);

  const upsertContentItem = useCallback((updated: AdminContentItem) => {
    setContentItems(prev => prev.map(item => (item.id === updated.id && item.type === updated.type ? updated : item)));
  }, []);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await listAuditLogs(auditFilters);
      setAuditLogs(res.data);
      setAuditTotal(res.total);
    } finally {
      setAuditLoading(false);
    }
  }, [auditFilters]);

  const loadAppeals = useCallback(async () => {
    setAppealsLoading(true);
    try {
      const res = await listAppeals({ page: 1, limit: 80, status: appealsStatus || undefined });
      setAppeals(res.data);
      setAppealsTotal(res.total);
      setAppealsPending(res.pending_count);
    } finally {
      setAppealsLoading(false);
    }
  }, [appealsStatus]);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadStats(),
        loadModeration(),
        loadUsers(userSearch, userSort, userRole, userIsActive),
        loadContent(),
        loadAudit(),
        loadAppeals(),
        loadFeedReadSurface(),
      ]);
      setBootstrapped(true);
    } catch {
      setError("Failed to load admin data. Make sure you have admin access.");
    } finally {
      setLoading(false);
    }
  }, [loadAppeals, loadAudit, loadContent, loadFeedReadSurface, loadModeration, loadStats, loadUsers, userSearch, userSort, userRole, userIsActive]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    void reloadAll();
  }, [reloadAll, user]);

  useEffect(() => {
    if (!bootstrapped) return;
    const t = setTimeout(() => void loadUsers(userSearch, userSort, userRole, userIsActive), 350);
    return () => clearTimeout(t);
  }, [bootstrapped, loadUsers, userSearch, userSort, userRole, userIsActive]);

  useEffect(() => {
    if (!bootstrapped) return;
    const t = setTimeout(() => void loadContent(), 350);
    return () => clearTimeout(t);
  }, [bootstrapped, loadContent]);

  useEffect(() => {
    if (tab !== "removed") return;
    if (contentDeleted === "true") return;
    setContentDeleted("true");
  }, [contentDeleted, tab]);

  useEffect(() => {
    if (!bootstrapped) return;
    const t = setTimeout(() => void loadAudit(), 350);
    return () => clearTimeout(t);
  }, [bootstrapped, loadAudit]);

  useEffect(() => {
    if (!bootstrapped) return;
    const t = setTimeout(() => void loadAppeals(), 350);
    return () => clearTimeout(t);
  }, [bootstrapped, loadAppeals]);

  // --- Action handlers ---

  const handleModerate = useCallback(async (item: ModerationItem, action: ModerationAction) => {
    const key = moderationItemKey(item);
    setModActionLoading(`moderate:${key}`);
    try {
      const res = await moderateBulk([{ content_type: item.type, content_id: item.id, action }]);
      const result = res.results[0];
      if (!result?.success) throw new Error(result?.error ?? "moderation_failed");
      setToast({ type: "ok", text: action === "approve" ? `${item.type} approved` : `${item.type} removed` });
      await Promise.all([loadModeration(), loadStats(), loadContent()]);
    } catch {
      setToast({ type: "err", text: "Moderation action failed" });
    } finally {
      setModActionLoading(null);
    }
  }, [loadContent, loadModeration, loadStats]);

  const handleBulkModerate = useCallback(async (action: ModerationAction) => {
    if (modSelectedIds.length === 0) return;
    const ok = window.confirm(`${action === "approve" ? "Approve" : "Remove"} ${modSelectedIds.length} selected item(s)?`);
    if (!ok) return;
    const selected = modItems.filter(item => modSelectedIds.includes(moderationItemKey(item)));
    if (selected.length === 0) { setModSelectedIds([]); return; }
    setModBulkLoading(true);
    try {
      const res = await moderateBulk(selected.map(item => ({ content_type: item.type, content_id: item.id, action })));
      setToast({ type: res.failed === 0 ? "ok" : "err", text: `${res.succeeded}/${res.processed} moderation actions completed` });
      setModSelectedIds([]);
      await Promise.all([loadModeration(), loadStats(), loadContent()]);
    } catch {
      setToast({ type: "err", text: "Bulk moderation failed" });
    } finally {
      setModBulkLoading(false);
    }
  }, [loadContent, loadModeration, loadStats, modItems, modSelectedIds]);

  const handleModerationCheck = useCallback(async (item: ModerationItem) => {
    const key = moderationItemKey(item);
    setModActionLoading(`check:${key}`);
    try {
      await rereportAdminContentItem(item.type, item.id);
      setToast({ type: "ok", text: `${item.type} checked with AI` });
      await Promise.all([loadModeration(), loadStats(), loadContent()]);
    } catch {
      setToast({ type: "err", text: "AI check failed" });
    } finally {
      setModActionLoading(null);
    }
  }, [loadContent, loadModeration, loadStats]);

  const handleModerationRefresh = useCallback(async () => {
    setModRefreshing(true);
    try {
      await Promise.all([loadModeration(), loadStats()]);
      setToast({ type: "ok", text: "Moderation queue refreshed" });
    } catch {
      setToast({ type: "err", text: "Failed to refresh moderation queue" });
    } finally {
      setModRefreshing(false);
    }
  }, [loadModeration, loadStats]);

  const resolveAppealItem = useCallback(async (item: AdminAppealItem, action: "approve" | "reject", note?: string) => {
    setAppealsActionLoading(`resolve:${item.id}`);
    try {
      await resolveAppeal(item.id, action, note);
      setToast({ type: "ok", text: action === "approve" ? "Appeal approved" : "Appeal rejected" });
      await Promise.all([loadAppeals(), loadContent(), loadModeration(), loadStats()]);
    } catch {
      setToast({ type: "err", text: "Failed to resolve appeal" });
      throw new Error("Failed to resolve appeal");
    } finally {
      setAppealsActionLoading(null);
    }
  }, [loadAppeals, loadContent, loadModeration, loadStats]);

  const handleResolveAppeal = useCallback((item: AdminAppealItem, action: "approve" | "reject") => {
    if (action === "reject") { setAppealRejectTarget(item); return; }
    void resolveAppealItem(item, action);
  }, [resolveAppealItem]);

  const handleRejectAppealSubmit = useCallback(async (note: string) => {
    if (!appealRejectTarget) throw new Error("Appeal target is missing");
    await resolveAppealItem(appealRejectTarget, "reject", note.trim() || undefined);
    setAppealRejectTarget(null);
  }, [appealRejectTarget, resolveAppealItem]);

  const handleUserRoleChange = useCallback(async (targetUser: AdminUserItem, role: UserRole) => {
    if (targetUser.role === role) return;
    setUserActionLoading(`role:${targetUser.id}`);
    try {
      const updated = await updateAdminUserRole(targetUser.id, role);
      setUsers(prev => prev.map(item => (item.id === targetUser.id ? { ...item, role: updated.role } : item)));
      setToast({ type: "ok", text: `${targetUser.username} role updated` });
    } catch {
      setToast({ type: "err", text: "Failed to update role" });
    } finally {
      setUserActionLoading(null);
    }
  }, []);

  const handleUserStatusToggle = useCallback(async (targetUser: AdminUserItem) => {
    const nextStatus = !targetUser.is_active;
    const ok = window.confirm(`${nextStatus ? "Activate" : "Deactivate"} @${targetUser.username}?`);
    if (!ok) return;
    setUserActionLoading(`status:${targetUser.id}`);
    try {
      const updated = await updateAdminUserStatus(targetUser.id, nextStatus);
      setUsers(prev => prev.map(item => (item.id === targetUser.id ? { ...item, is_active: updated.is_active } : item)));
      await loadStats();
      setToast({ type: "ok", text: nextStatus ? "User activated" : "User deactivated" });
    } catch {
      setToast({ type: "err", text: "Failed to update status" });
    } finally {
      setUserActionLoading(null);
    }
  }, [loadStats]);

  const handleToggleUserSelect = useCallback((id: string, checked: boolean) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const handleToggleAllUsers = useCallback((checked: boolean) => {
    if (!checked) { setSelectedUserIds(new Set()); return; }
    setSelectedUserIds(new Set(users.map(item => item.id)));
  }, [users]);

  const handleUserDetailUpdated = useCallback(async () => {
    await Promise.all([loadUsers(userSearch, userSort, userRole, userIsActive), loadStats()]);
  }, [loadStats, loadUsers, userSearch, userSort, userRole, userIsActive]);

  const handleRequestBulkRoleChange = useCallback((role: UserRole) => {
    if (selectedUserIds.size === 0) return;
    setBulkAction({ type: "role", role });
  }, [selectedUserIds]);

  const handleRequestBulkActivate = useCallback(() => {
    if (selectedUserIds.size === 0) return;
    setBulkAction({ type: "activate" });
  }, [selectedUserIds]);

  const handleRequestBulkDeactivate = useCallback(() => {
    if (selectedUserIds.size === 0) return;
    setBulkAction({ type: "deactivate" });
  }, [selectedUserIds]);

  const handleConfirmBulkAction = useCallback(async () => {
    if (!bulkAction || selectedUserIds.size === 0) { setBulkAction(null); return; }
    const userIds = Array.from(selectedUserIds);
    setUserBulkLoading(true);
    try {
      let result;
      if (bulkAction.type === "role") {
        if (!bulkAction.role) { setToast({ type: "err", text: "Missing role for bulk update" }); return; }
        result = await bulkUpdateUserRole(userIds, bulkAction.role);
      } else {
        result = await bulkUpdateUserStatus(userIds, bulkAction.type === "activate");
      }
      setToast({ type: result.failed === 0 ? "ok" : "err", text: `${result.succeeded}/${result.processed} users updated` });
      setSelectedUserIds(new Set());
      setBulkAction(null);
      await Promise.all([loadUsers(userSearch, userSort, userRole, userIsActive), loadStats()]);
    } catch {
      setToast({ type: "err", text: "Bulk user update failed" });
    } finally {
      setUserBulkLoading(false);
    }
  }, [bulkAction, loadStats, loadUsers, selectedUserIds, userSearch, userSort, userRole, userIsActive]);

  const handleExportUsers = useCallback(async (format: "csv" | "json") => {
    try {
      const res = await getAdminUsers({
        page: 1, limit: 1000,
        search: userSearch.trim() || undefined,
        sort: userSort, role: userRole || undefined,
        is_active: userIsActive === "active" ? true : userIsActive === "inactive" ? false : undefined,
      });
      const filename = `users-${new Date().toISOString().slice(0, 10)}`;
      if (format === "csv") downloadCsv(res.data as Record<string, unknown>[], `${filename}.csv`);
      else downloadJson(res.data, `${filename}.json`);
    } catch {
      setToast({ type: "err", text: "Export failed" });
    }
  }, [userSearch, userSort, userRole, userIsActive]);

  const handleExportAudit = useCallback(async (format: "csv" | "json") => {
    try {
      const res = await listAuditLogs({ ...auditFilters, limit: 500, page: 1 });
      const filename = `audit-${new Date().toISOString().slice(0, 10)}`;
      if (format === "csv") downloadCsv(res.data as Record<string, unknown>[], `${filename}.csv`);
      else downloadJson(res.data, `${filename}.json`);
    } catch {
      setToast({ type: "err", text: "Export failed" });
    }
  }, [auditFilters]);

  const handleDeleteContent = useCallback(async (item: AdminContentItem) => {
    const ok = window.confirm(`Delete this ${item.type}?`);
    if (!ok) return;
    setContentActionLoading(`delete:${item.type}:${item.id}`);
    try {
      if (item.type === "thread") await deleteThreadByAdmin(item.id);
      else await deletePostByAdmin(item.id);
      setToast({ type: "ok", text: `${item.type} deleted` });
      await Promise.all([loadContent(), loadStats(), loadModeration()]);
    } catch {
      setToast({ type: "err", text: "Failed to delete content" });
    } finally {
      setContentActionLoading(null);
    }
  }, [loadContent, loadModeration, loadStats]);

  const handleThreadStatusChange = useCallback(async (item: AdminContentItem, status: ThreadStatus) => {
    if (item.type !== "thread") return;
    setContentActionLoading(`status:${item.id}`);
    try {
      const updated = await updateThreadStatusByAdmin(item.id, status);
      setContentItems(prev => prev.map(c => (c.id === item.id && c.type === "thread" ? { ...c, status: updated.status } : c)));
      setToast({ type: "ok", text: "Thread status updated" });
    } catch {
      setToast({ type: "err", text: "Failed to update thread status" });
    } finally {
      setContentActionLoading(null);
    }
  }, []);

  const handleThreadPinToggle = useCallback(async (item: AdminContentItem) => {
    if (item.type !== "thread") return;
    setContentActionLoading(`pin:${item.id}`);
    try {
      const updated = await updateThreadPinByAdmin(item.id, !item.is_pinned);
      setContentItems(prev => prev.map(c => (c.id === item.id && c.type === "thread" ? { ...c, is_pinned: updated.is_pinned } : c)));
      setToast({ type: "ok", text: updated.is_pinned ? "Thread pinned" : "Thread unpinned" });
    } catch {
      setToast({ type: "err", text: "Failed to update pin status" });
    } finally {
      setContentActionLoading(null);
    }
  }, []);

  const handleContentRereportMissing = useCallback(async () => {
    const ok = window.confirm(`Run AI re-report for ${contentMissingAiReports} item(s) without reports?`);
    if (!ok) return;
    setContentActionLoading("rereport:missing");
    try {
      const res = await rereportMissingContentByAdmin({ limit: 500, include_deleted: false });
      setToast({ type: res.failed === 0 ? "ok" : "err", text: `AI re-report: ${res.updated}/${res.processed} updated, ${res.flagged} flagged` });
      await Promise.all([loadContent(), loadStats(), loadModeration()]);
    } catch {
      setToast({ type: "err", text: "Failed to run missing AI re-report" });
    } finally {
      setContentActionLoading(null);
    }
  }, [contentMissingAiReports, loadContent, loadModeration, loadStats]);

  const handleContentRereportItem = useCallback(async (item: AdminContentItem) => {
    setContentActionLoading(`rereport:${item.type}:${item.id}`);
    try {
      const updated = await rereportAdminContentItem(item.type, item.id);
      upsertContentItem(updated);
      setToast({ type: "ok", text: `${item.type} re-reported with AI` });
      await Promise.all([loadModeration(), loadStats(), loadContent()]);
    } catch {
      setToast({ type: "err", text: "Failed to re-report content item" });
    } finally {
      setContentActionLoading(null);
    }
  }, [loadContent, loadModeration, loadStats, upsertContentItem]);

  const handleContentFlagToggle = useCallback(async (item: AdminContentItem) => {
    const nextFlag = !Boolean(item.is_flagged);
    setContentActionLoading(`flag:${item.type}:${item.id}`);
    try {
      const updated = await updateAdminContentFlag(item.type, item.id, nextFlag);
      upsertContentItem(updated);
      setToast({ type: "ok", text: nextFlag ? "Item flagged" : "Item unflagged" });
      await Promise.all([loadModeration(), loadStats(), loadContent()]);
    } catch {
      setToast({ type: "err", text: "Failed to update flag state" });
    } finally {
      setContentActionLoading(null);
    }
  }, [loadContent, loadModeration, loadStats, upsertContentItem]);

  const handleContentEdit = useCallback(async (item: AdminContentItem) => {
    if (item.type === "thread") {
      const nextTitle = window.prompt("Edit thread title", item.title ?? "");
      if (nextTitle === null) return;
      const nextBody = window.prompt("Edit thread content", item.content ?? "");
      if (nextBody === null) return;
      setContentActionLoading(`edit:${item.type}:${item.id}`);
      try {
        const updated = await editAdminContentItem("thread", item.id, { title: nextTitle, content: nextBody });
        upsertContentItem(updated);
        setToast({ type: "ok", text: "Thread updated" });
        await Promise.all([loadModeration(), loadStats(), loadContent()]);
      } catch {
        setToast({ type: "err", text: "Failed to update thread" });
      } finally {
        setContentActionLoading(null);
      }
      return;
    }
    const nextContent = window.prompt("Edit post content", item.content ?? "");
    if (nextContent === null) return;
    setContentActionLoading(`edit:${item.type}:${item.id}`);
    try {
      const updated = await editAdminContentItem("post", item.id, { content: nextContent });
      upsertContentItem(updated);
      setToast({ type: "ok", text: "Post updated" });
      await Promise.all([loadModeration(), loadStats(), loadContent()]);
    } catch {
      setToast({ type: "err", text: "Failed to update post" });
    } finally {
      setContentActionLoading(null);
    }
  }, [loadContent, loadModeration, loadStats, upsertContentItem]);

  const handleContentNotify = useCallback(async (item: AdminContentItem) => {
    const message = window.prompt("Notify the author", `Admin update: action taken on your ${item.type}.`);
    if (message === null) return;
    if (!message.trim()) { setToast({ type: "err", text: "Message cannot be empty" }); return; }
    setContentActionLoading(`notify:${item.type}:${item.id}`);
    try {
      await notifyAdminContentAuthor(item.type, item.id, message.trim());
      setToast({ type: "ok", text: "Author notified" });
    } catch {
      setToast({ type: "err", text: "Failed to notify author" });
    } finally {
      setContentActionLoading(null);
    }
  }, []);

  const navigateToThread = useCallback((threadId: string) => router.push(`/threads/${threadId}`), [router]);
  const navigateToProfile = useCallback((username: string) => router.push(profilePathFromUsername(username)), [router]);
  const navigateToProfileById = useCallback((userId: string) => router.push(toProfilePath(userId)), [router]);
  const navigateToContentDetail = useCallback((type: string, id: string) => router.push(`/admin/content/${type}/${id}`), [router]);

  return {
    // auth
    user,
    // tab
    tab, openTab,
    // global
    loading, error, toast, setToast,
    reloadAll,
    // overview
    stats, feedConfig, feedAIHealth, feedReadError,
    // moderation
    modItems, modTotal, modFlaggedPosts, modFlaggedThreads,
    modSelectedIds, setModSelectedIds,
    modActionLoading, modBulkLoading, modRefreshing,
    handleModerate, handleBulkModerate, handleModerationCheck,
    handleModerationRefresh,
    // appeals
    appeals, appealsTotal, appealsPending,
    appealsLoading, appealsStatus, setAppealsStatus,
    appealsActionLoading, appealRejectTarget, setAppealRejectTarget,
    handleResolveAppeal, handleRejectAppealSubmit,
    // users
    users, usersTotal,
    userSearch, setUserSearch,
    userSort, setUserSort,
    userRole, setUserRole,
    userIsActive, setUserIsActive,
    userActionLoading, userBulkLoading,
    selectedUserIds,
    userDetailId, setUserDetailId,
    bulkAction, setBulkAction,
    handleUserRoleChange, handleUserStatusToggle,
    handleToggleUserSelect, handleToggleAllUsers,
    handleUserDetailUpdated,
    handleRequestBulkRoleChange, handleRequestBulkActivate, handleRequestBulkDeactivate,
    handleConfirmBulkAction,
    handleExportUsers,
    // content
    contentItems, contentTotal, removedTotal, contentMissingAiReports,
    contentLoading, contentSearch, setContentSearch,
    contentType, setContentType,
    contentStatus, setContentStatus,
    contentDeleted, setContentDeleted,
    contentFlagged, setContentFlagged,
    contentActionLoading,
    handleDeleteContent, handleThreadStatusChange, handleThreadPinToggle,
    handleContentRereportMissing, handleContentRereportItem,
    handleContentFlagToggle, handleContentEdit, handleContentNotify,
    // audit
    auditLogs, auditTotal, auditLoading,
    auditPage, setAuditPage, auditTotalPages,
    auditAction, setAuditAction,
    auditTargetType, setAuditTargetType,
    auditSeverity, setAuditSeverity,
    auditResult, setAuditResult,
    auditActorId, setAuditActorId,
    auditRequestId, setAuditRequestId,
    auditDateFrom, setAuditDateFrom,
    auditDateTo, setAuditDateTo,
    handleExportAudit,
    // navigation helpers
    navigateToThread, navigateToProfile, navigateToProfileById, navigateToContentDetail,
  };
}
