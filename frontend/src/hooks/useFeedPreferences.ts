"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getFeedPreferences, setUserTopics, updateFeedPreferences } from "@/lib/feedApi";
import type { FeedPreferences } from "@/types/feed";

export type FeedCustomPrefs = {
  interest_tags: string[];
  feed_explore_mode: boolean;
  feed_following_priority: boolean;
  feed_include_own: boolean;
};

const DEFAULTS: FeedCustomPrefs = {
  interest_tags: [],
  feed_explore_mode: true,
  feed_following_priority: false,
  feed_include_own: true,
};

function fromApiPrefs(data: FeedPreferences): FeedCustomPrefs {
  return {
    interest_tags: data.interest_tags,
    feed_explore_mode: data.feed_explore_mode,
    feed_following_priority: data.feed_following_priority,
    feed_include_own: data.feed_include_own,
  };
}

export function useFeedPreferences() {
  const [prefs, setPrefs] = useState<FeedCustomPrefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const prefsRef = useRef<FeedCustomPrefs>(DEFAULTS);

  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getFeedPreferences()
      .then((data) => {
        if (cancelled) return;
        const next = fromApiPrefs(data);
        setPrefs(next);
        prefsRef.current = next;
      })
      .catch(() => {
        if (cancelled) return;
        setPrefs(DEFAULTS);
        prefsRef.current = DEFAULTS;
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const savePrefs = useCallback(async (patch: Partial<FeedCustomPrefs>) => {
    const previous = prefsRef.current;
    const optimistic = { ...previous, ...patch };
    setPrefs(optimistic);
    prefsRef.current = optimistic;
    setSaving(true);
    try {
      // interest_tags go through setUserTopics; other prefs through updateFeedPreferences
      let updated: FeedPreferences;
      if (patch.interest_tags !== undefined) {
        updated = await setUserTopics(patch.interest_tags);
        // Also save any other fields in same patch
        const { interest_tags: _, ...rest } = patch;
        if (Object.keys(rest).length > 0) {
          updated = await updateFeedPreferences(rest);
        }
      } else {
        updated = await updateFeedPreferences(patch);
      }
      const resolved = fromApiPrefs(updated);
      setPrefs(resolved);
      prefsRef.current = resolved;
    } catch {
      setPrefs(previous);
      prefsRef.current = previous;
    } finally {
      setSaving(false);
    }
  }, []);

  return { prefs, loading, saving, savePrefs };
}
