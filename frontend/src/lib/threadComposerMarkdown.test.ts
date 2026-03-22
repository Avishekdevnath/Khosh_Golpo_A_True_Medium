import assert from "node:assert/strict";
import test from "node:test";

import { createPrefixedBlockMutation } from "./threadComposerMarkdown";

test("quote insertion moves a mid-paragraph selection into its own markdown block", () => {
  const value = "Now we write cause later";
  const start = value.indexOf("cause");
  const end = start + "cause".length;

  const mutation = createPrefixedBlockMutation({
    value,
    start,
    end,
    selected: value.slice(start, end),
    prefix: "> ",
    placeholder: "Quoted insight",
  });

  assert.equal(mutation.nextValue, "Now we write\n\n> cause\n\nlater");
});

test("quote insertion at the end of a paragraph adds a standalone quoted block", () => {
  const value = "First paragraph";

  const mutation = createPrefixedBlockMutation({
    value,
    start: value.length,
    end: value.length,
    selected: "",
    prefix: "> ",
    placeholder: "Quoted insight",
  });

  assert.equal(mutation.nextValue, "First paragraph\n\n> Quoted insight");
});
