"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useMyApplications } from "@/hooks/useJobs";
import ApplicationStatusBadge from "@/components/jobs/ApplicationStatusBadge";
import type { MyApplicationOut } from "@/lib/jobsApi";
import { TERMINAL_STAGES } from "@/lib/jobsApi";

function ApplicationRow({ app }: { app: MyApplicationOut }) {
  const daysAgo = Math.floor(
    (Date.now() - new Date(app.created_at).getTime()) / 86400000
  );

  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-border hover:bg-foreground/[0.02] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-foreground truncate">{app.job_title}</div>
        <div className="text-[12px] text-muted-foreground mt-0.5">{app.company_name} · {daysAgo}d ago</div>
      </div>
      <ApplicationStatusBadge stage={app.stage} />
    </div>
  );
}

export default function ApplicationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user === null) router.replace("/login?next=/jobs/applications");
  }, [user, router]);

  const { applications, isLoading } = useMyApplications();
  const apps = applications ?? [];

  const activeApps = apps.filter((a) => !TERMINAL_STAGES.includes(a.stage));
  const completedApps = apps.filter((a) => TERMINAL_STAGES.includes(a.stage));

  if (!user) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-[13px] text-muted-foreground">Loading...</div>
      ) : apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3 mt-16">
          <FileText size={32} strokeWidth={1.2} />
          <p className="text-[13px]">No applications yet</p>
          <button
            type="button"
            onClick={() => router.push("/jobs")}
            className="text-[12px] text-[#0EA5E9] border-0 bg-transparent cursor-pointer hover:underline"
          >
            Browse Jobs
          </button>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto py-6">
          {activeApps.length > 0 && (
            <div className="mb-8">
              <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-5 mb-2">
                Active ({activeApps.length})
              </h2>
              {activeApps.map((app) => <ApplicationRow key={app.id} app={app} />)}
            </div>
          )}
          {completedApps.length > 0 && (
            <div>
              <h2 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider px-5 mb-2">
                Completed ({completedApps.length})
              </h2>
              {completedApps.map((app) => <ApplicationRow key={app.id} app={app} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
