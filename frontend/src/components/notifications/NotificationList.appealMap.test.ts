import type { NotificationListHandlers } from "@/components/notifications/NotificationList";

type AppealMapValue = NotificationListHandlers["appealMap"][string];
type SupportsMissingEntries = undefined extends AppealMapValue ? true : false;

const appealMapSupportsIdleFallback: SupportsMissingEntries = true;

void appealMapSupportsIdleFallback;
