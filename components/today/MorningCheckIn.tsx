"use client";

import { useState, useEffect, useTransition } from "react";
import { saveRecapForDate } from "@/app/today/actions";
import type { DailyLog } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

const KEY_PREFIX = "rubicon:checkin:";
const localToday = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, browser-local
const pretty = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

interface Props {
  yesterday: string;
  yesterdayLog: DailyLog | null;
}

/** WHOOP-style morning pop-up: shows once per local day. If yesterday wasn't
 *  logged, fill it out; if it was, review it. X dismisses for the day. */
export default function MorningCheckIn({ yesterday, yesterdayLog }: Props) {
  const [visible, setVisible] = useState(false);
  const [recap, setRecap] = useState("");
  const [energy, setEnergy] = useState<number | null>(null);
  const [blocks, setBlocks] = useState("");
  const [slipped, setSlipped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      if (localStorage.getItem(`${KEY_PREFIX}${localToday()}`) !== "seen") setVisible(true);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith(KEY_PREFIX)) {
          const d = k.slice(KEY_PREFIX.length);
          if (new Date(`${d}T00:00:00`) < cutoff) localStorage.removeItem(k);
        }
      }
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    try { localStorage.setItem(`${KEY_PREFIX}${localToday()}`, "seen"); } catch {}
    setVisible(false);
  }

  function save() {
    start(async () => {
      const res = await saveRecapForDate(yesterday, {
        recap: recap || undefined,
        energy,
        slotsDone: blocks ? Number(blocks) : null,
        slotsSlipped: slipped || undefined,
      });
      if (res?.error) { setError(res.error); return; }
      dismiss();
    });
  }

  if (!visible) return null;
  const reviewing = !!yesterdayLog;
  const labelCls = "font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 md:items-center md:pl-52">
      <div
        className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border bg-card p-5 shadow-2xl md:rounded-2xl animate-slide-up"
        style={{ borderColor: "var(--glass-border)", paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground">
          <X className="h-5 w-5" />
        </button>

        <span className={labelCls}>Good morning</span>
        <h2 className="mt-1 text-2xl font-extrabold leading-tight">
          {reviewing ? <>Yesterday, <span className="accent">recapped.</span></> : <>How did <span className="accent">yesterday</span> go?</>}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{pretty(yesterday)}</p>

        {reviewing ? (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex gap-3">
              <Stat label="Energy" value={yesterdayLog!.energy != null ? `${yesterdayLog!.energy}/5` : "—"} />
              <Stat label="Blocks" value={yesterdayLog!.slots_done != null ? String(yesterdayLog!.slots_done) : "—"} />
            </div>
            {yesterdayLog!.recap_text && (
              <p className="rounded-[var(--radius)] border bg-card/60 p-3 text-sm text-foreground" style={{ borderColor: "var(--glass-border)" }}>
                {yesterdayLog!.recap_text}
              </p>
            )}
            {yesterdayLog!.slots_slipped && (
              <p className="text-xs text-muted-foreground"><span className={labelCls}>Slipped</span> · {yesterdayLog!.slots_slipped}</p>
            )}
            <Button onClick={dismiss} size="sm" className="mt-1 w-full">Start today →</Button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            <Field label="Recap">
              <Textarea value={recap} onChange={(e) => setRecap(e.target.value)} rows={3} placeholder="What happened yesterday?" className="mt-1.5 resize-none bg-transparent" style={{ borderColor: "var(--glass-border)" }} />
            </Field>
            <Field label="Energy">
              <div className="mt-1.5 flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setEnergy(energy === n ? null : n)}
                    className={["flex h-9 w-9 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                      energy === n ? "border-primary bg-primary text-primary-foreground" : "border-muted/50 text-muted-foreground hover:border-border hover:text-foreground"].join(" ")}>
                    {n}
                  </button>
                ))}
              </div>
            </Field>
            <div className="flex gap-3">
              <Field label="Blocks done" className="flex-1">
                <Input type="number" min={0} value={blocks} onChange={(e) => setBlocks(e.target.value)} className="mt-1.5 bg-transparent" style={{ borderColor: "var(--glass-border)" }} />
              </Field>
              <Field label="What slipped?" className="flex-[2]">
                <Input value={slipped} onChange={(e) => setSlipped(e.target.value)} placeholder="optional" className="mt-1.5 bg-transparent" style={{ borderColor: "var(--glass-border)" }} />
              </Field>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={dismiss} variant="outline" size="sm" className="flex-1" style={{ borderColor: "var(--glass-border)" }}>Skip</Button>
              <Button onClick={save} disabled={pending} size="sm" className="flex-[2]">{pending ? "Saving…" : "Save & start today"}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-[var(--radius)] border bg-card/60 p-3" style={{ borderColor: "var(--glass-border)" }}>
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
      <p className="text-lg font-extrabold leading-none">{value}</p>
    </div>
  );
}
