import Link from "next/link";
import type { ReactNode, ElementType } from "react";

// Minimal, XSS-safe markdown renderer for wiki pages + chat answers. Builds React
// nodes directly (no dangerouslySetInnerHTML), so external source content can't
// inject markup. Handles the subset the brain uses: headings, paragraphs,
// bullet/number lists, blockquotes, hr, and inline bold / italic / code / links /
// [[wiki-links]].

const INLINE =
  /(\[\[([a-z0-9-]+)\]\])|(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\*([^*]+)\*)/g;

function inline(text: string, kp: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${kp}-${n++}`;
    if (m[2]) {
      out.push(
        <Link key={key} href={`/brain/wiki/${m[2]}`} className="text-primary underline underline-offset-2">
          {m[2].replace(/-/g, " ")}
        </Link>,
      );
    } else if (m[4]) {
      // Only allow http(s) hrefs — block javascript:/data: etc.
      const href = /^https?:\/\//i.test(m[5]) ? m[5] : "#";
      out.push(
        <a key={key} href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
          {m[4]}
        </a>,
      );
    } else if (m[7]) {
      out.push(<strong key={key} className="font-semibold text-foreground">{m[7]}</strong>);
    } else if (m[9]) {
      out.push(<code key={key} className="rounded bg-muted/40 px-1 py-0.5 font-mono text-[0.85em]">{m[9]}</code>);
    } else if (m[11]) {
      out.push(<em key={key}>{m[11]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const isBlockStart = (l: string) => /^(#{1,6}\s|\s*[-*]\s|\s*\d+\.\s|>\s?|---+\s*$)/.test(l);

export default function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (/^---+\s*$/.test(line.trim())) {
      blocks.push(<hr key={key++} className="my-5 border-[color:var(--glass-border)]" />);
      i++;
      continue;
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const lvl = h[1].length;
      const Tag = `h${Math.min(lvl + 1, 6)}` as ElementType;
      const cls =
        lvl <= 1 ? "mt-5 mb-2 text-xl font-extrabold"
        : lvl === 2 ? "mt-5 mb-2 text-lg font-bold"
        : "mt-4 mb-1.5 text-base font-bold";
      blocks.push(<Tag key={key++} className={cls}>{inline(h[2], `h${key}`)}</Tag>);
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: ReactNode[] = [];
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s*\d+\.\s+/.test(lines[i]))) {
        const text = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, "");
        items.push(<li key={items.length} className="ml-1">{inline(text, `li${key}-${items.length}`)}</li>);
        i++;
      }
      const ListTag = (ordered ? "ol" : "ul") as ElementType;
      blocks.push(
        <ListTag key={key++} className={`my-2 flex flex-col gap-1 pl-5 text-sm ${ordered ? "list-decimal" : "list-disc"}`}>
          {items}
        </ListTag>,
      );
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { quote.push(lines[i].replace(/^>\s?/, "")); i++; }
      blocks.push(
        <blockquote key={key++} className="my-3 border-l-2 border-primary/50 pl-3 text-sm italic text-muted-foreground">
          {inline(quote.join(" "), `bq${key}`)}
        </blockquote>,
      );
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) { para.push(lines[i]); i++; }
    blocks.push(<p key={key++} className="my-2 text-sm leading-relaxed">{inline(para.join(" "), `p${key}`)}</p>);
  }

  return <div className="text-foreground">{blocks}</div>;
}
