// frontend/src/components/profile/ProfileTabs.tsx
import type { ProfileTab } from "./useUserProfile";

interface ProfileTabsProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  isOwnProfile: boolean;
}

const TABS: Array<{ key: ProfileTab; label: string; ownOnly: boolean }> = [
  { key: "threads", label: "Threads", ownOnly: false },
  { key: "replies", label: "Replies", ownOnly: false },
  { key: "saved",   label: "Saved",   ownOnly: true  },
  { key: "history", label: "History", ownOnly: true  },
];

export default function ProfileTabs({ activeTab, onTabChange, isOwnProfile }: ProfileTabsProps) {
  const visibleTabs = TABS.filter(t => !t.ownOnly || isOwnProfile);

  return (
    <div className="flex items-center border-b border-border px-7 max-sm:px-3.5">
      {visibleTabs.map(tab => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onTabChange(tab.key)}
          className={[
            "mr-6 py-[14px] text-[14px] border-b-2 transition-colors duration-150 whitespace-nowrap font-sans",
            activeTab === tab.key
              ? "border-b-foreground text-foreground font-medium"
              : "border-b-transparent text-text-secondary hover:text-foreground font-normal",
          ].join(" ")}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
