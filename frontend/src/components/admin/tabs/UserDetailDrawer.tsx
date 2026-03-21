import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Calendar,
  ClipboardList,
  ExternalLink,
  MessageSquare,
  StickyNote,
  UserCheck,
  Users as UsersIcon,
  X,
} from "lucide-react";

import {
  addAdminUserNote,
  getAdminUserDetail,
  updateAdminUserRole,
  updateAdminUserStatus,
} from "@/lib/adminApi";
import { profilePathFromUsername } from "@/lib/profileRouting";
import { avatarSeed, initials, relativeTime } from "@/lib/workspaceUtils";
import type { AdminUserDetail, AuditLogItem, UserRole } from "@/types/admin";

type UserDetailDrawerProps = {
  userId: string;
  onClose: () => void;
  onUserUpdated: () => void;
};

const ROLE_COLORS: Record<UserRole, { color: string; bg: string }> = {
  admin: { color: "#f0834a", bg: "rgba(240,131,74,0.12)" },
  moderator: { color: "#7c73f0", bg: "rgba(124,115,240,0.12)" },
  member: { color: "#3dd68c", bg: "rgba(61,214,140,0.12)" },
};

const tinyBtn = (variant: "warn" | "ok" | "primary" | "neutral") => {
  const base = "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer font-[inherit] disabled:opacity-50 disabled:cursor-not-allowed";
  if (variant === "warn") return `${base} border-accent-red/30 bg-accent-red/15 text-red-300`;
  if (variant === "ok") return `${base} border-accent-green/30 bg-accent-green/15 text-green-300`;
  if (variant === "primary") return `${base} border-accent-orange/30 bg-accent-orange/15 text-orange-300`;
  return `${base} border-app-border bg-app-input text-foreground/80`;
};

const severityBadge = (sev: string) => {
  const base = "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase";
  if (sev === "info") return `${base} bg-blue-400/12 text-blue-300`;
  if (sev === "warning") return `${base} bg-yellow-400/12 text-yellow-300`;
  if (sev === "critical") return `${base} bg-accent-red/12 text-red-300`;
  return `${base} bg-app-input text-muted-foreground`;
};

