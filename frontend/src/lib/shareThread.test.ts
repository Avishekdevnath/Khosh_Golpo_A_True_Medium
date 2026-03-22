import assert from "node:assert/strict";
import test from "node:test";

import { shareThread } from "./shareThread";


type MaybeNavigator = typeof globalThis.navigator & {
  share?: (data: { title?: string; text?: string; url: string }) => Promise<void>;
  clipboard?: { writeText: (value: string) => Promise<void> };
};


function withNavigator(mockNavigator: MaybeNavigator, run: () => Promise<void>) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: mockNavigator,
  });
  return run().finally(() => {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, "navigator", originalDescriptor);
    } else {
      // @ts-expect-error - cleanup for test environment
      delete globalThis.navigator;
    }
  });
}


test("shareThread prefers navigator.share when available", async () => {
  const calls: Array<{ title?: string; text?: string; url: string }> = [];

  await withNavigator(
    {
      share: async (data) => {
        calls.push(data);
      },
    } as MaybeNavigator,
    async () => {
      const result = await shareThread({
        title: "A thread",
        text: "Read this",
        url: "http://localhost:3000/threads/abc",
      });

      assert.deepEqual(calls, [
        {
          title: "A thread",
          text: "Read this",
          url: "http://localhost:3000/threads/abc",
        },
      ]);
      assert.equal(result.kind, "shared");
    },
  );
});


test("shareThread falls back to clipboard copy when Web Share API is unavailable", async () => {
  const copied: string[] = [];

  await withNavigator(
    {
      clipboard: {
        writeText: async (value) => {
          copied.push(value);
        },
      },
    } as MaybeNavigator,
    async () => {
      const result = await shareThread({
        title: "A thread",
        url: "http://localhost:3000/threads/abc",
      });

      assert.deepEqual(copied, ["http://localhost:3000/threads/abc"]);
      assert.equal(result.kind, "copied");
    },
  );
});


test("shareThread treats user-cancelled share as cancelled instead of a hard error", async () => {
  await withNavigator(
    {
      share: async () => {
        throw new DOMException("The share operation was aborted.", "AbortError");
      },
    } as MaybeNavigator,
    async () => {
      const result = await shareThread({
        url: "http://localhost:3000/threads/abc",
      });

      assert.equal(result.kind, "cancelled");
    },
  );
});
