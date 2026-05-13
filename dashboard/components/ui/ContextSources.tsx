"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { S } from "@/lib/theme";

type KbRow = { id: string; title: string; category: string | null };

type Props = {
  sourceIds: string[] | null | undefined;
};

export function ContextSources({ sourceIds }: Props) {
  const [rows, setRows] = useState<KbRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sourceIds || sourceIds.length === 0) {
      setRows([]);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("knowledge_base")
      .select("id, title, category")
      .in("id", sourceIds)
      .then(({ data }) => {
        setRows((data as KbRow[]) ?? []);
        setLoading(false);
      });
  }, [sourceIds]);

  return (
    <div className="component-ContextSources">
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
        Context Sources
      </div>
      {!sourceIds || sourceIds.length === 0 ? (
        <div style={{ fontSize: 11, color: S.muted }}>None retrieved</div>
      ) : loading ? (
        <div style={{ fontSize: 11, color: S.muted }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 11, color: S.muted }}>
          {sourceIds.length} source{sourceIds.length === 1 ? "" : "s"} (titles unavailable)
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map((row) => (
            <a
              key={row.id}
              href={`/knowledge-base?id=${row.id}`}
              style={{
                padding: "7px 10px",
                borderRadius: 8,
                border: `1px solid ${S.border}`,
                background: S.bg,
                fontSize: 11,
                color: S.text,
                textDecoration: "none",
                display: "block",
              }}
            >
              <div style={{ fontWeight: 500, lineHeight: 1.3 }}>{row.title}</div>
              {row.category && (
                <div
                  style={{
                    fontSize: 9,
                    color: S.muted,
                    marginTop: 2,
                    textTransform: "capitalize",
                  }}
                >
                  {row.category.replace(/_/g, " ")}
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
