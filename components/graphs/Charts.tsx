// Dependency-free SVG charts (pure server components). Colors via CSS vars so
// they track the theme. Swap for Recharts later if richer interaction is needed.

const W = 320;

export function BarChart({
  values,
  height = 100,
}: {
  values: number[];
  height?: number;
}) {
  const pad = 4;
  const n = Math.max(1, values.length);
  const max = Math.max(1, ...values);
  const bw = (W - pad * 2) / n;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label="Throughput by day">
      {values.map((v, i) => {
        const h = (v / max) * (height - pad * 2);
        return (
          <rect
            key={i}
            x={pad + i * bw + 1}
            y={height - pad - h}
            width={Math.max(1, bw - 2)}
            height={h}
            rx={1}
            fill="var(--color-primary)"
          />
        );
      })}
    </svg>
  );
}

export function AdherenceBars({
  data,
  height = 100,
}: {
  data: { planned: number; done: number }[];
  height?: number;
}) {
  const pad = 4;
  const n = Math.max(1, data.length);
  const max = Math.max(1, ...data.map((d) => d.planned));
  const bw = (W - pad * 2) / n;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label="Planned vs done by day">
      {data.map((d, i) => {
        const x = pad + i * bw + 1;
        const w = Math.max(1, bw - 2);
        const ph = (d.planned / max) * (height - pad * 2);
        const dh = (d.done / max) * (height - pad * 2);
        return (
          <g key={i}>
            <rect x={x} y={height - pad - ph} width={w} height={ph} rx={1} fill="var(--color-muted)" />
            <rect x={x} y={height - pad - dh} width={w} height={dh} rx={1} fill="var(--color-primary)" />
          </g>
        );
      })}
    </svg>
  );
}

export function Sparkline({
  points,
  height = 48,
}: {
  points: (number | null)[];
  height?: number;
}) {
  const pad = 4;
  const n = Math.max(2, points.length);
  const vals = points.filter((p): p is number => p != null);
  const min = Math.min(0, ...vals);
  const max = Math.max(1, ...vals);
  const range = max - min || 1;
  const x = (i: number) => pad + (i / (n - 1)) * (W - pad * 2);
  const y = (v: number) => height - pad - ((v - min) / range) * (height - pad * 2);

  let path = "";
  let drawing = false;
  points.forEach((p, i) => {
    if (p == null) {
      drawing = false;
      return;
    }
    path += `${drawing ? "L" : "M"}${x(i).toFixed(1)} ${y(p).toFixed(1)} `;
    drawing = true;
  });

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label="Trend">
      <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) =>
        p != null ? <circle key={i} cx={x(i)} cy={y(p)} r={1.8} fill="var(--color-primary)" /> : null,
      )}
    </svg>
  );
}

/**
 * Combo chart (the fitness-app pattern): faint daily bars + a bold cumulative
 * line for this period, with an optional dashed cumulative line for the previous
 * period to read "this week vs last week" at a glance. Bars and line use
 * independent scales (activity vs running total) — a deliberate dual-axis look.
 */
export function MomentumChart({
  values,
  compare,
  height = 120,
}: {
  values: number[];
  compare?: number[];
  height?: number;
}) {
  const pad = 6;
  const n = Math.max(1, values.length);
  const cumulative = (arr: number[]): number[] => {
    let s = 0;
    return arr.map((v) => (s += v));
  };
  const cur = cumulative(values);
  const cmp = compare && compare.length ? cumulative(compare) : null;

  const maxBar = Math.max(1, ...values);
  const maxLine = Math.max(1, cur[cur.length - 1] ?? 0, cmp ? cmp[cmp.length - 1] ?? 0 : 0);
  const bw = (W - pad * 2) / n;
  const inner = height - pad * 2;

  const cx = (i: number) => pad + (i + 0.5) * bw;
  const ly = (v: number) => pad + (1 - v / maxLine) * inner;
  const linePath = (arr: number[]) =>
    arr.map((v, i) => `${i ? "L" : "M"}${cx(i).toFixed(1)} ${ly(v).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label="Momentum: daily completions with cumulative trend vs previous period">
      {values.map((v, i) => {
        const h = (v / maxBar) * inner;
        return (
          <rect
            key={i}
            x={pad + i * bw + 1}
            y={pad + inner - h}
            width={Math.max(1, bw - 2)}
            height={h}
            rx={1}
            fill="var(--color-muted)"
          />
        );
      })}
      {cmp ? (
        <path
          d={linePath(cmp)}
          fill="none"
          stroke="var(--color-muted-foreground)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.7}
        />
      ) : null}
      <path d={linePath(cur)} fill="none" stroke="var(--color-primary)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {cur.map((v, i) => (
        <circle key={i} cx={cx(i)} cy={ly(v)} r={2} fill="var(--color-primary)" />
      ))}
    </svg>
  );
}
