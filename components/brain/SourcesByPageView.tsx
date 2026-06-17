"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SourcesByPageResult, PageWithSources, PendingSource } from "@/lib/brain/types";
import type { RawSourceType } from "@/lib/database.types";
import Link from "next/link";
import {
  FileText, Video, Camera, Link2, Mic, Image as ImageIcon, MessageSquare,
  Music2, ChevronDown, ChevronRight, RotateCcw, AlertCircle, ClipboardCheck,
} from "lucide-react";
import CaptureStatusBadge from "./CaptureStatusBadge";
import ReviewSheet from "./ReviewSheet";

const ICON: Record<RawSourceType, typeof FileText> = {
  note: FileText,
  youtube: Video,
  instagram: Camera,
  tiktok: Music2,
  article: Link2,
  voice: Mic,
  image: ImageIcon,
  chat_answer: MessageSquare,
};

function PageAccordion({ page }: { page: PageWithSources }) {
  const [open, setOpen] = useState(false);
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-[var(--radius)] border bg-card/50 px-3 py-2.5 text-left transition-colors hover:bg-card"
        style={{ borderColor: "var(--glass-border)" }}
      >
        <Chevron className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{page.title}</span>
        <span className="shrink-0 font-mono text-[0.5rem] text-muted-foreground">
          {page.sources.length} {page.sources.length === 1 ? "source" : "sources"}
        </span>
      </button>
      {open && page.sources.length > 0 && (
        <div
          className="ml-5 mt-1 flex flex-col gap-1 border-l pl-3"
          style={{ borderColor: "var(--glass-border)" }}
        >
          {page.sources.map((s) => {
            const Icon = ICON[s.type] ?? FileText;
            return (
              <Link
                key={s.id}
                href={`/brain/raw-sources/${s.id}`}
                className="flex items-center gap-2 py-1 transition-opacity hover:opacity-70"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground/80">
                  {s.title || "Untitled"}
                </span>
                <CaptureStatusBadge status={s.status} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface PendingRowProps {
  source: PendingSource;
  pages: { slug: string; title: string; domain: string }[];
  onRetried: () => void;
}

function PendingRow({ source, pages, onRetried }: PendingRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const Icon = ICON[source.type] ?? FileText;
  const canAct = source.status === "needs_review" || source.status === "error";
  const preview = source.content_md?.slice(0, 400) ?? source.raw_input?.slice(0, 400);

  async function retry() {
    setRetrying(true);
    try {
      await fetch(`/api/brain/captures/${source.id}/retry`, { method: "POST" });
      onRetried();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <>
      <div
        className="flex flex-col gap-2 rounded-[var(--radius)] border bg-card/50 px-3 py-2.5"
        style={{ borderColor: "var(--glass-border)" }}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Link
            href={`/brain/raw-sources/${source.id}`}
            className="min-w-0 flex-1 truncate text-sm transition-opacity hover:opacity-70"
          >
            {source.title || "Untitled"}
          </Link>
          <CaptureStatusBadge status={source.status} />
        </div>

        {source.error_msg && (
          <div className="flex items-start gap-1.5 rounded bg-yellow-500/10 px-2 py-1.5 text-xs text-yellow-300">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="break-words">{source.error_msg}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {preview && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="font-mono text-[0.5rem] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {expanded ? "Hide" : "Preview"}
            </button>
          )}
          {canAct && (
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setReviewing(true)}
                className="flex items-center gap-1 rounded-[3px] border px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-foreground transition-colors hover:bg-card"
                style={{ borderColor: "var(--glass-border)" }}
              >
                <ClipboardCheck className="h-2.5 w-2.5" /> Review
              </button>
              <button
                type="button"
                onClick={retry}
                disabled={retrying}
                className="flex items-center gap-1 rounded-[3px] border px-2 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                style={{ borderColor: "var(--glass-border)" }}
              >
                <RotateCcw className="h-2.5 w-2.5" />
                {retrying ? "Queuing…" : "Re-ingest"}
              </button>
            </div>
          )}
        </div>

        {expanded && preview && (
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded bg-muted/30 px-2 py-1.5 font-mono text-[0.6rem] leading-relaxed text-muted-foreground">
            {preview}
          </pre>
        )}
      </div>

      {reviewing && (
        <ReviewSheet
          source={source}
          pages={pages}
          onClose={() => setReviewing(false)}
        />
      )}
    </>
  );
}

export default function SourcesByPageView({ data }: { data: SourcesByPageResult }) {
  const router = useRouter();
  const [tab, setTab] = useState<"pages" | "pending">("pages");

  const totalSources = data.groups.reduce(
    (a, g) => a + g.pages.reduce((b, p) => b + p.sources.length, 0),
    0,
  );

  // Flat list of all wiki pages for the review sheet's page selector
  const allPages = data.groups.flatMap((g) =>
    g.pages.map((p) => ({ slug: p.slug, title: p.title, domain: g.domain })),
  );

  function onRetried() {
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b" style={{ borderColor: "var(--glass-border)" }}>
        {(["pages", "pending"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`pb-2 pt-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] transition-colors ${
              tab === t
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "pages"
              ? `By Page (${totalSources})`
              : `Pending (${data.pending.length})`}
          </button>
        ))}
      </div>

      {tab === "pages" && (
        <div className="flex flex-col gap-5">
          {data.groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No wiki pages yet.</p>
          ) : (
            data.groups.map((g) => (
              <div key={g.domain} className="flex flex-col gap-1.5">
                <h3 className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-muted-foreground/70">
                  {g.domain}
                </h3>
                {g.pages.map((p) => (
                  <PageAccordion key={p.slug} page={p} />
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "pending" && (
        <div className="flex flex-col gap-2">
          {data.pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing pending — all captures are filed.
            </p>
          ) : (
            data.pending.map((s) => (
              <PendingRow key={s.id} source={s} pages={allPages} onRetried={onRetried} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
