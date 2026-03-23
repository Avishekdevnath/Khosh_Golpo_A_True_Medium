"use client";

import { useState } from "react";
import { X, Loader2, Plus } from "lucide-react";
import { createJob, updateJob } from "@/lib/jobsApi";
import type { JobPostOut } from "@/lib/jobsApi";
import { useRouter } from "next/navigation";

interface Props {
  existing?: JobPostOut;
  onSuccess?: (job: JobPostOut) => void;
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
    required_skills: existing?.required_skills ?? [] as string[],
    tags: existing?.tags ?? [] as string[],
    application_deadline: existing?.application_deadline
      ? new Date(existing.application_deadline).toISOString().slice(0, 10)
      : "",
  });

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function addSkill() {
    const s = skillInput.trim();
    if (s && !form.required_skills.includes(s)) {
      set("required_skills", [...form.required_skills, s]);
    }
    setSkillInput("");
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) {
      set("tags", [...form.tags, t]);
    }
    setTagInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
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
      };

      let result: JobPostOut;
      if (existing) {
        result = await updateJob(existing.id, payload);
      } else {
        result = await createJob(payload);
      }

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

      {/* Basic info */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-foreground/80">Job Title *</label>
        <input
          required minLength={3} maxLength={120}
          value={form.title} onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Senior Frontend Engineer"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-foreground/80">Company Name *</label>
          <input
            required maxLength={120}
            value={form.company_name} onChange={(e) => set("company_name", e.target.value)}
            placeholder="Acme Corp"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-foreground/80">Company Logo URL</label>
          <input
            type="url"
            value={form.company_logo_url} onChange={(e) => set("company_logo_url", e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-foreground/80">Description *</label>
        <textarea
          required minLength={20} maxLength={10000} rows={8}
          value={form.description} onChange={(e) => set("description", e.target.value)}
          placeholder="Describe the role, responsibilities, and requirements..."
          className={`${inputClass} resize-none`}
        />
        <p className="text-[11px] text-muted-foreground text-right">{form.description.length}/10000</p>
      </div>

      {/* Location + remote */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-foreground/80">Location</label>
          <input
            value={form.location} onChange={(e) => set("location", e.target.value)}
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

      {/* Type + experience */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-foreground/80">Job Type</label>
          <select
            value={form.job_type}
            onChange={(e) => set("job_type", e.target.value)}
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
            onChange={(e) => set("experience_level", e.target.value)}
            className={`${inputClass} appearance-none`}
          >
            <option value="entry">Entry Level</option>
            <option value="mid">Mid-level</option>
            <option value="senior">Senior</option>
            <option value="lead">Lead</option>
          </select>
        </div>
      </div>

      {/* Salary */}
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
            type="number" min={0}
            value={form.salary_min} onChange={(e) => set("salary_min", e.target.value)}
            placeholder="Min"
            className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0EA5E9]/50"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="number" min={0}
            value={form.salary_max} onChange={(e) => set("salary_max", e.target.value)}
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

      {/* Skills */}
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
          {form.required_skills.map((s) => (
            <span key={s} className="flex items-center gap-1 px-2 py-0.5 bg-[#0EA5E9]/10 text-[#0EA5E9] border border-[#0EA5E9]/20 rounded text-[12px]">
              {s}
              <button type="button" onClick={() => set("required_skills", form.required_skills.filter((x) => x !== s))}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Tags */}
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
          {form.tags.map((t) => (
            <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-border text-muted-foreground rounded text-[12px]">
              #{t}
              <button type="button" onClick={() => set("tags", form.tags.filter((x) => x !== t))}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Deadline */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-foreground/80">Application Deadline</label>
        <input
          type="date"
          value={form.application_deadline}
          onChange={(e) => set("application_deadline", e.target.value)}
          className={inputClass}
        />
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
