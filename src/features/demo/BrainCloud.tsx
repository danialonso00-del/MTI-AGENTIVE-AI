// «Cerebro» de conocimiento. Fases dirigidas por el reloj `t` del reproductor (pausable):
//   1. órbita: los documentos indexados giran alrededor del núcleo;
//   2. barrido: un radar recorre la nube y puntúa la similitud de cada documento;
//   3. reglas: los relevantes se encienden y los descartados muestran su motivo;
//   4. contexto: los relevantes vuelan a la lista de resultados.
import { LayoutGroup, motion } from 'motion/react';
import { Brain, Building2, Check, Database, FileText, Package, Ruler, ScrollText, Search, Sparkles, Truck, Wallet, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '@/lib/format';
import { prog, Typewriter } from './kit';

export type CloudKind = 'job' | 'dataset' | 'norma' | 'partner' | 'product' | 'order' | 'picking' | 'arpa';
export interface CloudDoc { id: string; label: string; sub: string; kind: CloudKind }

const KIND: Record<CloudKind, { icon: ReactNode; color: string; name: string }> = {
  job: { icon: <ScrollText />, color: '#f0bc3d', name: 'Histórico' },
  dataset: { icon: <Database />, color: '#38bdf8', name: 'Datos' },
  norma: { icon: <Ruler />, color: '#a78bfa', name: 'Norma' },
  partner: { icon: <Building2 />, color: '#fb7185', name: 'Cliente' },
  product: { icon: <Package />, color: '#34d399', name: 'Producto' },
  order: { icon: <FileText />, color: '#818cf8', name: 'Documento' },
  picking: { icon: <Truck />, color: '#22d3ee', name: 'Logística' },
  arpa: { icon: <Wallet />, color: '#fb923c', name: 'Tarifa' },
};

interface Props {
  t: number;
  docs: CloudDoc[];
  selected: string[];
  rejected: { id: string; reason: string }[];
  query: string;
  centerLabel: string;
  centerSub: string;
  scanAt: number;
  matchAt: number;
  flyAt: number;
  selectedTitle: string;
  rejectedTitle: string;
  footer?: ReactNode;
  renderSelected?: (d: CloudDoc) => ReactNode;
}

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const fmtScore = (n: number) => n.toFixed(2).replace('.', ',');
const CX = 50, CY = 55; // núcleo (en % del lienzo)
const ASPECT = 1.65; // ancho/alto aproximado del lienzo, para alinear el radar con las tarjetas
const SQUASH = 1.18 / ASPECT; // el radar es un círculo aplastado en vertical
const PARTICLES = Array.from({ length: 34 }, (_, i) => { const h = hash(`p${i}`); return { x: h % 100, y: (h >> 8) % 100, s: 1 + ((h >> 16) % 3), v: 0.4 + ((h >> 4) % 10) / 12, ph: (h >> 12) % 628 }; });

function KindTile({ kind, size = 22, dim }: { kind: CloudKind; size?: number; dim?: boolean }) {
  const k = KIND[kind];
  return (
    <span className="flex shrink-0 items-center justify-center rounded-md [&>svg]:size-[60%]" style={{ width: size, height: size, background: dim ? 'rgb(255 255 255 / 0.06)' : `${k.color}26`, color: dim ? '#94a3b8' : k.color, boxShadow: dim ? undefined : `inset 0 0 0 1px ${k.color}55` }}>{k.icon}</span>
  );
}

export function BrainCloud({ t, docs, selected, rejected, query, centerLabel, centerSub, scanAt, matchAt, flyAt, selectedTitle, rejectedTitle, footer, renderSelected }: Props) {
  const n = docs.length;
  const scanEnd = Math.max(scanAt + 800, matchAt - 150);
  const sweep = prog(t, scanAt, scanEnd - scanAt); // 0..1, una vuelta completa del radar
  const scanning = t >= scanAt && t < matchAt;
  const matched = t >= matchAt;
  const flown = t >= flyAt;
  // La nube gira hasta que empieza la búsqueda; luego se congela (con un leve vaivén) para que el radar sea legible.
  const rot = (Math.min(t, scanAt) / 1000) * 0.28;
  const isSel = (id: string) => selected.includes(id);
  const rej = (id: string) => rejected.find((r) => r.id === id);

  const score = (d: CloudDoc) => {
    const si = selected.indexOf(d.id);
    if (si >= 0) return Math.max(0.71, 0.97 - si * 0.04);
    const ri = rejected.findIndex((r) => r.id === d.id);
    if (ri >= 0) return Math.max(0.31, 0.62 - ri * 0.07);
    return 0.14 + (hash(d.id) % 22) / 100;
  };

  // Con muchos documentos: tres órbitas y tarjetas compactas.
  const dense = n > 10;
  const RINGS = dense ? [[21, 17], [31, 26], [41, 35]] : [[24, 21], [37, 33]];
  const pos = docs.map((d, i) => {
    // Cada órbita reparte sus documentos por igual y se desfasa respecto a las demás para no solaparse.
    const ring = i % RINGS.length;
    const count = Math.floor(n / RINGS.length) + (ring < n % RINGS.length ? 1 : 0);
    const j = Math.floor(i / RINGS.length);
    const a = (j / count) * Math.PI * 2 + (ring * Math.PI * 2) / count / RINGS.length + rot * (ring % 2 ? 1 : -1) - Math.PI / 2;
    const [rx, ry] = RINGS[ring];
    const bob = Math.sin(t / 900 + i * 1.7) * 0.7;
    const x = CX + rx * Math.cos(a), y = CY + ry * Math.sin(a) + bob;
    // Ángulo del radar (0° arriba, sentido horario) que pasa por la tarjeta: se deshace el aplastamiento.
    const deg = ((Math.atan2((x - CX) * ASPECT, -(y - CY) / SQUASH) * 180) / Math.PI + 360) % 360;
    const depth = (Math.sin(a) + 1) / 2;
    return { d, i, x, y, deg, depth, scanned: t >= scanAt && (sweep >= 1 || sweep * 360 >= deg) };
  });
  const scannedN = pos.filter((p) => p.scanned).length;
  const phase = flown ? 'Contexto listo' : matched ? 'Aplicando reglas y descartes' : scanning ? 'Búsqueda por similitud' : 'Índice en memoria';
  const embed = Array.from({ length: 22 }, (_, i) => 0.25 + ((hash(query + i) % 75) / 100));

  return (
    <LayoutGroup>
      <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_310px]">
        <div className="relative min-h-[440px] overflow-hidden rounded-2xl bg-[#060a14] ring-1 ring-white/10">
          {/* Fondo: halos, rejilla de puntos y partículas */}
          <div className="absolute inset-0" style={{ background: `radial-gradient(circle at ${CX}% ${CY}%, rgb(230 168 23 / ${0.1 + (scanning ? 0.08 : 0)}), transparent 42%), radial-gradient(circle at 12% 8%, rgb(56 189 248 / 0.09), transparent 38%), radial-gradient(circle at 90% 95%, rgb(129 140 248 / 0.11), transparent 42%)` }} />
          <div className="absolute inset-0 opacity-70" style={{ backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.07) 1px, transparent 1.2px)', backgroundSize: '22px 22px', maskImage: `radial-gradient(ellipse at ${CX}% ${CY}%, black 20%, transparent 75%)`, WebkitMaskImage: `radial-gradient(ellipse at ${CX}% ${CY}%, black 20%, transparent 75%)` }} />
          {PARTICLES.map((p, i) => (
            <span key={i} className="absolute rounded-full bg-white" style={{ left: `${p.x}%`, top: `${(((p.y - (t / 1000) * p.v * 2.2) % 100) + 100) % 100}%`, width: p.s, height: p.s, opacity: 0.12 + 0.18 * (1 + Math.sin(t / 700 + p.ph)) / 2 }} />
          ))}

          {/* Radar */}
          {scanning && (
            <div className="pointer-events-none absolute aspect-square w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{
              left: `${CX}%`, top: `${CY}%`, transform: `translate(-50%, -50%) scaleY(${SQUASH}) rotate(${sweep * 360 - 62}deg)`,
              background: 'conic-gradient(from 0deg, transparent 0deg, rgb(230 168 23 / 0.04) 15deg, rgb(230 168 23 / 0.32) 60deg, rgb(255 224 150 / 0.9) 61.6deg, transparent 62deg)',
              opacity: Math.min(1, (1 - prog(t, scanEnd - 200, 300)) * 1.2),
            }} />
          )}

          {/* Órbitas, constelación y haces */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="bc-beam" x1="0" x2="1"><stop offset="0" stopColor="#f0bc3d" stopOpacity="0.9" /><stop offset="1" stopColor="#f0bc3d" stopOpacity="0.15" /></linearGradient>
            </defs>
            {RINGS.map(([rx, ry], k) => (
              <ellipse key={k} cx={CX} cy={CY} rx={rx} ry={ry} fill="none" stroke="white" strokeOpacity={0.09} strokeWidth={1} strokeDasharray="2 6" strokeDashoffset={(t / 60) * (k ? -1 : 1)} vectorEffect="non-scaling-stroke" />
            ))}
            {pos.map((p, k) => {
              const q = pos[(k + RINGS.length) % n];
              if (!q || flown) return null;
              const lit = p.scanned && q.scanned && isSel(p.d.id) && isSel(q.d.id);
              return <line key={`c${k}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={lit ? '#f0bc3d' : 'white'} strokeOpacity={lit ? 0.35 : 0.05} strokeWidth={1} vectorEffect="non-scaling-stroke" />;
            })}
            {!flown && pos.filter((p) => p.scanned && isSel(p.d.id)).map((p) => {
              const mx = (CX + p.x) / 2 + (p.y - CY) * 0.25, my = (CY + p.y) / 2 - (p.x - CX) * 0.25;
              const d = `M ${CX} ${CY} Q ${mx} ${my} ${p.x} ${p.y}`;
              const pulse = ((t / 1100 + p.i * 0.23) % 1);
              return (
                <g key={`b${p.d.id}`}>
                  <path d={d} fill="none" stroke="url(#bc-beam)" strokeWidth={1.4} vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - Math.min(1, prog(t, scanAt, 500))} />
                  <path d={d} fill="none" stroke="#fff6d8" strokeWidth={3} strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="0.04 1" strokeDashoffset={-pulse} style={{ filter: 'drop-shadow(0 0 4px #f0bc3d)' }} />
                </g>
              );
            })}
          </svg>

          {/* Barra de consulta semántica */}
          <div className="absolute left-1/2 top-3 z-30 w-[min(600px,92%)] -translate-x-1/2">
            <div className={cx('flex items-center gap-2.5 rounded-xl bg-white/[0.06] px-3 py-2 ring-1 backdrop-blur-md transition-[box-shadow] duration-500', t >= scanAt ? 'shadow-[0_0_30px_-8px_rgb(230_168_23/0.6)] ring-gold/40' : 'ring-white/10')}>
              <Search className={cx('size-4 shrink-0', t >= scanAt ? 'text-gold-light' : 'text-muted')} />
              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-white">
                {t >= scanAt ? <Typewriter t={t} from={scanAt} text={query} cps={60} /> : <span className="text-muted">Esperando consulta…</span>}
              </span>
              <span className="hidden items-end gap-[2px] sm:flex" title="Representación vectorial de la consulta">
                {embed.map((h, i) => (
                  <span key={i} className="w-[3px] rounded-full bg-gold-light" style={{ height: `${Math.round(4 + h * 14 * prog(t, scanAt + i * 25, 300))}px`, opacity: 0.35 + h * 0.65 }} />
                ))}
              </span>
            </div>
          </div>

          {/* Núcleo */}
          <div className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${CX}%`, top: `${CY}%` }}>
            <div className="relative flex size-[124px] items-center justify-center">
              {[0, 1, 2].map((k) => {
                const ph = ((t / 1900) + k / 3) % 1;
                return <span key={k} className="absolute inset-0 rounded-full border border-gold/50" style={{ transform: `scale(${0.55 + ph * 0.9})`, opacity: (1 - ph) * (scanning ? 0.7 : 0.35) }} />;
              })}
              <span className="absolute inset-[10px] rounded-full" style={{
                background: `conic-gradient(from ${t * 0.09}deg, #f0bc3d, transparent 28%, rgb(56 189 248 / 0.8) 50%, transparent 72%, #f0bc3d)`,
                mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 2px))', WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 2px))',
                filter: 'drop-shadow(0 0 6px rgb(230 168 23 / 0.6))',
              }} />
              <span className="absolute inset-[22px] rounded-full bg-gold/20 blur-xl" style={{ opacity: scanning ? 1 : 0.6 }} />
              <span className="relative flex size-[66px] items-center justify-center rounded-full ring-1 ring-gold/60" style={{ background: 'radial-gradient(circle at 32% 28%, #24324f, #0a0f1e 70%)', boxShadow: '0 0 40px rgb(230 168 23 / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.12)' }}>
                <Brain className="size-8 text-gold-light" style={{ transform: `scale(${1 + (scanning ? Math.sin(t / 160) * 0.05 : 0)})` }} />
                {flown && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[#22c55e] text-white ring-2 ring-[#060a14]"><Check className="size-3" /></motion.span>}
              </span>
            </div>
            <div className="mt-0.5 rounded-full bg-[#060a14]/80 px-2.5 py-0.5 text-center backdrop-blur">
              <div className="text-[13px] font-semibold text-white">{centerLabel}</div>
              <div className="font-mono text-[10.5px] text-muted">{centerSub}</div>
            </div>
          </div>

          {/* Documentos */}
          {pos.map(({ d, x, y, depth, scanned }) => {
            if (flown && isSel(d.id)) return null;
            const r = matched ? rej(d.id) : undefined;
            const hot = scanned && isSel(d.id);
            const s = score(d);
            const dim = matched && !hot && !r;
            return (
              <motion.div key={d.id} layoutId={`cloud-${d.id}`}
                className={cx('absolute -translate-x-1/2 -translate-y-1/2', dense ? 'w-[132px]' : 'w-[158px]')}
                style={{ left: `${x}%`, top: `${y}%`, zIndex: hot ? 25 : Math.round(depth * 10), scale: (0.84 + depth * 0.2) * (hot ? 1.06 : 1), opacity: dim ? 0.32 : r ? 0.8 : 0.55 + depth * 0.45, filter: !scanned && t >= scanAt ? 'saturate(0.6)' : undefined }}>
                <div className={cx('relative rounded-xl px-2 py-1.5 ring-1 backdrop-blur-md transition-[background-color,box-shadow] duration-300',
                  hot ? 'bg-gold/[0.18] ring-gold shadow-[0_0_28px_-4px_rgb(230_168_23/0.7)]' : r ? 'bg-[#dc2626]/[0.12] ring-[#f87171]/50' : 'bg-white/[0.06] ring-white/[0.14]')}>
                  <div className="flex items-center gap-1.5">
                    <KindTile kind={d.kind} dim={dim} size={dense ? 18 : 22} />
                    <div className="min-w-0 flex-1">
                      <div className={cx('truncate text-[11.5px] font-semibold', hot ? 'text-white' : r ? 'text-[#fca5a5] line-through decoration-[#f87171]/70' : 'text-white')}>{d.label}</div>
                      {!dense && <div className="truncate text-[10px] text-muted">{d.sub}</div>}
                    </div>
                  </div>
                  {scanned && (
                    <motion.span initial={{ opacity: 0, y: 4, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={cx('absolute -right-2 -top-2.5 flex items-center gap-0.5 rounded-full px-1.5 py-px font-mono text-[10px] font-semibold ring-1',
                        hot ? 'bg-gold text-navy ring-gold-light' : r ? 'bg-[#7f1d1d] text-[#fecaca] ring-[#f87171]/60' : 'bg-navy-mid text-muted ring-white/15')}>
                      {hot ? <Check className="size-2.5" /> : r ? <X className="size-2.5" /> : null}{fmtScore(s)}
                    </motion.span>
                  )}
                </div>
                {r && !dense && <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 truncate rounded-md bg-[#450a0a]/80 px-1.5 py-0.5 text-center text-[10px] text-[#fca5a5] ring-1 ring-[#f87171]/30">{r.reason}</motion.div>}
              </motion.div>
            );
          })}

          {/* Estado */}
          <div className="absolute inset-x-3 bottom-3 z-30 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-[#060a14]/75 px-3 py-2 text-[11.5px] ring-1 ring-white/10 backdrop-blur-md">
            <span className="flex items-center gap-1.5 font-semibold text-white">
              <span className="relative flex size-2">{!flown && t >= scanAt && <span className="absolute inset-0 animate-ping rounded-full bg-gold" />}<span className={cx('relative size-2 rounded-full', flown ? 'bg-[#22c55e]' : t >= scanAt ? 'bg-gold' : 'bg-white/30')} /></span>
              {phase}
            </span>
            <span className="text-muted">Analizados <b className="tabular text-white">{scannedN}/{n}</b></span>
            <span className="text-muted">Relevantes <b className="tabular text-gold-light">{pos.filter((p) => p.scanned && isSel(p.d.id)).length}</b></span>
            <span className="text-muted">Descartados <b className="tabular text-[#fca5a5]">{matched ? rejected.length : 0}</b></span>
            <span className="ml-auto hidden h-1 w-28 overflow-hidden rounded-full bg-white/10 sm:block"><span className="block h-full rounded-full bg-gradient-to-r from-gold to-gold-light" style={{ width: `${(flown ? 1 : matched ? 0.85 : t >= scanAt ? 0.15 + sweep * 0.6 : 0.05) * 100}%`, transition: 'width .3s' }} /></span>
          </div>
        </div>

        {/* Resultados */}
        <div className="flex min-h-0 flex-col gap-3">
          <div className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/10">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-gold-light"><Sparkles className="size-3.5" />{selectedTitle}</span>
              {flown && <span className="rounded-full bg-gold/15 px-2 py-px font-mono text-[11px] text-gold-light ring-1 ring-gold/30">{selected.length}</span>}
            </div>
            <div className="space-y-2">
              {!flown && [0, 1, 2].map((k) => (
                <div key={k} className="relative h-[46px] overflow-hidden rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]">
                  {t >= scanAt && <span className="absolute inset-y-0 w-1/2" style={{ left: `${(((t / 1300) + k * 0.2) % 1.6) * 100 - 50}%`, background: 'linear-gradient(90deg, transparent, rgb(230 168 23 / 0.12), transparent)' }} />}
                  <span className="absolute left-3 top-3 h-2 w-24 rounded bg-white/10" /><span className="absolute left-3 top-7 h-1.5 w-36 rounded bg-white/[0.06]" />
                </div>
              ))}
              {!flown && <div className="text-center text-[11.5px] text-muted">{t >= scanAt ? 'Buscando coincidencias…' : 'Esperando consulta'}</div>}
              {flown && docs.filter((d) => isSel(d.id)).map((d, i) => (
                <motion.div key={d.id} layoutId={`cloud-${d.id}`} transition={{ type: 'spring', duration: 0.9, bounce: 0.18, delay: i * 0.06 }}
                  className="relative overflow-hidden rounded-xl bg-gradient-to-r from-gold/[0.16] to-gold/[0.06] px-3 py-2 ring-1 ring-gold/45">
                  {renderSelected ? renderSelected(d) : (
                    <div className="flex items-start gap-2">
                      <KindTile kind={d.kind} size={26} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2"><span className="truncate text-[12.5px] font-semibold text-white">{d.label}</span><span className="font-mono text-[10.5px] text-gold-light">{fmtScore(score(d))}</span></div>
                        <div className="truncate text-[11.5px] text-secondary">{d.sub}</div>
                        <div className="mt-1 h-1 rounded-full bg-white/10"><motion.div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light" initial={{ width: 0 }} animate={{ width: `${score(d) * 100}%` }} transition={{ delay: 0.4 + i * 0.08, duration: 0.6 }} /></div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
          {matched && rejected.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white/[0.03] p-3 ring-1 ring-white/10">
              <div className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-[#fca5a5]">{rejectedTitle}</div>
              <ul className="space-y-1.5">
                {rejected.slice(0, 5).map((r) => {
                  const d = docs.find((x) => x.id === r.id);
                  return <li key={r.id} className="flex items-start gap-1.5 text-[11.5px] leading-snug text-muted"><X className="mt-0.5 size-3 shrink-0 text-[#f87171]" /><span><span className="text-secondary">{d?.label}</span> · {r.reason}</span></li>;
                })}
              </ul>
            </motion.div>
          )}
          {footer}
          <p className="mt-auto text-[10.5px] leading-snug text-muted">Puntuaciones de similitud ilustrativas. La selección final la deciden las reglas y quedan registrados los motivos de cada descarte.</p>
        </div>
      </div>
    </LayoutGroup>
  );
}
