import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { MetaRow } from "@/components/ui/MetaRow";
import { ChannelActivity } from "@/components/ui/ChannelActivity";
import { VersionHistory } from "@/components/ui/VersionHistory";
import { ContextSources } from "@/components/ui/ContextSources";
import { Message } from "@/app/types/message";

interface MetaPanelProps {
  selected: Message;
  sortedDrafts: Message["drafts"];
  activeDraft: Message["drafts"][0] | null;
  onSelectVersion: (draft: Message["drafts"][0]) => void;
  sendingMode: "auto" | "approve" | "draft";
  onSendingModeChange: (mode: "auto" | "approve" | "draft") => void;
  pendingCount: number;
  approvedCount: number;
  autoSentCount: number;
  avgToneScore: number | null;
  channelCounts: {
    gmail: number;
    whatsapp: number;
    instagram: number;
    total: number;
  };
}

const PRIORITY_STYLES: Record<string, { bg: string; color: string }> = {
  high: { bg: "bg-red-100", color: "text-red-600" },
  medium: { bg: "bg-dpw-gold-pale", color: "text-dpw-gold" },
  low: { bg: "bg-gray-100", color: "text-gray-600" },
};

export function MetaPanel({
  selected,
  sortedDrafts,
  activeDraft,
  onSelectVersion,
  sendingMode,
  onSendingModeChange,
  pendingCount,
  approvedCount,
  autoSentCount,
  avgToneScore,
  channelCounts,
}: MetaPanelProps) {
  const p = selected.priority ?? "medium";
  const priorityStyle = PRIORITY_STYLES[p] ?? PRIORITY_STYLES.medium;

  return (
    <div className="component-MetaPanel w-[220px] flex-shrink-0 border-l border-dpw-border p-[18px_16px] overflow-y-auto bg-white flex flex-col gap-[18px]">
      {/* Classification */}
      <MetaSection title="Classification">
        <MetaRow label="Category">
          <CategoryBadge category={selected.category} />
        </MetaRow>
        <MetaRow label="Priority">
          <span
            className={`px-2 py-[2px] rounded-md text-[10px] font-semibold capitalize ${priorityStyle.bg} ${priorityStyle.color}`}
          >
            {p}
          </span>
        </MetaRow>
        <MetaRow label="Source">
          {(selected.channel ?? "Gmail").replace(/^\w/, (c) => c.toUpperCase())}
        </MetaRow>
        {selected.estimated_value != null && (
          <MetaRow label="Est. Value">
            <span className="text-dpw-green">
              €{selected.estimated_value.toLocaleString()}+
            </span>
          </MetaRow>
        )}
        {selected.guest_count != null && (
          <MetaRow label="Guests">~{selected.guest_count}</MetaRow>
        )}
      </MetaSection>

      {/* Sending Mode */}
      <MetaSection title="Sending Mode">
        <div className="flex flex-col gap-1.5">
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
                onClick={() => onSendingModeChange(key)}
                className={`flex items-center gap-2 px-[10px] py-[7px] rounded-md cursor-pointer text-[11px] transition-all duration-100 border ${
                  active
                    ? "border-[#e8d5a3] bg-dpw-gold-pale text-dpw-gold font-medium"
                    : "border-dpw-border bg-transparent text-dpw-muted font-normal"
                }`}
              >
                <div className="w-3 h-3 rounded-full border-[1.5px] border-current flex items-center justify-center flex-shrink-0">
                  {active && (
                    <div className="w-1.5 h-1.5 bg-dpw-gold rounded-full" />
                  )}
                </div>
                {label}
              </div>
            );
          })}
        </div>
      </MetaSection>

      {/* Version History */}
      <VersionHistory
        drafts={sortedDrafts}
        activeDraftId={activeDraft?.id ?? null}
        onSelectVersion={onSelectVersion}
      />

      {/* Context Sources */}
      <ContextSources sourceIds={activeDraft?.context_sources} />

      {/* Stats */}
      <MetaSection title="Today's Stats">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              [pendingCount, "Pending", "text-dpw-gold"],
              [autoSentCount, "Auto-sent", "text-dpw-green"],
              [approvedCount, "Approved", "text-dpw-dark"],

              [
                avgToneScore != null ? `${avgToneScore}%` : "—",
                "Tone Score",
                "text-dpw-mid",
              ],
            ] as [string | number, string, string][]
          ).map(([val, lbl, col]) => (
            <div
              key={lbl}
              className="bg-dpw-bg border border-dpw-border rounded-md px-[10px] pt-[10px] pb-2"
            >
              <div className="text-xl font-semibold leading-none mb-[3px] font-serif text-dpw-gold">
                {val}
              </div>
              <div className="text-[9.5px] text-dpw-muted">{lbl}</div>
            </div>
          ))}
        </div>
      </MetaSection>

      {/* Channel Activity */}
      <ChannelActivity channelCounts={channelCounts} />
    </div>
  );
}

// ── Shared section wrapper ─────────────────────────────────────────────────────

function MetaSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[9px] tracking-[2px] uppercase text-dpw-muted mb-2.5 pb-1.5 border-b border-dpw-border">
        {title}
      </div>
      {children}
    </div>
  );
}
