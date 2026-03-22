import assert from "node:assert/strict";
import test from "node:test";

import { formatActivityItem } from "./activityFormatting";


test("formats a saved thread entry with an unsave quick action", () => {
  const formatted = formatActivityItem({
    id: "1",
    action: "thread_saved",
    actor_id: "user-1",
    target_type: "thread",
    target_id: "thread-1",
    severity: "info",
    result: "success",
    request_id: null,
    ip: null,
    details: { title: "Building with FastAPI" },
    created_at: "2026-03-22T10:00:00Z",
  });

  assert.equal(formatted.title, "You saved a thread");
  assert.equal(formatted.summary, "Building with FastAPI");
  assert.deepEqual(formatted.quickAction, {
    label: "Unsave",
    method: "DELETE",
    path: "threads/thread-1/save",
    successMessage: "Removed from saved threads.",
  });
});


test("formats a liked post entry with an unlike quick action", () => {
  const formatted = formatActivityItem({
    id: "2",
    action: "post_liked",
    actor_id: "user-1",
    target_type: "post",
    target_id: "post-1",
    severity: "info",
    result: "success",
    request_id: null,
    ip: null,
    details: { thread_id: "thread-9", content_preview: "Helpful answer" },
    created_at: "2026-03-22T10:00:00Z",
  });

  assert.equal(formatted.title, "You liked a reply");
  assert.equal(formatted.summary, "Helpful answer");
  assert.deepEqual(formatted.quickAction, {
    label: "Unlike",
    method: "DELETE",
    path: "threads/thread-9/posts/post-1/like",
    successMessage: "Like removed.",
  });
});


test("formats a follow event with an unfollow quick action", () => {
  const formatted = formatActivityItem({
    id: "3",
    action: "user_followed",
    actor_id: "user-1",
    target_type: "user",
    target_id: "user-2",
    severity: "info",
    result: "success",
    request_id: null,
    ip: null,
    details: {},
    created_at: "2026-03-22T10:00:00Z",
  });

  assert.equal(formatted.title, "You followed someone");
  assert.deepEqual(formatted.quickAction, {
    label: "Unfollow",
    method: "DELETE",
    path: "users/user-2/follow",
    successMessage: "User unfollowed.",
  });
});


test("formats sign-in and share events without undo actions", () => {
  const signedIn = formatActivityItem({
    id: "4",
    action: "auth_login_success",
    actor_id: "user-1",
    target_type: "user",
    target_id: "user-1",
    severity: "info",
    result: "success",
    request_id: null,
    ip: null,
    details: {},
    created_at: "2026-03-22T10:00:00Z",
  });
  const shared = formatActivityItem({
    id: "5",
    action: "thread_shared",
    actor_id: "user-1",
    target_type: "thread",
    target_id: "thread-1",
    severity: "info",
    result: "success",
    request_id: null,
    ip: null,
    details: { title: "Shareable thread" },
    created_at: "2026-03-22T10:00:00Z",
  });

  assert.equal(signedIn.title, "You signed in");
  assert.equal(signedIn.quickAction, null);
  assert.equal(shared.title, "You copied a thread link");
  assert.equal(shared.summary, "Shareable thread");
  assert.equal(shared.quickAction, null);
});


test("formats created content entries with delete quick actions", () => {
  const createdThread = formatActivityItem({
    id: "6",
    action: "thread_created",
    actor_id: "user-1",
    target_type: "thread",
    target_id: "thread-2",
    severity: "info",
    result: "success",
    request_id: null,
    ip: null,
    details: { title: "Thread to remove" },
    created_at: "2026-03-22T10:00:00Z",
  });
  const createdReply = formatActivityItem({
    id: "7",
    action: "post_created",
    actor_id: "user-1",
    target_type: "post",
    target_id: "post-2",
    severity: "info",
    result: "success",
    request_id: null,
    ip: null,
    details: { thread_id: "thread-2" },
    created_at: "2026-03-22T10:00:00Z",
  });

  assert.deepEqual(createdThread.quickAction, {
    label: "Delete thread",
    method: "DELETE",
    path: "threads/thread-2",
    successMessage: "Thread deleted.",
  });
  assert.deepEqual(createdReply.quickAction, {
    label: "Delete reply",
    method: "DELETE",
    path: "posts/post-2",
    successMessage: "Reply deleted.",
  });
});
