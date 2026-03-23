"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useJob } from "@/hooks/useJobs";
import JobDetailPanel from "@/components/jobs/JobDetailPanel";
import JobsFilterRail from "@/components/jobs/JobsFilterRail";
import PageLoader from "@/components/shared/PageLoader";

export default function JobDetailPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { job, isLoading } = useJob(slug as string);
  const [col1Expanded, setCol1Expanded] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-3 text-muted-foreground">
        <p className="text-[13px]">Job not found or has been removed.</p>
        <Link href="/jobs" className="text-[12px] text-[#0EA5E9] hover:underline">
          Browse all jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <JobsFilterRail
        expanded={col1Expanded}
        onToggle={() => setCol1Expanded((v) => !v)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile back button — hidden on desktop */}
        <div className="max-[1023px]:flex hidden items-center gap-2 px-3 h-11 border-b border-border shrink-0 bg-background">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={15} />
            Back
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <JobDetailPanel job={job} />
        </div>
      </div>
    </div>
  );
}
