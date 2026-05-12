"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Button } from "@/components/ui/Button";
import { ChannelActivity } from "@/components/ui/ChannelActivity";
import { RegenerateModal } from "@/components/RegenerateModal";
import { RejectModal } from "@/components/RejectModal";
import { VersionHistory } from "@/components/VersionHistory";
import { ContextSources } from "@/components/ContextSources";

/*Importing Types*/
import { Message } from "@/app/types/message";

/*End*/

import { S } from "@/lib/theme";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { MessageItem } from "@/components/ui/MessageItem";
import { MetaRow } from "@/components/ui/MetaRow";

// ── Category look-up ────────────────────────────────────────────────────────────

const CAT: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  new_inquiry: {
    label: "New Inquiry",
    bg: "#fffbe6",
    color: "#7a5c00",
    border: "#f5d87a",
  },
  vendor: {
    label: "Vendor",
    bg: "#edfaf2",
    color: "#1a5c35",
    border: "#7bd4a5",
  },
  existing_client: {
    label: "Client",
    bg: "#eff5ff",
    color: "#1a3a6e",
    border: "#90b8f0",
  },
  collaboration: {
    label: "Collab",
    bg: "#f3eeff",
    color: "#5a2a8a",
    border: "#c0a0e0",
  },
  general: {
    label: "General",
    bg: "#f5f5f5",
    color: "#5a5a5a",
    border: "#d0d0d0",
  },
};

const catMeta = (key: string | null) => CAT[key ?? "general"] ?? CAT.general;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "new_inquiry", label: "Inquiry" },
  { key: "existing_client", label: "Client" },
  { key: "general", label: "General" },
  // { key: "vendor", label: "Vendor" },
  // { key: "collaboration", label: "Collab" },
];

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

// Status groupings
const PENDING_STATUSES = [
  "received",
  "new",
  "processing",
  "classified",
  "draft_ready",
  "pending_review",
  "needs_human_reply",
];
const APPROVED_STATUSES = ["approved", "edited_approved"];
const SENT_STATUSES = ["auto_sent", "auto_approved", "sent", "replied"];

const CHANNEL_TABS = [
  { key: "all", label: "All", icon: "" },
  { key: "gmail", label: "Gmail", icon: "✉️" },
  { key: "whatsapp", label: "WhatsApp", icon: "💬" },
  { key: "instagram", label: "Instagram", icon: "📸" },
];

// ── Page ────────────────────────────────────────────────────────────────────────

export default function InboxPage() {
  return (
    <Suspense>
      <InboxContent />
    </Suspense>
  );
}

