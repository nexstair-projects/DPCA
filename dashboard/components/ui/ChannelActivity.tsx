import React from "react";

type ChannelKey = "gmail" | "whatsapp" | "instagram";

type Props = {
  channelCounts: Record<ChannelKey, number> & { total: number };
};

const CHANNELS = [
  {
    key: "gmail" as const,
    icon: "✉",
    label: "Gmail",
    color: "bg-[#c23b22]",
    iconBg: "bg-[#fde8e8]",
    iconColor: "text-[#c23b22]",
  },
  {
    key: "whatsapp" as const,
    icon: "💬",
    label: "WhatsApp",
    color: "bg-[#25a244]",
    iconBg: "bg-[#e8f7ee]",
    iconColor: "text-[#25a244]",
  },
  {
    key: "instagram" as const,
    icon: "📸",
    label: "Instagram",
    color: "bg-[#8b5cf6]",
    iconBg: "bg-[#f3eeff]",
    iconColor: "text-[#8b5cf6]",
  },
];

export function ChannelActivity({ channelCounts }: Props) {
  return (
    <div>
      {/* Header */}
      <div className="text-[9px] tracking-[2px] uppercase text-[#9c8f6f] mb-[10px] pb-[6px] border-b border-[#e8dfc8]">
        Channel Activity
      </div>

      {/* List */}
      <div className="flex flex-col gap-[7px]">
        {CHANNELS.map((ch) => {
          const count = channelCounts[ch.key];
          const pct = Math.round((count / channelCounts.total) * 100) || 0;

          return (
            <div key={ch.key} className="flex items-center gap-2">
              {/* Icon */}
              <div
                className={`w-[18px] h-[18px] rounded flex items-center justify-center text-[10px] flex-shrink-0 ${ch.iconBg} ${ch.iconColor}`}
              >
                {ch.icon}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="text-[11px] text-[#333] mb-[3px]">
                  {ch.label}{" "}
                  <span className="text-[#999]">· {count} msgs</span>
                </div>

                {/* Bar */}
                <div className="h-[4px] bg-[#e8dfc8] rounded overflow-hidden">
                  <div
                    className={`h-full rounded transition-all duration-300 ${ch.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}