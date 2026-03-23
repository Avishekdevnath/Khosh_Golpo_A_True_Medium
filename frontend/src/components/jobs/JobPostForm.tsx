"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createJob, updateJob } from "@/lib/jobsApi";
import type { JobPostOut, QuestionType } from "@/lib/jobsApi";
import {
  normalizeCustomQuestionsForSubmit,
  type QuestionDraft,
} from "@/lib/jobApplicationFlow";

interface Props {
  existing?: JobPostOut;
  onSuccess?: (job: JobPostOut) => void;
}

function createEmptyQuestion(): QuestionDraft {
  return {
    label: "",
    type: "short_text",
    required: false,
    options: [],
  };
}

export default function JobPostForm({ existing, onSuccess }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillInput, setSkillInput] = useState("");
  const [tagInput, setTagInput] = useState("");

  const [form, setForm] = useState({
    title: existing?.title ?? "",
    description: existing?.description ?? "",
    company_name: existing?.company_name ?? "",
    company_logo_url: existing?.company_logo_url ?? "",
    location: existing?.location ?? "",
    is_remote: existing?.is_remote ?? false,
    job_type: existing?.job_type ?? "full_time",
    experience_level: existing?.experience_level ?? "mid",
    salary_min: existing?.salary_min?.toString() ?? "",
    salary_max: existing?.salary_max?.toString() ?? "",
    salary_currency: existing?.salary_currency ?? "USD",
    salary_visible: existing?.salary_visible ?? true,
    required_skills: existing?.required_skills ?? ([] as string[]),
    tags: existing?.tags ?? ([] as string[]),
    application_deadline: existing?.application_deadline
      ? new Date(existing.application_deadline).toISOString().slice(0, 10)
      : "",
    external_apply_url: existing?.external_apply_url ?? "",
    custom_questions: (existing?.custom_questions ?? []).map<QuestionDraft>((question) => ({
      id: question.id,
      label: question.label,
      type: question.type,
      required: question.required,
      options: [...question.options],
    })),
  });

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: val }));
  }

  function addSkill() {
    const skill = skillInput.trim();
    if (skill && !form.required_skills.includes(skill)) {
      set("required_skills", [...form.required_skills, skill]);
    }
    setSkillInput("");
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      set("tags", [...form.tags, tag]);
    }
    setTagInput("");
  }

  function addQuestion() {
    if (form.custom_questions.length >= 10) return;
    set("custom_questions", [...form.custom_questions, createEmptyQuestion()]);
  }

  function updateQuestion<K extends keyof QuestionDraft>(index: number, field: K, value: QuestionDraft[K]) {
    const updated = [...form.custom_questions];
    const nextQuestion = { ...updated[index], [field]: value };

    if (field === "type" && (value === "short_text" || value === "url" || value === "yes_no")) {
      nextQuestion.options = [];
    }
    if (field === "type" && (value === "single_select" || value === "multi_select")) {
      nextQuestion.options = nextQuestion.options.length >= 2 ? nextQuestion.options : ["", ""];
    }

    updated[index] = nextQuestion;
    set("custom_questions", updated);
  }

  function removeQuestion(index: number) {
    set("custom_questions", form.custom_questions.filter((_, currentIndex) => currentIndex !== index));
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= form.custom_questions.length) return;
    const updated = [...form.custom_questions];
    [updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]];
    set("custom_questions", updated);
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    const updated = [...form.custom_questions];
    const options = [...updated[questionIndex].options];
    options[optionIndex] = value;
    updated[questionIndex] = { ...updated[questionIndex], options };
    set("custom_questions", updated);
  }

  function addOption(questionIndex: number) {
    const updated = [...form.custom_questions];
    updated[questionIndex] = {
      ...updated[questionIndex],
      options: [...updated[questionIndex].options, ""],
    };
    set("custom_questions", updated);
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    const updated = [...form.custom_questions];
    updated[questionIndex] = {
      ...updated[questionIndex],
      options: updated[questionIndex].options.filter((_, currentIndex) => currentIndex !== optionIndex),
    };
    set("custom_questions", updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let normalizedQuestions;
    try {
      normalizedQuestions = normalizeCustomQuestionsForSubmit(
        form.custom_questions,
        form.external_apply_url,
      );
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Invalid screening questions.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        title: form.title,
        description: form.description,
        company_name: form.company_name,
        company_logo_url: form.company_logo_url || undefined,
        location: form.location || undefined,
        is_remote: form.is_remote,
        job_type: form.job_type as JobPostOut["job_type"],
        experience_level: form.experience_level as JobPostOut["experience_level"],
        salary_min: form.salary_min ? Number(form.salary_min) : undefined,
        salary_max: form.salary_max ? Number(form.salary_max) : undefined,
        salary_currency: form.salary_currency,
        salary_visible: form.salary_visible,
        required_skills: form.required_skills,
        tags: form.tags,
        application_deadline: form.application_deadline
          ? new Date(form.application_deadline).toISOString()
          : undefined,
        external_apply_url: form.external_apply_url || undefined,
        custom_questions: form.external_apply_url
          ? []
          : normalizedQuestions.length > 0
          ? normalizedQuestions
          : undefined,
      };

      const result = existing
        ? await updateJob(existing.id, payload)
        : await createJob(payload);

      onSuccess?.(result);
      if (!onSuccess) router.push("/jobs/my");
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Failed to save job");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 bg-secondary border border-border rounded-lg text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0EA5E9]/50";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-2xl mx-auto p-5">
      <h1 className="text-[20px] font-bold text-foreground">
        {existing ? "Edit Job Post" : "Post a Job"}
      </h1>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-foreground/80">Job Title *</label>
        <input
          required
          minLength={3}
          maxLength={120}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Senior Frontend Engineer"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-foreground/80">Company Name *</label>
          <input
            required
            maxLength={120}
            value={form.company_name}
            onChange={(e) => set("company_name", e.target.value)}
            placeholder="Acme Corp"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-foreground/80">Company Logo URL</label>
          <input
            type="url"
            value={form.company_logo_url}
            onChange={(e) => set("company_logo_url", e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-foreground/80">Description *</label>
        <textarea
          required
          minLength={20}
          maxLength={10000}
          rows={8}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Describe the role, responsibilities, and requirements..."
          className={`${inputClass} resize-none`}
        />
        <p className="text-[11px] text-muted-foreground text-right">{form.description.length}/10000</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-foreground/80">Location</label>
          <input
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="New York, NY"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5 justify-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_remote}
              onChange={(e) => set("is_remote", e.target.checked)}
              className="accent-[#0EA5E9]"
            />
            <span className="text-[13px] text-foreground/80">Remote OK</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-foreground/80">Job Type</label>
          <select
            value={form.job_type}
            onChange={(e) => set("job_type", e.target.value as JobPostOut["job_type"])}
            className={`${inputClass} appearance-none`}
          >
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
            <option value="freelance">Freelance</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-foreground/80">Experience Level</label>
          <select
            value={form.experience_level}
            onChange={(e) => set("experience_level", e.target.value as JobPostOut["experience_level"])}
            className={`${inputClass} appearance-none`}
          >
            <option value="entry">Entry Level</option>
            <option value="mid">Mid-level</option>
            <option value="senior">Senior</option>
            <option value="lead">Lead</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-medium text-foreground/80">Salary Range</label>
        <div className="flex items-center gap-2">
          <select
            value={form.salary_currency}
            onChange={(e) => set("salary_currency", e.target.value)}
            className="w-20 px-2 py-2 bg-secondary border border-border rounded-lg text-[12px] text-foreground focus:outline-none appearance-none"
          >
            <option>USD</option>
            <option>EUR</option>
            <option>GBP</option>
            <option>BDT</option>
          </select>
          <input
            type="number"
            min={0}
            value={form.salary_min}
            onChange={(e) => set("salary_min", e.target.value)}
            placeholder="Min"
            className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0EA5E9]/50"
          />
          <span className="text-muted-foreground">-</span>
          <input
            type="number"
            min={0}
            value={form.salary_max}
            onChange={(e) => set("salary_max", e.target.value)}
            placeholder="Max"
            className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0EA5E9]/50"
          />
          <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={form.salary_visible}
              onChange={(e) => set("salary_visible", e.target.checked)}
              className="accent-[#0EA5E9]"
            />
            Show
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-foreground/80">Required Skills</label>
        <div className="flex gap-2">
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
            placeholder="e.g. React"
            className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0EA5E9]/50"
          />
          <button type="button" onClick={addSkill} className="px-3 py-2 bg-border hover:bg-[#0EA5E9]/20 text-[#0EA5E9] rounded-lg">
            <Plus size={14} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {form.required_skills.map((skill) => (
            <span key={skill} className="flex items-center gap-1 px-2 py-0.5 bg-[#0EA5E9]/10 text-[#0EA5E9] border border-[#0EA5E9]/20 rounded text-[12px]">
              {skill}
              <button type="button" onClick={() => set("required_skills", form.required_skills.filter((item) => item !== skill))}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-foreground/80">Tags</label>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            placeholder="e.g. startup"
            className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0EA5E9]/50"
          />
          <button type="button" onClick={addTag} className="px-3 py-2 bg-border hover:bg-[#0EA5E9]/20 text-[#0EA5E9] rounded-lg">
            <Plus size={14} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {form.tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-border text-muted-foreground rounded text-[12px]">
              #{tag}
              <button type="button" onClick={() => set("tags", form.tags.filter((item) => item !== tag))}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-foreground/80">Application Deadline</label>
        <input
          type="date"
          value={form.application_deadline}
          onChange={(e) => set("application_deadline", e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="border-t border-border pt-5">
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Application Settings</h3>

        <div className="mb-5">
          <label className="block text-[13px] text-foreground/80 mb-1">External Career Page URL</label>
          <input
            type="url"
            placeholder="https://careers.yourcompany.com/apply/..."
            value={form.external_apply_url}
            onChange={(e) => set("external_apply_url", e.target.value)}
            className={inputClass}
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            If set, candidates will be redirected here instead of using the built-in application form.
          </p>
        </div>

        <div className={form.external_apply_url ? "opacity-50 pointer-events-none" : ""}>
          <div className="flex items-center justify-between mb-3">
            <label className="text-[13px] text-foreground/80 font-medium">
              Screening Questions
              <span className="text-muted-foreground font-normal ml-1">({form.custom_questions.length}/10)</span>
            </label>
            <button
              type="button"
              onClick={addQuestion}
              disabled={form.custom_questions.length >= 10}
              className="text-[12px] text-[#0EA5E9] border-0 bg-transparent cursor-pointer hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Add Question
            </button>
          </div>

          {form.external_apply_url && (
            <p className="text-[12px] text-muted-foreground mb-3">
              Screening questions are disabled while an external application link is set.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {form.custom_questions.map((question, index) => (
              <div key={question.id ?? `${question.type}-${index}`} className="border border-border rounded-lg p-3 bg-card">
                <div className="flex items-start gap-2 mb-2">
                  <select
                    value={question.type}
                    onChange={(e) => updateQuestion(index, "type", e.target.value as QuestionType)}
                    className="h-8 bg-secondary border border-border rounded px-2 text-[12px] text-foreground shrink-0"
                  >
                    <option value="short_text">Short Text</option>
                    <option value="url">URL / Link</option>
                    <option value="yes_no">Yes / No</option>
                    <option value="single_select">Single Select</option>
                    <option value="multi_select">Multi Select</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Enter your question"
                    maxLength={200}
                    value={question.label}
                    onChange={(e) => updateQuestion(index, "label", e.target.value)}
                    className="flex-1 h-8 bg-secondary border border-border rounded px-2 text-[13px] text-foreground"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, -1)}
                      disabled={index === 0}
                      className="px-1 text-[11px] text-muted-foreground hover:text-foreground border-0 bg-transparent cursor-pointer disabled:opacity-30"
                      title="Move up"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, 1)}
                      disabled={index === form.custom_questions.length - 1}
                      className="px-1 text-[11px] text-muted-foreground hover:text-foreground border-0 bg-transparent cursor-pointer disabled:opacity-30"
                      title="Move down"
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="px-1 text-[11px] text-[#f06b6b] hover:text-[#f06b6b]/80 border-0 bg-transparent cursor-pointer"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={question.required}
                    onChange={(e) => updateQuestion(index, "required", e.target.checked)}
                    className="accent-[#0EA5E9]"
                  />
                  Required
                </label>

                {(question.type === "single_select" || question.type === "multi_select") && (
                  <div className="pl-2 border-l-2 border-border ml-1">
                    <p className="text-[11px] text-muted-foreground mb-1.5">Options (min 2)</p>
                    {question.options.map((option, optionIndex) => (
                      <div key={`${question.id ?? index}-${optionIndex}`} className="flex items-center gap-1.5 mb-1">
                        <input
                          type="text"
                          maxLength={50}
                          placeholder={`Option ${optionIndex + 1}`}
                          value={option}
                          onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                          className="flex-1 h-7 bg-secondary border border-border rounded px-2 text-[12px] text-foreground"
                        />
                        {question.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(index, optionIndex)}
                            className="text-[#f06b6b] text-[12px] border-0 bg-transparent cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addOption(index)}
                      className="text-[11px] text-[#0EA5E9] border-0 bg-transparent cursor-pointer hover:underline mt-1"
                    >
                      + Add Option
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-[13px] text-[#f06b6b] bg-[#f06b6b]/10 border border-[#f06b6b]/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 py-2.5 text-[14px] font-medium bg-[#0EA5E9] text-white rounded-lg hover:bg-[#0EA5E9]/90 disabled:opacity-60 transition-colors"
      >
        {loading && <Loader2 size={15} className="animate-spin" />}
        {existing ? "Save Changes" : "Post Job"}
      </button>

      {!existing && (
        <p className="text-[12px] text-muted-foreground text-center">
          Your post will be reviewed by an admin before going live.
        </p>
      )}
    </form>
  );
}
