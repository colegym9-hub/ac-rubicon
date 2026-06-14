import { type ProgressMode } from "@/lib/database.types";
import { progressStatus } from "@/lib/labels";

export default function ProgressBar({
  pct,
  mode,
}: {
  pct: number;
  mode?: ProgressMode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground">
        <span>{progressStatus(pct)}</span>
        <span>
          {pct}%{mode === "auto" ? " · auto" : ""}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: "var(--color-muted)" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: "var(--color-primary)" }}
        />
      </div>
    </div>
  );
}
