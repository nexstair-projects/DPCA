"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase";
import { Message } from "@/app/types/message";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const N8N_APPROVE_SEND_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_N8N_APPROVE_SEND_WEBHOOK_URL ?? "";

export const PENDING_STATUSES = [
  "received",
  "new",
  "processing",
  "classified",
  "draft_ready",
  "pending_review",
  "needs_human_reply",
];
export const APPROVED_STATUSES = ["approved", "edited_approved"];
export const SENT_STATUSES = ["auto_sent", "auto_approved", "sent", "replied"];

export function useInboxState(initialChannelFilter: string = "all") {
  // ── Selection & filters ──────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState(initialChannelFilter);

  // ── Draft editing ────────────────────────────────────────────────────────
  const [draftText, setDraftText] = useState("");
  const [viewingDraftId, setViewingDraftId] = useState<string | null>(null);

  // ── Sending mode ─────────────────────────────────────────────────────────
  const [sendingMode, setSendingMode] = useState<"auto" | "approve" | "draft">("approve");

  // ── UI state ─────────────────────────────────────────────────────────────
  const [isSending, setIsSending] = useState(false);
  const [actionAlert, setActionAlert] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);

  // ── Auth ─────────────────────────────────────────────────────────────────
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

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

  // ── Data fetching ────────────────────────────────────────────────────────
  const {
    data: messages = [],
    isLoading,
    mutate,
  } = useSWR<Message[]>(accessToken ? "inbox-messages" : null, async () => {
    const res = await fetch(`${BACKEND_URL}/api/messages`, { headers: authHeaders });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`${res.status}: ${body.error ?? "Unknown"} — ${body.detail ?? ""}`);
    }
    return res.json();
  });

  const selected = messages.find((m) => m.id === selectedId) ?? null;

  // Drafts sorted latest-first by version so [0] is always most recent
  const sortedDrafts = useMemo(() => {
    if (!selected?.drafts) return [];
    return [...selected.drafts].sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
  }, [selected]);

  // Active draft = the version the user is viewing, or the latest
  const activeDraft =
    sortedDrafts.find((d) => d.id === viewingDraftId) ?? sortedDrafts[0] ?? null;

  // Reset draft view when selection changes
  useEffect(() => {
    setViewingDraftId(null);
    if (selected) setDraftText(sortedDrafts[0]?.draft_text ?? "");
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtering ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = messages;
    if (channelFilter !== "all")
      result = result.filter((m) => m.channel === channelFilter);

    // Hide `general` on the "all" tab; otherwise match exact category
    if (filter === "all") {
      result = result.filter((m) => (m.category ?? "") !== "general");
    } else {
      result = result.filter((m) => m.category === filter);
    }

    return result;
  }, [messages, channelFilter, filter]);

  // ── Selection helpers ────────────────────────────────────────────────────
  const handleSelect = useCallback((msg: Message) => {
    setSelectedId(msg.id);
    setDraftText(msg.drafts?.[0]?.draft_text ?? "");
  }, []);

  const advanceSelection = useCallback(() => {
    if (!selected) return;
    const idx = filtered.findIndex((m) => m.id === selected.id);
    const next = filtered[idx + 1] ?? filtered[idx - 1] ?? null;
    if (next) handleSelect(next);
    else setSelectedId(null);
  }, [selected, filtered, handleSelect]);

  // ── Webhook ──────────────────────────────────────────────────────────────
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

  // ── Action handlers ──────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!selected) return;
    const draftId = activeDraft?.id;
    setIsSending(true);
    setActionAlert(null);

    try {
      if (draftId) {
        const editedText =
          draftText !== activeDraft?.draft_text ? draftText : undefined;
        const response = await fetch(`${BACKEND_URL}/api/drafts/${draftId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            reviewed_by: userId ?? undefined,
            sender_email: userEmail ?? undefined,
            draft_text: draftText,
            edited_text: editedText,
          }),
        });
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
        await supabase.from("messages").update({ status: "approved" }).eq("id", selected.id);
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
        body: JSON.stringify({ reviewed_by: userId, rejection_reason: rejectionReason }),
      });
    } else {
      const supabase = createClient();
      await supabase.from("messages").update({ status: "discarded" }).eq("id", selected.id);
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

  // ── Derived counts ───────────────────────────────────────────────────────
  const pendingCount = messages.filter((m) =>
    PENDING_STATUSES.includes(m.status ?? ""),
  ).length;
  const approvedCount = messages.filter((m) =>
    APPROVED_STATUSES.includes(m.status ?? ""),
  ).length;
  const autoSentCount = messages.filter((m) =>
    SENT_STATUSES.includes(m.status ?? ""),
  ).length;

  const channelCounts = useMemo(() => {
    const counts = { gmail: 0, whatsapp: 0, instagram: 0 };
    messages.forEach((m) => {
      const ch = (m.channel ?? "gmail").toLowerCase();
      if (ch in counts) counts[ch as keyof typeof counts]++;
    });
    return {
      ...counts,
      total: Math.max(counts.gmail + counts.whatsapp + counts.instagram, 1),
    };
  }, [messages]);

  const avgToneScore = useMemo(() => {
    const scores = messages
      .flatMap((m) => m.drafts)
      .map((d) => d?.tone_confidence)
      .filter((s): s is number => s != null);
    return scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;
  }, [messages]);

  return {
    // ── Selection ──────────────────────────────────────────────────────────
    selectedId,
    setSelectedId,
    filter,
    setFilter,
    channelFilter,
    setChannelFilter,
    // ── Draft ──────────────────────────────────────────────────────────────
    draftText,
    setDraftText,
    viewingDraftId,
    setViewingDraftId,
    sortedDrafts,
    activeDraft,
    // ── Sending mode ───────────────────────────────────────────────────────
    sendingMode,
    setSendingMode,
    // ── UI state ───────────────────────────────────────────────────────────
    isSending,
    actionAlert,
    rejectModalOpen,
    setRejectModalOpen,
    regenerateModalOpen,
    setRegenerateModalOpen,
    // ── Data ───────────────────────────────────────────────────────────────
    messages,
    filtered,
    selected,
    isLoading,
    mutate,
    // ── Handlers ───────────────────────────────────────────────────────────
    handleSelect,
    handleApprove,
    handleReject,
    handleRegenerate,
    // ── Derived ────────────────────────────────────────────────────────────
    pendingCount,
    approvedCount,
    autoSentCount,
    channelCounts,
    avgToneScore,
  };
}