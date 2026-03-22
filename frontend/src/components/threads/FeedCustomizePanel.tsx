"use client";

import { X } from "lucide-react";
import type { PopularTopic } from "@/types/feed";
import type { FeedCustomPrefs } from "@/hooks/useFeedPreferences";

type Props = {
  open: boolean;
  onClose: () => void;
  prefs: FeedCustomPrefs;
  saving: boolean;
  availableTopics: PopularTopic[];
  onSave: (patch: Partial<FeedCustomPrefs>) => void;
};

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-medium text-foreground leading-tight m-0">{label}</p>
        <p className="text-[12px] text-text-tertiary mt-0.5 leading-snug m-0">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          "relative shrink-0 mt-0.5 w-9 h-5 rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-primary/50 disabled:opacity-40",
          checked ? "bg-primary" : "bg-border",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-4" : "translate-x-0",
          ].join(" ")}
        />
      </button>
    </label>
  );
}

export default function FeedCustomizePanel({
  open,
  onClose,
  prefs,
  saving,
  availableTopics,
  onSave,
}: Props) {
  const selectedTopics = prefs.interest_tags;

  function toggleTopic(topic: string) {
    const next = selectedTopics.includes(topic)
      ? selectedTopics.filter(t => t !== topic)
      : [...selectedTopics, topic];
    onSave({ interest_tags: next });
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={[
          "fixed right-0 top-0 z-50 h-full w-[320px] max-w-[90vw] bg-background border-l border-border shadow-xl flex flex-col",
          "transition-transform duration-250 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        aria-label="Customize feed"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-[15px] font-semibold text-foreground m-0">Customize Feed</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close customize feed panel"
            className="size-8 flex items-center justify-center rounded-full text-text-tertiary hover:bg-card-hover hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto ws-scroll px-5 py-5 flex flex-col gap-6">

          {/* ── Empty topic warning ── */}
          {!prefs.feed_explore_mode && prefs.interest_tags.length === 0 && (
            <p className="text-[12px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 m-0">
              Pick at least one topic or your feed will be empty with Explore mode off.
            </p>
          )}

          {/* ── Topics ── */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary mb-3 m-0">
              Your topics
            </h3>
            <p className="text-[12.5px] text-text-secondary mb-3 m-0">
              Only threads tagged with these topics will appear in your feed when Explore mode is off.
            </p>
            {availableTopics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableTopics.map(({ name }) => {
                  const active = selectedTopics.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleTopic(name)}
                      className={[
                        "rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150 border",
                        active
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-card-hover border-border text-text-secondary hover:border-border-strong hover:text-foreground",
                      ].join(" ")}
                    >
                      {name}
                      <span className="ml-1.5 text-[10px] opacity-60">
                        {active ? "✓" : "+"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[12px] text-text-tertiary italic m-0">Loading topics…</p>
            )}
            {selectedTopics.length > 0 && (
              <button
                type="button"
                onClick={() => onSave({ interest_tags: [] })}
                className="mt-3 text-[12px] text-text-tertiary hover:text-destructive transition-colors"
              >
                Clear all topics
              </button>
            )}
          </section>

          <div className="border-t border-border" />

          {/* ── Feed behaviour toggles ── */}
          <section className="flex flex-col gap-5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary m-0">
              Feed behaviour
            </h3>

            <Toggle
              label="Explore mode"
              description="When on, shows all threads. Turn off to see only your topics and people you follow."
              checked={prefs.feed_explore_mode}
              onChange={v => onSave({ feed_explore_mode: v })}
              disabled={saving}
            />

            <Toggle
              label="Following priority"
              description="Show threads from people you follow before everyone else."
              checked={prefs.feed_following_priority}
              onChange={v => onSave({ feed_following_priority: v })}
              disabled={saving}
            />

            <Toggle
              label="Include my posts"
              description="Show your own threads in your feed alongside others."
              checked={prefs.feed_include_own}
              onChange={v => onSave({ feed_include_own: v })}
              disabled={saving}
            />
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          <p className="text-[11.5px] text-text-tertiary text-center m-0">
            {saving ? "Saving…" : "Changes save automatically"}
          </p>
        </div>
      </aside>
    </>
  );
}
