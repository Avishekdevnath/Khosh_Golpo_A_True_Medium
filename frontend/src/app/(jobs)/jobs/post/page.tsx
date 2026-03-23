"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useJob } from "@/hooks/useJobs";
import JobPostForm from "@/components/jobs/JobPostForm";

export default function PostJobPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  useEffect(() => {
    if (user === null) router.replace("/login?next=/jobs/post");
  }, [user, router]);

  const { job: existingJob, isLoading } = useJob(editId);

  if (!user) return null;

  if (editId && isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-[13px] text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto py-8 px-6">
        <JobPostForm
          existing={editId ? existingJob ?? undefined : undefined}
          onSuccess={() => router.push("/jobs/my")}
        />
      </div>
    </div>
  );
}
