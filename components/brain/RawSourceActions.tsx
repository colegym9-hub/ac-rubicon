"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, ClipboardCheck } from "lucide-react";
import type { CaptureDetail } from "@/lib/brain/types";
import ReviewSheet from "./ReviewSheet";

interface Props {
  source: CaptureDetail;
  wikiPages: { slug: string; title: string; domain: string }[];
}

export default function RawSourceActions({ source, wikiPages }: Props) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  async function retry() {
    setRetrying(true);
    try {
      await fetch(`/api/brain/captures/${source.id}/retry`, { method: "POST" });
      router.refresh();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setReviewing(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius)] border bg-card/50 py-2.5 text-sm font-medium transition-colors hover:bg-card"
          style={{ borderColor: "var(--glass-border)" }}
        >
          <ClipboardCheck className="h-4 w-4" /> Review & file
        </button>
        <button
          type="button"
          onClick={retry}
          disabled={retrying}
          className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius)] border border-primary/40 bg-primary/10 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
        >
          <RotateCcw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
          {retrying ? "Queuing…" : "Re-ingest"}
        </button>
      </div>

      {reviewing && (
        <ReviewSheet
          source={{
            ...source,
            raw_input: source.raw_input ?? null,
          }}
          pages={wikiPages}
          onClose={() => setReviewing(false)}
        />
      )}
    </>
  );
}
