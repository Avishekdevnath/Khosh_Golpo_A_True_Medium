"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { reportJob } from "@/lib/jobsApi";
import type { JobPostOut, ReportReason } from "@/lib/jobsApi";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "fake_job", label: "Fake job posting" },
  { value: "misleading", label: "Misleading information" },
  { value: "spam", label: "Spam" },
  { value: "scam", label: "Potential scam" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Other" },
];

interface Props {
  job: JobPostOut;
  onClose: () => void;
  onReported: () => void;
}

export default function JobReportModal({ job, onClose, onReported }: Props) {
  const [reason, setReason] = useState<ReportReason>("fake_job");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await reportJob(job.id, reason, details || undefined);
      onReported();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Failed to submit report";
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
      <div className="bg-[#10131d] border border-[#1e2235] rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2235]">
          <h2 className="text-[15px] font-semibold text-white">Report Job Posting</h2>
          <button onClick={onClose} className="text-[#8b95a1] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          <p className="text-[13px] text-[#8b95a1]">
            Reporting: <span className="text-white">{job.title}</span> at {job.company_name}
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[#c5ccd6]">Reason</label>
            <div className="flex flex-col gap-1">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-[#151927] transition-colors"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-[#0EA5E9]"
                  />
                  <span className="text-[13px] text-[#c5ccd6]">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-[#c5ccd6]">
              Details <span className="text-[#8b95a1] font-normal">(optional)</span>
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Any additional context..."
              className="w-full px-3 py-2 bg-[#151927] border border-[#1e2235] rounded-lg text-[13px] text-white placeholder-[#8b95a1] focus:outline-none focus:border-[#0EA5E9]/50 resize-none"
            />
          </div>

          {error && (
            <p className="text-[13px] text-[#f06b6b] bg-[#f06b6b]/10 border border-[#f06b6b]/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-end">
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
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium bg-[#f06b6b]/90 text-white rounded-lg hover:bg-[#f06b6b] disabled:opacity-60 transition-colors"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
