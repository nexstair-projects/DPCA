"use client";

import { useState } from "react";
import type { Draft } from "@/app/types/message";

type Props = {
  drafts: Draft[];
  activeDraftId: string | null;
  onSelectVersion: (draft: Draft) => void;
};

export function VersionHistory({
  drafts,
  activeDraftId,
  onSelectVersion,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!drafts || drafts.length === 0) return null;

  const sorted = [...drafts].sort((a, b) => {
    const av = a.version ?? 0;
    const bv = b.version ?? 0;
    return bv - av;
  });

  if (sorted.length <= 1 && !expanded) {
    return (
      <div className="component-VersionHistory">

        <div className="text-[9px] tracking-[2px] uppercase text-dpw-muted mb-2.5 pb-1.5 border-b border-dpw-border">
          Versions
        </div>

        <div className="text-[11px] text-dpw-muted">
          v{sorted[0].version ?? 1} only
        </div>

      </div>
    );
  }

  return (
    <div>

      <div
        onClick={() => setExpanded((e) => !e)}
        className="text-[9px] tracking-[2px] uppercase text-dpw-muted mb-2.5 pb-1.5 border-b border-dpw-border flex justify-between items-center cursor-pointer select-none"
      >
        <span>Versions ({sorted.length})</span>

        <span className="text-[11px] leading-none">
          {expanded ? "▾" : "▸"}
        </span>
      </div>

      {expanded && (
        <div className="flex flex-col gap-1.5">

          {sorted.map((d) => {
            const isActive = d.id === activeDraftId;

            const ts = d.created_at
              ? new Date(d.created_at)
              : null;

            const tsLabel = ts
              ? `${ts.toLocaleDateString()} ${ts.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "—";

            return (
              <div
                key={d.id}
                onClick={() => onSelectVersion(d)}
                className={`px-[10px] py-2 rounded-md border cursor-pointer text-[11px] ${
                  isActive
                    ? "border-dpw-gold bg-dpw-gold-pale text-dpw-gold"
                    : "border-dpw-border bg-transparent text-dpw-text"
                }`}
              >

                <div className="flex justify-between items-center mb-[2px]">

                  <span className="font-semibold">
                    v{d.version ?? 1}
                  </span>

                  <span
                    className={`text-[9px] capitalize ${
                      isActive
                        ? "text-dpw-gold"
                        : "text-dpw-muted"
                    }`}
                  >
                    {(d.status ?? "pending_review").replace(/_/g, " ")}
                  </span>

                </div>

                <div className="text-[9.5px] text-dpw-muted">
                  {tsLabel}
                </div>

              </div>
            );
          })}

        </div>
      )}
    </div>
  );
}