import { CategoryBadge } from "./CategoryBadge";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Message } from "@/app/types/message";
import { S } from "@/lib/theme";

type MessageItemProps = {
  msg: Message;
  isActive: boolean;
  onClick: (msg: Message) => void;
  messageCount?: number;
};

const relativeTime = (iso: string) => {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: false });
  } catch {
    return "";
  }
};

/* Message Item Component */
export function MessageItem({ msg, isActive, onClick, messageCount }: MessageItemProps) {
  const count = messageCount ?? msg.conversation_count ?? msg.conversation?.length ?? 1;
  const activityAt = msg.latest_message_at ?? msg.received_at ?? msg.created_at;

  return (
    <div
      className={`message-item px-4 py-[14px] border-b border-[#f0e8d4] cursor-pointer transition-all duration-100 ${
        isActive
          ? "bg-dpw-gold-pale border-l-2 border-l-dpw-gold"
          : "bg-transparent border-l-2 border-l-transparent"
      }`}
      key={msg.id}
      onClick={() => onClick(msg)}
    >
      <div className="flex justify-between items-center mb-0.5">
        <div>
          <h6 className="font-sans font-medium text-[14px] text-dpw-dark">
            {msg.sender_name ?? "Unknown"}
          </h6>
        </div>
        <span className="font-sans text-[10px] text-dpw-muted">
          {relativeTime(activityAt)}
        </span>
      </div>

      <div>
        <h4 className="font-sans font-regular text-[12px] mb-0.5">
          {msg.subject ?? "(no subject)"}
        </h4>
      </div>

      <div>
        <p className="font-sans text-[11px] text-dpw-muted">
          {(msg.body_raw ?? "").substring(0, 80)}
        </p>
      </div>

      <div className="mt-1 flex items-center justify-between">
        <div>
          <CategoryBadge category={msg.category} />
          {(msg.tier === 3 || (msg.estimated_value != null && msg.estimated_value >= 5000)) && (
            <CategoryBadge category="high_value" className="ml-2" />
          )}
        </div>
        {count > 1 && (
          <div
            style={{
              background: S.bg,
              color: S.muted,
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 999,
              border: `1px solid ${S.border}`,
            }}
          >
            {count} messages
          </div>
        )}
      </div>
    </div>
  );
}
