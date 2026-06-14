import type { WikiGroup } from "@/lib/brain/types";
import WikiPageRow from "./WikiPageRow";

export default function WikiSection({ groups }: { groups: WikiGroup[] }) {
  if (groups.length === 0) {
    return (
      <section className="flex flex-col gap-2">
        <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">Wiki</h2>
        <p className="text-sm text-muted-foreground">No wiki pages yet.</p>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">Wiki</h2>
      {groups.map((g) => (
        <div key={g.domain} className="flex flex-col gap-1.5">
          <h3 className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-foreground/70">{g.domain}</h3>
          {g.pages.map((p) => <WikiPageRow key={p.slug} page={p} />)}
        </div>
      ))}
    </section>
  );
}
