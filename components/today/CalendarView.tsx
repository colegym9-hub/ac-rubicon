"use client";

import { useState, useEffect, useRef, useTransition, useMemo, useCallback } from "react";
import { saveDayPlan, fetchBlocksForDate } from "@/app/today/actions";
import { type DayBlock, sortBlocks, toMinutes } from "@/lib/day";
import BlockChip from "./BlockChip";
import AddBlockSheet from "./AddBlockSheet";

// ─── constants ────────────────────────────────────────────────────────────────
const HOUR_W   = 44;   // px — left label column
const DEF_PX   = 80;   // px per hour default
const MIN_PX   = 40;
const MAX_PX   = 220;
const SNAP     = 15;   // minute snap grid

// ─── date helpers ─────────────────────────────────────────────────────────────
const DAY_ABBR   = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_FULL = ["January","February","March","April","May","June",
                    "July","August","September","October","November","December"];

function isoDate(d: Date)   { return d.toISOString().slice(0, 10); }
function todayStr()         { return isoDate(new Date()); }

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

function weekSunday(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() - d.getDay());
  return isoDate(d);
}

function monthOf(iso: string) { return iso.slice(0, 7); }

function monthStart(iso: string) {
  return `${monthOf(iso)}-01`;
}

function daysInMonth(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function fmtHour(h: number) {
  if (h === 0)  return "12a";
  if (h < 12)   return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

function minsToHHMM(m: number) {
  const hh = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function snapMins(raw: number, snap = SNAP) {
  return Math.round(raw / snap) * snap;
}

// ─── overlap layout ───────────────────────────────────────────────────────────
type LayoutBlock = DayBlock & { col: number; cols: number };

function layoutBlocks(blocks: DayBlock[]): LayoutBlock[] {
  const sorted = sortBlocks(blocks);
  const out: LayoutBlock[] = sorted.map(b => ({ ...b, col: 0, cols: 1 }));

  for (let i = 0; i < out.length; i++) {
    const aS = toMinutes(out[i].start);
    const aE = toMinutes(out[i].end);
    const peers = out.filter((b, j) => j !== i && toMinutes(b.start) < aE && toMinutes(b.end) > aS);
    if (!peers.length) continue;
    const group = [out[i], ...peers].sort((x, y) => toMinutes(x.start) - toMinutes(y.start));
    const ids = [...new Set(group.map(b => b.id))];
    ids.forEach((id, col) => {
      const idx = out.findIndex(b => b.id === id);
      if (idx >= 0) { out[idx].col = col; out[idx].cols = ids.length; }
    });
  }
  return out;
}

// ─── gesture state shape ──────────────────────────────────────────────────────
type GestureMode = "pending" | "drag" | "resize";
interface Gesture {
  mode:         GestureMode;
  blockId:      string;
  pointerId:    number;
  startY:       number;
  origStartMin: number;
  origEndMin:   number;
  timer:        ReturnType<typeof setTimeout> | null;
}

// ─── component ────────────────────────────────────────────────────────────────
interface Props {
  initialDate:   string;
  initialBlocks: DayBlock[];
}

export default function CalendarView({ initialDate, initialBlocks }: Props) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [blocks, setBlocks]             = useState<DayBlock[]>(sortBlocks(initialBlocks));
  const [pxPerHour, setPxPerHour]       = useState(DEF_PX);
  const [showMonth, setShowMonth]       = useState(false);
  const [monthCursor, setMonthCursor]   = useState(monthStart(initialDate));
  const [dragVisual, setDragVisual]     = useState<{ id: string; startMin: number; endMin: number } | null>(null);
  const [sheet, setSheet]               = useState<{ open: boolean; time?: string; edit?: DayBlock }>({ open: false });
  const [nowMin, setNowMin]             = useState(() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); });
  const [, startTrans]                  = useTransition();

  const today    = todayStr();
  const weekSun  = weekSunday(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekSun, i));

  // Mutable refs (avoid stale closures in event listeners)
  const pxRef          = useRef(pxPerHour);
  const blocksRef      = useRef(blocks);
  const dragVisualRef  = useRef(dragVisual);
  const scrollRef      = useRef<HTMLDivElement>(null);
  const gridRef        = useRef<HTMLDivElement>(null);
  const pinchRef       = useRef<{ dist: number; topMin: number; startPx: number } | null>(null);
  const gestureRef     = useRef<Gesture | null>(null);
  const cleanupRef     = useRef<(() => void) | null>(null);
  const headerTouchX   = useRef<number | null>(null);

  useEffect(() => { pxRef.current = pxPerHour; },  [pxPerHour]);
  useEffect(() => { blocksRef.current = blocks; },  [blocks]);
  useEffect(() => { dragVisualRef.current = dragVisual; }, [dragVisual]);

  // Tick nowMin every minute
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Scroll to ~2h before now on mount
  useEffect(() => {
    if (!scrollRef.current) return;
    const d = new Date();
    const mins = d.getHours() * 60 + d.getMinutes();
    scrollRef.current.scrollTop = Math.max(0, ((mins - 120) / 60) * DEF_PX);
  }, []);

  // Non-passive pinch zoom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function onStart(e: TouchEvent) {
      if (e.touches.length !== 2) return;
      const t1 = e.touches[0] as Touch;
      const t2 = e.touches[1] as Touch;
      pinchRef.current = {
        dist:    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
        topMin:  ((scrollRef.current as HTMLDivElement).scrollTop / pxRef.current) * 60,
        startPx: pxRef.current,
      };
    }

    function onMove(e: TouchEvent) {
      if (e.touches.length !== 2 || !pinchRef.current) return;
      e.preventDefault();
      const t1 = e.touches[0] as Touch;
      const t2 = e.touches[1] as Touch;
      const newDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const scale   = newDist / pinchRef.current.dist;
      const newPx   = Math.min(MAX_PX, Math.max(MIN_PX, pinchRef.current.startPx * scale));
      setPxPerHour(newPx);
      (scrollRef.current as HTMLDivElement).scrollTop = (pinchRef.current.topMin / 60) * newPx;
    }

    function onEnd() { pinchRef.current = null; }

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove",  onMove,  { passive: false });
    el.addEventListener("touchend",   onEnd,   { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove",  onMove);
      el.removeEventListener("touchend",   onEnd);
    };
  }, []);

  // ── persist ──────────────────────────────────────────────────────────────────
  function persist(next: DayBlock[]) {
    const sorted = sortBlocks(next);
    setBlocks(sorted);
    startTrans(async () => { await saveDayPlan(sorted, selectedDate); });
  }

  // ── date navigation ──────────────────────────────────────────────────────────
  const selectDate = useCallback(async (date: string) => {
    if (date === selectedDate) return;
    setSelectedDate(date);
    setMonthCursor(monthStart(date));
    setShowMonth(false);
    if (date === initialDate) {
      setBlocks(sortBlocks(initialBlocks));
    } else {
      startTrans(async () => {
        const { blocks: fetched } = await fetchBlocksForDate(date);
        setBlocks(fetched);
      });
    }
  }, [selectedDate, initialDate, initialBlocks]);

  // ── block gestures ────────────────────────────────────────────────────────────
  function onBlockPointerDown(e: React.PointerEvent<HTMLDivElement>, block: DayBlock) {
    e.stopPropagation();
    cleanupRef.current?.(); // cancel any in-flight gesture

    const isResize = !!(e.target as HTMLElement).closest("[data-resize]");
    const origStartMin = toMinutes(block.start);
    const origEndMin   = toMinutes(block.end);

    gestureRef.current = {
      mode:         isResize ? "resize" : "pending",
      blockId:      block.id,
      pointerId:    e.pointerId,
      startY:       e.clientY,
      origStartMin,
      origEndMin,
      timer: isResize ? null : setTimeout(() => {
        const g = gestureRef.current;
        if (g?.mode === "pending" && g.blockId === block.id) {
          g.mode = "drag";
          setDragVisual({ id: block.id, startMin: g.origStartMin, endMin: g.origEndMin });
          if ("vibrate" in navigator) navigator.vibrate(30);
        }
      }, 300),
    };

    if (isResize) {
      setDragVisual({ id: block.id, startMin: origStartMin, endMin: origEndMin });
    }

    // Global move/up listeners (works regardless of where pointer goes)
    function onMove(ev: PointerEvent) {
      if (ev.pointerId !== e.pointerId) return;
      const g = gestureRef.current;
      if (!g) return;

      if (g.mode === "pending") {
        if (Math.abs(ev.clientY - g.startY) > 10 && g.timer) {
          clearTimeout(g.timer);
          g.timer = null;
          gestureRef.current = null;
          cleanupRef.current?.();
        }
        return;
      }

      const dyMins = snapMins(((ev.clientY - g.startY) / pxRef.current) * 60);
      if (g.mode === "drag") {
        const newStart = Math.min(23 * 60, Math.max(0, g.origStartMin + dyMins));
        setDragVisual({ id: block.id, startMin: newStart, endMin: newStart + (g.origEndMin - g.origStartMin) });
      } else {
        const newEnd = Math.min(24 * 60, Math.max(g.origStartMin + SNAP, g.origEndMin + dyMins));
        setDragVisual({ id: block.id, startMin: g.origStartMin, endMin: newEnd });
      }
    }

    function onUp(ev: PointerEvent) {
      if (ev.pointerId !== e.pointerId) return;
      const g = gestureRef.current;
      if (g?.timer) clearTimeout(g.timer);

      const dv = dragVisualRef.current;
      if (!g || g.mode === "pending") {
        setSheet({ open: true, edit: block });
      } else if (dv) {
        const updated = blocksRef.current.map(b =>
          b.id === block.id ? { ...b, start: minsToHHMM(dv.startMin), end: minsToHHMM(dv.endMin) } : b,
        );
        setDragVisual(null);
        persist(updated);
      }

      gestureRef.current = null;
      cleanupRef.current?.();
    }

    window.addEventListener("pointermove",   onMove);
    window.addEventListener("pointerup",     onUp);
    window.addEventListener("pointercancel", onUp);
    cleanupRef.current = () => {
      window.removeEventListener("pointermove",   onMove);
      window.removeEventListener("pointerup",     onUp);
      window.removeEventListener("pointercancel", onUp);
      cleanupRef.current = null;
    };
  }

  // ── grid tap (add block) ─────────────────────────────────────────────────────
  const gridTapStart = useRef<{ y: number; t: number } | null>(null);

  function onGridPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-block]")) return;
    gridTapStart.current = { y: e.clientY, t: Date.now() };
  }

  function onGridPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const tap = gridTapStart.current;
    gridTapStart.current = null;
    if (!tap || sheet.open) return;
    if (Math.abs(e.clientY - tap.y) > 12 || Date.now() - tap.t > 500) return;
    if ((e.target as HTMLElement).closest("[data-block]")) return;

    const rect = gridRef.current!.getBoundingClientRect();
    const y    = e.clientY - rect.top; // rect.top already accounts for scroll
    const mins = Math.min(23 * 60, Math.max(0, snapMins((y / pxPerHour) * 60)));
    setSheet({ open: true, time: minsToHHMM(mins) });
  }

  // ── sheet callbacks ───────────────────────────────────────────────────────────
  function handleSave(block: DayBlock, isNew: boolean) {
    persist(isNew ? [...blocks, block] : blocks.map(b => b.id === block.id ? block : b));
    setSheet({ open: false });
  }

  function handleDelete(id: string) {
    persist(blocks.filter(b => b.id !== id));
    setSheet({ open: false });
  }

  // ── month picker ──────────────────────────────────────────────────────────────
  const mcD = new Date(`${monthCursor}T00:00:00`);
  const mcLabel = `${MONTH_FULL[mcD.getMonth()]} ${mcD.getFullYear()}`;

  function shiftMonth(n: number) {
    const d = new Date(`${monthCursor}T00:00:00`);
    d.setMonth(d.getMonth() + n);
    setMonthCursor(isoDate(d).slice(0, 8) + "01");
  }

  const mFirstDay = new Date(`${monthCursor}T00:00:00`).getDay();
  const mDays     = daysInMonth(monthCursor);
  const mCells: Array<string | null> = [
    ...Array(mFirstDay).fill(null),
    ...Array.from({ length: mDays }, (_, i) =>
      `${monthCursor.slice(0, 7)}-${String(i + 1).padStart(2, "0")}`,
    ),
  ];
  while (mCells.length % 7 !== 0) mCells.push(null);

  // ── layout ────────────────────────────────────────────────────────────────────
  const laidOut = useMemo(() => layoutBlocks(blocks), [blocks]);

  const selD  = new Date(`${selectedDate}T00:00:00`);
  const hdrLabel = `${MONTH_FULL[selD.getMonth()]} ${selD.getFullYear()}`;

  const border = { borderColor: "var(--glass-border)" };

  return (
    <div className="flex h-full flex-col">

      {/* ── Week / Month header ──────────────────────────────────────────── */}
      <div
        className="shrink-0 pb-1"
        onTouchStart={(e) => { headerTouchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (headerTouchX.current === null) return;
          const dx = e.changedTouches[0].clientX - headerTouchX.current;
          headerTouchX.current = null;
          if (Math.abs(dx) > 50) selectDate(addDays(selectedDate, dx < 0 ? 7 : -7));
        }}
      >
        {/* Top row: month label + today + nav arrows */}
        <div className="flex items-center justify-between px-1 pb-1">
          <button
            type="button"
            className="flex items-center gap-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-foreground"
            onClick={() => {
              setShowMonth(!showMonth);
              setMonthCursor(monthStart(selectedDate));
            }}
          >
            {showMonth ? mcLabel : hdrLabel}
            <span className="text-muted-foreground text-[0.5rem]">{showMonth ? "▲" : "▼"}</span>
          </button>
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={() => selectDate(addDays(selectedDate, -7))} className="px-2 py-1 text-lg text-muted-foreground hover:text-foreground">‹</button>
            <button type="button" onClick={() => selectDate(today)} className="px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.15em] text-primary border rounded-[3px]" style={border}>Today</button>
            <button type="button" onClick={() => selectDate(addDays(selectedDate, 7))}  className="px-2 py-1 text-lg text-muted-foreground hover:text-foreground">›</button>
          </div>
        </div>

        {/* Day-of-week abbreviation row */}
        <div className="grid grid-cols-7 border-t" style={border}>
          {DAY_ABBR.map((a, i) => (
            <span key={i} className="py-0.5 text-center font-mono text-[0.5rem] uppercase tracking-[0.1em] text-muted-foreground">
              {a}
            </span>
          ))}
        </div>

        {/* ── Week row OR Month grid ──────────────────────────────────────── */}
        {showMonth ? (
          <div className="border-t pt-1" style={border}>
            <div className="flex items-center justify-between px-2 pb-1">
              <button type="button" onClick={() => shiftMonth(-1)} className="px-2 py-0.5 text-muted-foreground">‹</button>
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em]">{mcLabel}</span>
              <button type="button" onClick={() => shiftMonth(1)}  className="px-2 py-0.5 text-muted-foreground">›</button>
            </div>
            <div className="grid grid-cols-7 text-center">
              {mCells.map((date, i) => {
                const isSelected = date === selectedDate;
                const isToday    = date === today;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!date}
                    onClick={() => { if (date) selectDate(date); }}
                    className={[
                      "relative mx-auto my-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[0.7rem]",
                      isSelected ? "bg-primary font-bold text-primary-foreground" :
                      isToday    ? "font-semibold text-primary" :
                      date       ? "text-foreground hover:bg-card/80" : "",
                    ].join(" ")}
                  >
                    {date ? new Date(`${date}T00:00:00`).getDate() : ""}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-7 border-t" style={border}>
            {weekDays.map((date) => {
              const d          = new Date(`${date}T00:00:00`);
              const isSelected = date === selectedDate;
              const isToday    = date === today;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => selectDate(date)}
                  className={[
                    "relative mx-auto my-1 flex h-8 w-8 flex-col items-center justify-center rounded-full font-mono text-[0.7rem]",
                    isSelected ? "bg-primary font-bold text-primary-foreground" :
                    isToday    ? "text-primary" : "text-foreground",
                  ].join(" ")}
                >
                  {d.getDate()}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Scrollable 24h timeline ──────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto"
        style={{ overscrollBehavior: "contain" }}
      >
        <div
          ref={gridRef}
          className="relative select-none"
          style={{ height: 24 * pxPerHour, touchAction: "pan-y" }}
          onPointerDown={onGridPointerDown}
          onPointerUp={onGridPointerUp}
        >
          {/* Hour lines + labels */}
          {Array.from({ length: 25 }, (_, h) => (
            <div
              key={h}
              className="pointer-events-none absolute inset-x-0 flex items-start"
              style={{ top: h * pxPerHour }}
            >
              <span className="w-11 shrink-0 pr-2 text-right font-mono text-[0.5rem] leading-none text-muted-foreground" style={{ marginTop: -7 }}>
                {h < 24 ? fmtHour(h) : ""}
              </span>
              <div className="flex-1 border-t" style={border} />
            </div>
          ))}

          {/* 30-min dashed ticks */}
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={`t${h}`}
              className="pointer-events-none absolute right-0 border-t border-dashed"
              style={{
                top: h * pxPerHour + pxPerHour / 2,
                left: HOUR_W,
                borderColor: "color-mix(in oklch, var(--glass-border), transparent 50%)",
              }}
            />
          ))}

          {/* Current time indicator */}
          {selectedDate === today && (
            <div
              className="pointer-events-none absolute z-10 flex items-center"
              style={{ top: (nowMin / 60) * pxPerHour, left: HOUR_W - 4, right: 0 }}
            >
              <div className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
              <div className="h-px flex-1 bg-red-500" />
            </div>
          )}

          {/* Blocks */}
          {laidOut.map((block) => {
            const sMin = toMinutes(block.start);
            const eMin = toMinutes(block.end);
            if (sMin < 0 || eMin <= sMin) return null;

            const dv          = dragVisual?.id === block.id ? dragVisual : null;
            const dispStart   = dv?.startMin ?? sMin;
            const dispEnd     = dv?.endMin   ?? eMin;
            const durMin      = dispEnd - dispStart;
            const availW      = `calc(100% - ${HOUR_W}px - 4px)`;

            return (
              <BlockChip
                key={block.id}
                block={block}
                top={    (dispStart / 60) * pxPerHour }
                height={ (durMin   / 60) * pxPerHour }
                left={   `calc(${HOUR_W}px + (${availW}) * ${block.col} / ${block.cols})` }
                width={  `calc((${availW}) / ${block.cols})` }
                isDragging={!!dv}
                onPointerDown={(e) => onBlockPointerDown(e, block)}
              />
            );
          })}
        </div>
      </div>

      {/* ── Add / Edit sheet ─────────────────────────────────────────────── */}
      {sheet.open && (
        <AddBlockSheet
          initialTime={sheet.time}
          editBlock={sheet.edit}
          onSave={handleSave}
          onDelete={sheet.edit ? () => handleDelete(sheet.edit!.id) : undefined}
          onClose={() => setSheet({ open: false })}
        />
      )}
    </div>
  );
}
