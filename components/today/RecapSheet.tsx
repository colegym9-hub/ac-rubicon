"use client";

import { useState, useRef, useCallback, useTransition, useEffect, useMemo } from "react";
import { saveRecap } from "@/app/today/actions";
import type { DailyLog } from "@/lib/database.types";
import { isLogged, type DayBlock } from "@/lib/day";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BookOpen, ChevronDown, SlidersHorizontal } from "lucide-react";

// ─── Field config ─────────────────────────────────────────────────────────────

type FieldType = "longtext" | "text" | "rating";

interface LogField {
  id: string;
  label: string;
  type: FieldType;
  enabled: boolean;
  order: number;
  db: boolean;
}

const ALL_FIELDS: LogField[] = [
  { id: "recap",     label: "Recap",         type: "longtext", enabled: true,  order: 0, db: true },
  { id: "energy",    label: "Energy",        type: "rating",   enabled: true,  order: 1, db: true },
  { id: "slipped",   label: "What slipped?", type: "text",     enabled: true,  order: 2, db: true },
  { id: "mood",      label: "Mood",          type: "rating",   enabled: false, order: 3, db: false },
  { id: "wins",      label: "Wins",          type: "longtext", enabled: false, order: 4, db: false },
  { id: "tomorrow",  label: "Tomorrow",      type: "text",     enabled: true,  order: 5, db: false },
  { id: "gratitude", label: "Gratitude",     type: "text",     enabled: false, order: 6, db: false },
];

// Only the field layout (which fields are on + their order) is a device-local
// preference; the field *values* now live on the dated daily_logs row.
const LS_FIELDS = "rubicon:log-fields";

type BlockCompletion = Record<string, { pct: number; note: string }>;

/** The day's optional log content, persisted in daily_logs.extra (jsonb) so it is
 *  tied to the date + readable by the MCP — replaces the old localStorage blobs.
 *  The "tomorrow" field is NOT here; it write-forwards to tomorrow's plan_note. */
type LogExtra = {
  fields?: Record<string, string>; // mood / wins / gratitude / custom (non-core, non-tomorrow)
  blocks?: BlockCompletion;        // per-block { pct, note } keyed by block id
};

function mergeWithSaved(base: LogField[]): LogField[] {
  try {
    const raw = localStorage.getItem(LS_FIELDS);
    if (!raw) return base;
    const saved = JSON.parse(raw) as { id: string; enabled: boolean; order: number }[];
    return base
      .map((f) => {
        const s = saved.find((x) => x.id === f.id);
        return s ? { ...f, enabled: s.enabled, order: s.order } : f;
      })
      .sort((a, b) => a.order - b.order);
  } catch {
    return base;
  }
}