export default function UserDetailDrawer({ userId, onClose, onUserUpdated }: UserDetailDrawerProps) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await getAdminUserDetail(userId);
      setDetail(res);
    } catch {
      setError("Failed to load user detail.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void fetchDetail(); }, [fetchDetail]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleRoleChange(role: UserRole) {
    if (!detail || detail.role === role) return;
    setActionLoading("role");
    try {
      await updateAdminUserRole(userId, role);
      await fetchDetail(); onUserUpdated();
      setToast({ type: "ok", text: "Role updated" });
    } catch { setToast({ type: "err", text: "Failed to update role" }); }
    finally { setActionLoading(null); }
  }

  async function handleStatusToggle() {
    if (!detail) return;
    const nextStatus = !detail.is_active;
    setActionLoading("status");
    try {
      await updateAdminUserStatus(userId, nextStatus);
      await fetchDetail(); onUserUpdated();
      setToast({ type: "ok", text: nextStatus ? "User activated" : "User deactivated" });
    } catch { setToast({ type: "err", text: "Failed to update status" }); }
    finally { setActionLoading(null); }
  }

  async function handleAddNote() {
    const trimmed = noteText.trim();
    if (!trimmed || noteLoading) return;
    setNoteLoading(true);
    try {
      const res = await addAdminUserNote(userId, trimmed);
      setDetail(res); setNoteText("");
      setToast({ type: "ok", text: "Note added" });
    } catch { setToast({ type: "err", text: "Failed to add note" }); }
    finally { setNoteLoading(false); }
  }

  const hasUnusualActivity = Boolean(
    detail && (detail.login_attempts > 0 || (detail.locked_until ? new Date(detail.locked_until).getTime() > Date.now() : false)),
  );
  const [c1, c2] = detail ? avatarSeed(detail.id) : ["#555", "#777"];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[89] bg-black/45" onClick={onClose} />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 z-[90] flex h-screen w-[min(480px,calc(100vw-40px))] animate-[slideIn_0.22s_ease-out] flex-col border-l border-app-border bg-app-panel"
        role="dialog"
        aria-modal="true"
        aria-label="User detail"
        style={{ animation: "slideIn 0.22s ease-out" }}
      >
        <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        {/* Head */}
        <div className="flex shrink-0 items-center justify-between border-b border-app-border px-4 py-3.5">
          <span className="font-serif text-lg text-foreground">User Detail</span>
          <button type="button" className="grid h-[30px] w-[30px] cursor-pointer place-items-center rounded-lg border border-app-border bg-app-input text-muted-foreground hover:text-foreground" onClick={onClose} aria-label="Close drawer">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
          ) : error || !detail ? (
            <div className="py-10 text-center text-sm text-red-300">{error ?? "User not found"}</div>
          ) : (
            <>
              {/* Identity */}
              <div className="flex items-center gap-3.5">
                <div
                  className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-lg font-bold text-white"
                  style={{ background: `linear-gradient(135deg,${c1},${c2})` }}
                >
                  {initials(detail.display_name)}
                </div>
                <div className="min-w-0">
                  <div className="text-base font-bold text-foreground">{detail.display_name}</div>
                  <div className="text-[13px] text-muted-foreground">@{detail.username}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground/60">{detail.email}</div>
                </div>
              </div>

              {detail.bio && <p className="m-0 text-[13px] leading-relaxed text-muted-foreground">{detail.bio}</p>}

              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                <Calendar size={12} />
                <span>Joined {relativeTime(detail.created_at)}</span>
                <span className="text-app-border">|</span>
                <span>Updated {relativeTime(detail.updated_at)}</span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: MessageSquare, value: detail.total_posts, label: "Posts" },
                  { icon: ClipboardList, value: detail.total_threads, label: "Threads" },
                  { icon: UsersIcon, value: detail.followers_count, label: "Followers" },
                  { icon: UsersIcon, value: detail.following_count, label: "Following" },
                ].map(({ icon: Icon, value, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1 rounded-[10px] border border-app-border bg-app-input py-2.5">
                    <Icon size={14} className="text-muted-foreground" />
                    <span className="text-lg font-bold text-foreground">{value}</span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="border-t border-app-border pt-3.5">
                <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Actions
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <label className="w-[50px] shrink-0 text-xs text-muted-foreground">Role</label>
                  <select
                    className="rounded-lg border border-app-border bg-app-input px-2 py-1.5 text-[11px] font-[inherit] text-foreground outline-none disabled:opacity-50"
                    value={detail.role}
                    disabled={actionLoading === "role"}
                    onChange={e => void handleRoleChange(e.target.value as UserRole)}
                  >
                    <option value="member">member</option>
                    <option value="moderator">moderator</option>
                    <option value="admin">admin</option>
                  </select>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: ROLE_COLORS[detail.role].color, background: ROLE_COLORS[detail.role].bg }}>
                    {detail.role}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-[50px] shrink-0 text-xs text-muted-foreground">Status</label>
                  <button type="button" className={tinyBtn(detail.is_active ? "warn" : "ok")} disabled={actionLoading === "status"} onClick={() => void handleStatusToggle()}>
                    {detail.is_active ? <Ban size={12} /> : <UserCheck size={12} />}
                    {detail.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <span className={`text-[11px] font-semibold ${detail.is_active ? "text-accent-green" : "text-accent-red"}`}>
                    {detail.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* Security */}
              <div className="border-t border-app-border pt-3.5">
                <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <ClipboardList size={13} /> Security
                </div>
                <div className={`flex flex-col gap-1.5 rounded-lg border p-2.5 ${hasUnusualActivity ? "border-accent-red/32 bg-accent-red/8" : "border-app-border bg-app-input"}`}>
                  {[
                    { label: "Last login:", value: detail.last_login ? relativeTime(detail.last_login) : "Never" },
                    { label: "Failed attempts:", value: String(detail.login_attempts) },
                    { label: "Locked until:", value: detail.locked_until ? relativeTime(detail.locked_until) : "Not locked" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>{label}</span>
                      <strong className="font-semibold text-foreground">{value}</strong>
                    </div>
                  ))}
                  {hasUnusualActivity && (
                    <p className="m-0 mt-1 inline-flex items-center gap-1.5 text-[11px] text-red-300">
                      <AlertTriangle size={12} /> Unusual activity detected. Consider enforcing password change.
                    </p>
                  )}
                </div>
              </div>

              {/* Admin Notes */}
              <div className="border-t border-app-border pt-3.5">
                <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <StickyNote size={13} /> Admin Notes ({detail.admin_notes.length})
                </div>
                <div className="mb-2.5 flex items-end gap-2">
                  <textarea
                    className="min-h-[40px] flex-1 resize-y rounded-lg border border-app-border bg-app-input px-2.5 py-2 text-xs text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-accent-orange disabled:opacity-60 font-[inherit]"
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Add a note about this user..."
                    rows={2}
                    maxLength={500}
                    disabled={noteLoading}
                  />
                  <button type="button" className={tinyBtn("primary")} disabled={!noteText.trim() || noteLoading} onClick={() => void handleAddNote()}>
                    {noteLoading ? "Adding..." : "Add note"}
                  </button>
                </div>
                {detail.admin_notes.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {detail.admin_notes.map((n, idx) => (
                      <div key={idx} className="rounded-lg border border-app-border bg-app-input px-2.5 py-2">
                        <div className="mb-0.5 text-[10px] text-muted-foreground/60">
                          {n.admin_display_name ?? "Admin"} &middot; {relativeTime(n.created_at)}
                        </div>
                        <div className="text-xs leading-snug text-foreground/80">{n.note}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Audit */}
              <div className="border-t border-app-border pt-3.5">
                <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <ClipboardList size={13} /> Recent Activity ({detail.recent_audit_logs.length})
                </div>
                {detail.recent_audit_logs.length === 0 ? (
                  <p className="m-0 text-xs text-muted-foreground">No recent audit entries.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {detail.recent_audit_logs.map((log: AuditLogItem) => (
                      <div key={log.id} className="flex items-center gap-2 rounded-md bg-app-input px-2 py-1.5 text-[11px]">
                        <span className={severityBadge(log.severity)}>{log.severity}</span>
                        <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-foreground/80">{log.action}</span>
                        <span className="shrink-0 text-muted-foreground/60">{relativeTime(log.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* View profile */}
              <a
                className="inline-flex items-center gap-1.5 py-2 text-xs text-accent-purple hover:text-purple-300"
                href={profilePathFromUsername(detail.username)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={12} /> View public profile
              </a>
            </>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg border px-3.5 py-2 text-[11px] font-semibold shadow-xl ${toast.type === "ok" ? "border-accent-green/34 bg-accent-green/20 text-green-300" : "border-accent-red/34 bg-accent-red/20 text-red-300"}`}>
            {toast.text}
          </div>
        )}
      </div>
    </>
  );
}
