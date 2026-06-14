"use client";

import { useState, useTransition } from "react";
import { replanFromNow } from "@/app/today/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, X } from "lucide-react";

const TIME_OPTIONS = ["1h", "2h", "3h", "4h+"];

/** "Re-plan from now": two quick questions → queues a request the brain routine
 *  acts on to rewrite the rest of today. Self-contained trigger + modal. */
export default function ReplanSheet() {
  const [open, setOpen] = useState(false);
  const [whatChanged, setWhatChanged] = useState("");
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function close() {
    setOpen(false);
    setDone(false);
    setWhatChanged("");
    setTimeLeft(null);
    setError(null);
  }

  function submit() {
    start(async () => {
      const res = await replanFromNow({
        whatChanged: whatChanged || undefined,
        timeLeft: timeLeft || undefined,
      });
      if (res?.error) { setError(res.error); return; }
      setDone(true);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-[3px] border px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.15em] text-primary transition-colors hover:bg-primary/10"
        style={{ borderColor: "var(--glass-border)" }}
      >
        <Wand2 className="h-3 w-3" /> Re-plan
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center md:pl-52" onClick={close}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-t-2xl border bg-card p-5 pb-8 shadow-2xl md:rounded-2xl"
            style={{ borderColor: "var(--glass-border)" }}
          >
            <button type="button" onClick={close} aria-label="Close" className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-5 w-5" />
            </button>

            {done ? (
              <div className="flex flex-col gap-3">
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">On it</span>
                <h2 className="text-xl font-extrabold leading-tight">Re-planning <span className="accent">the rest of today.</span></h2>
                <p className="text-sm text-muted-foreground">Your updated plan will land on the timeline shortly.</p>
                <Button onClick={close} size="sm" className="mt-1 w-full">Done</Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">Re-plan from now</span>
                  <h2 className="mt-1 text-xl font-extrabold leading-tight">Two quick things.</h2>
                </div>

                <div>
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">What changed?</span>
                  <Textarea
                    value={whatChanged}
                    onChange={(e) => setWhatChanged(e.target.value)}
                    rows={2}
                    placeholder="e.g. skipping the gym, a call came up at 4"
                    className="mt-1.5 resize-none bg-transparent"
                    style={{ borderColor: "var(--glass-border)" }}
                  />
                </div>

                <div>
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">Time left today?</span>
                  <div className="mt-1.5 flex gap-2">
                    {TIME_OPTIONS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTimeLeft(timeLeft === t ? null : t)}
                        className={["flex-1 rounded-[var(--radius)] border py-2 text-sm font-medium transition-colors",
                          timeLeft === t ? "border-primary bg-primary text-primary-foreground" : "border-muted/50 text-muted-foreground hover:border-border hover:text-foreground"].join(" ")}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <Button onClick={submit} disabled={pending} size="sm" className="w-full">
                  {pending ? "Re-planning…" : "Re-plan my day"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
