import { AnimatePresence, motion } from 'motion/react';
import { AgentChip } from '@/components/agents/AgentIcon';
import { ArrowRight, Boxes, Factory, FileText, Mail, Play, Target, User } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button } from '@/components/ui';
import { BrandLogo } from '@/components/layout/Brand';
import { holePositions } from '@/components/part/PartDrawing';
import { AGENTS } from '@/fixtures/agents';
import { CATALOG } from '@/fixtures/catalog';
import { CONNECTORS } from '@/fixtures/integrations';
import { estimate } from '@/services/estimation/engine';
import { useStudio } from '@/store/useStudio';
import { cx, eur, numSmart } from '@/lib/format';
import { useMotionOff } from '@/lib/useMotion';
import { CaseCard } from '../catalog/CatalogPage';

const STAR = 'rfq-2026-0042';

export default function SolutionsPage() {
  const requests = useStudio((s) => s.requests);
  const erp = useStudio((s) => s.erp);
  const runs = useStudio((s) => s.runs);
  const nav = useNavigate();
  const star = requests.find((r) => r.id === STAR)!;
  const start = () => nav('/demo');
  const stats = [
    ['Solicitudes en bandeja', requests.length],
    ['Pendientes de revisión o dato', requests.filter((r) => ['reviewing', 'needs_input'].includes(r.state)).length],
    ['Borradores creados por agentes', erp.saleOrders.filter((o) => o.createdBy.startsWith('MTI')).length],
    ['Ejecuciones registradas', runs.length],
  ] as const;

  return (
    <div className="mx-auto max-w-[1680px] space-y-6 px-4 py-5 md:px-6">
      {/* Héroe */}
      <section className="tech-grid relative overflow-hidden rounded-[20px] px-6 py-8 ring-1 ring-navy-border md:px-10 md:py-10">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1 text-[12.5px] font-medium text-gold-light ring-1 ring-white/10"><span className="size-1.5 rounded-full bg-gold" /> MTI Agentive AI Studio</span>
            <h1 className="mt-4 text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] text-white md:text-[46px]">Agentes que leen, calculan y dejan el trabajo listo en tu ERP</h1>
            <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-secondary">Entra una solicitud. Los agentes extraen cada dato con su fuente, estiman de forma explicable y, tras tu aprobación, dejan un borrador trazable en Odoo.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" variant="primary" icon={<Play />} onClick={start} data-testid="start-demo">Iniciar demo</Button>
              <Button size="lg" variant="outline-dark" onClick={() => nav('/fabricacion')} iconRight={<ArrowRight />}>Abrir workspace</Button>
            </div>
            <p className="mt-4 text-[12.5px] text-muted">Demo local con datos de ejemplo · sin credenciales externas · 4–6 minutos guiados</p>
          </div>
          <HeroPipeline />
        </div>
      </section>

      {/* Dos protagonistas */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <ManufacturingHero req={star} />
        <ErpHero />
      </div>

      {/* Estado */}
      <section aria-label="Estado de esta demo" className="rounded-2xl bg-white px-5 py-4 ring-1 ring-line">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[14px] font-semibold">Estado de esta demo</h2>
          <span className="text-[12px] text-ink-3">Datos locales de esta sesión · no son métricas de cliente</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(([k, v]) => <div key={k}><div className="text-[26px] font-semibold tracking-tight tabular">{v}</div><div className="text-[12.5px] text-ink-3">{k}</div></div>)}
        </div>
      </section>

      {/* Catálogo */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[20px] font-semibold tracking-tight">Otros casos de la presentación</h2>
            <p className="text-[13.5px] text-ink-3">Recorridos simplificados con el mismo motor. Clientes como referencia; datos ficticios.</p>
          </div>
          <Link to="/catalogo" className="text-[13.5px] font-medium text-[#8a6100] hover:underline">Ver catálogo</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {CATALOG.map((c) => <CaseCard key={c.id} c={c} dense />)}
        </div>
      </section>

      {/* Agentes + ecosistema */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Link to="/arquitectura" className="group rounded-2xl bg-navy p-5 ring-1 ring-navy-border transition-shadow hover:ring-gold/40">
          <div className="flex items-center justify-between"><h2 className="text-[15px] font-semibold text-white">Ocho agentes, una orquestación</h2><ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" /></div>
          <div className="mt-3 flex flex-wrap gap-1.5">{AGENTS.map((a) => <AgentChip key={a.code} code={a.code} />)}</div>
        </Link>
        <Link to="/integraciones" className="group rounded-2xl bg-white p-5 ring-1 ring-line transition-shadow hover:ring-gold/40">
          <div className="flex items-center justify-between"><h2 className="text-[15px] font-semibold">Integración con sistemas empresariales</h2><ArrowRight className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5" /></div>
          <div className="mt-3 flex flex-wrap items-center gap-2">{CONNECTORS.filter((c) => c.logo).map((c) => <BrandLogo key={c.id} src={c.logo} name={c.name} size={34} />)}</div>
          <p className="mt-2 text-[12px] text-ink-3">Estado por conector: demo, pendiente o sandbox. Ninguno se muestra conectado sin prueba.</p>
        </Link>
      </section>
    </div>
  );
}

function HeroPipeline() {
  const motionOff = useMotionOff();
  const steps = [
    { icon: <Mail className="size-4" />, label: 'Correo y adjuntos', sub: 'C01 · fuentes por campo' },
    { icon: <span className="font-mono text-[11px] font-bold">MTI</span>, label: 'Orquestador + agentes', sub: 'plan · CAD · histórico' },
    { icon: <Factory className="size-4" />, label: 'Estimación explicable', sub: 'reglas + corrección' },
    { icon: <User className="size-4" />, label: 'Revisión humana', sub: 'aprobación por versión' },
    { icon: <FileText className="size-4" />, label: 'Borrador en Odoo', sub: 'sale.order · idempotente' },
  ];
  const [i, setI] = useState(0);
  useEffect(() => { if (motionOff) return; const t = setInterval(() => setI((x) => (x + 1) % steps.length), 1500); return () => clearInterval(t); }, [motionOff, steps.length]);
  return (
    <div className="relative mx-auto w-full max-w-[520px]" aria-hidden>
      <div className="absolute bottom-6 left-[27px] top-6 w-px bg-gradient-to-b from-gold/60 via-white/15 to-white/5" />
      <ul className="space-y-2.5">
        {steps.map((s, k) => (
          <li key={s.label} className={cx('relative flex items-center gap-3 rounded-2xl px-3 py-2.5 ring-1 transition-[background-color,box-shadow] duration-500', k === i ? 'bg-white/[0.09] ring-gold/50 shadow-[0_0_30px_-8px_rgb(230_168_23/0.45)]' : 'bg-white/[0.03] ring-white/[0.07]')}>
            <span className={cx('relative z-10 flex size-[30px] items-center justify-center rounded-full text-navy transition-colors duration-500', k <= i ? 'bg-gold' : 'bg-white/20 text-white')}>{s.icon}</span>
            <div><div className="text-[14px] font-semibold text-white">{s.label}</div><div className="text-[12px] text-muted">{s.sub}</div></div>
            {k === i && !motionOff && <motion.span layoutId="hero-dot" className="ml-auto size-2 rounded-full bg-gold shadow-[0_0_12px_#e6a817]" transition={{ type: 'spring', duration: 0.6, bounce: 0.2 }} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ManufacturingHero({ req }: { req: ReturnType<typeof useStudio.getState>['requests'][number] }) {
  const r = useMemo(() => estimate(req.draft), [req.draft]);
  const motionOff = useMotionOff();
  const [k, setK] = useState(2);
  useEffect(() => { if (motionOff || !r.operations.length) return; const t = setInterval(() => setK((x) => (x + 1) % r.operations.length), 1800); return () => clearInterval(t); }, [motionOff, r.operations.length]);
  const op = r.operations[k];
  const pending = useStudio((s) => s.requests.filter((x) => x.state !== 'draft_created').length);
  return (
    <article className="flex flex-col overflow-hidden rounded-[20px] bg-white ring-1 ring-line shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3 px-6 pt-5">
        <div>
          <Badge tone="gold">Recorrido estrella · GALMETEC / PROMEGA</Badge>
          <h2 className="mt-2 text-[24px] font-semibold tracking-tight">De un plano a una oferta</h2>
          <p className="mt-1 max-w-md text-[14px] text-ink-3">Correo, plano y CAD → operaciones con tiempos explicables, histórico comparable y precio.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-0 border-y border-line md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="tech-grid-light relative flex items-center justify-center bg-[#f8fafc] p-4">
          <PartMini req={req} op={op?.kind} />
          <span className="absolute left-3 top-3 rounded-md bg-white/80 px-2 py-0.5 font-mono text-[11.5px] text-ink-3 ring-1 ring-line">{req.partNumber} rev. {req.currentRevision} · modelo de ejemplo</span>
        </div>
        <ul className="divide-y divide-line border-t border-line md:border-l md:border-t-0">
          {r.operations.map((o, i) => (
            <li key={o.id} className={cx('flex items-center justify-between gap-2 px-4 py-2 text-[13px] transition-colors duration-300', i === k && 'bg-gold/10')}>
              <span className={cx(i === k ? 'font-semibold text-ink' : 'text-ink-2')}>{o.name}</span>
              <span className="tabular text-ink-3">{numSmart(o.totalMin, 1)} min</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="text-[13px] text-ink-3">{req.ref} · {req.draft.quantity} uds · <b className="text-ink tabular">{numSmart(r.estimatedLotMin, 1)} min</b> · {eur(r.cost.commercialTotalEur)}</div>
        <div className="flex gap-2">
          <Link to="/fabricacion" className="inline-flex h-9 items-center rounded-[10px] px-3 text-[13.5px] font-medium text-ink-2 ring-1 ring-line-strong hover:bg-ink/[0.03]">Bandeja · {pending}</Link>
          <Link to={`/fabricacion/${req.id}/flujo`} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-navy px-3.5 text-[13.5px] font-medium text-white hover:bg-navy-mid">Abrir expediente <ArrowRight className="size-4" /></Link>
        </div>
      </div>
    </article>
  );
}

function PartMini({ req, op }: { req: { draft: { features: Parameters<typeof holePositions>[0] } }; op?: string }) {
  const f = req.draft.features;
  const s = Math.min(380 / f.lengthMm, 200 / f.widthMm);
  const L = f.lengthMm * s, W = f.widthMm * s;
  const ox = (420 - L) / 2, oy = (240 - W) / 2;
  const gold = '#e6a817';
  const on = (k: string) => op === k;
  return (
    <svg viewBox="0 0 420 240" className="h-[220px] w-full max-w-[460px]" role="img" aria-label="Pieza con la operación resaltada">
      <rect x={ox - 8} y={oy - 8} width={L + 16} height={W + 16} rx={6} fill="none" stroke={on('corte') ? gold : '#cbd5e1'} strokeDasharray="5 4" strokeWidth={on('corte') ? 2 : 1} className="transition-[stroke] duration-300" />
      <rect x={ox} y={oy} width={L} height={W} rx={12} fill="#e8edf4" stroke={on('fresado') || on('desbarbado') ? gold : '#475569'} strokeWidth={on('fresado') || on('desbarbado') ? 3.5 : 1.6} className="transition-all duration-300" />
      {f.pocket && <rect x={ox + (L - f.pocket.lengthMm * s) / 2} y={oy + (W - f.pocket.widthMm * s) / 2} width={f.pocket.lengthMm * s} height={f.pocket.widthMm * s} rx={8} fill={on('bolsillo') ? 'rgba(230,168,23,0.45)' : '#d5dde8'} stroke={on('bolsillo') ? gold : '#64748b'} strokeWidth={1.4} className="transition-all duration-300" />}
      {holePositions(f).map(([x, y], i) => <circle key={i} cx={ox + x * s} cy={oy + y * s} r={(f.holes.diameterMm / 2) * s} fill={on('taladrado') ? gold : '#fff'} stroke={on('taladrado') || on('desbarbado') ? gold : '#475569'} strokeWidth={1.4} className="transition-all duration-300" />)}
      <AnimatePresence>{on('inspeccion') && <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><line x1={ox} y1={oy + W + 18} x2={ox + L} y2={oy + W + 18} stroke={gold} strokeWidth={1.5} /><text x={ox + L / 2} y={oy + W + 32} textAnchor="middle" fontSize={12} fill="#8a6100" fontFamily="JetBrains Mono">{f.lengthMm} mm</text></motion.g>}</AnimatePresence>
    </svg>
  );
}

function ErpHero() {
  const motionOff = useMotionOff();
  const inbox = useStudio((s) => s.erp.inbox);
  const [k, setK] = useState(0);
  useEffect(() => { if (motionOff) return; const t = setInterval(() => setK((x) => (x + 1) % 3), 1700); return () => clearInterval(t); }, [motionOff]);
  const recs = [
    { icon: <User className="size-3.5" />, m: 'res.partner', t: 'Conservas Océano S.A.' },
    { icon: <Target className="size-3.5" />, m: 'crm.lead', t: 'CB-30 + EJ-12 — línea de cierre' },
    { icon: <FileText className="size-3.5" />, m: 'sale.order', t: 'Presupuesto borrador' },
  ];
  return (
    <article className="flex flex-col overflow-hidden rounded-[20px] bg-white ring-1 ring-line shadow-[var(--shadow-card)]">
      <div className="px-6 pt-5">
        <Badge tone="info">Odoo · TÉCNICAS DEL MAR · GALPI</Badge>
        <h2 className="mt-2 text-[24px] font-semibold tracking-tight">Tu ERP, trabajando contigo</h2>
        <p className="mt-1 max-w-md text-[14px] text-ink-3">Bandeja + agentes + registros conectados: oferta, pedido multicanal, estado y pricing.</p>
      </div>
      <div className="tech-grid mx-6 mt-4 grid flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-2xl p-4 ring-1 ring-navy-border">
        <ul className="space-y-2">
          {inbox.slice(0, 3).map((i, n) => (
            <li key={i.id} className={cx('flex items-center gap-2 rounded-xl px-2.5 py-2 ring-1 transition-colors duration-300', n === k ? 'bg-white/10 ring-gold/50' : 'bg-white/[0.04] ring-white/10')}>
              <BrandLogo src={i.channel === 'whatsapp' ? '/brands/whatsapp.svg' : '/brands/gmail.svg'} name={i.channel} size={18} plate={false} />
              <span className="truncate text-[12.5px] text-secondary">{i.subject}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col items-center gap-1 text-gold">
          <Boxes className="size-5" />
          <span className="font-mono text-[10.5px] text-muted">C01·C04·C02</span>
        </div>
        <ul className="space-y-2">
          {recs.map((r, n) => (
            <li key={r.m} className={cx('rounded-xl px-2.5 py-2 ring-1 transition-colors duration-300', n === k ? 'bg-gold/15 ring-gold/50' : 'bg-white/[0.04] ring-white/10')}>
              <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-muted">{r.icon}{r.m}</div>
              <div className="truncate text-[12.5px] text-white">{r.t}</div>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-2 text-[13px] text-ink-3"><BrandLogo src="/brands/odoo.svg" name="Odoo" size={22} /> Representación MTI · adapter demo</div>
        <Link to="/odoo/bandeja" className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-navy px-3.5 text-[13.5px] font-medium text-white hover:bg-navy-mid">Abrir bandeja Odoo <ArrowRight className="size-4" /></Link>
      </div>
    </article>
  );
}
