export type ActivityLike = {
  id: string;
  action: string;
  actor_id: string | null;
  target_type: string;
  target_id: string | null;
  severity: "info" | "warning" | "critical";
  result: "success" | "failed";
  request_id: string | null;
  ip: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export type ActivityQuickAction = {
  label: string;
  method: "POST" | "DELETE";
  path: string;
  successMessage: string;
};

export type FormattedActivityItem = {
  title: string;
  summary: string | null;
  quickAction: ActivityQuickAction | null;
};


function stringDetail(details: Record<string, unknown>, key: string): string | null {
  const value = details[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}


export function formatActivityItem(item: ActivityLike): FormattedActivityItem {
  const summary =
    stringDetail(item.details, "title")
    ?? stringDetail(item.details, "content_preview")
    ?? stringDetail(item.details, "identifier");

  if (item.action === "auth_login_success") {
    return { title: "You signed in", summary: null, quickAction: null };
  }
  if (item.action === "user_logout") {
    return { title: "You signed out", summary: null, quickAction: null };
  }
  if (item.action === "thread_created") {
    return {
      title: "You created a thread",
      summary,
      quickAction: item.target_id
        ? {
            label: "Delete thread",
            method: "DELETE",
            path: `threads/${item.target_id}`,
            successMessage: "Thread deleted.",
          }
        : null,
    };
  }
  if (item.action === "post_created") {
    return {
      title: "You replied to a thread",
      summary,
      quickAction: item.target_id
        ? {
            label: "Delete reply",
            method: "DELETE",
            path: `posts/${item.target_id}`,
            successMessage: "Reply deleted.",
          }
        : null,
    };
  }
  if (item.action === "thread_liked" && item.target_id) {
    return {
      title: "You liked a thread",
      summary,
      quickAction: {
        label: "Unlike",
        method: "DELETE",
        path: `threads/${item.target_id}/like`,
        successMessage: "Like removed.",
      },
    };
  }
  if (item.action === "post_liked" && item.target_id) {
    const threadId = stringDetail(item.details, "thread_id");
    return {
      title: "You liked a reply",
      summary,
      quickAction: threadId
        ? {
            label: "Unlike",
            method: "DELETE",
            path: `threads/${threadId}/posts/${item.target_id}/like`,
            successMessage: "Like removed.",
          }
        : null,
    };
  }
  if (item.action === "thread_saved" && item.target_id) {
    return {
      title: "You saved a thread",
      summary,
      quickAction: {
        label: "Unsave",
        method: "DELETE",
        path: `threads/${item.target_id}/save`,
        successMessage: "Removed from saved threads.",
      },
    };
  }
  if (item.action === "user_followed" && item.target_id) {
    return {
      title: "You followed someone",
      summary,
      quickAction: {
        label: "Unfollow",
        method: "DELETE",
        path: `users/${item.target_id}/follow`,
        successMessage: "User unfollowed.",
      },
    };
  }
  if (item.action === "thread_shared") {
    return { title: "You copied a thread link", summary, quickAction: null };
  }

  return {
    title: item.action.replaceAll("_", " "),
    summary,
    quickAction: null,
  };
}
