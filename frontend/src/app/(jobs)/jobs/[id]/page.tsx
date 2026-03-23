"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useJob } from "@/hooks/useJobs";
import JobDetailPanel from "@/components/jobs/JobDetailPanel";

export default function JobCanonicalPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const { job, isLoading } = useJob(jobId);

  // On client desktop, redirect to Browse view with job selected
  useEffect(() => {
    if (jobId && typeof window !== "undefined" && window.innerWidth >= 860) {
      const timer = setTimeout(() => {
        router.replace(`/jobs?job=${jobId}`);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [jobId, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-[13px] text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center h-full text-[13px] text-muted-foreground">
        Job not found
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <JobDetailPanel job={job} />
    </div>
  );
}
