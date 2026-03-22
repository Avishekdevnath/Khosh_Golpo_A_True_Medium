export type ShareThreadInput = {
  url: string;
  title?: string;
  text?: string;
};

export type ShareThreadResult = {
  kind: "shared" | "copied" | "cancelled" | "error";
  message: string;
};


function isShareCancelled(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }
  if (error instanceof Error) {
    return /cancel|aborted/i.test(error.message);
  }
  return false;
}


export async function shareThread({ url, title, text }: ShareThreadInput): Promise<ShareThreadResult> {
  const shareData = { title, text, url };

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(shareData);
      return { kind: "shared", message: "Thread shared." };
    } catch (error) {
      if (isShareCancelled(error)) {
        return { kind: "cancelled", message: "Share cancelled." };
      }
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return { kind: "copied", message: "Link copied!" };
    } catch {
      return { kind: "error", message: "Could not copy the link." };
    }
  }

  return { kind: "error", message: "Sharing is not available on this device." };
}
