"use client";

import { useState } from "react";
import { S } from "@/lib/theme";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (instructions: string) => Promise<void>;
}

export function RegenerateModal({ open, onClose, onSubmit }: Props) {
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(instructions.trim());
    } finally {
      setLoading(false);
      setInstructions("");
    }
  };

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
          <span
            style={{
              fontFamily: S.serif,
              fontSize: 20,
              color: S.gold,
              lineHeight: 1,
            }}
          >
            ✦
          </span>
          <h2
            style={{
              fontFamily: S.serif,
              fontSize: 20,
              fontWeight: 600,
              color: S.dark,
              margin: 0,
            }}
          >
            Regenerate Draft
          </h2>
        </div>

        <p
          style={{
            fontSize: 12.5,
            color: S.muted,
            margin: "0 0 16px",
            lineHeight: 1.65,
          }}
        >
          Tell the AI what to improve. Leave blank to regenerate with the same
          context.
        </p>

        {/* Suggestion chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {[
            "Make it shorter",
            "Warmer tone",
            "More personal",
            "Add call-to-action",
          ].map((chip) => (
            <button
              key={chip}
              onClick={() => setInstructions(chip)}
              style={{
                padding: "4px 10px",
                borderRadius: 20,
                border: `1px solid ${instructions === chip ? S.gold : S.border}`,
                background: instructions === chip ? S.pale : "transparent",
                color: instructions === chip ? S.gold : S.muted,
                fontSize: 11,
                fontFamily: S.sans,
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. Mention the Château de Vaux-le-Vicomte venue, keep under 200 words…"
          autoFocus
          style={{
            width: "100%",
            minHeight: 96,
            padding: "12px 14px",
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
            disabled={loading}
            style={{
              padding: "8px 22px",
              borderRadius: 8,
              border: "none",
              background: loading ? S.border : S.dark,
              color: loading ? S.muted : S.gold,
              fontSize: 12.5,
              fontFamily: S.sans,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.12s",
            }}
          >
            {loading ? "Requesting…" : "✦ Regenerate"}
          </button>
        </div>
      </div>
    </div>
  );
}
