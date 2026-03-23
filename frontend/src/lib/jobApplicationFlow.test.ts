import assert from "node:assert/strict";
import test from "node:test";

import type { CustomQuestion } from "./jobsApi";
import {
  buildCustomAnswersPayload,
  formatScreeningAnswer,
  normalizeCustomQuestionsForSubmit,
  validateCustomAnswersPayload,
} from "./jobApplicationFlow";

const screeningQuestions: CustomQuestion[] = [
  {
    id: "portfolio",
    label: "Portfolio URL",
    type: "url",
    required: true,
    options: [],
  },
  {
    id: "work-mode",
    label: "Preferred work mode",
    type: "single_select",
    required: false,
    options: ["Remote", "Hybrid"],
  },
];

test("buildCustomAnswersPayload trims strings and drops blank values", () => {
  assert.deepEqual(
    buildCustomAnswersPayload({
      portfolio: " https://example.com/me ",
      notes: "   ",
      remote: true,
      stack: ["React", "TypeScript"],
      empty: [],
      nullable: null,
    }),
    {
      portfolio: "https://example.com/me",
      remote: true,
      stack: ["React", "TypeScript"],
    },
  );
});

test("validateCustomAnswersPayload reports missing required answers and invalid urls", () => {
  assert.deepEqual(
    validateCustomAnswersPayload(screeningQuestions, { "work-mode": "Remote" }),
    { portfolio: "This question is required." },
  );

  assert.deepEqual(
    validateCustomAnswersPayload(screeningQuestions, {
      portfolio: "not-a-url",
      "work-mode": "Remote",
    }),
    { portfolio: "Enter a valid URL." },
  );
});

test("normalizeCustomQuestionsForSubmit trims labels and options", () => {
  assert.deepEqual(
    normalizeCustomQuestionsForSubmit([
      {
        label: "  Years of React experience  ",
        type: "short_text",
        required: true,
        options: [],
      },
      {
        id: "q2",
        label: " Preferred setup ",
        type: "single_select",
        required: false,
        options: [" Remote ", " ", "Hybrid"],
      },
    ]),
    [
      {
        label: "Years of React experience",
        type: "short_text",
        required: true,
        options: [],
      },
      {
        id: "q2",
        label: "Preferred setup",
        type: "single_select",
        required: false,
        options: ["Remote", "Hybrid"],
      },
    ],
  );
});

test("normalizeCustomQuestionsForSubmit disables questions for external apply jobs", () => {
  assert.deepEqual(
    normalizeCustomQuestionsForSubmit(
      [
        {
          label: "Ignored",
          type: "short_text",
          required: false,
          options: [],
        },
      ],
      "https://careers.example.com/apply",
    ),
    [],
  );
});

test("normalizeCustomQuestionsForSubmit rejects invalid question drafts", () => {
  assert.throws(
    () =>
      normalizeCustomQuestionsForSubmit([
        {
          label: "  ",
          type: "short_text",
          required: false,
          options: [],
        },
      ]),
    /Each screening question needs a prompt/,
  );

  assert.throws(
    () =>
      normalizeCustomQuestionsForSubmit([
        {
          label: "Work mode",
          type: "single_select",
          required: false,
          options: ["Remote"],
        },
      ]),
    /at least 2 options/,
  );
});

test("formatScreeningAnswer presents booleans and arrays cleanly", () => {
  assert.equal(formatScreeningAnswer(true), "Yes");
  assert.equal(formatScreeningAnswer(["React", "TypeScript"]), "React, TypeScript");
  assert.equal(formatScreeningAnswer(""), "Not provided");
});
