// Identidad visual de cada agente: icono + color propio, igual en todo el producto.
import {
  AudioLines, BookOpenText, Box, Calculator, FileStack, Mail, Network, ScanText, ShieldCheck, ShoppingCart, Sigma, Timer, UserCheck, UsersRound, Boxes,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { agentByCode } from '@/fixtures/agents';
import { cx } from '@/lib/format';

interface Identity { icon: ReactNode; from: string; to: string; glow: string }

export const AGENT_IDENTITY: Record<string, Identity> = {
  MTI: { icon: <Network />, from: '#f0bc3d', to: '#c8921a', glow: '230 168 23' },
  C01: { icon: <Mail />, from: '#38bdf8', to: '#0369a1', glow: '56 189 248' },
  C02: { icon: <Calculator />, from: '#fbbf24', to: '#b45309', glow: '251 191 36' },
  C03: { icon: <AudioLines />, from: '#a78bfa', to: '#6d28d9', glow: '167 139 250' },
  C04: { icon: <UsersRound />, from: '#fb7185', to: '#be123c', glow: '251 113 133' },
  C05: { icon: <ShoppingCart />, from: '#34d399', to: '#047857', glow: '52 211 153' },
  C06: { icon: <FileStack />, from: '#22d3ee', to: '#0e7490', glow: '34 211 238' },
  C07: { icon: <BookOpenText />, from: '#818cf8', to: '#4338ca', glow: '129 140 248' },
  C08: { icon: <ShieldCheck />, from: '#fb923c', to: '#c2410c', glow: '251 146 60' },
  CAD: { icon: <Box />, from: '#94a3b8', to: '#475569', glow: '148 163 184' },
  OCR: { icon: <ScanText />, from: '#94a3b8', to: '#475569', glow: '148 163 184' },
  TME: { icon: <Timer />, from: '#94a3b8', to: '#475569', glow: '148 163 184' },
  MLC: { icon: <Sigma />, from: '#94a3b8', to: '#475569', glow: '148 163 184' },
  ERP: { icon: <Boxes />, from: '#94a3b8', to: '#475569', glow: '148 163 184' },
  HUM: { icon: <UserCheck />, from: '#4ade80', to: '#15803d', glow: '74 222 128' },
};
const FALLBACK: Identity = { icon: <Network />, from: '#94a3b8', to: '#475569', glow: '148 163 184' };
export const agentIdentity = (code: string) => AGENT_IDENTITY[code] ?? FALLBACK;

/** Tesela con el icono del agente. `size` en px. */
export function AgentIcon({ code, size = 24, glow, className }: { code: string; size?: number; glow?: boolean; className?: string }) {
  const id = agentIdentity(code);
  return (
    <span
      aria-hidden
      className={cx('relative inline-flex shrink-0 items-center justify-center text-white ring-1 ring-inset ring-white/25', className)}
      style={{
        width: size, height: size, borderRadius: Math.round(size * 0.3),
        background: `linear-gradient(140deg, ${id.from}, ${id.to})`,
        boxShadow: glow ? `0 0 ${Math.round(size * 0.8)}px -2px rgb(${id.glow} / 0.65)` : `0 1px 2px rgb(0 0 0 / 0.25)`,
      }}
    >
      <span className="flex [&>svg]:size-full" style={{ width: size * 0.56, height: size * 0.56 }}>{id.icon}</span>
    </span>
  );
}

/** Píldora de agente: icono + código (+ nombre). */
export function AgentChip({ code, name = true, dark = true, size = 'md', className }: { code: string; name?: boolean; dark?: boolean; size?: 'sm' | 'md'; className?: string }) {
  const a = agentByCode(code);
  return (
    <span title={a ? `${a.code} · ${a.name} — ${a.responsibility}` : code}
      className={cx('inline-flex items-center rounded-lg ring-1', size === 'sm' ? 'gap-1 py-0.5 pl-0.5 pr-1.5 text-[11px]' : 'gap-1.5 py-0.5 pl-0.5 pr-2 text-[12px]',
        dark ? 'bg-white/[0.07] text-white ring-white/10' : 'bg-white text-ink ring-line', className)}>
      <AgentIcon code={code} size={size === 'sm' ? 16 : 20} />
      <b className={cx('font-mono', dark ? 'text-gold-light' : 'text-ink-2')}>{code}</b>
      {name && a && <span className={dark ? 'text-secondary' : 'text-ink-3'}>{a.name}</span>}
    </span>
  );
}
