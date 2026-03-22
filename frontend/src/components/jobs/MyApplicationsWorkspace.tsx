"use client";

import { useState } from "react";
import { Briefcase, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { useMyApplications } from "@/hooks/useJobs";
import { withdrawApplication } from "@/lib/jobsApi";
import type { MyApplicationOut } from "@/lib/jobsApi";
import ApplicationStatusBadge from "./ApplicationStatusBadge";

export default function MyApplicationsWorkspace() {
  const { applications, isLoading, error, mutate } = useMyApplications();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  async function handleWithdraw(app: MyApplicationOut) {
    if (!confirm("Withdraw your application?")) return;
    setWithdrawing(app.id);
    try {
      await withdrawApplication(app.job_id, app.id);
      mutate();
    } finally {
      setWithdrawing(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-5 h-5 border-2 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-[#f06b6b] p-4 text-[13px]">
        <AlertCircle size={15} /> Failed to load applications
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-48 text-[#8b95a1]">
        <Briefcase size={32} strokeWidth={1.5} />
        <p className="text-[14px]">No applications yet</p>
        <a href="/jobs" className="text-[13px] text-[#0EA5E9] hover:underline">
          Browse jobs
        </a>
      </div>
    );
  }

  const active = applications.filter((a) => !["hired", "rejected", "withdrawn"].includes(a.stage));
  const terminal = applications.filter((a) => ["hired", "rejected", "withdrawn"].includes(a.stage));

  function AppRow({ app }: { app: MyApplicationOut }) {
    const isOpen = expanded === app.id;
    const canWithdraw = !["hired", "rejected", "withdrawn"].includes(app.stage);

    return (
      <div className="border border-[#1e2235] rounded-lg overflow-hidden">
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#151927] transition-colors"
          onClick={() => setExpanded(isOpen ? null : app.id)}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-white truncate">{app.job_title}</p>
            <p className="text-[12px] text-[#8b95a1] truncate">{app.company_name}</p>
          </div>
          <ApplicationStatusBadge stage={app.stage} />
          {isOpen ? <ChevronUp size={14} className="text-[#8b95a1]" /> : <ChevronDown size={14} className="text-[#8b95a1]" />}
        </div>

        {isOpen && (
          <div className="px-4 pb-4 border-t border-[#1e2235] bg-[#10131d] flex flex-col gap-3">
            {/* Timeline */}
            <div className="pt-3">
              <p className="text-[12px] font-medium text-[#c5ccd6] mb-2">Stage History</p>
              <div className="flex flex-col gap-1.5">
                {app.stage_history.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px] text-[#8b95a1]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9] flex-shrink-0" />
                    <ApplicationStatusBadge stage={entry.stage} className="scale-90" />
                    <span className="text-[11px]">
                      {new Date(entry.changed_at).toLocaleDateString()}
                    </span>
                    {entry.note && <span className="text-[#c5ccd6]">— {entry.note}</span>}
                  </div>
                ))}
              </div>
            </div>

            {app.employer_note && (
              <div className="bg-[#151927] border border-[#1e2235] rounded-lg p-3">
                <p className="text-[11px] text-[#8b95a1] mb-1">Note from employer</p>
                <p className="text-[13px] text-[#c5ccd6]">{app.employer_note}</p>
              </div>
            )}

            {canWithdraw && (
              <button
                onClick={() => handleWithdraw(app)}
                disabled={withdrawing === app.id}
                className="self-start text-[12px] text-[#f06b6b] hover:text-[#f06b6b]/80 border border-[#f06b6b]/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {withdrawing === app.id ? "Withdrawing..." : "Withdraw Application"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto w-full">
      <h2 className="text-[18px] font-bold text-white">My Applications</h2>

      {active.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[12px] font-medium text-[#8b95a1] uppercase tracking-wide">Active</h3>
          {active.map((a) => <AppRow key={a.id} app={a} />)}
        </section>
      )}

      {terminal.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-[12px] font-medium text-[#8b95a1] uppercase tracking-wide">Completed</h3>
          {terminal.map((a) => <AppRow key={a.id} app={a} />)}
        </section>
      )}
    </div>
  );
}
