import { MessageItem } from "../ui/MessageItem";
import { Message } from "@/app/types/message";

const CHANNEL_TABS = [
  { key: "all", label: "All", icon: "" },
  { key: "gmail", label: "Gmail", icon: "✉️" },
  { key: "whatsapp", label: "WhatsApp", icon: "💬" },
  { key: "instagram", label: "Instagram", icon: "📸" },
];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "new_inquiry", label: "Inquiry" },
  { key: "existing_client", label: "Client" },
  { key: "vendor", label: "Vendor" },
  { key: "collaboration", label: "Collab" },
];

interface InboxListPanelProps {
  filtered: Message[];
  selectedId: string | null;
  isLoading: boolean;
  channelFilter: string;
  filter: string;
  onChannelFilterChange: (key: string) => void;
  onFilterChange: (key: string) => void;
  onSelect: (msg: Message) => void;
}

export function InboxListPanel({
  filtered,
  selectedId,
  isLoading,
  channelFilter,
  filter,
  onChannelFilterChange,
  onFilterChange,
  onSelect,
}: InboxListPanelProps) {
  return (
    <div className="component-InboxListPanel w-[310px] flex-shrink-0 border-r border-dpw-border flex flex-col bg-white">
      {/* Tabs */}
      <div className="px-3 pt-2 pb-0 border-b border-dpw-border">
        {/* Channel tabs */}
        <div className="flex gap-0.5 mb-1">
          {CHANNEL_TABS.map((ch) => (
            <button
              key={ch.key}
              onClick={() => onChannelFilterChange(ch.key)}
              className={`px-[9px] py-1 rounded-md text-[10px] cursor-pointer font-sans transition-all duration-100 ${
                channelFilter === ch.key
                  ? "bg-dpw-dark text-white font-semibold"
                  : "bg-transparent text-dpw-muted font-normal"
              }`}
            >
              {ch.icon} {ch.label}
            </button>
          ))}
        </div>

        {/* Category filter tabs */}
        <div className="flex gap-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`px-[9px] py-[5px] text-[10.5px] cursor-pointer font-sans transition-all duration-100 ${
                filter === f.key
                  ? "bg-dpw-gold text-white font-semibold"
                  : "bg-transparent text-dpw-muted font-normal"
              } rounded-t-md`}
            >
              {f.label}
              {f.key === "all" ? ` (${filtered.length})` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-6 text-dpw-muted text-[13px]">
            Loading messages…
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="p-6 text-dpw-muted text-[13px]">No messages</div>
        )}
        {filtered.map((msg) => (
          <MessageItem
            key={msg.id}
            msg={msg}
            isActive={msg.id === selectedId}
            onClick={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
