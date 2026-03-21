"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Bot, ChevronRight, FileText, Loader2, MessageSquare, Pencil, Plus, RefreshCw, Settings, ToggleLeft, ToggleRight, Trash2, X, Zap } from "lucide-react";
import {
  archiveBotThread,
  createBot,
  deleteBotConfig,
  deleteBotPost,
  deleteBotThread,
  editBotPost,
  editBotThread,
  getBotActivity,
  getBotContent,
  listBots,
  setBotEnabled,
  triggerBotComment,
  triggerBotEngage,
  triggerBotThread,
  updateBotIdentity,
  updateBotSchedule,
} from "@/lib/botApi";
import type {
  BotActivityEntry,
  BotConfig,
  BotContentItem,
  CreateBotRequest,
  UpdateBotIdentityRequest,
  UpdateBotScheduleRequest,
} from "@/types/admin";

const BOT_BADGE = (
  <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] border border-accent-purple/50 text-purple-300 bg-accent-purple/10">
    BOT
  </span>
);

function formatTs(ts: string | null): string {
  if (!ts) return "Never";
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const inputCls = "w-full rounded-lg border border-app-border bg-app-input px-3 py-2 text-[13px] text-foreground outline-none font-[inherit] focus:border-accent-purple placeholder:text-muted-foreground/50";
const textareaCls = `${inputCls} resize-y`;
const labelCls = "text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground";
const sectionDividerCls = "text-[11px] font-bold text-accent-purple uppercase tracking-[0.06em] border-b border-app-border pb-1.5";
const tagCls = "inline-flex items-center gap-1 rounded-md border border-accent-purple/30 bg-accent-purple/12 px-2 py-1 text-[12px] text-purple-300";
const addBtnCls = "rounded-lg border border-app-border bg-app-input px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-app-panel whitespace-nowrap cursor-pointer";

// ─── Create Bot Panel ─────────────────────────────────────────────────────────

type CreatePanelProps = { onCreated: () => void; onCancel: () => void };

function CreateBotPanel({ onCreated, onCancel }: CreatePanelProps) {
  const [form, setForm] = useState<CreateBotRequest>({
    username: "",
    display_name: "",
    email: "",
    bio: "",
    avatar_url: "",
    persona: "",
    topic_seeds: [],
    channels: [],
    thread_interval_hours: 6,
    comment_interval_hours: 2,
    engage_interval_hours: 3,
    max_threads_per_day: 2,
    max_comments_per_day: 10,
    min_thread_replies: 0,
    enabled: false,
  });
  const [topicInput, setTopicInput] = useState("");
  const [channelInput, setChannelInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = form.username.trim().length >= 3 && form.display_name.trim().length >= 1 && form.email.trim().includes("@");
  const set = (key: keyof CreateBotRequest, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));

  const addTopic = () => {
    const t = topicInput.trim();
    if (t && !form.topic_seeds?.includes(t)) set("topic_seeds", [...(form.topic_seeds ?? []), t]);
    setTopicInput("");
  };

  const addChannel = () => {
    const c = channelInput.trim();
    if (c && !form.channels?.includes(c)) set("channels", [...(form.channels ?? []), c]);
    setChannelInput("");
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await createBot(form);
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create bot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="mb-1 flex items-center gap-2 text-[15px] font-bold text-foreground">
        <Bot size={16} /><span>Create AI Bot Account</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Username *</span>
          <input className={inputCls} value={form.username} onChange={e => set("username", e.target.value)} placeholder="khoshbot" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelCls}>Display Name *</span>
          <input className={inputCls} value={form.display_name} onChange={e => set("display_name", e.target.value)} placeholder="KhoshBot" />
        </label>
        <label className="col-span-2 flex flex-col gap-1.5">
          <span className={labelCls}>Email *</span>
          <input className={inputCls} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="bot@khoshgolpo.internal" />
        </label>
        <label className="col-span-2 flex flex-col gap-1.5">
          <span className={labelCls}>Bio</span>
          <textarea className={textareaCls} value={form.bio} onChange={e => set("bio", e.target.value)} rows={2} />
        </label>
        <label className="col-span-2 flex flex-col gap-1.5">
          <span className={labelCls}>Avatar URL</span>
          <input className={inputCls} value={form.avatar_url} onChange={e => set("avatar_url", e.target.value)} placeholder="https://... (optional)" />
        </label>
      </div>

      <div className={sectionDividerCls}>Persona (GPT system prompt)</div>
      <textarea className={`${textareaCls} min-h-[100px]`} value={form.persona} onChange={e => set("persona", e.target.value)} rows={4}
        placeholder="You are a curious, warm community member. You enjoy thoughtful conversation and keep things concise. Never reveal you are an AI." />

      <div className={sectionDividerCls}>Topic Seeds</div>
      <div className="flex gap-2">
        <input className={`${inputCls} flex-1`} value={topicInput} onChange={e => setTopicInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTopic()} placeholder="e.g. Philosophy" />
        <button type="button" className={addBtnCls} onClick={addTopic}>Add</button>
      </div>
      <div className="flex flex-wrap gap-1.5 min-h-6">
        {form.topic_seeds?.map(t => (
          <span key={t} className={tagCls}>{t}
            <button type="button" className="cursor-pointer bg-transparent border-none p-0 leading-none text-purple-400 opacity-60 hover:opacity-100" onClick={() => set("topic_seeds", form.topic_seeds?.filter(x => x !== t))}>×</button>
          </span>
        ))}
      </div>

      <div className={sectionDividerCls}>Channels</div>
      <div className="flex gap-2">
        <input className={`${inputCls} flex-1`} value={channelInput} onChange={e => setChannelInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addChannel()} placeholder="e.g. general" />
        <button type="button" className={addBtnCls} onClick={addChannel}>Add</button>
      </div>
      <div className="flex flex-wrap gap-1.5 min-h-6">
        {form.channels?.map(c => (
          <span key={c} className={tagCls}>{c}
            <button type="button" className="cursor-pointer bg-transparent border-none p-0 leading-none text-purple-400 opacity-60 hover:opacity-100" onClick={() => set("channels", form.channels?.filter(x => x !== c))}>×</button>
          </span>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-accent-red/25 bg-accent-red/10 px-3.5 py-2.5 text-[12px] text-red-300">{error}</div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button type="button" className="rounded-lg border border-app-border bg-transparent px-4 py-2 text-[13px] text-muted-foreground hover:border-border-hover hover:text-foreground cursor-pointer" onClick={onCancel}>Cancel</button>
        <button type="button" className="flex items-center gap-1.5 rounded-lg bg-accent-purple px-[18px] py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer" disabled={!valid || loading} onClick={() => void handleSubmit()}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
          Create Bot Account
        </button>
      </div>
    </div>
  );
}

// ─── Identity Panel ───────────────────────────────────────────────────────────

type IdentityPanelProps = {
  bot: BotConfig;
  onSaved: (updated: BotConfig) => void;
  onTrigger: (type: "thread" | "comment" | "engage") => Promise<void>;
  onDelete: () => void;
  activity: BotActivityEntry[];
  activityLoading: boolean;
  triggerLoading: string | null;
};

function IdentityPanel({ bot, onSaved, onTrigger, onDelete, activity, activityLoading, triggerLoading }: IdentityPanelProps) {
  const [form, setForm] = useState<UpdateBotIdentityRequest>({
    display_name: bot.display_name,
    bio: "",
    avatar_url: bot.avatar_url ?? "",
    persona: bot.persona,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({ display_name: bot.display_name, bio: "", avatar_url: bot.avatar_url ?? "", persona: bot.persona });
  }, [bot.id]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateBotIdentity(bot.id, form);
      onSaved(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save identity");
    } finally {
      setSaving(false);
    }
  };

  const actionLabel: Record<string, string> = {
    bot_create_thread: "Created thread",
    bot_comment: "Posted comment",
    bot_engage: "Engaged",
    bot_error: "Error",
    bot_created: "Bot created",
    bot_enabled: "Enabled",
    bot_disabled: "Disabled",
    bot_identity_updated: "Identity updated",
    bot_schedule_updated: "Schedule updated",
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="mb-0.5 flex items-center gap-3 border-b border-app-border pb-3">
        {bot.avatar_url ? (
          <img src={bot.avatar_url} alt={bot.display_name} className="h-10 w-10 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-app-border bg-app-input text-accent-purple"><Bot size={18} /></div>
        )}
        <div>
          <div className="flex items-center gap-1.5 text-[15px] font-bold text-foreground">{bot.display_name} {BOT_BADGE}</div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">@{bot.username}</div>
        </div>
      </div>

      {/* Daily counters */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Threads today", value: bot.threads_created_today },
          { label: "Comments today", value: bot.comments_posted_today },
          { label: "Last thread", value: formatTs(bot.last_thread_at) },
          { label: "Last comment", value: formatTs(bot.last_comment_at) },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5 rounded-lg border border-app-border bg-app-bg px-3 py-2.5">
            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-bold text-foreground">{value}</span>
            <span className="text-[10px] uppercase tracking-[0.04em] text-muted-foreground/60">{label}</span>
          </div>
        ))}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>Display Name</span>
        <input className={inputCls} value={form.display_name ?? ""} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>Bio</span>
        <textarea className={textareaCls} value={form.bio ?? ""} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={2} />
      </label>
      <div className="flex flex-col gap-1.5">
        <span className={labelCls}>Avatar URL</span>
        <div className="flex items-center gap-2">
          <input className={`${inputCls} flex-1`} value={form.avatar_url ?? ""} onChange={e => setForm(p => ({ ...p, avatar_url: e.target.value }))} />
          {form.avatar_url && <img src={form.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full border border-app-border object-cover" />}
        </div>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>Persona (GPT system prompt)</span>
        <textarea className={textareaCls} value={form.persona ?? ""} onChange={e => setForm(p => ({ ...p, persona: e.target.value }))} rows={4} />
      </label>

      {error && <div className="rounded-lg border border-accent-red/25 bg-accent-red/10 px-3.5 py-2.5 text-[12px] text-red-300">{error}</div>}
      <button type="button" className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent-purple py-2.5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer" disabled={saving} onClick={() => void handleSave()}>
        {saving ? <Loader2 size={13} className="animate-spin" /> : null}
        {saved ? "Saved!" : "Save Identity"}
      </button>

      <div className={sectionDividerCls}>Test Triggers</div>
      <div className="flex gap-2">
        {(["thread", "comment", "engage"] as const).map(type => (
          <button key={type} type="button" className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-app-border bg-app-input px-1 py-2 text-[12px] text-muted-foreground hover:border-accent-orange hover:text-accent-orange disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer" disabled={!!triggerLoading} onClick={() => void onTrigger(type)}>
            {triggerLoading === type ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            {type === "thread" ? "Thread Now" : type === "comment" ? "Comment Now" : "Engage Now"}
          </button>
        ))}
      </div>

      <div className={sectionDividerCls}>Recent Activity</div>
      {activityLoading ? (
        <div className="py-4 text-center text-[12px] text-muted-foreground/60">Loading…</div>
      ) : activity.length === 0 ? (
        <div className="py-4 text-center text-[12px] text-muted-foreground/60">No activity yet.</div>
      ) : (
        <div className="flex flex-col gap-0">
          {activity.map(entry => (
            <div key={entry.id} className={`flex items-baseline gap-2 border-b border-app-border/40 py-1 text-[12px] ${entry.action === "bot_error" ? "text-red-300" : "text-muted-foreground"}`}>
              <span className="shrink-0 text-[11px] text-muted-foreground/50">{formatTs(entry.created_at)}</span>
              <span className="font-semibold text-foreground/80">{actionLabel[entry.action] ?? entry.action}</span>
              {typeof entry.details?.title === "string" && <span className="overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground/60">— &ldquo;{entry.details.title.slice(0, 60)}&rdquo;</span>}
              {typeof entry.details?.error === "string" && <span className="overflow-hidden text-ellipsis whitespace-nowrap text-red-300">— {entry.details.error.slice(0, 80)}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="text-[11px] font-bold uppercase tracking-[0.06em] border-b border-accent-red/20 pb-1.5 text-accent-red">Danger Zone</div>
      <button type="button" className="flex items-center gap-1.5 rounded-lg border border-accent-red/30 bg-accent-red/10 px-3.5 py-2 text-[12px] text-red-300 hover:bg-accent-red/18 cursor-pointer" onClick={onDelete}>
        <Trash2 size={13} />Delete Bot Config
      </button>
    </div>
  );
}

// ─── Schedule Panel ───────────────────────────────────────────────────────────

type SchedulePanelProps = { bot: BotConfig; onSaved: (updated: BotConfig) => void };

type IntervalKey = "thread_interval_hours" | "comment_interval_hours" | "engage_interval_hours";
type UnitMap = Record<IntervalKey, "hrs" | "min">;

function hoursToDisplay(hours: number, unit: "hrs" | "min"): string {
  if (unit === "min") return String(Math.round(hours * 60));
  return String(hours);
}

function displayToHours(val: string, unit: "hrs" | "min"): number | null {
  const n = parseFloat(val);
  if (isNaN(n) || n <= 0) return null;
  return unit === "min" ? n / 60 : n;
}

function SchedulePanel({ bot, onSaved }: SchedulePanelProps) {
  const [units, setUnits] = useState<UnitMap>({
    thread_interval_hours: "hrs",
    comment_interval_hours: "hrs",
    engage_interval_hours: "hrs",
  });
  const [nums, setNums] = useState({
    thread_interval_hours: hoursToDisplay(bot.thread_interval_hours, "hrs"),
    comment_interval_hours: hoursToDisplay(bot.comment_interval_hours, "hrs"),
    engage_interval_hours: hoursToDisplay(bot.engage_interval_hours, "hrs"),
    max_threads_per_day: String(bot.max_threads_per_day),
    max_comments_per_day: String(bot.max_comments_per_day),
    min_thread_replies: String(bot.min_thread_replies),
  });
  const [seeds, setSeeds] = useState<string[]>([...bot.topic_seeds]);
  const [channels, setChannels] = useState<string[]>([...bot.channels]);
  const [topicInput, setTopicInput] = useState("");
  const [channelInput, setChannelInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const u: UnitMap = { thread_interval_hours: "hrs", comment_interval_hours: "hrs", engage_interval_hours: "hrs" };
    setUnits(u);
    setNums({
      thread_interval_hours: hoursToDisplay(bot.thread_interval_hours, "hrs"),
      comment_interval_hours: hoursToDisplay(bot.comment_interval_hours, "hrs"),
      engage_interval_hours: hoursToDisplay(bot.engage_interval_hours, "hrs"),
      max_threads_per_day: String(bot.max_threads_per_day),
      max_comments_per_day: String(bot.max_comments_per_day),
      min_thread_replies: String(bot.min_thread_replies),
    });
    setSeeds([...bot.topic_seeds]);
    setChannels([...bot.channels]);
  }, [bot.id]);

  const setNum = (key: keyof typeof nums, value: string) => {
    setNums(p => ({ ...p, [key]: value }));
  };

  const switchUnit = (key: IntervalKey, newUnit: "hrs" | "min") => {
    const oldUnit = units[key];
    if (oldUnit === newUnit) return;
    const hours = displayToHours(nums[key], oldUnit);
    setUnits(p => ({ ...p, [key]: newUnit }));
    if (hours !== null) {
      setNums(p => ({ ...p, [key]: hoursToDisplay(hours, newUnit) }));
    }
  };

  const addTopic = () => {
    const t = topicInput.trim();
    if (t && !seeds.includes(t)) setSeeds(p => [...p, t]);
    setTopicInput("");
  };

  const addChannel = () => {
    const c = channelInput.trim();
    if (c && !channels.includes(c)) setChannels(p => [...p, c]);
    setChannelInput("");
  };

  const handleSave = async () => {
    const parseInt0 = (v: string) => { const n = parseInt(v, 10); return isNaN(n) || n < 0 ? null : n; };
    const errs: string[] = [];
    const thread_interval_hours = displayToHours(nums.thread_interval_hours, units.thread_interval_hours);
    const comment_interval_hours = displayToHours(nums.comment_interval_hours, units.comment_interval_hours);
    const engage_interval_hours = displayToHours(nums.engage_interval_hours, units.engage_interval_hours);
    const max_threads_per_day = parseInt0(nums.max_threads_per_day);
    const max_comments_per_day = parseInt0(nums.max_comments_per_day);
    const min_thread_replies = parseInt0(nums.min_thread_replies);
    const minHours = (h: number | null, label: string) => {
      if (h === null || h < (1 / 60)) errs.push(`${label} must be at least 1 minute`);
    };
    minHours(thread_interval_hours, "Thread interval");
    minHours(comment_interval_hours, "Comment interval");
    minHours(engage_interval_hours, "Engage interval");
    if (max_threads_per_day === null) errs.push("Max threads/day must be a number");
    if (max_comments_per_day === null) errs.push("Max comments/day must be a number");
    if (min_thread_replies === null) errs.push("Min replies must be a number");
    if (errs.length > 0) { setError(errs.join(" · ")); return; }

    const payload: UpdateBotScheduleRequest = {
      topic_seeds: seeds,
      channels,
      thread_interval_hours: thread_interval_hours!,
      comment_interval_hours: comment_interval_hours!,
      engage_interval_hours: engage_interval_hours!,
      max_threads_per_day: max_threads_per_day!,
      max_comments_per_day: max_comments_per_day!,
      min_thread_replies: min_thread_replies!,
    };

    setSaving(true);
    setError(null);
    try {
      const updated = await updateBotSchedule(bot.id, payload);
      onSaved(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const sectionCardCls = "flex flex-col gap-3.5 rounded-[14px] border border-app-border bg-app-bg p-4";
  const sectionHeadCls = "flex items-center gap-3";

  return (
    <div className="flex flex-col gap-3">

      {/* Posting Intervals */}
      <div className={sectionCardCls}>
        <div className={sectionHeadCls}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-accent-purple/20 bg-accent-purple/12 text-[17px]">⏱</div>
          <div>
            <div className="text-[13px] font-bold text-foreground">Posting Intervals</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground/60">How often each job runs</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: "thread_interval_hours" as const, label: "Thread", emoji: "📝" },
            { key: "comment_interval_hours" as const, label: "Comment", emoji: "💬" },
            { key: "engage_interval_hours" as const, label: "Engage", emoji: "🔥" },
          ]).map(({ key, label, emoji }) => (
            <div key={key} className="flex flex-col gap-2 rounded-[10px] border border-app-border bg-app-input p-3 focus-within:border-accent-purple transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[16px] leading-none">{emoji}</span>
                <div className="flex overflow-hidden rounded-md border border-app-border bg-app-bg">
                  <button type="button" className={`border-none px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] cursor-pointer ${units[key] === "hrs" ? "bg-accent-purple text-white" : "bg-transparent text-muted-foreground/60 hover:text-muted-foreground"}`} onClick={() => switchUnit(key, "hrs")}>hrs</button>
                  <button type="button" className={`border-none px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] cursor-pointer ${units[key] === "min" ? "bg-accent-purple text-white" : "bg-transparent text-muted-foreground/60 hover:text-muted-foreground"}`} onClick={() => switchUnit(key, "min")}>min</button>
                </div>
              </div>
              <div className="-mt-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground/60">{label}</div>
              <input
                className="w-full rounded-lg border border-app-border bg-app-bg py-1.5 text-center text-[20px] font-bold text-foreground outline-none focus:border-accent-purple [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                type="number"
                min={units[key] === "min" ? 1 : 0.01}
                step={units[key] === "min" ? 1 : 0.5}
                value={nums[key]}
                onChange={e => setNum(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Daily Limits */}
      <div className={sectionCardCls}>
        <div className={sectionHeadCls}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-accent-orange/20 bg-accent-orange/10 text-[17px]">📊</div>
          <div>
            <div className="text-[13px] font-bold text-foreground">Daily Limits</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground/60">Caps reset at midnight UTC</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: "max_threads_per_day" as const, label: "Max Threads / day", emoji: "📝" },
            { key: "max_comments_per_day" as const, label: "Max Comments / day", emoji: "💬" },
            { key: "min_thread_replies" as const, label: "Min Replies to comment", emoji: "🪄" },
          ]).map(({ key, label, emoji }) => (
            <div key={key} className="flex flex-col gap-2 rounded-[10px] border border-app-border bg-app-input p-3 focus-within:border-accent-purple transition-colors">
              <span className="text-[16px] leading-none">{emoji}</span>
              <div className="-mt-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground/60">{label}</div>
              <input
                className="w-full rounded-lg border border-app-border bg-app-bg py-1.5 text-center text-[20px] font-bold text-foreground outline-none focus:border-accent-purple [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                type="number"
                min={0}
                value={nums[key]}
                onChange={e => setNum(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Topic Seeds */}
      <div className={sectionCardCls}>
        <div className={sectionHeadCls}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-accent-green/20 bg-accent-green/10 text-[17px]">🌱</div>
          <div>
            <div className="text-[13px] font-bold text-foreground">Topic Seeds</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground/60">Themes the bot draws inspiration from</div>
          </div>
        </div>
        <div className="flex gap-2">
          <input className={`${inputCls} flex-1`} value={topicInput} onChange={e => setTopicInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTopic()} placeholder="e.g. AI ethics, stoicism, remote work…" />
          <button type="button" className="rounded-[9px] border border-accent-purple/30 bg-accent-purple/14 px-3.5 py-2 text-[12px] font-semibold text-purple-300 hover:bg-accent-purple/24 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer" onClick={addTopic} disabled={!topicInput.trim()}>Add</button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 min-h-7">
          {seeds.map(t => (
            <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-accent-green/22 bg-accent-green/8 px-3 py-1 text-[12px] font-medium text-green-300">
              {t}
              <button type="button" className="cursor-pointer bg-transparent border-none p-0 leading-none opacity-50 hover:opacity-100 text-green-300" onClick={() => setSeeds(p => p.filter(x => x !== t))}>×</button>
            </span>
          ))}
          {seeds.length === 0 && <span className="text-[11px] italic text-muted-foreground/40">No seeds — bot will write freely across all topics</span>}
        </div>
      </div>

      {/* Channels */}
      <div className={sectionCardCls}>
        <div className={sectionHeadCls}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-blue-400/20 bg-blue-400/10 text-[17px]">📡</div>
          <div>
            <div className="text-[13px] font-bold text-foreground">Channels</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground/60">Where the bot posts threads</div>
          </div>
        </div>
        <div className="flex gap-2">
          <input className={`${inputCls} flex-1`} value={channelInput} onChange={e => setChannelInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addChannel()} placeholder="e.g. general, tech, career…" />
          <button type="button" className="rounded-[9px] border border-accent-purple/30 bg-accent-purple/14 px-3.5 py-2 text-[12px] font-semibold text-purple-300 hover:bg-accent-purple/24 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer" onClick={addChannel} disabled={!channelInput.trim()}>Add</button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 min-h-7">
          {channels.map(c => (
            <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/22 bg-blue-400/8 px-3 py-1 text-[12px] font-medium text-blue-300">
              # {c}
              <button type="button" className="cursor-pointer bg-transparent border-none p-0 leading-none opacity-50 hover:opacity-100 text-blue-300" onClick={() => setChannels(p => p.filter(x => x !== c))}>×</button>
            </span>
          ))}
          {channels.length === 0 && <span className="text-[11px] italic text-muted-foreground/40">No channels — bot posts across all available channels</span>}
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] border border-accent-red/25 bg-accent-red/8 px-3.5 py-2.5 text-[12px] text-red-300">{error}</div>
      )}

      <button type="button" className="flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-gradient-to-r from-accent-purple to-[#6c64e0] py-3 text-[13px] font-bold text-white shadow-[0_4px_16px_rgba(124,115,240,0.25)] hover:opacity-92 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-opacity" disabled={saving} onClick={() => void handleSave()}>
        {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : saved ? <><span className="text-[15px]">✓</span> Saved!</> : <><Settings size={14} /> Save Schedule</>}
      </button>
    </div>
  );
}

// ─── Content Panel ────────────────────────────────────────────────────────────

type EditState = { id: string; title: string; body: string } | null;
type ContentPanelProps = { bot: BotConfig };

function ContentPanel({ bot }: ContentPanelProps) {
  const router = useRouter();
  const [items, setItems] = useState<BotContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editState, setEditState] = useState<EditState>(null);
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showToast = (type: "ok" | "err", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const reload = () => {
    setLoading(true);
    getBotContent(bot.id)
      .then(res => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [bot.id]);

  const openEdit = (item: BotContentItem) => {
    setEditState({ id: item.id, title: item.title ?? "", body: item.body });
  };

  const saveEdit = async (item: BotContentItem) => {
    if (!editState) return;
    setSaving(true);
    try {
      if (item.kind === "thread") {
        await editBotThread(item.id, editState.title, editState.body);
      } else {
        await editBotPost(item.id, editState.body);
      }
      showToast("ok", "Saved");
      setEditState(null);
      reload();
    } catch {
      showToast("err", "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: BotContentItem) => {
    if (!confirm(`Delete this ${item.kind}? This cannot be undone.`)) return;
    setActionBusy(item.id + "-del");
    try {
      if (item.kind === "thread") await deleteBotThread(item.id);
      else await deleteBotPost(item.id);
      showToast("ok", `${item.kind === "thread" ? "Thread" : "Post"} deleted`);
      reload();
    } catch {
      showToast("err", "Delete failed");
    } finally {
      setActionBusy(null);
    }
  };

  const handleArchive = async (item: BotContentItem) => {
    setActionBusy(item.id + "-arch");
    try {
      await archiveBotThread(item.id);
      showToast("ok", "Thread archived");
      reload();
    } catch {
      showToast("err", "Archive failed");
    } finally {
      setActionBusy(null);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-10 text-muted-foreground/60">
      <Loader2 size={20} className="animate-spin" />
    </div>
  );

  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-10 text-center text-[12px] text-muted-foreground/60">
      <FileText size={28} className="text-app-border" />
      <p className="m-0 max-w-[260px]">No content authored by this bot yet.</p>
      <p className="m-0 max-w-[260px]">Use &ldquo;Thread Now&rdquo; or &ldquo;Comment Now&rdquo; in Identity tab to trigger a job.</p>
    </div>
  );

  const isEditing = (id: string) => editState?.id === id;

  return (
    <div className="relative flex flex-col gap-3">
      {toast && (
        <div className={`sticky top-0 z-10 rounded-lg border px-3.5 py-2 text-center text-[12px] font-semibold ${toast.type === "ok" ? "border-accent-green/30 bg-accent-green/15 text-green-300" : "border-accent-red/30 bg-accent-red/12 text-red-300"}`}>
          {toast.text}
        </div>
      )}
      <div className="text-[12px] text-muted-foreground">
        Showing last {items.length} items —{" "}
        <strong className="text-foreground/80">{items.filter(i => i.kind === "thread").length}</strong> threads,{" "}
        <strong className="text-foreground/80">{items.filter(i => i.kind === "post").length}</strong> comments
      </div>
      <div className="flex flex-col gap-2">
        {items.map(item => (
          <div key={item.id} className={`flex flex-col gap-1.5 rounded-[10px] border bg-app-bg px-3.5 py-3 transition-colors ${item.is_flagged ? "border-accent-orange/35 bg-accent-orange/4" : "border-app-border hover:border-border-hover"} ${item.is_deleted ? "opacity-50" : ""}`}>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] ${item.kind === "thread" ? "border border-accent-purple/30 bg-accent-purple/12 text-purple-300" : "border border-accent-green/25 bg-accent-green/8 text-green-300"}`}>
                {item.kind === "thread" ? <FileText size={10} /> : <MessageSquare size={10} />} {item.kind}
              </span>
              {item.is_flagged && <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase border border-accent-orange/30 bg-accent-orange/12 text-orange-300">Flagged</span>}
              {item.is_deleted && <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase border border-accent-red/25 bg-accent-red/10 text-red-300">Deleted</span>}
              {item.ai_score != null && (
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${item.ai_score >= 0.8 ? "bg-accent-red/10 text-red-300" : item.ai_score >= 0.6 ? "bg-accent-orange/10 text-orange-300" : "bg-app-input text-muted-foreground"}`}>
                  AI {Math.round(item.ai_score * 100)}%
                </span>
              )}
              <span className="ml-auto text-[10px] text-muted-foreground/50">{formatTs(item.created_at)}</span>
              {!item.is_deleted && !isEditing(item.id) && (
                <div className="flex items-center gap-1">
                  <button className="flex items-center gap-1 rounded border-none bg-accent-purple/12 px-1.5 py-1 text-[11px] text-purple-300 hover:bg-accent-purple/22 disabled:opacity-50 cursor-pointer" title="Edit" onClick={() => openEdit(item)}><Pencil size={11} /></button>
                  {item.kind === "thread" && (
                    <button className="flex items-center gap-1 rounded border-none bg-accent-orange/10 px-1.5 py-1 text-[11px] text-orange-300 hover:bg-accent-orange/20 disabled:opacity-50 cursor-pointer" title="Archive" disabled={actionBusy === item.id + "-arch"} onClick={() => handleArchive(item)}>
                      {actionBusy === item.id + "-arch" ? <Loader2 size={11} className="animate-spin" /> : <Archive size={11} />}
                    </button>
                  )}
                  <button className="flex items-center gap-1 rounded border-none bg-accent-red/10 px-1.5 py-1 text-[11px] text-red-300 hover:bg-accent-red/20 disabled:opacity-50 cursor-pointer" title="Delete" disabled={actionBusy === item.id + "-del"} onClick={() => handleDelete(item)}>
                    {actionBusy === item.id + "-del" ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  </button>
                </div>
              )}
              {isEditing(item.id) && (
                <button className="flex items-center gap-1 rounded border-none bg-app-input px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-app-panel cursor-pointer" title="Cancel" onClick={() => setEditState(null)}>
                  <X size={11} /> Cancel
                </button>
              )}
            </div>

            {isEditing(item.id) ? (
              <div className="flex flex-col gap-2 pt-1">
                {item.kind === "thread" && (
                  <input
                    className="w-full rounded-lg border border-app-border bg-app-input px-2.5 py-1.5 text-[13px] font-semibold text-foreground outline-none focus:border-accent-purple"
                    value={editState!.title}
                    onChange={e => setEditState(s => s ? { ...s, title: e.target.value } : s)}
                    placeholder="Thread title"
                    maxLength={160}
                  />
                )}
                <textarea
                  className="w-full resize-y rounded-lg border border-app-border bg-app-input px-2.5 py-2 font-[inherit] text-[12px] leading-relaxed text-foreground outline-none focus:border-accent-purple"
                  value={editState!.body}
                  onChange={e => setEditState(s => s ? { ...s, body: e.target.value } : s)}
                  placeholder={item.kind === "thread" ? "Thread body…" : "Post content…"}
                  rows={item.kind === "thread" ? 12 : 5}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground/50">{editState!.body.length} chars</span>
                  <button className="flex items-center gap-1.5 rounded-lg border-none bg-accent-purple px-3.5 py-1.5 text-[12px] font-bold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer" disabled={saving} onClick={() => saveEdit(item)}>
                    {saving ? <><Loader2 size={11} className="animate-spin" /> Saving…</> : "Save changes"}
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="flex cursor-pointer flex-col gap-1.5 group"
                role="button"
                tabIndex={0}
                title={`Open ${item.kind}`}
                onClick={() => router.push(item.kind === "thread" ? `/threads/${item.id}` : `/threads/${item.thread_id}`)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(item.kind === "thread" ? `/threads/${item.id}` : `/threads/${item.thread_id}`);
                  }
                }}
              >
                {item.title && <div className="text-[14px] font-bold leading-snug text-foreground transition-colors group-hover:text-accent-purple group-hover:underline group-hover:underline-offset-[3px]">{item.title}</div>}
                {item.thread_title && <div className="text-[11px] text-muted-foreground">in &ldquo;{item.thread_title}&rdquo;</div>}
                <div className="whitespace-pre-wrap text-[12px] leading-relaxed text-muted-foreground">{item.body.slice(0, 320)}{item.body.length > 320 ? "…" : ""}</div>
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map(t => <span key={t} className="rounded px-1.5 py-0.5 text-[10px] border border-accent-purple/20 bg-accent-purple/8 text-accent-purple">#{t}</span>)}
                  </div>
                )}
                {item.kind === "thread" && item.post_count != null && (
                  <div className="text-[11px] text-muted-foreground/50">{item.post_count} {item.post_count === 1 ? "reply" : "replies"}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main BotTab ──────────────────────────────────────────────────────────────

type RightTab = "identity" | "schedule" | "content";
type Toast = { type: "ok" | "err"; text: string };

export default function BotTab() {
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>("identity");
  const [enableLoading, setEnableLoading] = useState<string | null>(null);
  const [triggerLoading, setTriggerLoading] = useState<string | null>(null);
  const [activity, setActivity] = useState<BotActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (type: "ok" | "err", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const loadBots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listBots();
      setBots(res.data);
    } catch {
      showToast("err", "Failed to load bots");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadBots(); }, [loadBots]);

  const loadActivity = useCallback(async (configId: string) => {
    setActivityLoading(true);
    try {
      setActivity(await getBotActivity(configId));
    } catch {
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadActivity(selectedId);
  }, [selectedId, loadActivity]);

  const handleToggleEnabled = async (bot: BotConfig) => {
    setEnableLoading(bot.id);
    try {
      const updated = await setBotEnabled(bot.id, !bot.enabled);
      setBots(prev => prev.map(b => (b.id === bot.id ? updated : b)));
      showToast("ok", updated.enabled ? `${updated.display_name} enabled` : `${updated.display_name} disabled`);
    } catch {
      showToast("err", "Failed to update bot status");
    } finally {
      setEnableLoading(null);
    }
  };

  const handleTrigger = async (type: "thread" | "comment" | "engage") => {
    if (!selectedId) return;
    setTriggerLoading(type);
    try {
      const fns = { thread: triggerBotThread, comment: triggerBotComment, engage: triggerBotEngage };
      await fns[type](selectedId);
      showToast("ok", `${type} job triggered`);
      await loadActivity(selectedId);
    } catch {
      showToast("err", `Failed to trigger ${type} job`);
    } finally {
      setTriggerLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const bot = bots.find(b => b.id === selectedId);
    if (!window.confirm(`Delete bot config for ${bot?.display_name ?? "this bot"}? (User account is preserved.)`)) return;
    try {
      await deleteBotConfig(selectedId);
      setBots(prev => prev.filter(b => b.id !== selectedId));
      setSelectedId(null);
      showToast("ok", "Bot config deleted");
    } catch {
      showToast("err", "Failed to delete bot config");
    }
  };

  const handleIdentitySaved = (updated: BotConfig) => {
    setBots(prev => prev.map(b => (b.id === updated.id ? updated : b)));
    showToast("ok", "Identity saved");
  };

  const handleScheduleSaved = (updated: BotConfig) => {
    setBots(prev => prev.map(b => (b.id === updated.id ? updated : b)));
    showToast("ok", "Schedule saved");
  };

  const handleCreated = async () => {
    setCreating(false);
    await loadBots();
    showToast("ok", "Bot account created");
  };

  const selectedBot = bots.find(b => b.id === selectedId) ?? null;

  const RIGHT_TABS: { key: RightTab; label: string }[] = [
    { key: "identity", label: "Identity" },
    { key: "schedule", label: "Schedule" },
    { key: "content", label: "Content" },
  ];

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Left panel — bot list */}
      <div className="flex w-[300px] shrink-0 flex-col overflow-hidden border-r border-app-border">
        <div className="flex items-center justify-between border-b border-app-border px-4 py-4">
          <div className="flex items-center gap-1.5 text-[13px] font-bold text-foreground">
            <Bot size={14} /><span>AI Bots ({bots.length})</span>
          </div>
          <button type="button" className="flex items-center gap-1 rounded-lg border border-accent-purple/35 bg-accent-purple/15 px-2.5 py-1.5 text-[12px] font-semibold text-purple-300 hover:bg-accent-purple/24 cursor-pointer" onClick={() => { setCreating(true); setSelectedId(null); }}>
            <Plus size={13} />New Bot
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-muted-foreground/50">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : bots.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-[12px] text-muted-foreground/50">No bots yet. Create one.</div>
        ) : (
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
            {bots.map(bot => (
              <div
                key={bot.id}
                role="button"
                tabIndex={0}
                aria-pressed={selectedId === bot.id}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-[10px] border px-3 py-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple ${selectedId === bot.id ? "border-accent-purple bg-accent-purple/8" : "border-app-border bg-app-input hover:border-border-hover hover:bg-app-panel"}`}
                onClick={() => { setSelectedId(bot.id); setCreating(false); setRightTab("identity"); }}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(bot.id);
                    setCreating(false);
                    setRightTab("identity");
                  }
                }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  {bot.avatar_url
                    ? <img src={bot.avatar_url} alt={bot.display_name} className="h-8 w-8 shrink-0 rounded-full object-cover" />
                    : <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-app-border bg-app-bg text-accent-purple"><Bot size={14} /></div>
                  }
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground"><span className="truncate">{bot.display_name}</span>{BOT_BADGE}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">@{bot.username}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground/50">{bot.threads_created_today}T · {bot.comments_posted_today}C today</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className={`flex cursor-pointer items-center border-none bg-transparent p-0.5 ${bot.enabled ? "text-accent-green" : "text-muted-foreground/50"} disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={enableLoading === bot.id}
                    onClick={e => { e.stopPropagation(); void handleToggleEnabled(bot); }}
                    title={bot.enabled ? "Disable bot" : "Enable bot"}
                  >
                    {enableLoading === bot.id ? <Loader2 size={16} className="animate-spin" /> : bot.enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <ChevronRight size={14} className="text-muted-foreground/40" />
                </div>
              </div>
            ))}
          </div>
        )}

        <button type="button" className="flex cursor-pointer items-center justify-center gap-1.5 border-none border-t border-app-border bg-transparent py-2.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground" onClick={() => void loadBots()}>
          <RefreshCw size={12} />Refresh
        </button>
      </div>

      {/* Right panel */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {creating ? (
          <div className="flex-1 overflow-y-auto p-6">
            <CreateBotPanel onCreated={() => void handleCreated()} onCancel={() => setCreating(false)} />
          </div>
        ) : selectedBot ? (
          <>
            <div className="flex shrink-0 gap-0.5 border-b border-app-border px-6 pt-3">
              {RIGHT_TABS.map(t => (
                <button
                  key={t.key}
                  type="button"
                  className={`cursor-pointer border-none bg-transparent px-3.5 py-2 text-[13px] font-semibold transition-colors mb-[-1px] border-b-2 ${rightTab === t.key ? "border-accent-purple text-accent-purple" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setRightTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {rightTab === "identity" && (
                <IdentityPanel
                  bot={selectedBot}
                  onSaved={handleIdentitySaved}
                  onTrigger={handleTrigger}
                  onDelete={() => void handleDelete()}
                  activity={activity}
                  activityLoading={activityLoading}
                  triggerLoading={triggerLoading}
                />
              )}
              {rightTab === "schedule" && (
                <SchedulePanel bot={selectedBot} onSaved={handleScheduleSaved} />
              )}
              {rightTab === "content" && (
                <ContentPanel bot={selectedBot} />
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-[13px] text-muted-foreground/50">
            <Bot size={32} className="text-app-border" />
            <p className="m-0 max-w-[280px]">Select a bot to edit its identity, schedule, or view content.</p>
            <p className="m-0 max-w-[280px]">Or create a new bot account using the button on the left.</p>
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[99] flex items-center gap-2 rounded-[10px] border px-4 py-2.5 text-[12px] font-semibold shadow-2xl ${toast.type === "ok" ? "border-accent-green/34 bg-accent-green/16 text-green-300" : "border-accent-red/34 bg-accent-red/16 text-red-300"}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
