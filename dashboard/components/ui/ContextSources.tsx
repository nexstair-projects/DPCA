"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
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

      <div className="text-[9px] tracking-[2px] uppercase text-dpw-muted mb-2.5 pb-1.5 border-b border-dpw-border">
        Context Sources
      </div>

      {!sourceIds || sourceIds.length === 0 ? (

        <div className="text-[11px] text-dpw-muted">
          None retrieved
        </div>

      ) : loading ? (

        <div className="text-[11px] text-dpw-muted">
          Loading…
        </div>

      ) : rows.length === 0 ? (

        <div className="text-[11px] text-dpw-muted">
          {sourceIds.length} source{sourceIds.length === 1 ? "" : "s"} (titles unavailable)
        </div>

      ) : (

        <div className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <a
              key={row.id}
              href={`/knowledge-base?id=${row.id}`}
              className="px-[10px] py-[7px] rounded-md border border-dpw-border bg-dpw-bg text-[11px] text-dpw-text no-underline block"
            >
              <div className="font-medium leading-[1.3]">
                {row.title}
              </div>

              {row.category && (
                <div className="text-[9px] text-dpw-muted mt-[2px] capitalize">
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