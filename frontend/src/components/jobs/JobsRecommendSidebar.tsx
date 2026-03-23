"use client";

import { useRouter } from "next/navigation";
import { Sparkles, TrendingUp, Briefcase, MapPin } from "lucide-react";
import { useJobs } from "@/hooks/useJobs";
import { useMyApplications } from "@/hooks/useJobs";
import { useAuthStore } from "@/store/authStore";

const TRENDING_TAGS = ["React", "Next.js", "Python", "AI/ML", "DevOps", "TypeScript", "Figma", "FastAPI"];

function MiniJobCard({ job, onClick }: { job: any; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex gap-3 px-3 py-3 rounded-xl hover:bg-secondary transition-colors group border-0 bg-transparent cursor-pointer"
    >
      <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0 text-[11px] font-bold text-muted-foreground uppercase group-hover:border-primary/20 transition-colors">
        {job.company_logo_url
          ? <img src={job.company_logo_url} alt="" className="w-full h-full rounded-lg object-cover" />
          : job.company_name?.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {job.title}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">{job.company_name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {job.location && (
            <span className="flex items-center gap-0.5 text-[10.5px] text-muted-foreground/70">
              <MapPin size={9} />{job.location}
            </span>
          )}
          {job.is_remote && (
            <span className="text-[10px] font-medium text-emerald-500">· Remote</span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function JobsRecommendSidebar() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { applications } = useMyApplications();

  // Remote jobs as "recommended" — simple heuristic
  const { jobs: remoteJobs } = useJobs({ is_remote: true, page_size: 4 });
  // Latest full-time jobs
  const { jobs: latestJobs } = useJobs({ job_type: "full_time", page_size: 4 });

  const appliedJobIds = new Set(applications.map((a) => a.job_id));

  return (
    <aside className="hidden min-[1280px]:flex flex-col w-[280px] shrink-0 gap-4 py-4 pr-2 overflow-y-auto">

      {/* Recommended for you */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Sparkles size={14} className="text-primary" />
          <span className="text-[12.5px] font-semibold text-foreground">Recommended</span>
        </div>
        <div className="py-1">
          {remoteJobs.slice(0, 4).map((job) => (
            <MiniJobCard
              key={job.id}
              job={job}
              onClick={() => router.push(`/jobs/${job.slug}`)}
            />
          ))}
          {remoteJobs.length === 0 && (
            <p className="text-[12px] text-muted-foreground px-4 py-3">No recommendations yet</p>
          )}
        </div>
      </div>

      {/* Trending searches */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <TrendingUp size={14} className="text-primary" />
          <span className="text-[12.5px] font-semibold text-foreground">Trending Skills</span>
        </div>
        <div className="flex flex-wrap gap-2 px-4 py-3">
          {TRENDING_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => router.push(`/jobs?tag=${encodeURIComponent(tag.toLowerCase())}`)}
              className="h-7 px-2.5 rounded-full text-[11.5px] font-medium border border-border bg-secondary text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Latest full-time */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Briefcase size={14} className="text-primary" />
          <span className="text-[12.5px] font-semibold text-foreground">Latest Full-time</span>
        </div>
        <div className="py-1">
          {latestJobs.slice(0, 4).map((job) => (
            <MiniJobCard
              key={job.id}
              job={job}
              onClick={() => router.push(`/jobs/${job.slug}`)}
            />
          ))}
        </div>
      </div>

      {/* Applied count */}
      {user && applications.length > 0 && (
        <div
          className="rounded-2xl border border-border bg-card px-4 py-4 flex flex-col gap-1 cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => router.push("/jobs/applications")}
        >
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Your Applications</p>
          <p className="text-[24px] font-bold text-foreground">{applications.length}</p>
          <p className="text-[12px] text-primary hover:underline">View all →</p>
        </div>
      )}
    </aside>
  );
}
