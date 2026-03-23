"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { applyToJob } from "@/lib/jobsApi";
import type { JobPostOut } from "@/lib/jobsApi";
import {
  buildCustomAnswersPayload,
  validateCustomAnswersPayload,
} from "@/lib/jobApplicationFlow";

interface Props {
  job: JobPostOut;
  onClose: () => void;
  onApplied: () => void;
}

export default function JobApplyModal({ job, onClose, onApplied }: Props) {
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [customAnswers, setCustomAnswers] = useState<Record<string, unknown>>({});
  const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setAnswer(questionId: string, value: unknown) {
    setCustomAnswers((current) => ({ ...current, [questionId]: value }));
    setQuestionErrors((current) => {
      if (!current[questionId]) return current;
      const next = { ...current };
      delete next[questionId];
      return next;
    });
  }

  function toggleMultiSelect(questionId: string, option: string) {
    const current = Array.isArray(customAnswers[questionId]) ? (customAnswers[questionId] as string[]) : [];
    const next = current.includes(option)
      ? current.filter((item) => item !== option)
      : [...current, option];
    setAnswer(questionId, next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const answersPayload = buildCustomAnswersPayload(customAnswers);
    const nextErrors = validateCustomAnswersPayload(job.custom_questions, answersPayload);
    setQuestionErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setLoading(false);
      return;
    }

    try {
      await applyToJob(job.id, {
        cover_letter: coverLetter || undefined,
        resume_url: resumeUrl || undefined,
        custom_answers: Object.keys(answersPayload).length > 0 ? answersPayload : undefined,
      });
      onApplied();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Failed to apply";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0EA5E9]/50";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-[16px] font-semibold text-foreground">Apply to {job.company_name}</h2>
            <p className="text-[13px] text-muted-foreground mt-0.5">{job.title}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 overflow-y-auto max-h-[calc(90vh-72px)]">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground/80">
              Cover Letter <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="Tell them why you're a great fit..."
              className={`${inputClass} resize-none`}
            />
            <p className="text-[11px] text-muted-foreground text-right">{coverLetter.length}/2000</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground/80">
              Resume URL <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={resumeUrl}
              onChange={(e) => setResumeUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className={inputClass}
            />
          </div>

          {job.custom_questions.length > 0 && (
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/50 p-4">
              <div>
                <h3 className="text-[13px] font-semibold text-foreground">Screening Questions</h3>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Answer the additional questions required by the employer.
                </p>
              </div>

              {job.custom_questions.map((question) => {
                const answer = customAnswers[question.id];
                return (
                  <div key={question.id} className="flex flex-col gap-2">
                    <label className="text-[13px] font-medium text-foreground/80">
                      {question.label}
                      {question.required && <span className="text-[#f06b6b]"> *</span>}
                    </label>

                    {question.type === "short_text" && (
                      <input
                        type="text"
                        value={typeof answer === "string" ? answer : ""}
                        onChange={(e) => setAnswer(question.id, e.target.value)}
                        maxLength={500}
                        className={inputClass}
                      />
                    )}

                    {question.type === "url" && (
                      <input
                        type="url"
                        value={typeof answer === "string" ? answer : ""}
                        onChange={(e) => setAnswer(question.id, e.target.value)}
                        placeholder="https://..."
                        className={inputClass}
                      />
                    )}

                    {question.type === "yes_no" && (
                      <div className="flex gap-2">
                        <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground">
                          <input
                            type="radio"
                            name={question.id}
                            checked={answer === true}
                            onChange={() => setAnswer(question.id, true)}
                            className="accent-[#0EA5E9]"
                          />
                          Yes
                        </label>
                        <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground">
                          <input
                            type="radio"
                            name={question.id}
                            checked={answer === false}
                            onChange={() => setAnswer(question.id, false)}
                            className="accent-[#0EA5E9]"
                          />
                          No
                        </label>
                      </div>
                    )}

                    {question.type === "single_select" && (
                      <select
                        value={typeof answer === "string" ? answer : ""}
                        onChange={(e) => setAnswer(question.id, e.target.value)}
                        className={`${inputClass} appearance-none`}
                      >
                        <option value="">Select an option</option>
                        {question.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}

                    {question.type === "multi_select" && (
                      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
                        {question.options.map((option) => {
                          const selected = Array.isArray(answer) && answer.includes(option);
                          return (
                            <label key={option} className="flex items-center gap-2 text-[13px] text-foreground">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleMultiSelect(question.id, option)}
                                className="accent-[#0EA5E9]"
                              />
                              {option}
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {questionErrors[question.id] && (
                      <p className="text-[12px] text-[#f06b6b]">{questionErrors[question.id]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <p className="text-[13px] text-[#f06b6b] bg-[#f06b6b]/10 border border-[#f06b6b]/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[13px] text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium bg-[#0EA5E9] text-white rounded-lg hover:bg-[#0EA5E9]/90 disabled:opacity-60 transition-colors"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              Submit Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
