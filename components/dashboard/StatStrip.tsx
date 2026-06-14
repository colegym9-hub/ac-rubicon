// Headline "at a glance" stat cards (Kinhive pattern: big number + label +
// teal underline accent). Server component — pure presentation.

export type Stat = {
  label: string;
  value: string;
  hint?: string;
};

export default function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col gap-1 rounded-[var(--radius)] border bg-card/60 p-3 backdrop-blur-md"
          style={{ borderColor: "var(--glass-border)" }}
        >
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">
            {s.label}
          </span>
          <span className="text-2xl font-extrabold leading-none">{s.value}</span>
          {s.hint ? (
            <span className="text-[0.7rem] text-muted-foreground">{s.hint}</span>
          ) : null}
          <span
            className="mt-1 h-[2px] w-8 rounded-full"
            style={{ background: "var(--color-primary)" }}
          />
        </div>
      ))}
    </div>
  );
}
