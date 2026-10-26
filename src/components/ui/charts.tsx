// Gráficos ligeros en HTML/SVG. Paleta categórica validada (dataviz): azul #2a78d6, dorado #c8921a,
// aqua #1baf7a. Contraste < 3:1 en dos tonos → siempre se muestran etiquetas de valor.
import { useState, type ReactNode } from 'react';
import { cx } from '@/lib/format';

export const SERIES = ['#2a78d6', '#c8921a', '#1baf7a'] as const;

/** Barras horizontales de una serie: etiqueta, barra y valor visible. */
export function BarList({ rows, format, color = SERIES[0], max, onRow, empty = 'Sin datos' }: {
  rows: { key: string; label: ReactNode; value: number; hint?: string }[];
  format: (v: number) => string;
  color?: string;
  max?: number;
  onRow?: (key: string) => void;
  empty?: string;
}) {
  const top = max ?? Math.max(...rows.map((r) => r.value), 0);
  if (!rows.length) return <p className="py-4 text-center text-[13px] text-ink-3">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key}>
          <button type="button" disabled={!onRow} onClick={() => onRow?.(r.key)} title={r.hint ?? `${typeof r.label === 'string' ? r.label : r.key}: ${format(r.value)}`}
            className={cx('group block w-full text-left', onRow && 'cursor-pointer')}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
              <span className={cx('min-w-0 truncate text-ink-2', onRow && 'group-hover:text-ink')}>{r.label}</span>
              <span className="shrink-0 font-medium tabular text-ink">{format(r.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-ink/[0.06]">
              <div className="h-full rounded-r-[4px] transition-[width] duration-700 ease-[var(--ease-out)]" style={{ width: `${top ? (r.value / top) * 100 : 0}%`, background: color }} />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Columnas agrupadas (1–3 series) con leyenda, etiquetas y tooltip por columna. */
export function ColumnChart({ categories, series, format, height = 200 }: {
  categories: string[];
  series: { name: string; values: number[]; color?: string }[];
  format: (v: number) => string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...series.flatMap((s) => s.values), 0) || 1;
  return (
    <div>
      {series.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-4 text-[12.5px] text-ink-2">
          {series.map((s, i) => <span key={s.name} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: s.color ?? SERIES[i] }} />{s.name}</span>)}
        </div>
      )}
      <div className="relative flex items-end gap-3 border-b border-line-strong" style={{ height }}>
        {[0.25, 0.5, 0.75].map((g) => <div key={g} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${g * 100}%` }} />)}
        {categories.map((c, ci) => (
          <div key={c} className="relative flex h-full flex-1 items-end justify-center gap-[2px]" onMouseEnter={() => setHover(ci)} onMouseLeave={() => setHover(null)}>
            {series.map((s, si) => (
              <div key={s.name} className="relative flex h-full max-w-[34px] flex-1 flex-col justify-end">
                <span className="mb-0.5 text-center text-[11px] font-medium tabular text-ink-2">{format(s.values[ci])}</span>
                <div className={cx('rounded-t-[4px] transition-[height,opacity] duration-700 ease-[var(--ease-out)]', hover !== null && hover !== ci && 'opacity-50')} style={{ height: `${(s.values[ci] / max) * 82}%`, background: s.color ?? SERIES[si] }} />
              </div>
            ))}
            {hover === ci && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-navy px-2.5 py-1.5 text-[12px] text-white shadow-lg">
                <div className="font-semibold">{c}</div>
                {series.map((s, si) => <div key={s.name} className="flex items-center gap-1.5"><span className="size-2 rounded-sm" style={{ background: s.color ?? SERIES[si] }} />{s.name}: <b className="tabular">{format(s.values[ci])}</b></div>)}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-3">{categories.map((c) => <span key={c} className="flex-1 truncate text-center text-[11.5px] text-ink-3" title={c}>{c}</span>)}</div>
    </div>
  );
}

/** Barra apilada única (distribución), con leyenda y etiquetas. */
export function StackBar({ parts, format }: { parts: { label: string; value: number; color: string }[]; format: (v: number) => string }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
        {parts.filter((p) => p.value > 0).map((p) => <div key={p.label} title={`${p.label}: ${format(p.value)}`} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-2">
        {parts.map((p) => <span key={p.label} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: p.color }} />{p.label} <b className="tabular text-ink">{format(p.value)}</b></span>)}
      </div>
    </div>
  );
}
