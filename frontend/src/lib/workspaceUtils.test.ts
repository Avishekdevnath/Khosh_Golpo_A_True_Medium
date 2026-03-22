import assert from "node:assert/strict";
import test from "node:test";

import { normalizeApiDate, parseApiDate, relativeTime, wasEdited } from "./workspaceUtils";

test("normalizeApiDate appends UTC suffix to naive API timestamps", () => {
  assert.equal(normalizeApiDate("2026-03-22T11:07:54.516000"), "2026-03-22T11:07:54.516000Z");
  assert.equal(normalizeApiDate("2026-03-22T11:07:54.516000Z"), "2026-03-22T11:07:54.516000Z");
});

test("parseApiDate treats naive ISO timestamps as UTC", () => {
  assert.equal(parseApiDate("2026-03-22T11:07:54.516000").toISOString(), "2026-03-22T11:07:54.516Z");
});

test("relativeTime uses normalized API timestamps", () => {
  const realNow = Date.now;
  Date.now = () => Date.parse("2026-03-22T11:12:54.516Z");
  try {
    assert.equal(relativeTime("2026-03-22T11:07:54.516000"), "5m ago");
  } finally {
    Date.now = realNow;
  }
});

test("wasEdited compares normalized timestamps", () => {
  assert.equal(wasEdited("2026-03-22T11:07:54.516000", "2026-03-22T11:07:54.516000"), false);
  assert.equal(wasEdited("2026-03-22T11:07:54.516000", "2026-03-22T11:08:01.000000"), false);
  assert.equal(wasEdited("2026-03-22T11:07:54.516000", "2026-03-22T11:08:40.000000"), true);
});
