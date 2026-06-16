"use client";

import { useState, useTransition } from "react";
import { replanFromNow } from "@/app/today/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wand2 } from "lucide-react";

function hoursLeftToday(): string {
  const now = new Date();
  const rem = Math.max(0, 23 * 60 - (now.getHours() * 60 + now.getMinutes()));
  const h = Math.floor(rem / 60);
  const m = rem % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** "Re-plan from now": one question → queues a request the brain routine acts on. */
export default function ReplanSheet() {
  const [open, setOpen] = useState(false);
  const [whatChanged, setWhatChanged] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function close() {
    setOpen(false);
    setDone(false);
    setWhatChanged("");
    setError(null);
  }

  function submit() {
    start(async () => {
      const res = await replanFromNow({
        whatChanged: whatChanged || undefined,
        timeLeft: hoursLeftToday(),
      });
      if (res?.error) { setError(res.error); return; }
      setDone(true);
    });
  }

  const border = { borderColor: "var(--glass-border)" };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-[3px] border px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.15em] text-primary transition-colors hover:bg-primary/10"
        style={border}
      >
        <Wand2 className="h-3 w-3" /> Re-plan
      </button>

      {open && (
        <>
          <div className="fixed inset-0 md:left-52 z-[60] bg-black/50" onClick={close} />
          <div
            className="fixed left-0 md:left-52 right-0 bottom-0 z-[70] rounded-t-2xl border-t bg-card px-5 pt-4 pb-10 shadow-2xl animate-slide-up"
            style={border}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/30" />

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
                  <div className="mt-0.5 flex items-baseline justify-between">
                    <h2 className="text-xl font-extrabold leading-tight">What changed?</h2>
                    <span className="font-mono text-[0.6rem] text-muted-foreground/60">~{hoursLeftToday()} left</span>
                  </div>
                </div>

                <Textarea
                  value={whatChanged}
                  onChange={(e) => setWhatChanged(e.target.value)}
                  rows={3}
                  placeholder="e.g. skipping gym, a call came up at 4"
                  className="resize-none bg-transparent"
                  style={border}
                />

                {error && <p className="text-xs text-destructive">{error}</p>}

                <Button onClick={submit} disabled={pending} size="sm" className="w-full">
                  {pending ? "Re-planning…" : "Re-plan my day"}
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
