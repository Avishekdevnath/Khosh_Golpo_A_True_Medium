"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, UserPlus } from "lucide-react";

import PageLoader from "@/components/shared/PageLoader";
import PeopleWorkspaceShell from "@/components/people/PeopleWorkspaceShell";
import RequestCard from "@/components/people/RequestCard";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import {
  acceptMessageRequest,
  cancelMessageRequest,
  getPendingRequests,
  getSentRequests,
  rejectMessageRequest,
} from "@/lib/connectionApi";
import type { MessageRequestOut } from "@/types/connection";
import type { Tab, CardAction } from "@/components/people/RequestCard";

export default function PeopleRequestsWorkspace() {
  const { toast } = useToast();

  const [tab, setTab]                     = useState<Tab>("received");
  const [received, setReceived]           = useState<MessageRequestOut[]>([]);
  const [sent, setSent]                   = useState<MessageRequestOut[]>([]);
  const [receivedTotal, setReceivedTotal] = useState(0);
  const [sentTotal, setSentTotal]         = useState(0);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [actionMap, setActionMap]         = useState<Record<string, CardAction>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rec, snt] = await Promise.all([getPendingRequests(), getSentRequests()]);
      setReceived(rec.data);
      setReceivedTotal(rec.total);
      setSent(snt.data);
      setSentTotal(snt.total);
    } catch {
      setError("Failed to load connection requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading && received.length === 0 && sent.length === 0) {
    return <PageLoader />;
  }

  function setAction(id: string, state: CardAction) {
    setActionMap(prev => ({ ...prev, [id]: state }));
  }

  async function handleAccept(reqId: string) {
    setAction(reqId, "loading");
    try {
      await acceptMessageRequest(reqId);
      setAction(reqId, "done");
      setReceivedTotal(t => Math.max(0, t - 1));
      toast.success("Connection accepted!");
    } catch {
      setAction(reqId, "idle");
      toast.error("Failed to accept");
    }
  }

  async function handleDecline(reqId: string) {
    setAction(reqId, "loading");
    try {
      await rejectMessageRequest(reqId);
      setAction(reqId, "done");
      setReceivedTotal(t => Math.max(0, t - 1));
      toast.success("Request declined.");
    } catch {
      setAction(reqId, "idle");
      toast.error("Failed to decline");
    }
  }

  async function handleCancel(reqId: string) {
    setAction(reqId, "loading");
    try {
      await cancelMessageRequest(reqId);
      setAction(reqId, "done");
      setSentTotal(t => Math.max(0, t - 1));
      toast.success("Request cancelled.");
    } catch {
      setAction(reqId, "idle");
      toast.error("Failed to cancel");
    }
  }

  const activeList       = tab === "received" ? received : sent;
  const pendingReceived  = receivedTotal - received.filter(r => actionMap[r.id] === "done").length;

  /* ── Tab button shared classes ── */
  const tabCls = (active: boolean) =>
    [
      "inline-flex items-center gap-1.5 border-b-2 px-4 py-[9px] text-[13px] font-semibold -mb-px transition-colors duration-150 cursor-pointer border-none bg-transparent font-sans",
      active
        ? "border-b-2 border-accent-orange text-accent-orange"
        : "border-transparent text-[#636f8d] hover:text-[#b5bfd8]",
    ].join(" ");

  return (
    <PeopleWorkspaceShell
      title="Connection Requests"
      subtitle="Accept incoming requests or manage the ones you've sent."
      requestsBadge={pendingReceived > 0 ? pendingReceived : undefined}
    >
      {/* Tab switcher */}
      <div className="flex gap-1.5 border-b border-app-border">
        <button type="button" className={tabCls(tab === "received")} onClick={() => setTab("received")}>
          <UserPlus size={14} />
          Received
          {receivedTotal > 0 && (
            <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/15 px-1 text-[10px] font-bold text-accent-orange">
              {receivedTotal}
            </span>
          )}
        </button>
        <button type="button" className={tabCls(tab === "sent")} onClick={() => setTab("sent")}>
          <Clock size={14} />
          Sent
          {sentTotal > 0 && (
            <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/15 px-1 text-[10px] font-bold text-accent-orange">
              {sentTotal}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-5 text-[13px] text-[#636f8d]">Loading…</div>
      ) : error ? (
        <div className="py-5 text-[13px] text-accent-red">{error}</div>
      ) : activeList.length === 0 ? (
        <EmptyState
          icon={tab === "received" ? <UserPlus strokeWidth={1.4} /> : <Clock strokeWidth={1.4} />}
          title={tab === "received" ? "No pending requests" : "No sent requests"}
          description={
            tab === "received"
              ? "When someone sends you a connection request, it will appear here."
              : "Requests you've sent that haven't been accepted yet will appear here."
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {activeList.map(req => (
            <RequestCard
              key={req.id}
              req={req}
              tab={tab}
              actionState={actionMap[req.id] ?? "idle"}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </PeopleWorkspaceShell>
  );
}
