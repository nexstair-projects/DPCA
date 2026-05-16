import { Button } from "@/components/ui/Button";
import { Message } from "@/app/types/message";

interface ReviewPanelProps {
  selected: Message;
  draftText: string;
  activeDraft: Message["drafts"][0] | null;
  isSending: boolean;
  onDraftChange: (text: string) => void;
  onSkip: () => void;
  onReject: () => void; // opens RejectModal (was onDiscard)
  onRegenerate: () => void; // opens RegenerateModal
  onApprove: () => void;
}

export function ReviewPanel({
  selected,
  draftText,
  activeDraft,
  isSending,
  onDraftChange,
  onSkip,
  onReject,
  onRegenerate,
  onApprove,
}: ReviewPanelProps) {
  return (
    <div className="component-ReviewPanel flex-1 flex flex-col overflow-hidden">
      <ReviewPanelHeader
        selected={selected}
        isSending={isSending}
        onSkip={onSkip}
        onReject={onReject}
        onRegenerate={onRegenerate}
        onApprove={onApprove}
      />

      <div className="flex-1 flex overflow-hidden">
        <OriginalMessageColumn selected={selected} />
        <AIDraftColumn
          activeDraft={activeDraft}
          draftText={draftText}
          onDraftChange={onDraftChange}
        />
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ReviewPanelHeader({
  selected,
  isSending,
  onSkip,
  onReject,
  onRegenerate,
  onApprove,
}: Pick<
  ReviewPanelProps,
  | "selected"
  | "isSending"
  | "onSkip"
  | "onReject"
  | "onRegenerate"
  | "onApprove"
>) {
  return (
    <div className="py-3 px-5 border-b border-dpw-border flex flex-col justify-between items-start flex-shrink-0 bg-white">
      <div>
        <div className="font-serif text-[18px] font-semibold text-dpw-dark">
          {selected.sender_name}
        </div>
        <div className="text-[11px] text-dpw-muted mt-[3px] flex gap-[14px] flex-wrap">
          {selected.sender_email && <span>✉️ {selected.sender_email}</span>}
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

      <div className="flex gap-2 flex-shrink-0 mt-4">
        {/* Skip */}
        <Button
          onClick={onSkip}
          bgColor="bg-transparent hover:bg-[#faf8f3]"
          textColor="text-[#8a7a5a]"
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
                d="m7.49 12-3.75 3.75m0 0 3.75 3.75m-3.75-3.75h16.5V4.499"
              />
            </svg>
          }
        >
          Skip
        </Button>

        {/* Reject (was Discard — now opens modal for reason) */}
        <Button
          onClick={onReject}
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

        {/* Regenerate */}
        <Button
          onClick={onRegenerate}
          bgColor="bg-transparent hover:bg-[#faf8f3]"
          textColor="text-[#8a7a5a]"
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

        {/* Approve & Send */}
        <Button
          onClick={onApprove}
          disabled={isSending}
          bgColor="bg-[#3d7a5a] hover:bg-[#2d6048]"
          textColor="text-white"
          border="border-[#2d6048] hover:border-[#3d7a5a]"
          className="font-sans text-[13px] disabled:opacity-60 disabled:cursor-not-allowed"
          icon={
            isSending ? (
              <svg
                className="animate-spin size-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                />
              </svg>
            ) : (
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
            )
          }
        >
          {isSending ? "Sending…" : "Approve & Send"}
        </Button>
      </div>
    </div>
  );
}

function OriginalMessageColumn({ selected }: { selected: Message }) {
  return (
    <div className="flex-1 p-5 overflow-y-auto border-r border-dpw-border">
      <div className="text-[10px] font-semibold text-dpw-muted tracking-[0.08em] uppercase mb-3">
        Original Message
      </div>
      <div className="bg-white border border-dpw-border rounded-xl p-5 text-[13px] text-dpw-text leading-[1.75]">
        {(selected.body_raw ?? "(no content)").split("\n").map((line, i) => (
          <p key={i} className="mb-2.5">
            {line || <br />}
          </p>
        ))}
      </div>
    </div>
  );
}

function AIDraftColumn({
  activeDraft,
  draftText,
  onDraftChange,
}: {
  activeDraft: Message["drafts"][0] | null | undefined;
  draftText: string;
  onDraftChange: (text: string) => void;
}) {
  return (
    <div className="flex-1 p-5 overflow-y-auto flex flex-col">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="bg-dpw-dark text-dpw-gold-light px-[9px] py-[2px] rounded-xl text-[9px] font-bold tracking-[0.06em]">
          ✦ AI DRAFT
        </span>
        {activeDraft?.tone_confidence != null && (
          <span className="text-[10px] text-dpw-green">
            {activeDraft.tone_confidence}% tone match
          </span>
        )}
        {activeDraft?.version != null && (
          <span className="text-[10px] text-dpw-muted">
            v{activeDraft.version}
          </span>
        )}
      </div>
      <textarea
        value={draftText}
        onChange={(e) => onDraftChange(e.target.value)}
        className="flex-1 min-h-[260px] p-4 border border-dpw-border rounded-xl text-[13px] text-dpw-text leading-[1.75] resize-none bg-[#fffdf8] outline-none font-sans"
      />
      <div className="mt-2 flex justify-between text-[10px] text-dpw-muted">
        <span>✎ Click to edit before sending</span>
        <span>{draftText.length} characters</span>
      </div>
    </div>
  );
}
