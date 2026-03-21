import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ClipboardList, Copy, Download, Search } from "lucide-react";

import AdminEmptyState from "@/components/admin/shared/AdminEmptyState";
import AdminSectionHeader from "@/components/admin/shared/AdminSectionHeader";
import AdminSkeleton from "@/components/admin/shared/AdminSkeleton";
import ScrollArea from "@/components/shared/ScrollArea";
import { relativeTime } from "@/lib/workspaceUtils";
import type { AuditLogItem, AuditResult, AuditSeverity } from "@/types/admin";

type AuditTabProps = {
  logs: AuditLogItem[];
  total: number;
  loading: boolean;
  page: number;
  totalPages: number;
  action: string;
  targetType: string;
  severity: "" | AuditSeverity;
  result: "" | AuditResult;
  actorId: string;
  requestId: string;
  dateFrom: string;
  dateTo: string;
  onActionChange: (value: string) => void;
  onTargetTypeChange: (value: string) => void;
  onSeverityChange: (value: "" | AuditSeverity) => void;
  onResultChange: (value: "" | AuditResult) => void;
  onActorIdChange: (value: string) => void;
  onRequestIdChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onPageChange: (value: number) => void;
  onExport: (format: "csv" | "json") => void;
};

function absoluteTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function targetLabel(log: AuditLogItem): string {
  if (log.target_display_name) return log.target_display_name;
  if (!log.target_id) return log.target_type;
  return `${log.target_type}:${log.target_id.slice(-8)}`;
}

function actorLabel(log: AuditLogItem): string {
  if (log.actor_display_name) return log.actor_display_name;
  if (!log.actor_id) return "-";
  return log.actor_id.slice(-8);
}

function actorDetailLabel(log: AuditLogItem): string {
  if (log.actor_display_name && log.actor_username) return `${log.actor_display_name} (@${log.actor_username})`;
  if (log.actor_display_name) return log.actor_display_name;
  return log.actor_id ?? "-";
}

function targetDetailLabel(log: AuditLogItem): string {
  if (log.target_display_name) return log.target_display_name;
  if (!log.target_id) return log.target_type;
  return `${log.target_type} (${log.target_id})`;
}

const severityChip: Record<string, string> = {
  info: "border-accent-purple/35 bg-accent-purple/16 text-purple-200",
  warning: "border-accent-orange/35 bg-accent-orange/16 text-orange-200",
  critical: "border-accent-red/35 bg-accent-red/16 text-red-300",
};
const resultChip: Record<string, string> = {
  success: "border-accent-green/35 bg-accent-green/16 text-green-300",
  failed: "border-accent-red/35 bg-accent-red/16 text-red-300",
};

const chipBase = "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide";
const inputCls = "rounded-[10px] border border-app-border bg-app-input px-2.5 py-2 text-xs text-foreground font-[inherit] outline-none placeholder:text-muted-foreground/50 focus:border-border-hover";

