"use client";

import { useState } from "react";
import { S } from "@/lib/theme";

const PRESET_REASONS = [
  "Wrong tone for this client",
  "Contains incorrect information",
  "Too long — needs to be shorter",
  "Too generic — needs personalisation",
  "Missing key details",
  "Commission or pricing mentioned",
  "Not relevant to their question",
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export function RejectModal({ open, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await onSubmit(trimmed);
    } finally {
      setLoading(false);
      setReason("");
    }
  };

  const canSubmit = reason.trim().length > 0 && !loading;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26,22,18,0.48)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: S.white,
          borderRadius: 16,
          padding: 28,
          width: 480,
          maxWidth: "90vw",
          boxShadow: "0 20px 60px rgba(0,0,0,0.20)",
          border: `1px solid ${S.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 16, color: S.red }}>✕</span>
          <h2
            style={{
              fontFamily: S.serif,
              fontSize: 20,
              fontWeight: 600,
              color: S.dark,
              margin: 0,
            }}
          >
            Reject Draft
          </h2>
        </div>

        <p
          style={{
            fontSize: 12.5,
            color: S.muted,
            margin: "0 0 14px",
            lineHeight: 1.65,
          }}
        >
          Select a reason or write your own. This helps improve future drafts.
        </p>

        {/* Preset reasons */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {PRESET_REASONS.map((r) => {
            const active = reason === r;
            return (
              <button
                key={r}
                onClick={() => setReason(active ? "" : r)}
                style={{
                  padding: "5px 11px",
                  borderRadius: 20,
                  border: `1px solid ${active ? S.red : S.border}`,
                  background: active ? S.redBg : "transparent",
                  color: active ? S.red : S.muted,
                  fontSize: 11.5,
                  fontFamily: S.sans,
                  cursor: "pointer",
                  transition: "all 0.12s",
                }}
              >
                {r}
              </button>
            );
          })}
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Or type a custom reason…"
          style={{
            width: "100%",
            minHeight: 72,
            padding: "10px 14px",
            border: `1px solid ${S.border}`,
            borderRadius: 10,
            fontSize: 13,
            fontFamily: S.sans,
            color: S.text,
            lineHeight: 1.65,
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
            background: "#fffdf8",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 18,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: `1px solid ${S.border}`,
              background: "transparent",
              color: S.muted,
              fontSize: 12.5,
              fontFamily: S.sans,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              padding: "8px 22px",
              borderRadius: 8,
              border: "none",
              background: canSubmit ? S.red : S.border,
              color: canSubmit ? "#fff" : S.muted,
              fontSize: 12.5,
              fontFamily: S.sans,
              fontWeight: 600,
              cursor: canSubmit ? "pointer" : "not-allowed",
              transition: "all 0.12s",
            }}
          >
            {loading ? "Rejecting…" : "Reject Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}
