import Link from "next/link";
import type { WikiSummary } from "@/lib/brain/types";
import { Pin } from "lucide-react";

export default function WikiPageRow({ page }: { page: WikiSummary }) {
  return (
    <Link
      href={`/brain/wiki/${page.slug}`}
      className="flex items-start gap-2 rounded-[var(--radius)] border bg-card/50 px-3 py-2.5 transition-colors hover:bg-card"
      style={{ borderColor: "var(--glass-border)" }}
    >
      {page.pinned && <Pin className="mt-0.5 h-3 w-3 shrink-0 text-primary" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{page.title}</span>
        {page.overview && (
          <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{page.overview}</span>
        )}
      </span>
    </Link>
  );
}
