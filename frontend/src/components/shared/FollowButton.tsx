import { useFollow } from "@/hooks/useFollow";
import { UserPlus, UserCheck } from "lucide-react";

interface FollowButtonProps {
  userId: string;
  initialFollowing?: boolean;
  followsYou?: boolean;
  iconOnly?: boolean;
  onFollowChange?: (isFollowing: boolean, followersCount: number, followingCount: number) => void;
}

export default function FollowButton({
  userId,
  initialFollowing = false,
  followsYou = false,
  iconOnly = false,
  onFollowChange,
}: FollowButtonProps) {
  const { isFollowing, loading, error, follow, unfollow } = useFollow(userId, initialFollowing);

  const handleClick = async () => {
    if (isFollowing) {
      const stats = await unfollow();
      if (stats) onFollowChange?.(false, stats.followers_count, stats.following_count);
    } else {
      const stats = await follow();
      if (stats) onFollowChange?.(true, stats.followers_count, stats.following_count);
    }
  };

  const label = isFollowing ? "Following" : followsYou ? "Follow back" : "Follow";
  const Icon = isFollowing ? UserCheck : UserPlus;

  return (
    <button
      onClick={() => void handleClick()}
      disabled={loading}
      title={error || label}
      aria-label={label}
      className={[
        "inline-flex items-center justify-center gap-1.5 rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
        iconOnly
          ? "size-9 shrink-0 p-0"
          : "px-4 py-1.5 text-[13px] font-medium",
        isFollowing
          ? "border-border bg-card-hover text-foreground/60 hover:border-foreground hover:text-foreground"
          : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10",
      ].join(" ")}
    >
      <Icon size={iconOnly ? 15 : 13} />
      {!iconOnly && <span>{label}</span>}
    </button>
  );
}
