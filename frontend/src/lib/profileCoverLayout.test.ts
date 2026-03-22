import assert from "node:assert/strict";
import test from "node:test";

import {
  getManageProfileCoverLayout,
  getPublicProfileCoverLayout,
} from "./profileCoverLayout";


test("public profile cover layout keeps a strict 4:1 frame with linked-in style overlap", () => {
  const layout = getPublicProfileCoverLayout();

  assert.match(layout.frameClassName, /aspect-\[4\/1\]/);
  assert.match(layout.frameClassName, /w-full/);
  assert.match(layout.frameClassName, /md:w-\[70%\]/);
  assert.match(layout.frameClassName, /md:mx-auto/);
  assert.match(layout.avatarOverlapClassName, /-mt-/);
  assert.match(layout.imageClassName, /object-contain/);
});


test("manage profile preview cover layout also keeps the strict 4:1 frame", () => {
  const layout = getManageProfileCoverLayout();

  assert.match(layout.frameClassName, /aspect-\[4\/1\]/);
  assert.match(layout.frameClassName, /w-full/);
  assert.match(layout.frameClassName, /md:w-\[70%\]/);
  assert.match(layout.frameClassName, /md:mx-auto/);
  assert.match(layout.avatarOverlapClassName, /-mt-/);
  assert.match(layout.imageClassName, /object-contain/);
});