function InboxContent() {
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState(
    searchParams.get("channel") ?? "all",
  );
  const [draftText, setDraftText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);
  const [viewingDraftId, setViewingDraftId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [actionAlert, setActionAlert] = useState<string | null>(null);
  const N8N_APPROVE_SEND_WEBHOOK_URL =
    process.env.NEXT_PUBLIC_N8N_APPROVE_SEND_WEBHOOK_URL ?? "";

  // Get current user ID and session token for API calls
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error || !data.session) return;
      setAccessToken(data.session.access_token ?? null);

      // reviewed_by FK references users.id (custom table), not auth.users.id
      const { data: profile } = await supabase
        .from("users")
        .select("id, email")
        .eq("auth_id", data.session.user.id)
        .single();

      setUserId(profile?.id ?? null);
      setUserEmail(profile?.email ?? data.session.user.email ?? null);
    });
  }, []);

  const authHeaders: Record<string, string> = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : {};

  const {
    data: messages = [],
    isLoading,
    mutate,
  } = useSWR<Message[]>(accessToken ? "inbox-messages" : null, async () => {
    console.log(
      "📡 Fetching messages with token:",
      accessToken ? accessToken.slice(0, 20) + "…" : "NULL",
    );
    const res = await fetch(`${BACKEND_URL}/api/messages`, {
      headers: authHeaders,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("📡 API error:", res.status, body);
      throw new Error(
        `${res.status}: ${body.error ?? "Unknown"} — ${body.detail ?? ""}`,
      );
    }
    return res.json();
  });

  const selected = messages.find((m) => m.id === selectedId) ?? null;

  // Drafts sorted latest-first by version (so [0] is always the most recent)
  const sortedDrafts = useMemo(() => {
    if (!selected?.drafts) return [];
    return [...selected.drafts].sort(
      (a, b) => (b.version ?? 0) - (a.version ?? 0),
    );
  }, [selected]);

  // Active draft = whichever version the user is viewing, or the latest
  const activeDraft =
    sortedDrafts.find((d) => d.id === viewingDraftId) ??
    sortedDrafts[0] ??
    null;

  useEffect(() => {
    setViewingDraftId(null);
    if (selected) setDraftText(sortedDrafts[0]?.draft_text ?? "");
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let result = messages;
    if (channelFilter !== "all")
      result = result.filter((m) => m.channel === channelFilter);

    // Show everything except `general` when the `all` tab is active.
    if (filter === "all") {
      result = result.filter((m) => (m.category ?? "") !== "general");
    } else {
      result = result.filter((m) => m.category === filter);
    }

    return result;
  }, [messages, channelFilter, filter]);

  const handleSelect = useCallback((msg: Message) => {
    setSelectedId(msg.id);
    setDraftText(msg.drafts?.[0]?.draft_text ?? "");
  }, []);

  const sendApproveWebhook = async () => {
    if (!selected || !N8N_APPROVE_SEND_WEBHOOK_URL) return null;

    const payload = {
      message_id: selected.id,
      draft_id: activeDraft?.id,
      inbox_id: selected.inbox_id ?? null,
      thread_id: selected.thread_id ?? null,
      channel: selected.channel,
      sender_email: selected.sender_email,
      sender_name: selected.sender_name,
      subject: selected.subject,
      draft_text: draftText,
    };

    const res = await fetch(N8N_APPROVE_SEND_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg =
        typeof result?.error === "string"
          ? result.error
          : typeof result?.message === "string"
            ? result.message
            : result?.error
              ? JSON.stringify(result.error)
              : `Webhook call failed with status ${res.status}`;
      throw new Error(errMsg);
    }

    return result;
  };

  const advanceSelection = useCallback(() => {
    if (!selected) return;
    const idx = filtered.findIndex((m) => m.id === selected.id);
    const next = filtered[idx + 1] ?? filtered[idx - 1] ?? null;
    if (next) handleSelect(next);
    else setSelectedId(null);
  }, [selected, filtered, handleSelect]);

  const handleApprove = async () => {
    if (!selected) return;
    const draftId = activeDraft?.id;
    setIsSending(true);
    setActionAlert(null);

    try {
      if (draftId) {
        const editedText =
          draftText !== activeDraft?.draft_text ? draftText : undefined;
        const response = await fetch(
          `${BACKEND_URL}/api/drafts/${draftId}/approve`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({
              reviewed_by: userId ?? undefined,
              sender_email: userEmail ?? undefined,
              draft_text: draftText,
              edited_text: editedText,
            }),
          },
        );
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const errMsg =
            typeof errorBody?.error === "string"
              ? errorBody.error
              : errorBody?.error
                ? JSON.stringify(errorBody.error)
                : response.statusText || "Failed to approve draft";
          throw new Error(errMsg);
        }
      } else {
        const supabase = createClient();
        await supabase
          .from("messages")
          .update({ status: "approved" })
          .eq("id", selected.id);
      }

      const webhookResponse = await sendApproveWebhook();
      const alertMessage =
        webhookResponse?.message ??
        webhookResponse?.status ??
        webhookResponse?.result ??
        (N8N_APPROVE_SEND_WEBHOOK_URL
          ? "Approve & send webhook completed successfully."
          : "Approve completed; no send webhook configured.");

      setActionAlert(alertMessage);
      if (N8N_APPROVE_SEND_WEBHOOK_URL) {
        window.alert(`Send webhook response: ${alertMessage}`);
      }

      await mutate();
      advanceSelection();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object"
            ? JSON.stringify(err)
            : String(err);
      const alertMessage = `Send failed: ${message}`;
      setActionAlert(alertMessage);
      window.alert(alertMessage);
      console.error("Approve & Send error:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleReject = async (rejectionReason: string) => {
    if (!selected || !userId) return;
    const draftId = activeDraft?.id;
    if (draftId) {
      await fetch(`${BACKEND_URL}/api/drafts/${draftId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          reviewed_by: userId,
          rejection_reason: rejectionReason,
        }),
      });
    } else {
      const supabase = createClient();
      await supabase
        .from("messages")
        .update({ status: "discarded" })
        .eq("id", selected.id);
    }
    setRejectModalOpen(false);
    mutate();
    advanceSelection();
  };

  const handleRegenerate = async (instructions: string) => {
    if (!selected || !userId) return;
    const draftId = activeDraft?.id;
    if (!draftId) return;
    await fetch(`${BACKEND_URL}/api/drafts/${draftId}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ reviewed_by: userId, instructions }),
    });
    setRegenerateModalOpen(false);
    mutate();
  };

  const pendingCount = messages.filter((m) =>
    PENDING_STATUSES.includes(m.status ?? ""),
  ).length;
  const approvedCount = messages.filter((m) =>
    APPROVED_STATUSES.includes(m.status ?? ""),
  ).length;
  const autoSentCount = messages.filter((m) =>
    SENT_STATUSES.includes(m.status ?? ""),
  ).length;
  const [sendingMode, setSendingMode] = useState<"auto" | "approve" | "draft">(
    "approve",
  );

  // Channel activity counts
  const channelCounts = useMemo(() => {
    const counts = { gmail: 0, whatsapp: 0, instagram: 0 };
    messages.forEach((m) => {
      const ch = (m.channel ?? "gmail").toLowerCase();
      if (ch in counts) counts[ch as keyof typeof counts]++;
    });
    const total = Math.max(
      counts.gmail + counts.whatsapp + counts.instagram,
      1,
    );
    return { ...counts, total };
  }, [messages]);

  // Average tone score
  const avgToneScore = useMemo(() => {
    const scores = messages
      .flatMap((m) => m.drafts)
      .map((d) => d?.tone_confidence)
      .filter((s): s is number => s != null);
    return scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;
  }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLInputElement
      )
        return;
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        handleApprove();
      }
      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        if (selected) setRejectModalOpen(true);
      }
      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        const idx = selected
          ? filtered.findIndex((m) => m.id === selected.id)
          : -1;
        const next = filtered[idx + 1];
        if (next) handleSelect(next);
      }
      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        const idx = selected
          ? filtered.findIndex((m) => m.id === selected.id)
          : filtered.length;
        const prev = filtered[idx - 1];
        if (prev) handleSelect(prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }); // intentionally no deps — always uses latest state

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: S.bg,
        fontFamily: S.sans,
      }}
    >
      <Sidebar />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* ── TOPBAR ──────────────────────────────────────────────────────── */}
        <div
          style={{
            background: S.white,
            borderBottom: `1px solid ${S.border}`,
            padding: "0 24px",
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h1
              style={{
                fontFamily: S.serif,
                fontSize: 18,
                fontWeight: 600,
                color: S.dark,
                margin: 0,
              }}
            >
              Approval Queue
            </h1>
            {pendingCount > 0 && (
              <span
                style={{
                  background: S.pale,
                  color: S.gold,
                  border: `1px solid ${S.border}`,
                  borderRadius: 20,
                  padding: "2px 10px",
                  fontSize: 11,
                  fontWeight: 500,
                }}
              >
                {pendingCount} Pending Review
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              onClick={() => mutate()}
              bgColor="bg-transaparent hover:bg-[#faf8f3]"
              textColor="text-[#8a7a5a]"
              border="border-[#e8dfc8]"
              className="font-sans text-[13px] disabled:bg-dpw-gold disabled:text-white disabled:border-dpw-gold disabled:opacity-100 disabled:cursor-not-allowed"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              }
            >
              Refresh
            </Button>
            <Button
              bgColor="bg-[#B8960C] hover:bg-[#D4AF37]"
              textColor="text-white"
              border="border-[#B8960C] hover:border-[#D4AF37]"
              className="font-sans text-[13px] disabled:bg-dpw-gold disabled:text-white disabled:border-dpw-gold disabled:opacity-100 disabled:cursor-not-allowed"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 12.75 6 6 9-13.5"
                  />
                </svg>
              }
            >
              Approve All Safe
            </Button>
          </div>
        </div>

        {/* ── 3-PANEL CONTENT ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* ── INBOX LIST PANEL ──────────────────────────────────────────── */}
          <div
            style={{
              width: 310,
              flexShrink: 0,
              borderRight: `1px solid ${S.border}`,
              display: "flex",
              flexDirection: "column",
              background: S.white,
            }}
          >
            {/* Channel tabs */}
            <div
              style={{
                padding: "8px 12px 0",
                borderBottom: `1px solid ${S.border}`,
              }}
            >
              <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>
                {CHANNEL_TABS.map((ch) => (
                  <button
                    key={ch.key}
                    onClick={() => setChannelFilter(ch.key)}
                    style={{
                      padding: "4px 9px",
                      borderRadius: 6,
                      border: "none",
                      background:
                        channelFilter === ch.key ? S.dark : "transparent",
                      color: channelFilter === ch.key ? "#fff" : S.muted,
                      fontSize: 10,
                      fontWeight: channelFilter === ch.key ? 600 : 400,
                      cursor: "pointer",
                      fontFamily: S.sans,
                      transition: "all 0.12s",
                    }}
                  >
                    {ch.icon} {ch.label}
                  </button>
                ))}
              </div>
              {/* Category filter tabs */}
              <div style={{ display: "flex", gap: 2 }}>
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    style={{
                      padding: "5px 9px",
                      borderRadius: "6px 6px 0 0",
                      border: "none",
                      background: filter === f.key ? S.gold : "transparent",
                      color: filter === f.key ? "#fff" : S.muted,
                      fontSize: 10.5,
                      fontWeight: filter === f.key ? 600 : 400,
                      cursor: "pointer",
                      fontFamily: S.sans,
                      transition: "all 0.12s",
                    }}
                  >
                    {f.label}
                    {f.key === "all" ? ` (${filtered.length})` : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Message list */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {isLoading && (
                <div style={{ padding: 24, color: S.muted, fontSize: 13 }}>
                  Loading messages…
                </div>
              )}
              {!isLoading && filtered.length === 0 && (
                <div style={{ padding: 24, color: S.muted, fontSize: 13 }}>
                  No messages
                </div>
              )}
              {filtered.map((msg) => {
                const isActive = msg.id === selectedId;
                return (
                  <MessageItem
                    key={msg.id}
                    msg={msg}
                    isActive={isActive}
                    onClick={handleSelect}
                  />
                );
              })}
            </div>
          </div>

          {/* ── REVIEW + META ──────────────────────────────────────────────── */}
          {selected ? (
            <>
              {/* Review panel */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {/* Review header */}
                <div
                  className={`py-3 px-5 border-b flex flex-col gap-[10px] justify-between items-start flex-shrink-0 bg-[${S.white}] border-[${S.border}]`}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: S.serif,
                        fontSize: 18,
                        fontWeight: 600,
                        color: S.dark,
                      }}
                    >
                      {selected.sender_name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: S.muted,
                        marginTop: 3,
                        display: "flex",
                        gap: 14,
                        flexWrap: "wrap",
                      }}
                    >
                      {selected.sender_email && (
                        <span>✉️ {selected.sender_email}</span>
                      )}
                      <span>
                        🕐 {new Date(selected.created_at).toLocaleDateString()}{" "}
                        {new Date(selected.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span>
                        📍 Via{" "}
                        {(selected.channel ?? "Gmail").replace(/^\w/, (c) =>
                          c.toUpperCase(),
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      onClick={() => setSelectedId(null)}
                      bgColor="bg-transaparent hover:bg-[#faf8f3]"
                      textColor="text-[#8a7a5a]"
                      border="border-[#e8dfc8]"
                      className="font-sans text-[13px] disabled:bg-dpw-gold disabled:text-white disabled:border-dpw-gold disabled:opacity-100 disabled:cursor-not-allowed"
                      icon={
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="size-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m7.49 12-3.75 3.75m0 0 3.75 3.75m-3.75-3.75h16.5V4.499"
                          />
                        </svg>
                      }
                    >
                      Skip
                    </Button>
                    <Button
                      onClick={() => setRegenerateModalOpen(true)}
                      bgColor="bg-transparent hover:bg-[#faf8f3]"
                      textColor="text-[#6b5d3f]"
                      border="border-[#e8dfc8]"
                      className="font-sans text-[13px]"
                      icon={
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="size-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                          />
                        </svg>
                      }
                    >
                      Regenerate
                    </Button>
                    <Button
                      onClick={() => setRejectModalOpen(true)}
                      bgColor="bg-[#fdf0f0] hover:bg-[#fde8e8]"
                      textColor="text-[#8b3a3a]"
                      border="border-[#e8c0c0]"
                      className="font-sans text-[13px]"
                      icon={
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="size-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18 18 6M6 6l12 12"
                          />
                        </svg>
                      }
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={isSending || !selected}
                      bgColor="bg-[#3d7a5a] hover:bg-[#2d6048]"
                      textColor="text-white"
                      border="border-[#2d6048] hover:border-[#3d7a5a]"
                      className="font-sans text-[13px] disabled:bg-dpw-gold disabled:text-white disabled:border-dpw-gold disabled:opacity-100 disabled:cursor-not-allowed"
                      icon={
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="size-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                          />
                        </svg>
                      }
                    >
                      {isSending ? "Sending..." : "Approve & Send"}
                    </Button>
                  </div>
                </div>
                {actionAlert ? (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 12,
                      borderRadius: 12,
                      background: "#f6ffed",
                      border: "1px solid #b7eb8f",
                      color: "#175a24",
                      fontSize: 13,
                    }}
                  >
                    {actionAlert}
                  </div>
                ) : null}

                {/* Review body — two columns */}
                <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                  {/* Original message */}
                  <div
                    style={{
                      flex: 1,
                      padding: 20,
                      overflowY: "auto",
                      borderRight: `1px solid ${S.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: S.muted,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginBottom: 12,
                      }}
                    >
                      Original Message
                    </div>
                    <div
                      style={{
                        background: S.white,
                        border: `1px solid ${S.border}`,
                        borderRadius: 12,
                        padding: 20,
                        fontSize: 13,
                        color: S.text,
                        lineHeight: 1.75,
                      }}
                    >
                      {(selected.body_raw ?? "(no content)")
                        .split("\n")
                        .map((line, i) => (
                          <p key={i} style={{ margin: "0 0 10px" }}>
                            {line || <br />}
                          </p>
                        ))}
                    </div>
                  </div>

                  {/* AI Draft */}
                  <div
                    style={{
                      flex: 1,
                      padding: 20,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <span
                        style={{
                          background: S.dark,
                          color: "#D4AF37",
                          padding: "2px 9px",
                          borderRadius: 12,
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                        }}
                      >
                        ✦ AI DRAFT
                      </span>
                      {activeDraft?.tone_confidence != null && (
                        <span style={{ fontSize: 10, color: S.green }}>
                          {activeDraft.tone_confidence}% tone match
                        </span>
                      )}
                    </div>
                    <textarea
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      style={{
                        flex: 1,
                        minHeight: 260,
                        padding: 16,
                        border: `1px solid ${S.border}`,
                        borderRadius: 12,
                        fontSize: 13,
                        color: S.text,
                        lineHeight: 1.75,
                        fontFamily: S.sans,
                        resize: "none",
                        background: "#fffdf8",
                        outline: "none",
                      }}
                    />
                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 10,
                        color: S.muted,
                      }}
                    >
                      <span>✎ Click to edit before sending</span>
                      <span>{draftText.length} characters</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── META PANEL ──────────────────────────────────────────── */}
              <div
                style={{
                  width: 220,
                  flexShrink: 0,
                  borderLeft: `1px solid ${S.border}`,
                  padding: "18px 16px",
                  overflowY: "auto",
                  background: S.white,
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                }}
              >
                {/* Classification */}
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: "2px",
                      textTransform: "uppercase",
                      color: S.muted,
                      marginBottom: 10,
                      paddingBottom: 6,
                      borderBottom: `1px solid ${S.border}`,
                    }}
                  >
                    Classification
                  </div>
                  <MetaRow label="Category">
                    <CategoryBadge category={selected.category} />
                  </MetaRow>
                  <MetaRow label="Priority">
                    {(() => {
                      const p = selected.priority ?? "medium";
                      const cfg: Record<string, { bg: string; color: string }> =
                        {
                          high: { bg: S.redBg, color: S.red },
                          medium: { bg: S.pale, color: S.gold },
                          low: { bg: "#f5f5f5", color: "#666" },
                        };
                      const c = cfg[p] ?? cfg.medium;
                      return (
                        <span
                          style={{
                            background: c.bg,
                            color: c.color,
                            padding: "2px 8px",
                            borderRadius: 8,
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: "capitalize",
                          }}
                        >
                          {p}
                        </span>
                      );
                    })()}
                  </MetaRow>
                  <MetaRow label="Source">
                    {(selected.channel ?? "Gmail").replace(/^\w/, (c) =>
                      c.toUpperCase(),
                    )}
                  </MetaRow>
                  {selected.estimated_value != null && (
                    <MetaRow label="Est. Value">
                      <span style={{ color: S.green }}>
                        &euro;{selected.estimated_value.toLocaleString()}+
                      </span>
                    </MetaRow>
                  )}
                  {selected.guest_count != null && (
                    <MetaRow label="Guests">~{selected.guest_count}</MetaRow>
                  )}
                </div>

                {/* Sending Mode */}
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: "2px",
                      textTransform: "uppercase",
                      color: S.muted,
                      marginBottom: 10,
                      paddingBottom: 6,
                      borderBottom: `1px solid ${S.border}`,
                    }}
                  >
                    Sending Mode
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {(
                      [
                        ["auto", "Auto-Send"],
                        ["approve", "Approve First"],
                        ["draft", "Draft Only"],
                      ] as const
                    ).map(([key, label]) => {
                      const active = sendingMode === key;
                      return (
                        <div
                          key={key}
                          onClick={() => setSendingMode(key)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "7px 10px",
                            borderRadius: 8,
                            border: `1px solid ${active ? "#e8d5a3" : S.border}`,
                            background: active ? S.pale : "transparent",
                            color: active ? S.gold : S.muted,
                            fontWeight: active ? 500 : 400,
                            fontSize: 11,
                            cursor: "pointer",
                            transition: "all 0.12s",
                          }}
                        >
                          <div
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              border: `1.5px solid currentColor`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {active && (
                              <div
                                style={{
                                  width: 6,
                                  height: 6,
                                  background: S.gold,
                                  borderRadius: "50%",
                                }}
                              />
                            )}
                          </div>
                          {label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Versions (D3) */}
                <VersionHistory
                  drafts={sortedDrafts}
                  activeDraftId={activeDraft?.id ?? null}
                  onSelectVersion={(d) => {
                    setViewingDraftId(d.id);
                    setDraftText(d.draft_text ?? "");
                  }}
                />

                {/* Context Sources (D4) */}
                <ContextSources sourceIds={activeDraft?.context_sources} />

                {/* Stats */}
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: "2px",
                      textTransform: "uppercase",
                      color: S.muted,
                      marginBottom: 10,
                      paddingBottom: 6,
                      borderBottom: `1px solid ${S.border}`,
                    }}
                  >
                    Today&apos;s Stats
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    {(
                      [
                        [pendingCount, "Pending", S.gold],
                        [autoSentCount, "Auto-sent", S.green],
                        [approvedCount, "Approved", S.dark],
                        [
                          avgToneScore != null ? `${avgToneScore}%` : "—",
                          "Tone Score",
                          S.mid,
                        ],
                      ] as [string | number, string, string][]
                    ).map(([val, lbl, col]) => (
                      <div
                        key={lbl}
                        style={{
                          background: S.bg,
                          border: `1px solid ${S.border}`,
                          borderRadius: 8,
                          padding: "10px 10px 8px",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: S.serif,
                            fontSize: 22,
                            fontWeight: 600,
                            color: col,
                            lineHeight: 1,
                            marginBottom: 3,
                          }}
                        >
                          {val}
                        </div>
                        <div style={{ fontSize: 9.5, color: S.muted }}>
                          {lbl}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Channel Activity */}
                <div>
                  <ChannelActivity channelCounts={channelCounts} />
                </div>
              </div>
            </>
          ) : (
            /* ── EMPTY STATE ─────────────────────────────────────────────── */
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: S.muted,
                gap: 10,
              }}
            >
              <div style={{ fontSize: 28, color: S.gold }}>✦</div>
              <div style={{ fontFamily: S.serif, fontSize: 20, color: S.mid }}>
                {isLoading ? "Loading…" : "Select a message to review"}
              </div>
              {!isLoading && (
                <div style={{ fontSize: 12 }}>
                  {pendingCount > 0
                    ? `${pendingCount} message${pendingCount === 1 ? "" : "s"} awaiting review`
                    : "All caught up!"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── MODALS ──────────────────────────────────────────────────────── */}
        <RejectModal
          open={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          onSubmit={handleReject}
        />
        <RegenerateModal
          open={regenerateModalOpen}
          onClose={() => setRegenerateModalOpen(false)}
          onSubmit={handleRegenerate}
        />

        {/* ── STATS BAR ───────────────────────────────────────────────────── */}
        <div
          style={{
            background: S.white,
            borderTop: `1px solid ${S.border}`,
            padding: "8px 24px",
            display: "flex",
            alignItems: "center",
            gap: 24,
            flexShrink: 0,
            fontSize: 11,
            color: S.muted,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: S.gold,
              }}
            />
            <strong style={{ color: S.text }}>{pendingCount}</strong>
            &nbsp;awaiting approval
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: S.green,
              }}
            />
            <strong style={{ color: S.text }}>{autoSentCount}</strong>
            &nbsp;auto-sent today
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: S.blue,
              }}
            />
            <strong style={{ color: S.text }}>{approvedCount}</strong>
            &nbsp;manually approved
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            {avgToneScore != null && (
              <span>
                AI tone accuracy:{" "}
                <strong style={{ color: S.green }}>{avgToneScore}%</strong>
              </span>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: S.green,
                  animation: "pulse 2s infinite",
                }}
              />
              System online
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
