"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { applyToJob } from "@/lib/jobsApi";
import type { JobPostOut } from "@/lib/jobsApi";

interface Props {
  job: JobPostOut;
  onClose: () => void;
  onApplied: () => void;
}

export default function JobApplyModal({ job, onClose, onApplied }: Props) {
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await applyToJob(job.id, {
        cover_letter: coverLetter || undefined,
        resume_url: resumeUrl || undefined,
      });
      onApplied();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Failed to apply";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#10131d] border border-[#1e2235] rounded-xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2235]">
          <div>
            <h2 className="text-[16px] font-semibold text-white">Apply to {job.company_name}</h2>
            <p className="text-[13px] text-[#8b95a1] mt-0.5">{job.title}</p>
          </div>
          <button onClick={onClose} className="text-[#8b95a1] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[#c5ccd6]">
              Cover Letter <span className="text-[#8b95a1] font-normal">(optional)</span>
            </label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="Tell them why you're a great fit..."
              className="w-full px-3 py-2 bg-[#151927] border border-[#1e2235] rounded-lg text-[13px] text-white placeholder-[#8b95a1] focus:outline-none focus:border-[#0EA5E9]/50 resize-none"
            />
            <p className="text-[11px] text-[#8b95a1] text-right">{coverLetter.length}/2000</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[#c5ccd6]">
              Resume URL <span className="text-[#8b95a1] font-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={resumeUrl}
              onChange={(e) => setResumeUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full px-3 py-2 bg-[#151927] border border-[#1e2235] rounded-lg text-[13px] text-white placeholder-[#8b95a1] focus:outline-none focus:border-[#0EA5E9]/50"
            />
          </div>

          {error && (
            <p className="text-[13px] text-[#f06b6b] bg-[#f06b6b]/10 border border-[#f06b6b]/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[13px] text-[#8b95a1] hover:text-white border border-[#1e2235] rounded-lg transition-colors"
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
