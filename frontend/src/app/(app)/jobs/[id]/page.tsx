"use client";

import { use } from "react";
import { useJob } from "@/hooks/useJobs";
import JobDetailPanel from "@/components/jobs/JobDetailPanel";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { job, isLoading, mutate } = useJob(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-5 h-5 border-2 border-[#0EA5E9] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-40 text-[#8b95a1]">
        <p>Job not found.</p>
        <Link href="/jobs" className="text-[#0EA5E9] hover:underline text-[13px]">
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-4">
      <Link
        href="/jobs"
        className="flex items-center gap-1.5 text-[13px] text-[#8b95a1] hover:text-white mb-4 px-4 transition-colors"
      >
        <ArrowLeft size={14} /> Back to Jobs
      </Link>
      <JobDetailPanel job={job} onApplied={() => mutate()} />
    </div>
  );
}
