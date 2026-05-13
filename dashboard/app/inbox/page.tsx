"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/block/Sidebar";
import { S } from "@/lib/theme";

import { useInboxState } from "@/hooks/useInboxState";
import { TopBar } from "@/components/block/TopBar";
import { InboxListPanel } from "@/components/block/InboxList";
import { ReviewPanel } from "@/components/block/ReviewPanel";
import { MetaPanel } from "@/components/block/MetaPanel";
import { RejectModal } from "@/components/modals/RejectModal";
import { RegenerateModal } from "@/components/modals/RegenerateModal";
import { StatsBar } from "@/components/block/StatsBar";

export default function InboxPage() {
  return (
    <Suspense>
      <InboxContent />
    </Suspense>
  );
}

function InboxContent() {
  const searchParams = useSearchParams();

  const {
    // Selection & filters
    selectedId,
    setSelectedId,
    filter,
    setFilter,
    channelFilter,
    setChannelFilter,
    // Draft
    draftText,
    setDraftText,
    viewingDraftId,
    setViewingDraftId,
    sortedDrafts,
    activeDraft,
    // Sending mode
    sendingMode,
    setSendingMode,
    // UI state
    isSending,
    rejectModalOpen,
    setRejectModalOpen,
    regenerateModalOpen,
    setRegenerateModalOpen,
    // Data
    filtered,
    selected,
    isLoading,
    mutate,
    // Handlers
    handleSelect,
    handleApprove,
    handleReject,
    handleRegenerate,
    // Derived
    pendingCount,
    approvedCount,
    autoSentCount,
    channelCounts,
    avgToneScore,
  } = useInboxState(searchParams.get("channel") ?? "all");

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;

      switch (e.key.toLowerCase()) {
        case "a":
          e.preventDefault();
          handleApprove();
          break;
        case "d":
          e.preventDefault();
          if (selected) setRejectModalOpen(true);
          break;
        case "j": {
          e.preventDefault();
          const idx = selected ? filtered.findIndex((m) => m.id === selected.id) : -1;
          const next = filtered[idx + 1];
          if (next) handleSelect(next);
          break;
        }
        case "k": {
          e.preventDefault();
          const idx = selected ? filtered.findIndex((m) => m.id === selected.id) : filtered.length;
          const prev = filtered[idx - 1];
          if (prev) handleSelect(prev);
          break;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }); // intentionally no deps — always uses latest state

  return (
    <div style={{ display: "flex", height: "100vh", background: S.bg, fontFamily: S.sans }}>
      <Sidebar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <TopBar pendingCount={pendingCount} onRefresh={() => mutate()} />

        {/* 3-panel content */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <InboxListPanel
            filtered={filtered}
            selectedId={selectedId}
            isLoading={isLoading}
            channelFilter={channelFilter}
            filter={filter}
            onChannelFilterChange={setChannelFilter}
            onFilterChange={setFilter}
            onSelect={handleSelect}
          />

          {selected ? (
            <>
              <ReviewPanel
                selected={selected}
                draftText={draftText}
                activeDraft={activeDraft}
                isSending={isSending}
                onDraftChange={setDraftText}
                onSkip={() => setSelectedId(null)}
                onReject={() => setRejectModalOpen(true)}
                onRegenerate={() => setRegenerateModalOpen(true)}
                onApprove={handleApprove}
              />
              <MetaPanel
                selected={selected}
                sortedDrafts={sortedDrafts}
                activeDraft={activeDraft}
                onSelectVersion={(d) => {
                  setViewingDraftId(d.id);
                  setDraftText(d.draft_text ?? "");
                }}
                sendingMode={sendingMode}
                onSendingModeChange={setSendingMode}
                pendingCount={pendingCount}
                approvedCount={approvedCount}
                autoSentCount={autoSentCount}
                avgToneScore={avgToneScore}
                channelCounts={channelCounts}
              />
            </>
          ) : (
            <EmptyState isLoading={isLoading} pendingCount={pendingCount} />
          )}
        </div>

        {/* Modals */}
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

        {/* Stats bar */}
        <StatsBar
          pendingCount={pendingCount}
          autoSentCount={autoSentCount}
          approvedCount={approvedCount}
          avgToneScore={avgToneScore}
        />
      </div>
    </div>
  );
}

// ── Local helpers (page-specific, too small for their own files) ───────────────

function EmptyState({ isLoading, pendingCount }: { isLoading: boolean; pendingCount: number }) {
  return (
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
  );
}