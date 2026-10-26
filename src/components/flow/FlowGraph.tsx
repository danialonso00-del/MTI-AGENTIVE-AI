// Grafo de ejecución. Nodos HTML (legibles y enfocables) + aristas SVG. El paquete solo se mueve
// cuando un paso pasa realmente a «completado» en el estado: la animación no es independiente del trabajo.
import { animate } from 'motion/react';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { AlertTriangle, Check, Loader2, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { StepStatus } from '@/domain/types';
import { cx } from '@/lib/format';
import { useMotionOff } from '@/lib/useMotion';
import { useStudio } from '@/store/useStudio';

export interface FlowNode {
  id: string;
  title: string;
  short: string;
  agents: string[];
  status: StepStatus;
  summary?: string;
}

interface Props {
  nodes: FlowNode[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  packetLabel?: string;
  cols?: number;
  nodeHeight?: number;
  compact?: boolean;
  className?: string;
}

const STATUS_ICON: Record<StepStatus, React.ReactNode> = {
  idle: <span className="size-2 rounded-full bg-white/25" />,
  running: <Loader2 className="size-3.5 animate-spin text-navy" />,
  completed: <Check className="size-3.5 text-white" strokeWidth={3} />,
  needs_input: <AlertTriangle className="size-3.5 text-navy" strokeWidth={2.5} />,
  failed: <X className="size-3.5 text-white" strokeWidth={3} />,
};

const STATUS_BG: Record<StepStatus, string> = {
  idle: 'bg-white/[0.06] ring-1 ring-white/15',
  running: 'bg-gold',
  completed: 'bg-[#16a34a]',
  needs_input: 'bg-[#f59e0b]',
  failed: 'bg-[#dc2626]',
};

export function FlowGraph({ nodes, selectedId, onSelect, packetLabel, cols: colsProp, nodeHeight, compact, className }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(900);
  const motionOff = useMotionOff();
  const speed = useStudio((s) => s.ui.speed);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const vertical = W < 560;
  const cols = vertical ? 1 : colsProp ?? (nodes.length > 5 ? 4 : nodes.length);
  const rows = Math.ceil(nodes.length / cols);
  const pad = vertical ? 12 : 22;
  const gapX = vertical ? 0 : compact ? 30 : 36;
  const nh = vertical ? 76 : nodeHeight ?? (compact ? 112 : 126);
  const rowGap = vertical ? 26 : compact ? 46 : 58;
  const colW = (W - 2 * pad) / cols;
  const nw = colW - gapX;
  const H = pad * 2 + rows * nh + (rows - 1) * rowGap;

  const pos = useMemo(() => nodes.map((_, i) => {
    const row = Math.floor(i / cols);
    const c = i % cols;
    const col = row % 2 === 0 ? c : cols - 1 - c;
    return { x: pad + col * colW + gapX / 2, y: pad + row * (nh + rowGap), row, col };
  }), [nodes, cols, colW, gapX, nh, rowGap, pad]);

  const edges = useMemo(() => pos.slice(0, -1).map((a, i) => {
    const b = pos[i + 1];
    if (a.row === b.row) {
      const dir = b.col > a.col ? 1 : -1;
      const x1 = dir > 0 ? a.x + nw : a.x;
      const x2 = dir > 0 ? b.x : b.x + nw;
      const y = a.y + nh / 2;
      return `M ${x1} ${y} L ${x2} ${y}`;
    }
    const x = a.x + nw / 2;
    return `M ${x} ${a.y + nh} C ${x} ${a.y + nh + rowGap * 0.5}, ${x} ${b.y - rowGap * 0.5}, ${x} ${b.y}`;
  }), [pos, nw, nh, rowGap]);

  // Paquete: se lanza al detectar la transición real de un paso a «completed».
  const prev = useRef<Record<string, StepStatus>>({});
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [packet, setPacket] = useState<{ edge: number; x: number; y: number } | null>(null);
  useEffect(() => {
    const before = prev.current;
    const firstRender = Object.keys(before).length === 0;
    prev.current = Object.fromEntries(nodes.map((n) => [n.id, n.status]));
    if (firstRender || motionOff) return;
    const idx = nodes.findIndex((n) => n.status === 'completed' && before[n.id] && before[n.id] !== 'completed');
    if (idx < 0 || idx >= nodes.length - 1) return;
    const path = pathRefs.current[idx];
    if (!path) return;
    const len = path.getTotalLength();
    const controls = animate(0, 1, {
      duration: Math.min(1.2, Math.max(0.6, len / 260)) / speed,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (t) => {
        const p = path.getPointAtLength(t * len);
        setPacket({ edge: idx, x: p.x, y: p.y });
      },
      onComplete: () => setPacket(null),
    });
    return () => controls.stop();
  }, [nodes, motionOff, speed]);

  return (
    <div ref={wrap} className={cx('relative w-full', className)} style={{ height: H }}>
      <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden>
        <defs>
          <radialGradient id="pkt" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff7dd" />
            <stop offset="45%" stopColor="#f0bc3d" />
            <stop offset="100%" stopColor="#e6a817" stopOpacity="0" />
          </radialGradient>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="rgb(148 163 184 / 0.55)" />
          </marker>
          <marker id="arrow-gold" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#e6a817" />
          </marker>
        </defs>
        {edges.map((d, i) => {
          const a = nodes[i].status;
          const b = nodes[i + 1].status;
          const done = a === 'completed' && b !== 'idle';
          const flowing = a === 'completed' && (b === 'running' || b === 'idle');
          return (
            <g key={i}>
              <path ref={(el) => { pathRefs.current[i] = el; }} d={d} fill="none" stroke={done ? 'rgb(230 168 23 / 0.75)' : 'rgb(148 163 184 / 0.28)'} strokeWidth={done ? 2 : 1.5} markerEnd={done ? 'url(#arrow-gold)' : 'url(#arrow)'} />
              {flowing && !motionOff && <path d={d} fill="none" stroke="rgb(230 168 23 / 0.6)" strokeWidth={2} strokeDasharray="4 8" className="animate-dash" />}
            </g>
          );
        })}
        {packet && (
          <g transform={`translate(${packet.x} ${packet.y})`}>
            <circle r={16} fill="url(#pkt)" opacity={0.55} />
            <circle r={5.5} fill="#f0bc3d" stroke="#fff7dd" strokeWidth={1.5} />
            {packetLabel && !vertical && (
              <g transform="translate(10 -22)">
                <rect x={0} y={0} rx={6} width={packetLabel.length * 6.6 + 14} height={19} fill="#0a0f1e" stroke="rgb(230 168 23 / 0.6)" />
                <text x={7} y={13} fill="#f0bc3d" fontSize={11} fontFamily="JetBrains Mono, monospace">{packetLabel}</text>
              </g>
            )}
          </g>
        )}
      </svg>

      {nodes.map((n, i) => {
        const p = pos[i];
        const sel = n.id === selectedId;
        return (
          <button
            key={n.id}
            onClick={() => onSelect?.(n.id)}
            aria-pressed={sel}
            aria-label={`Paso ${i + 1}: ${n.title} · ${n.status}`}
            data-step={n.id}
            data-status={n.status}
            className={cx(
              'group absolute flex flex-col rounded-[14px] border p-3 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 ease-[var(--ease-out)]',
              'bg-navy-mid/90 hover:bg-[#1f2b42] focus-visible:outline-gold',
              sel ? 'border-gold shadow-[0_0_0_3px_rgb(230_168_23/0.18),0_12px_30px_-12px_rgb(230_168_23/0.35)]' : 'border-white/10 hover:border-white/25',
              n.status === 'running' && 'animate-pulse-gold border-gold/70',
              n.status === 'needs_input' && !sel && 'border-[#f59e0b]/60',
              n.status === 'idle' && 'opacity-80',
            )}
            style={{ left: p.x, top: p.y, width: nw, height: nh }}
          >
            <div className="flex items-start gap-1.5">
              <span className="min-w-0 flex-1 pt-px text-[13.5px] font-semibold leading-[1.2] text-white">{vertical && <span className="mr-1.5 font-mono text-[11px] font-normal text-muted">{String(i + 1).padStart(2, '0')}</span>}{n.title}</span>
              <span className={cx('flex size-5 shrink-0 items-center justify-center rounded-full transition-colors duration-300 [&>svg]:size-3', STATUS_BG[n.status])}>{STATUS_ICON[n.status]}</span>
            </div>
            {!vertical && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                {n.agents.map((a) => (
                  <span key={a} className={cx('inline-flex items-center gap-1 rounded-md py-px pl-px pr-1.5 font-mono text-[11px]', a === 'MTI' ? 'bg-gold/15 text-gold-light' : 'bg-white/[0.07] text-secondary')}><AgentIcon code={a} size={15} />{a}</span>
                ))}
                {!compact && <span className="truncate pl-0.5 text-[12px] text-muted">{n.short}</span>}
              </div>
            )}
            <div className={cx('mt-auto line-clamp-2 text-[12.5px] leading-snug', n.status === 'needs_input' ? 'text-[#fbbf24]' : n.status === 'completed' ? 'text-secondary' : 'text-muted')}>
              {n.summary ?? (n.status === 'idle' ? 'Pendiente' : n.status === 'running' ? 'Ejecutando…' : '')}
            </div>
          </button>
        );
      })}
    </div>
  );
}
