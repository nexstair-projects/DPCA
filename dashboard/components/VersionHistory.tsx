"use client";

import { useState } from "react";
import { S } from "@/lib/theme";
import type { Draft } from "@/app/types/message";

type Props = {
  drafts: Draft[];
  activeDraftId: string | null;
  onSelectVersion: (draft: Draft) => void;
};

export function VersionHistory({ drafts, activeDraftId, onSelectVersion }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!drafts || drafts.length === 0) return null;

  const sorted = [...drafts].sort((a, b) => {
    const av = a.version ?? 0;
    const bv = b.version ?? 0;
    return bv - av;
  });

  if (sorted.length <= 1 && !expanded) {
    return (
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
          Versions
        </div>
        <div style={{ fontSize: 11, color: S.muted }}>
          v{sorted[0].version ?? 1} only
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => setExpanded((e) => !e)}
        style={{
          fontSize: 9,
          letterSpacing: "2px",
          textTransform: "uppercase",
          color: S.muted,
          marginBottom: 10,
          paddingBottom: 6,
          borderBottom: `1px solid ${S.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <span>Versions ({sorted.length})</span>
        <span style={{ fontSize: 11, lineHeight: 1 }}>{expanded ? "▾" : "▸"}</span>
      </div>
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sorted.map((d) => {
            const isActive = d.id === activeDraftId;
            const ts = d.created_at ? new Date(d.created_at) : null;
            const tsLabel = ts
              ? `${ts.toLocaleDateString()} ${ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "—";
            return (
              <div
                key={d.id}
                onClick={() => onSelectVersion(d)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: `1px solid ${isActive ? S.gold : S.border}`,
                  background: isActive ? S.pale : "transparent",
                  cursor: "pointer",
                  fontSize: 11,
                  color: isActive ? S.gold : S.text,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 2,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>v{d.version ?? 1}</span>
                  <span
                    style={{
                      fontSize: 9,
                      color: isActive ? S.gold : S.muted,
                      textTransform: "capitalize",
                    }}
                  >
                    {(d.status ?? "pending_review").replace(/_/g, " ")}
                  </span>
                </div>
                <div style={{ fontSize: 9.5, color: S.muted }}>{tsLabel}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
