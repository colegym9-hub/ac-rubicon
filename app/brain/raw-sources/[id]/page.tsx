import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { getCapture, getWikiPages } from "@/lib/data/brain";
import CaptureStatusBadge from "@/components/brain/CaptureStatusBadge";
import RawSourceActions from "@/components/brain/RawSourceActions";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  note: "Note",
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  article: "Article",
  voice: "Voice memo",
  image: "Image",
  chat_answer: "Chat answer",
};

export default async function RawSourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [source, wikiGroups] = await Promise.all([getCapture(id), getWikiPages()]);
  if (!source) notFound();

  const wikiPages = wikiGroups.flatMap((g) =>
    g.pages.map((p) => ({ slug: p.slug, title: p.title, domain: g.domain })),
  );

  const isUrl = /^https?:\/\//i.test(source.raw_input);
  const border = { borderColor: "var(--glass-border)" };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-5 pt-12 pb-24">
      <header className="flex flex-col gap-1">
        <Link
          href="/brain/sources"
          className="mb-1 flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" /> Sources
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {TYPE_LABEL[source.type] ?? source.type}
            </span>
            <h1 className="text-2xl font-extrabold leading-tight">
              {source.title || "Untitled"}
            </h1>
          </div>
          <CaptureStatusBadge status={source.status} />
        </div>
        <p className="font-mono text-[0.6rem] text-muted-foreground">
          {new Date(source.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </header>

      {/* AI review reason */}
      {source.error_msg && (
        <div
          className="rounded-[var(--radius)] border bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300"
          style={border}
        >
          <p className="mb-0.5 font-mono text-[0.5rem] uppercase tracking-[0.15em] text-yellow-400/70">
            Review reason
          </p>
          {source.error_msg}
        </div>
      )}

      {/* Original source */}
      <section className="flex flex-col gap-2">
        <h2 className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-muted-foreground">
          Original source
        </h2>
        {isUrl ? (
          <a
            href={source.raw_input}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-[var(--radius)] border bg-card/50 px-3 py-2.5 text-sm text-primary transition-colors hover:bg-card"
            style={border}
          >
            <span className="min-w-0 flex-1 truncate">{source.raw_input}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        ) : (
          <pre
            className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words rounded-[var(--radius)] border bg-card/50 px-3 py-2.5 font-mono text-[0.65rem] leading-relaxed text-foreground/70"
            style={border}
          >
            {source.raw_input}
          </pre>
        )}
      </section>

      {/* Converted content */}
      {source.content_md ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-muted-foreground">
            Content
          </h2>
          <pre
            className="whitespace-pre-wrap break-words rounded-[var(--radius)] border bg-card/50 px-3 py-3 font-mono text-[0.65rem] leading-relaxed text-foreground/80"
            style={border}
          >
            {source.content_md}
          </pre>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">No content extracted yet.</p>
      )}

      {/* Filed to */}
      {source.pages.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-mono text-[0.55rem] uppercase tracking-[0.2em] text-muted-foreground">
            Filed to
          </h2>
          <div className="flex flex-col gap-1.5">
            {source.pages.map((p) => (
              <Link
                key={p.slug}
                href={`/brain/wiki/${p.slug}`}
                className="flex items-center gap-2 rounded-[var(--radius)] border bg-card/50 px-3 py-2.5 text-sm transition-colors hover:bg-card"
                style={border}
              >
                <span className="flex-1">{p.title}</span>
                <ChevronLeft className="h-3.5 w-3.5 rotate-180 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Actions for stuck sources */}
      {(source.status === "needs_review" || source.status === "error") && (
        <RawSourceActions source={source} wikiPages={wikiPages} />
      )}
    </main>
  );
}
