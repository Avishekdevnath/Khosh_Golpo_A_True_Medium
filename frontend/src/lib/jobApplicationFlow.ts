import type { CustomQuestion, CustomQuestionInput, QuestionType } from "./jobsApi";

export interface QuestionDraft {
  id?: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options: string[];
}

export function isBlankAnswer(value: unknown) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function buildCustomAnswersPayload(customAnswers: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(customAnswers).flatMap(([key, value]) => {
      if (isBlankAnswer(value)) return [];
      if (typeof value === "string") return [[key, value.trim()]];
      return [[key, value]];
    }),
  );
}

export function validateCustomAnswersPayload(
  questions: CustomQuestion[],
  payload: Record<string, unknown>,
) {
  const nextErrors: Record<string, string> = {};

  for (const question of questions) {
    const value = payload[question.id];
    if (question.required && isBlankAnswer(value)) {
      nextErrors[question.id] = "This question is required.";
      continue;
    }
    if (value === undefined) continue;

    if (question.type === "url" && typeof value === "string") {
      try {
        new URL(value);
      } catch {
        nextErrors[question.id] = "Enter a valid URL.";
      }
    }
  }

  return nextErrors;
}

export function normalizeCustomQuestionsForSubmit(
  questions: QuestionDraft[],
  externalApplyUrl?: string,
): CustomQuestionInput[] {
  if (externalApplyUrl?.trim()) return [];

  const normalized = questions.map<CustomQuestionInput>((question) => ({
    ...(question.id ? { id: question.id } : {}),
    label: question.label.trim(),
    type: question.type,
    required: question.required,
    options: question.options.map((option) => option.trim()).filter((option) => option !== ""),
  }));

  const invalidQuestion = normalized.find((question) => {
    if (!question.label) return true;
    if (question.type === "single_select" || question.type === "multi_select") {
      return question.options.length < 2;
    }
    return false;
  });

  if (invalidQuestion) {
    if (!invalidQuestion.label) {
      throw new Error("Each screening question needs a prompt.");
    }
    throw new Error("Select-style screening questions need at least 2 options.");
  }

  return normalized;
}

export function formatScreeningAnswer(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined || value === "") return "Not provided";
  return String(value);
}
