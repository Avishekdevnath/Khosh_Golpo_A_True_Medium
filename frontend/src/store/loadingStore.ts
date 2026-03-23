import { create } from "zustand";

export type LoaderStatus = "idle" | "warming-up" | "connecting" | "ready";

interface LoadingStore {
  isShowing: boolean;
  status: LoaderStatus;
  message: string;

  // Actions
  show: () => void;
  hide: () => void;
  setStatus: (status: LoaderStatus, message?: string) => void;
  setMessage: (message: string) => void;
  reset: () => void;
}

export const useLoadingStore = create<LoadingStore>((set) => ({
  isShowing: true, // Show on initial load
  status: "warming-up",
  message: "Warming up backend...",

  show: () => set({ isShowing: true }),
  hide: () => set({ isShowing: false }),
  setStatus: (status, message) =>
    set({
      status,
      message: message || getDefaultMessage(status),
    }),
  setMessage: (message) => set({ message }),
  reset: () =>
    set({
      isShowing: false,
      status: "idle",
      message: "",
    }),
}));

function getDefaultMessage(status: LoaderStatus): string {
  const messages: Record<LoaderStatus, string> = {
    "warming-up": "Warming up backend...",
    connecting: "Establishing connection...",
    ready: "Ready to go!",
    idle: "",
  };
  return messages[status];
}