function persistFields(fields: LogField[]) {
  localStorage.setItem(
    LS_FIELDS,
    JSON.stringify(fields.map((f) => ({ id: f.id, enabled: f.enabled, order: f.order }))),
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SheetState = "closed" | "half" | "full";

interface Props {
  log: DailyLog | null;
  blocks: DayBlock[];
  /** Tomorrow's existing plan_note — seeds the "Tomorrow" field so it's idempotent. */
  tomorrowNote: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecapSheet({ log, blocks, tomorrowNote }: Props) {
  const [sheetState, setSheetState]           = useState<SheetState>("closed");
  const [editingFields, setEditing]           = useState(false);
  const [fields, setFields]                   = useState<LogField[]>(ALL_FIELDS);
  const [values, setValues]                   = useState<Record<string, string>>({});
  const [blockCompletion, setBlockCompletion] = useState<BlockCompletion>({});
  const [saved, setSaved]                     = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [pending, start]                      = useTransition();

  const dragStartY    = useRef<number | null>(null);
  const THRESHOLD     = 60;

  // Seed the form on mount from the dated row (daily_logs.extra) + tomorrow's note.
  useEffect(() => {
    setFields(mergeWithSaved(ALL_FIELDS));

    const stored: LogExtra =
      log?.extra && typeof log.extra === "object" ? (log.extra as LogExtra) : {};

    setValues({
      recap:    log?.recap_text    ?? "",
      energy:   log?.energy    != null ? String(log.energy) : "",
      slipped:  log?.slots_slipped ?? "",
      ...(stored.fields ?? {}),
      tomorrow: tomorrowNote ?? "",
    });

    // Block completion: seed from block.done, then overlay the saved per-block data.
    const fromBlocks: BlockCompletion = Object.fromEntries(
      blocks.map(b => [b.id, { pct: b.done ? 100 : 0, note: "" }])
    );
    const savedCompletion = stored.blocks ?? {};
    const merged: BlockCompletion = { ...fromBlocks };
    for (const id of Object.keys(savedCompletion)) {
      if (id in fromBlocks) merged[id] = savedCompletion[id];
    }
    setBlockCompletion(merged);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Gestures ────────────────────────────────────────────────────────────────

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (dragStartY.current === null) return;
      const delta = e.clientY - dragStartY.current;
      dragStartY.current = null;
      if (delta < -THRESHOLD && sheetState === "half") setSheetState("full");
      if (delta > THRESHOLD  && sheetState === "full") { setSheetState("half"); setEditing(false); }
      if (delta > THRESHOLD  && sheetState === "half") setSheetState("closed");
    },
    [sheetState],
  );

  // ── Field value helpers ──────────────────────────────────────────────────────

  const get = (id: string) => values[id] ?? "";
  const set = (id: string, val: string) => {
    setValues((prev) => ({ ...prev, [id]: val }));
    setSaved(false);
  };

  // ── Block completion helpers ─────────────────────────────────────────────────

  // Block completion lives in component state and is persisted (to daily_logs.extra)
  // together with the rest of the log on Save — no per-keystroke writes.
  const setBlockPct = useCallback((id: string, pct: number) => {
    setBlockCompletion(prev => ({ ...prev, [id]: { pct, note: prev[id]?.note ?? "" } }));
    setSaved(false);
  }, []);

  const setBlockNote = useCallback((id: string, note: string) => {
    setBlockCompletion(prev => ({ ...prev, [id]: { pct: prev[id]?.pct ?? 0, note } }));
    setSaved(false);
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────────

  function handleSave() {
    // Non-core field values → extra.fields, EXCEPT the special "tomorrow" field,
    // which write-forwards to tomorrow's plan_note.
    const extraFields: Record<string, string> = {};
    fields
      .filter((f) => !f.db && f.id !== "tomorrow")
      .forEach((f) => { const v = get(f.id); if (v) extraFields[f.id] = v; });

    const extra: LogExtra = { fields: extraFields, blocks: blockCompletion };

    const slotsDone = workBlocks.length > 0
      ? workBlocks.filter(b => (blockCompletion[b.id]?.pct ?? 0) === 100).length
      : null;

    // Only touch tomorrow's note when the field is on, so a user who never enables
    // it never writes (or clears) tomorrow's plan_note.
    const tomorrowOn = fields.some((f) => f.id === "tomorrow" && f.enabled);

    start(async () => {
      const res = await saveRecap({
        recap:        get("recap") || undefined,
        energy:       get("energy") ? Number(get("energy")) : null,
        slotsDone,
        slotsSlipped: get("slipped") || undefined,
        extra,
        ...(tomorrowOn ? { tomorrowNote: get("tomorrow") } : {}),
      });
      if (res?.error) { setError(res.error); return; }
      setError(null);
      setSaved(true);
      setTimeout(() => setSheetState("closed"), 400);
    });
  }

  // ── Field editor actions ─────────────────────────────────────────────────────

  function toggle(id: string) {
    const next = fields.map((f) => f.id === id ? { ...f, enabled: !f.enabled } : f);
    setFields(next);
    persistFields(next);
  }

  function move(id: string, dir: -1 | 1) {
    const sorted = [...fields].sort((a, b) => a.order - b.order);
    const idx    = sorted.findIndex((f) => f.id === id);
    const swap   = idx + dir;
    if (swap < 0 || swap >= sorted.length) return;
    const next = sorted.map((f, i) => {
      if (i === idx)  return { ...f, order: sorted[swap].order };
      if (i === swap) return { ...f, order: sorted[idx].order };
      return f;
    }).sort((a, b) => a.order - b.order);
    setFields(next);
    persistFields(next);
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const isOpen        = sheetState !== "closed";
  const enabledSorted = useMemo(
    () => [...fields].sort((a, b) => a.order - b.order).filter((f) => f.enabled),
    [fields],
  );
  const hasLog     = isLogged(log);
  const summaryE   = log?.energy;
  const workBlocks = useMemo(
    () => blocks.filter(b => !["break", "buffer"].includes(b.kind)),
    [blocks],
  );
  const doneCount = useMemo(
    () => workBlocks.filter(b => (blockCompletion[b.id]?.pct ?? 0) === 100).length,
    [workBlocks, blockCompletion],
  );
  const partialCount = useMemo(
    () => workBlocks.filter(b => { const p = blockCompletion[b.id]?.pct ?? 0; return p > 0 && p < 100; }).length,
    [workBlocks, blockCompletion],
  );

  const sheetHeight: Record<SheetState, string> = {
    closed: "55vh",
    half:   "55vh",
    full:   "95vh",
  };

  const glassB = { borderColor: "var(--glass-border)" };

  return (
    <>
      {/* ── Log card ──────────────────────────────────────────────────────── */}
      <div
        className="mx-2 mb-2 shrink-0 rounded-[var(--radius)] border bg-card/70 px-4 py-3 backdrop-blur-md"
        style={glassB}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
              Today&apos;s log
            </span>
          </div>
          {hasLog ? (
            <div className="flex items-center gap-2">
              {summaryE != null && (
                <span className="font-mono text-xs text-primary">E {summaryE}/5</span>
              )}
              {workBlocks.length > 0 ? (
                <span className="font-mono text-xs text-muted-foreground">
                  {doneCount}/{workBlocks.length}
                  {partialCount > 0 && (
                    <span className="ml-0.5 text-amber-400">+{partialCount}</span>
                  )}
                </span>
              ) : log?.slots_done != null ? (
                <span className="font-mono text-xs text-muted-foreground">{log.slots_done} blocks</span>
              ) : null}
            </div>
          ) : (
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground/40">
              not logged
            </span>
          )}
        </div>
        <Button
          onClick={() => setSheetState("half")}
          variant={hasLog ? "outline" : "default"}
          size="sm"
          className="w-full"
          style={hasLog ? glassB : undefined}
        >
          {hasLog ? "Update log" : "Log today →"}
        </Button>
      </div>

      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 md:left-52 z-[60] bg-black/50"
          onClick={() => { setSheetState("closed"); setEditing(false); }}
        />
      )}

      {/* ── Sheet ────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "fixed left-0 md:left-52 right-0 bottom-0 z-[70] flex flex-col overflow-hidden rounded-t-2xl border-t bg-card shadow-2xl",
          "transition-[height,transform] duration-300 ease-out",
          isOpen ? "translate-y-0" : "translate-y-full",
        )}
        style={{ height: sheetHeight[sheetState], ...glassB }}
      >
        {/* Drag handle */}
        <div
          className="shrink-0 cursor-grab touch-none py-3 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {editingFields ? (
          <FieldEditor
            fields={fields}
            onToggle={toggle}
            onMove={move}
            onDone={() => setEditing(false)}
          />
        ) : (
          <LogForm
            enabledFields={enabledSorted}
            onGet={get}
            onSet={set}
            sheetState={sheetState}
            onCollapse={() => setSheetState("half")}
            onEditFields={() => { setSheetState("full"); setEditing(true); }}
            onSave={handleSave}
            pending={pending}
            saved={saved}
            error={error}
            blocks={workBlocks}
            blockCompletion={blockCompletion}
            onBlockPct={setBlockPct}
            onBlockNote={setBlockNote}
          />
        )}
      </div>
    </>
  );
}

// ─── Log form ─────────────────────────────────────────────────────────────────

function LogForm({
  enabledFields, onGet, onSet, sheetState,
  onCollapse, onEditFields, onSave, pending, saved, error,
  blocks, blockCompletion, onBlockPct, onBlockNote,
}: {
  enabledFields: LogField[];
  onGet: (id: string) => string;
  onSet: (id: string, v: string) => void;
  sheetState: SheetState;
  onCollapse: () => void;
  onEditFields: () => void;
  onSave: () => void;
  pending: boolean;
  saved: boolean;
  error: string | null;
  blocks: DayBlock[];
  blockCompletion: BlockCompletion;
  onBlockPct: (id: string, pct: number) => void;
  onBlockNote: (id: string, note: string) => void;
}) {
  const isFull = sheetState === "full";

  // Build ordered field list, injecting the blocks section just before "slipped"
  const fieldItems: React.ReactNode[] = [];
  let blocksInserted = false;
  for (const field of enabledFields) {
    if (!blocksInserted && field.id === "slipped" && blocks.length > 0) {
      fieldItems.push(
        <BlocksSection
          key="__blocks"
          blocks={blocks}
          completion={blockCompletion}
          onPct={onBlockPct}
          onNote={onBlockNote}
        />
      );
      blocksInserted = true;
    }
    fieldItems.push(
      <FieldInput
        key={field.id}
        field={field}
        value={onGet(field.id)}
        onChange={(v) => onSet(field.id, v)}
        compact={!isFull}
      />
    );
  }
  if (!blocksInserted && blocks.length > 0) {
    fieldItems.push(
      <BlocksSection
        key="__blocks"
        blocks={blocks}
        completion={blockCompletion}
        onPct={onBlockPct}
        onNote={onBlockNote}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header row */}
      <div className="flex shrink-0 items-center justify-between px-4 pb-2">
        {isFull ? (
          <button
            type="button"
            onClick={onCollapse}
            className="flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className="h-3 w-3" /> Collapse
          </button>
        ) : (
          <h2 className="text-base font-bold">How did today go?</h2>
        )}
        <button
          type="button"
          onClick={onEditFields}
          className="flex items-center gap-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
        >
          <SlidersHorizontal className="h-3 w-3" /> Edit fields
        </button>
      </div>

      {isFull && (
        <h2 className="shrink-0 px-4 pb-3 text-base font-bold">How did today go?</h2>
      )}

      {/* Fields + blocks section */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-2">
        {fieldItems}
      </div>

      {error && (
        <p className="shrink-0 px-4 py-1 text-xs text-destructive">{error}</p>
      )}

      {/* Footer */}
      <div className="shrink-0 px-4 pt-2" style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}>
        {saved && (
          <p className="mb-1.5 text-center font-mono text-[0.6rem] uppercase tracking-[0.15em] text-primary">
            saved ✓
          </p>
        )}
        <Button onClick={onSave} disabled={pending} size="sm" className="w-full">
          {pending ? "Saving…" : "Save log"}
        </Button>
      </div>
    </div>
  );
}

// ─── Blocks section ───────────────────────────────────────────────────────────

function BlocksSection({
  blocks, completion, onPct, onNote,
}: {
  blocks: DayBlock[];
  completion: BlockCompletion;
  onPct: (id: string, pct: number) => void;
  onNote: (id: string, note: string) => void;
}) {
  const glassB     = { borderColor: "var(--glass-border)" };
  const labelClass = "font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground";

  return (
    <div>
      <Label className={labelClass}>Blocks</Label>
      <div className="mt-2 flex flex-col gap-4">
        {blocks.map((block) => {
          const pct       = completion[block.id]?.pct ?? 0;
          const note      = completion[block.id]?.note ?? "";
          const isPartial = pct > 0 && pct < 100;
          const isDone    = pct === 100;

          return (
            <div key={block.id} className="flex flex-col gap-1.5">
              {/* Label row */}
              <div className="flex items-center gap-2">
                <span className="w-[4.5rem] shrink-0 font-mono text-[0.6rem] text-muted-foreground/60">
                  {block.start}–{block.end}
                </span>
                <span className="flex-1 truncate text-sm">{block.label}</span>
                <span
                  className={cn(
                    "w-8 shrink-0 text-right font-mono text-[0.65rem] tabular-nums",
                    isDone      ? "text-primary"
                    : isPartial ? "text-amber-400"
                    : "text-muted-foreground/40",
                  )}
                >
                  {pct}%
                </span>
              </div>

              {/* Completion slider */}
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={pct}
                onChange={(e) => onPct(block.id, Number(e.target.value))}
                className="w-full cursor-pointer"
                style={{
                  accentColor: isDone
                    ? "var(--color-primary)"
                    : isPartial
                    ? "oklch(0.8 0.12 80)"
                    : undefined,
                }}
              />

              {/* Partial note — only visible when slider is between 1–99 */}
              {isPartial && (
                <Textarea
                  value={note}
                  onChange={(e) => onNote(block.id, e.target.value)}
                  rows={2}
                  placeholder="What got done?"
                  className="resize-none bg-transparent text-xs"
                  style={glassB}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Field editor ─────────────────────────────────────────────────────────────

function FieldEditor({
  fields, onToggle, onMove, onDone,
}: {
  fields: LogField[];
  onToggle: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onDone: () => void;
}) {
  const sorted = [...fields].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between px-4 pb-3">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
          Log fields
        </span>
        <button
          type="button"
          onClick={onDone}
          className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-primary hover:text-primary/80"
        >
          Done
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pb-6">
        {sorted.map((field, idx) => (
          <div
            key={field.id}
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius)] border px-3 py-2.5 transition-colors",
              field.enabled
                ? "border-border bg-card"
                : "border-muted/30 bg-muted/20 opacity-60",
            )}
          >
            {/* Reorder buttons */}
            <span className="flex flex-col">
              <button
                type="button"
                aria-label={`Move ${field.label} up`}
                onClick={() => onMove(field.id, -1)}
                disabled={idx === 0}
                className="text-[0.55rem] text-muted-foreground/50 hover:text-muted-foreground disabled:opacity-20"
              >
                ▲
              </button>
              <button
                type="button"
                aria-label={`Move ${field.label} down`}
                onClick={() => onMove(field.id, 1)}
                disabled={idx === sorted.length - 1}
                className="text-[0.55rem] text-muted-foreground/50 hover:text-muted-foreground disabled:opacity-20"
              >
                ▼
              </button>
            </span>

            <span className="flex-1">
              <span className="text-sm">{field.label}</span>
              <span className="ml-2 font-mono text-[0.55rem] uppercase tracking-[0.1em] text-muted-foreground">
                {field.type}
              </span>
            </span>

            <Switch
              checked={field.enabled}
              onCheckedChange={() => onToggle(field.id)}
              aria-label={`Toggle ${field.label}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Field input ─────────────────────────────────────────────────────────────

function FieldInput({
  field, value, onChange, compact,
}: {
  field: LogField;
  value: string;
  onChange: (v: string) => void;
  compact: boolean;
}) {
  const glassB     = { borderColor: "var(--glass-border)" };
  const labelClass = "font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted-foreground";

  if (field.type === "rating") {
    return (
      <div>
        <Label className={labelClass}>{field.label}</Label>
        <div className="mt-1.5 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(value === String(n) ? "" : String(n))}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                value === String(n)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted/50 text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "longtext") {
    return (
      <div>
        <Label className={labelClass}>{field.label}</Label>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={compact ? 2 : 4}
          placeholder={`Add ${field.label.toLowerCase()}…`}
          className="mt-1.5 resize-none bg-transparent"
          style={glassB}
        />
      </div>
    );
  }

  // "text" — short single-line
  const isTomorrow = field.id === "tomorrow";
  return (
    <div>
      <Label className={labelClass}>{isTomorrow ? "Tomorrow →" : field.label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isTomorrow ? "A note for tomorrow…" : `Add ${field.label.toLowerCase()}…`}
        className="mt-1.5 bg-transparent"
        style={glassB}
      />
      {isTomorrow && (
        <p className="mt-1 text-[0.6rem] text-muted-foreground/70">
          Saved onto tomorrow — your morning planner reads it.
        </p>
      )}
    </div>
  );
}
