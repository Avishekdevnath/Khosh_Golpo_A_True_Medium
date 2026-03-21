"use client";

import { CheckCircle2, RotateCcw, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useUserTopics } from "@/hooks/useUserTopics";

const SKELETON_WIDTHS = [96, 76, 112, 88, 104, 72, 94, 120, 84, 108];

export default function FeedTopicsSettings() {
  const {
    selectedTopics,
    topicsSelected,
    availableTopics,
    loading,
    saving,
    addTopic,
    removeTopic,
    resetTopics,
  } = useUserTopics();
  const [error, setError] = useState<string | null>(null);

  const hasTopics = selectedTopics.length > 0;
  const statusText = hasTopics
    ? `${selectedTopics.length} topic${selectedTopics.length === 1 ? "" : "s"} selected for My Feed.`
    : topicsSelected
    ? "My Feed is active, but no topics are saved right now."
    : "No topics selected yet. My Feed will show the topic picker in Threads.";

  async function handleToggle(topic: string) {
    if (saving) return;
    setError(null);
    try {
      if (selectedTopics.includes(topic)) {
        await removeTopic(topic);
      } else {
        await addTopic(topic);
      }
    } catch {
      setError("Failed to update your topics. Try again.");
    }
  }

  async function handleReset() {
    if (saving) return;
    setError(null);
    try {
      await resetTopics();
    } catch {
      setError("Failed to reset topic setup. Try again.");
    }
  }

  return (
    <div className="w-full">
      {/* Section heading */}
      <h2 className="font-serif text-[18px] font-bold mb-1">Feed Topics</h2>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        Manage the topics that shape My Feed. If you skipped the topic picker before, you can set or reset it here any
        time.
      </p>

      {/* Status card */}
      <div className="flex items-start justify-between gap-3.5 rounded-xl border border-app-border bg-gradient-to-b from-[rgba(16,19,29,0.96)] to-[rgba(12,15,24,0.96)] px-4 py-3.5 mb-[18px]">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 text-[14px] font-bold text-foreground mb-1.5">
            <Sparkles size={15} />
            My Feed setup
          </div>
          <p className="m-0 text-[13px] text-muted-foreground leading-relaxed">{statusText}</p>
        </div>
        <div
          className={[
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap",
            hasTopics
              ? "border-[rgba(61,214,140,0.3)] bg-[rgba(61,214,140,0.1)] text-[#7fe0ad]"
              : "border-[#2b3654] bg-app-input text-muted-foreground",
          ].join(" ")}
        >
          {hasTopics && <CheckCircle2 size={13} />}
          {saving ? "Saving..." : hasTopics ? "Active" : "Needs topics"}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1.5 rounded-lg border border-[rgba(240,107,107,0.2)] bg-[rgba(240,107,107,0.08)] px-3 py-2 text-[13px] text-[#f06b6b] mt-3.5">
          {error}
        </div>
      )}

      {/* Selected topics */}
      {hasTopics && (
        <>
          <div className="flex items-center justify-between gap-3 mt-5 mb-2.5">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#dbe0f0]">
              Selected topics
            </span>
            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2b3654] bg-app-input px-2.5 py-1.5 text-[12px] font-semibold text-[#aab3cf] font-[inherit] transition-all duration-150 hover:border-accent-orange hover:text-[#f6c0a5] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw size={13} />
              Reset topic setup
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedTopics.map(topic => (
              <button
                key={topic}
                type="button"
                onClick={() => void handleToggle(topic)}
                disabled={saving}
                aria-label={`Remove ${topic}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(240,131,74,0.4)] bg-[rgba(240,131,74,0.12)] px-3 py-1.5 text-[13px] font-medium text-accent-orange font-[inherit] transition-all duration-150 hover:bg-[rgba(240,131,74,0.18)] hover:text-[#ffd3bd] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {topic}
                <X size={11} />
              </button>
            ))}
          </div>
        </>
      )}

      {/* Empty hint */}
      {!hasTopics && (
        <div className="rounded-[10px] border border-[#252b40] bg-[#141a28] px-3.5 py-3 text-[13px] text-[#9aa4c0] leading-relaxed mt-2">
          Choose one or more topics below to personalize My Feed. Leaving this empty will keep the inline picker
          available on the Threads page.
        </div>
      )}

      {/* Available topics header */}
      <div className="flex items-center justify-between gap-3 mt-5 mb-2.5">
        <span className="text-[12px] font-bold uppercase tracking-wider text-[#dbe0f0]">
          Popular topics
        </span>
        <span className="text-[11px] text-[#636f8d]">Changes save automatically</span>
      </div>

      {/* Topic chips */}
      <div className="flex flex-wrap gap-2">
        {loading
          ? SKELETON_WIDTHS.map((width, index) => (
              <Skeleton
                key={index}
                variant="circle"
                className="h-9"
                style={{ width }}
              />
            ))
          : availableTopics.map(topic => {
              const selected = selectedTopics.includes(topic.name);
              return (
                <button
                  key={topic.name}
                  type="button"
                  onClick={() => void handleToggle(topic.name)}
                  disabled={saving}
                  aria-pressed={selected}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[13px] font-medium font-[inherit] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed",
                    selected
                      ? "border-accent-orange bg-[rgba(240,131,74,0.14)] text-accent-orange"
                      : "border-[#2b3654] bg-app-input text-muted-foreground hover:border-accent-orange hover:text-foreground",
                  ].join(" ")}
                >
                  <span>{topic.name}</span>
                  {topic.thread_count > 0 && (
                    <span className="text-[11px] opacity-65">{topic.thread_count}</span>
                  )}
                </button>
              );
            })}
      </div>

      {/* Empty available */}
      {!loading && availableTopics.length === 0 && (
        <div className="rounded-[10px] border border-[#252b40] bg-[#141a28] px-3.5 py-3 text-[13px] text-[#9aa4c0] leading-relaxed mt-2">
          Popular topics are unavailable right now. You can try again later.
        </div>
      )}

      {/* Helper text */}
      <p className="mt-3.5 text-[12px] text-[#636f8d] leading-relaxed">
        Resetting topic setup clears saved feed topics and makes the topic picker appear again when you open My Feed in
        Threads.
      </p>
    </div>
  );
}
