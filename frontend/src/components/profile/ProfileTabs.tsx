import { getProfileTabs, type ProfileTabKey } from "@/lib/profileViewModel";

type ProfileTabsProps = {
  activeTab: ProfileTabKey;
  onTabChange: (tab: ProfileTabKey) => void;
  isOwnProfile: boolean;
};

const LABELS: Record<ProfileTabKey, string> = {
  overview: "Overview",
  threads: "Threads",
  replies: "Replies",
  saved: "Saved",
};

export default function ProfileTabs({ activeTab, onTabChange, isOwnProfile }: ProfileTabsProps) {
  const visibleTabs = getProfileTabs(isOwnProfile);

  return (
    <div role="tablist" className="flex items-center gap-8 border-b border-border/50 px-7 max-sm:px-4 bg-background/40">
      {visibleTabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          onClick={() => onTabChange(tab)}
          className={[
            "border-b-2 py-4 text-[14px] font-medium transition-all cursor-pointer",
            activeTab === tab
              ? "border-b-primary text-foreground"
              : "border-b-transparent text-foreground/60 hover:text-foreground/80",
          ].join(" ")}
        >
          {LABELS[tab]}
        </button>
      ))}
    </div>
  );
}
