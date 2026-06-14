import type { RefObject } from "react";
import type { Action } from "./useCommandActions";

export default function CommandList({
  actions,
  sel,
  onHover,
  listRef,
}: {
  actions: Action[];
  sel: number;
  onHover: (i: number) => void;
  listRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
      {actions.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</p>
      ) : (
        actions.map((a, i) => {
          const header = i === 0 || actions[i - 1].section !== a.section ? a.section : null;
          return (
            <div key={a.id}>
              {header ? (
                <div className="px-3 pb-1 pt-3 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-muted-foreground">
                  {header}
                </div>
              ) : null}
              <button
                type="button"
                data-idx={i}
                onMouseEnter={() => onHover(i)}
                onClick={a.run}
                className="flex w-full items-center justify-between gap-3 rounded-[var(--radius)] px-3 py-2.5 text-left text-sm transition-colors"
                style={{
                  background:
                    i === sel ? "color-mix(in oklch, var(--color-primary) 18%, transparent)" : "transparent",
                }}
              >
                <span className="truncate">{a.label}</span>
                {a.hint ? (
                  <span className="shrink-0 font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground">
                    {a.hint}
                  </span>
                ) : null}
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
