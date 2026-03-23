"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useJob } from "@/hooks/useJobs";
import JobDetailPanel from "@/components/jobs/JobDetailPanel";

export default function JobCanonicalPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { job, isLoading } = useJob(slug);

  // Desktop: redirect to Browse view with job selected (uses slug)
  useEffect(() => {
    if (slug && typeof window !== "undefined" && window.innerWidth >= 860) {
      const timer = setTimeout(() => {
        router.replace(`/jobs?job=${slug}`);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [slug, router]);

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
    <div className="flex flex-col h-full overflow-hidden">
      <div className="min-[860px]:hidden flex items-center gap-2 px-3 h-11 border-b border-border shrink-0 bg-background">
        <button
          type="button"
          onClick={() => router.push("/jobs")}
          className="flex items-center gap-1.5 border-0 bg-transparent text-muted-foreground hover:text-foreground cursor-pointer text-[13px] font-medium transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Back
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <JobDetailPanel job={job} />
      </div>
    </div>
  );
}
