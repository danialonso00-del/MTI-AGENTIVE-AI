// Piezas de animación de la demo guiada. Todo se dirige con un reloj de escena `t` (ms) que el
// reproductor pausa, acelera o salta: así la animación es determinista y se puede detener.
import { AnimatePresence, motion } from 'motion/react';
import { AgentIcon } from '@/components/agents/AgentIcon';
import type { ReactNode } from 'react';
import { MtiLogo } from '@/components/layout/Brand';
import { cx } from '@/lib/format';

export const EASE = [0.23, 1, 0.32, 1] as const;
export const prog = (t: number, from: number, dur: number) => Math.max(0, Math.min(1, (t - from) / dur));

/** Muestra el contenido a partir del instante `at` con una entrada suave. */
export function Reveal({ t, at, children, className, y = 10, x = 0 }: { t: number; at: number; children: ReactNode; className?: string; y?: number; x?: number }) {
  return (
    <AnimatePresence initial={false}>
      {t >= at && (
        <motion.div className={className} initial={{ opacity: 0, y, x, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease: EASE }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function CountUp({ t, from, dur = 1200, value, format }: { t: number; from: number; dur?: number; value: number; format: (n: number) => string }) {
  const p = prog(t, from, dur);
  const eased = 1 - Math.pow(1 - p, 3);
  return <span className="tabular">{format(value * eased)}</span>;
}

export function Typewriter({ t, from, text, cps = 70, className }: { t: number; from: number; text: string; cps?: number; className?: string }) {
  const n = Math.max(0, Math.floor(((t - from) / 1000) * cps));
  const shown = text.slice(0, n);
  return (
    <span className={cx('whitespace-pre-wrap', className)}>
      {shown}
      {n < text.length && n > 0 && <span className="ml-px inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-gold" />}
    </span>
  );
}

/** Resalta varios fragmentos del texto; cada uno se enciende cuando su `on` es true. */
export function MultiHighlight({ text, marks, className }: { text: string; marks: { needle: string; on: boolean; active?: boolean }[]; className?: string }) {
  const ranges = marks
    .map((m) => ({ ...m, i: text.toLowerCase().indexOf(m.needle.toLowerCase()) }))
    .filter((m) => m.i >= 0)
    .sort((a, b) => a.i - b.i);
  const out: ReactNode[] = [];
  let pos = 0;
  ranges.forEach((m, k) => {
    if (m.i < pos) return;
    out.push(text.slice(pos, m.i));
    out.push(
      <mark key={k} className={cx('rounded transition-[background-color,box-shadow,color] duration-500', m.on ? (m.active ? 'bg-gold/45 text-ink shadow-[0_0_0_2px_rgb(230_168_23/0.7)]' : 'bg-gold/25 text-ink') : 'bg-transparent text-inherit')}>
        {text.slice(m.i, m.i + m.needle.length)}
      </mark>,
    );
    pos = m.i + m.needle.length;
  });
  out.push(text.slice(pos));
  return <span className={className}>{out}</span>;
}

/** Ventana de aplicación: deja claro en qué sección del software ocurre cada escena. */
export function AppWindow({ section, children, className, dark, right }: { section: string; children: ReactNode; className?: string; dark?: boolean; right?: ReactNode }) {
  return (
    <div className={cx('flex flex-col overflow-hidden rounded-2xl shadow-[0_30px_80px_-30px_rgb(0_0_0/0.7)] ring-1', dark ? 'bg-navy-mid/80 ring-white/10' : 'bg-white ring-white/20', className)}>
      <div className={cx('flex h-10 shrink-0 items-center gap-2.5 border-b px-3.5', dark ? 'border-white/10 bg-white/[0.03]' : 'border-line bg-[#f6f8fb]')}>
        <span className="flex gap-1.5"><i className="size-2.5 rounded-full bg-[#ff5f57]" /><i className="size-2.5 rounded-full bg-[#febc2e]" /><i className="size-2.5 rounded-full bg-[#28c840]" /></span>
        <span className={cx('rounded-md px-2 py-0.5', dark ? 'bg-navy' : 'bg-navy')}><MtiLogo height={11} /></span>
        <span className={cx('truncate text-[12.5px] font-medium', dark ? 'text-secondary' : 'text-ink-2')}>{section}</span>
        <span className="ml-auto">{right}</span>
      </div>
      <div className={cx('min-h-0 flex-1', dark ? 'text-white' : 'text-ink')}>{children}</div>
    </div>
  );
}

export function AgentPulse({ code, label, active, done }: { code: string; label: string; active?: boolean; done?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12.5px] ring-1 transition-colors duration-500', active ? 'bg-gold/20 text-gold-light ring-gold/50' : done ? 'bg-[#16a34a]/15 text-[#86efac] ring-[#16a34a]/40' : 'bg-white/[0.05] text-muted ring-white/10')}>
      <span className="relative flex size-2">
        {active && <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-75" />}
        <span className={cx('relative inline-flex size-2 rounded-full', active ? 'bg-gold' : done ? 'bg-[#22c55e]' : 'bg-white/30')} />
      </span>
      <AgentIcon code={code} size={18} glow={active} /><b className="font-mono text-[11.5px]">{code}</b>{label}
    </span>
  );
}

/** Escáner: una línea dorada que recorre el contenedor entre `from` y `from + dur`. */
export function ScanLine({ t, from, dur }: { t: number; from: number; dur: number }) {
  const p = prog(t, from, dur);
  if (p <= 0 || p >= 1) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-10 h-16 -translate-y-1/2" style={{ top: `${p * 100}%`, background: 'linear-gradient(180deg, transparent, rgb(230 168 23 / 0.16), transparent)' }}>
      <div className="absolute inset-x-0 top-1/2 h-px bg-gold/80 shadow-[0_0_12px_#e6a817]" />
    </div>
  );
}