export default function AuditTab({
  logs, total, loading, page, totalPages,
  action, targetType, severity, result, actorId, requestId, dateFrom, dateTo,
  onActionChange, onTargetTypeChange, onSeverityChange, onResultChange,
  onActorIdChange, onRequestIdChange, onDateFromChange, onDateToChange,
  onPageChange, onExport,
}: AuditTabProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const [localAction, setLocalAction] = useState(action);
  const [localActorId, setLocalActorId] = useState(actorId);
  const [localRequestId, setLocalRequestId] = useState(requestId);

  useEffect(() => { setLocalAction(action); }, [action]);
  useEffect(() => { setLocalActorId(actorId); }, [actorId]);
  useEffect(() => { setLocalRequestId(requestId); }, [requestId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => onActionChange(localAction), 300); return () => clearTimeout(t); }, [localAction]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => onActorIdChange(localActorId), 300); return () => clearTimeout(t); }, [localActorId]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => onRequestIdChange(localRequestId), 300); return () => clearTimeout(t); }, [localRequestId]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const activeSelectedId = useMemo(() => {
    if (selectedId && logs.some(log => log.id === selectedId)) return selectedId;
    return logs[0]?.id ?? null;
  }, [logs, selectedId]);

  const selectedLog = useMemo(() => logs.find(log => log.id === activeSelectedId) ?? null, [activeSelectedId, logs]);
  const rawJson = useMemo(() => selectedLog ? JSON.stringify(selectedLog, null, 2) : "", [selectedLog]);

  const copyRawJson = async () => {
    if (!rawJson) return;
    try { await navigator.clipboard.writeText(rawJson); setCopied(true); } catch { setCopied(false); }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      {/* Toolbar */}
      <div className="shrink-0 pb-2">
        <AdminSectionHeader title="Audit Log" countLabel={`${total} entries`} />
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              className={`${inputCls} w-full pl-9`}
              value={localAction}
              onChange={e => setLocalAction(e.target.value)}
              placeholder="Action..."
            />
          </div>
          <input className={inputCls} type="text" value={targetType} onChange={e => onTargetTypeChange(e.target.value)} placeholder="Target type" />
          <select className={inputCls} value={severity} onChange={e => onSeverityChange(e.target.value as "" | AuditSeverity)}>
            <option value="">Any severity</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <select className={inputCls} value={result} onChange={e => onResultChange(e.target.value as "" | AuditResult)}>
            <option value="">Any result</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
          <input className={inputCls} type="text" value={localActorId} onChange={e => setLocalActorId(e.target.value)} placeholder="Actor id" />
          <input className={inputCls} type="text" value={localRequestId} onChange={e => setLocalRequestId(e.target.value)} placeholder="Request id" />
          <input className={inputCls} type="date" value={dateFrom} onChange={e => onDateFromChange(e.target.value)} />
          <input className={inputCls} type="date" value={dateTo} onChange={e => onDateToChange(e.target.value)} />
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
                <button type="button" className="rounded px-2.5 py-1.5 text-left text-xs text-foreground/80 hover:bg-app-input" onClick={() => { onExport("csv"); setExportOpen(false); }}>CSV</button>
                <button type="button" className="rounded px-2.5 py-1.5 text-left text-xs text-foreground/80 hover:bg-app-input" onClick={() => { onExport("json"); setExportOpen(false); }}>JSON</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] gap-2.5 max-[1120px]:grid-cols-1">
        {/* Table pane */}
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[14px] border border-app-border bg-app-panel">
          <ScrollArea
            className="min-h-[120px]"
            size="lg"
            tone="strong"
            style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
          >
            {loading && logs.length === 0 ? (
              <div className="p-3"><AdminSkeleton rows={8} /></div>
            ) : logs.length === 0 ? (
              <AdminEmptyState icon={ClipboardList} text="No audit logs found." />
            ) : (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    {["Time", "Action", "Severity", "Result", "Target", "Actor", "Request"].map(h => (
                      <th key={h} className="sticky top-0 z-[1] whitespace-nowrap border-b border-app-border bg-app-input px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const selected = log.id === activeSelectedId;
                    return (
                      <tr
                        key={log.id}
                        className={`cursor-pointer border-b border-app-border/50 hover:bg-accent-purple/8 ${selected ? "bg-accent-purple/16" : ""}`}
                        onClick={() => setSelectedId(log.id)}
                      >
                        <td className="whitespace-nowrap px-3 py-2.5 text-foreground/80" title={absoluteTime(log.created_at)}>{relativeTime(log.created_at)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-foreground/80">{log.action}</td>
                        <td className="px-3 py-2.5">
                          <span className={`${chipBase} ${severityChip[log.severity] ?? ""}`}>{log.severity}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`${chipBase} ${resultChip[log.result] ?? ""}`}>{log.result}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-foreground/80" title={log.target_id ?? ""}>{targetLabel(log)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-foreground/80" title={log.actor_id ?? ""}>{actorLabel(log)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-foreground/80" title={log.request_id ?? ""}>{log.request_id ? log.request_id.slice(0, 16) : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </ScrollArea>

          {!loading && logs.length > 0 && (
            <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-app-border px-3 py-2.5">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-app-border bg-app-input px-2.5 py-1.5 text-[11px] text-foreground/80 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                <ChevronLeft size={12} /> Prev
              </button>
              <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-app-border bg-app-input px-2.5 py-1.5 text-[11px] text-foreground/80 disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Next <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Detail pane */}
        <aside className="flex min-h-0 flex-col gap-3 overflow-hidden rounded-[14px] border border-app-border bg-app-panel p-3.5 max-[1120px]:max-h-80">
          {!selectedLog ? (
            <div className="mt-1.5 text-[13px] text-muted-foreground">Select an event to inspect details.</div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2.5">
                <div>
                  <p className="m-0 text-[11px] uppercase tracking-widest text-muted-foreground">Event Details</p>
                  <h3 className="m-0 mt-1 text-base text-foreground leading-snug">{selectedLog.action}</h3>
                </div>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-app-border bg-app-input px-2 py-1.5 text-[11px] text-foreground/80 hover:text-foreground"
                  onClick={() => void copyRawJson()}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy JSON"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "Severity", chip: <span className={`${chipBase} ${severityChip[selectedLog.severity] ?? ""}`}>{selectedLog.severity}</span> },
                  { label: "Result", chip: <span className={`${chipBase} ${resultChip[selectedLog.result] ?? ""}`}>{selectedLog.result}</span> },
                ].map(({ label, chip }) => (
                  <div key={label}>
                    <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
                    {chip}
                  </div>
                ))}
                {[
                  { label: "Target", value: targetDetailLabel(selectedLog) },
                  { label: "Actor", value: actorDetailLabel(selectedLog) },
                  { label: "Request ID", value: selectedLog.request_id ?? "-" },
                  { label: "IP", value: selectedLog.ip ?? "-" },
                  { label: "Created", value: absoluteTime(selectedLog.created_at) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
                    <p className="m-0 break-words text-xs text-foreground/90">{value}</p>
                  </div>
                ))}
              </div>

              <p className="m-0 text-[10px] uppercase tracking-wider text-muted-foreground">Raw JSON</p>
              <ScrollArea
                className="min-h-[120px] flex-1 overflow-hidden rounded-[10px] border border-app-border bg-app-bg"
                tone="subtle"
                size="md"
                style={{ overflowY: "auto" }}
              >
                <pre className="m-0 break-words whitespace-pre-wrap p-2.5 text-[11px] leading-relaxed text-muted-foreground">{rawJson}</pre>
              </ScrollArea>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
