import { Ban, Download, Eye, Search, UserCheck, Users, X } from "lucide-react";
import { useState } from "react";

import AdminEmptyState from "@/components/admin/shared/AdminEmptyState";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import AdminSkeleton from "@/components/admin/shared/AdminSkeleton";
import ScrollArea from "@/components/shared/ScrollArea";
import { avatarSeed, initials } from "@/lib/workspaceUtils";
import type { AdminUserItem, UserRole, UserSortOption } from "@/types/admin";

const ROLE_COLORS: Record<UserRole, { color: string; bg: string }> = {
  admin: { color: "#f0834a", bg: "rgba(240,131,74,0.12)" },
  moderator: { color: "#7c73f0", bg: "rgba(124,115,240,0.12)" },
  member: { color: "#3dd68c", bg: "rgba(61,214,140,0.12)" },
};

type UsersTabProps = {
  users: AdminUserItem[];
  total: number;
  search: string;
  sort: UserSortOption;
  roleFilter: UserRole | "";
  statusFilter: "active" | "inactive" | "";
  loading?: boolean;
  selectedIds: Set<string>;
  actionLoading: string | null;
  bulkLoading: boolean;
  onSearchChange: (value: string) => void;
  onSortChange: (value: UserSortOption) => void;
  onRoleFilterChange: (value: UserRole | "") => void;
  onStatusFilterChange: (value: "active" | "inactive" | "") => void;
  onRoleChange: (user: AdminUserItem, role: UserRole) => void;
  onStatusToggle: (user: AdminUserItem) => void;
  onViewProfile: (username: string) => void;
  onUserRowClick: (user: AdminUserItem) => void;
  onToggleSelect: (id: string, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onBulkRoleChange: (role: UserRole) => void;
  onBulkActivate: () => void;
  onBulkDeactivate: () => void;
  onExport: (format: "csv" | "json") => void;
};

const selectCls =
  "rounded-[10px] border border-app-border bg-app-input px-3 text-sm text-foreground outline-none cursor-pointer font-[inherit] whitespace-nowrap";

const tinyBtn = (variant: "warn" | "ok" | "neutral") => {
  const base = "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer font-[inherit] disabled:opacity-50 disabled:cursor-not-allowed";
  if (variant === "warn") return `${base} border-accent-red/30 bg-accent-red/15 text-red-300`;
  if (variant === "ok") return `${base} border-accent-green/30 bg-accent-green/15 text-green-300`;
  return `${base} border-app-border bg-app-input text-foreground/80`;
};

export default function UsersTab({
  users,
  total,
  search,
  sort,
  roleFilter,
  statusFilter,
  loading,
  selectedIds,
  actionLoading,
  bulkLoading,
  onSearchChange,
  onSortChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onRoleChange,
  onStatusToggle,
  onViewProfile,
  onUserRowClick,
  onToggleSelect,
  onToggleSelectAll,
  onBulkRoleChange,
  onBulkActivate,
  onBulkDeactivate,
  onExport,
}: UsersTabProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const allChecked = users.length > 0 && users.every(u => selectedIds.has(u.id));
  const someChecked = selectedIds.size > 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      {/* Toolbar */}
      <div className="shrink-0 pb-2">
        <AdminSectionHeader title="Users" countLabel={`${total} total`} />
        <div className="flex items-stretch gap-2 max-[860px]:flex-col">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search by username, email, or name..."
              className="w-full rounded-[10px] border border-app-border bg-app-input py-2.5 pl-9 pr-8 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-border-hover"
            />
            {search && (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                onClick={() => onSearchChange("")}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <select className={`${selectCls} py-0`} value={sort} onChange={e => onSortChange(e.target.value as UserSortOption)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name_az">Name A-Z</option>
            <option value="name_za">Name Z-A</option>
          </select>

          <select className={`${selectCls} py-0`} value={roleFilter} onChange={e => onRoleFilterChange(e.target.value as UserRole | "")}>
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
            <option value="member">Member</option>
          </select>

          <select className={`${selectCls} py-0`} value={statusFilter} onChange={e => onStatusFilterChange(e.target.value as "active" | "inactive" | "")}>
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Export */}
          <div className="relative shrink-0">
            <button
              type="button"
              title="Export"
              onClick={() => setExportOpen(o => !o)}
              onBlur={() => setTimeout(() => setExportOpen(false), 150)}
              className="flex h-full min-h-[36px] w-9 items-center justify-center rounded-[10px] border border-app-border bg-app-input text-muted-foreground hover:border-border-hover hover:text-foreground"
            >
              <Download size={13} />
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-[calc(100%+4px)] z-30 flex min-w-[80px] flex-col gap-0.5 rounded-lg border border-app-border bg-app-panel p-1">
                <button type="button" className="rounded px-2.5 py-1.5 text-left text-xs text-foreground/80 hover:bg-app-input hover:text-foreground" onClick={() => { onExport("csv"); setExportOpen(false); }}>CSV</button>
                <button type="button" className="rounded px-2.5 py-1.5 text-left text-xs text-foreground/80 hover:bg-app-input hover:text-foreground" onClick={() => { onExport("json"); setExportOpen(false); }}>JSON</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User list */}
      <ScrollArea
        className="min-h-[120px]"
        size="lg"
        tone="strong"
        style={{ flex: 1, minHeight: 0, overflowY: "scroll", paddingRight: 6 }}
      >
        {loading && users.length === 0 ? (
          <AdminSkeleton rows={6} />
        ) : users.length === 0 ? (
          <AdminEmptyState icon={Users} text="No users found." />
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="px-3.5 py-1">
              <label className="inline-flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={e => onToggleSelectAll(e.target.checked)}
                  className="h-[15px] w-[15px] cursor-pointer accent-accent-orange"
                />
                <span className="text-[11px] text-muted-foreground">
                  {allChecked ? "Deselect all" : "Select all"}
                </span>
              </label>
            </div>

            {users.map(user => {
              const [c1, c2] = avatarSeed(user.id);
              const roleCfg = ROLE_COLORS[user.role];
              const roleLoading = actionLoading === `role:${user.id}`;
              const statusLoading = actionLoading === `status:${user.id}`;
              const isSelected = selectedIds.has(user.id);
              return (
                <div
                  key={user.id}
                  className={`flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border px-3.5 py-2.5 transition hover:border-border-hover hover:shadow-md ${isSelected ? "border-accent-orange/40 bg-app-input" : "border-app-border bg-app-panel"}`}
                  onClick={() => onUserRowClick(user)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === "Enter") onUserRowClick(user); }}
                >
                  <label className="inline-flex cursor-pointer items-center" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={e => onToggleSelect(user.id, e.target.checked)}
                      className="h-[15px] w-[15px] cursor-pointer accent-accent-orange"
                    />
                  </label>

                  <div
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: `linear-gradient(135deg,${c1},${c2})` }}
                  >
                    {initials(user.display_name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-foreground">
                      {user.display_name}
                      {user.is_bot && (
                        <span className="rounded border border-accent-purple/50 bg-accent-purple/10 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-accent-purple">
                          BOT
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">@{user.username}</div>
                  </div>

                  <div className="min-w-[140px] text-xs text-muted-foreground max-[860px]:hidden">
                    {user.email}
                  </div>

                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: roleCfg.color, background: roleCfg.bg }}
                  >
                    {user.role}
                  </span>

                  <span className={`text-[11px] font-semibold ${user.is_active ? "text-accent-green" : "text-accent-red"}`}>
                    {user.is_active ? "Active" : "Inactive"}
                  </span>

                  <div className="ml-auto flex flex-wrap items-center gap-1.5 max-[860px]:ml-0 max-[860px]:w-full" onClick={e => e.stopPropagation()}>
                    <select
                      className="min-h-[32px] rounded-lg border border-app-border bg-app-input px-2 text-[11px] font-[inherit] text-foreground outline-none disabled:opacity-50"
                      value={user.role}
                      disabled={roleLoading}
                      onChange={e => onRoleChange(user, e.target.value as UserRole)}
                    >
                      <option value="member">member</option>
                      <option value="moderator">moderator</option>
                      <option value="admin">admin</option>
                    </select>
                    <button
                      type="button"
                      className={tinyBtn(user.is_active ? "warn" : "ok")}
                      disabled={statusLoading}
                      onClick={() => onStatusToggle(user)}
                    >
                      {user.is_active ? <Ban size={12} /> : <UserCheck size={12} />}
                      {user.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      className={tinyBtn("neutral")}
                      onClick={() => onViewProfile(user.username)}
                    >
                      <Eye size={12} /> View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Bulk action bar */}
      {someChecked && (
        <div className="flex shrink-0 animate-[fadeUp_0.18s_ease-out] items-center gap-2 rounded-xl border border-accent-orange/30 bg-accent-orange/8 px-3.5 py-2.5">
          <span className="mr-auto text-xs font-bold text-accent-orange">{selectedIds.size} selected</span>
          <select
            className="min-h-[32px] rounded-lg border border-app-border bg-app-input px-2 text-[11px] font-[inherit] text-foreground outline-none disabled:opacity-50"
            defaultValue=""
            disabled={bulkLoading}
            onChange={e => {
              const role = e.target.value as UserRole;
              if (role) { onBulkRoleChange(role); e.target.value = ""; }
            }}
          >
            <option value="" disabled>Change role...</option>
            <option value="member">member</option>
            <option value="moderator">moderator</option>
            <option value="admin">admin</option>
          </select>
          <button type="button" className={tinyBtn("ok")} disabled={bulkLoading} onClick={onBulkActivate}>
            <UserCheck size={12} /> Activate
          </button>
          <button type="button" className={tinyBtn("warn")} disabled={bulkLoading} onClick={onBulkDeactivate}>
            <Ban size={12} /> Deactivate
          </button>
        </div>
      )}
    </div>
  );
}
