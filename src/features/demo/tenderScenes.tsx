// Recorrido guiado de licitaciones de obra: del portal a la oferta. Cada escena ejecuta el motor real.
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, FileSignature, FileText, Stamp, Users, XCircle } from 'lucide-react';
import { COMPANY, PRICE_BASE, TENDERS } from '@/fixtures/tenders';
import { DEFAULT_TENDER_PARAMS, estimateTender, screenTender } from '@/services/tenders/tenderEngine';
import { useStudio } from '@/store/useStudio';
import { cx, dateEs, eur, num } from '@/lib/format';
import { AgentPulse, AppWindow, CountUp, MultiHighlight, Reveal, ScanLine } from './kit';
import { BrainCloud, type CloudDoc } from './BrainCloud';
import type { DemoScenario } from './types';

const S = () => useStudio.getState();
const PORTAL_SRC = { PLACSP: '/brands/placsp.svg', TED: '/brands/ted.png' } as const;
const useEst = (id: string) => {
  const params = useStudio((s) => s.tenders?.[id]?.params ?? DEFAULT_TENDER_PARAMS);
  return estimateTender(TENDERS.find((x) => x.id === id)!, params);
};

function Portal({ t }: { t: number }) {
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <AppWindow section="Vigilancia de portales · contratación pública" className="h-full" right={<span className="flex items-center gap-2"><img src="/brands/placsp.svg" alt="PLACSP" className="h-5" /><img src="/brands/ted.png" alt="TED" className="h-5" /></span>}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-4 border-b border-line bg-white px-5 py-3"><img src="/brands/placsp.svg" alt="Plataforma de Contratación del Sector Público" className="h-9" /><span className="h-8 w-px bg-line" /><img src="/brands/ted.png" alt="TED" className="h-9" /><span className="text-[12px] leading-tight text-ink-3">Tenders Electronic Daily<br />Diario Oficial de la UE</span></div>
          <ul className="flex-1 divide-y divide-line overflow-hidden">
            {TENDERS.map((x, i) => (
              <Reveal key={x.id} t={t} at={600 + i * 380} y={-12}>
                <li className="flex items-center gap-3 px-5 py-2.5">
                  <img src={PORTAL_SRC[x.portal]} alt={x.portal} className="h-5 w-12 object-contain" />
                  <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-medium text-ink">{x.title}</div><div className="truncate text-[11.5px] text-ink-3">{x.organismo} · {x.province} · CPV {x.cpv[0].code}</div></div>
                  <span className="text-[13px] font-semibold tabular text-ink">{eur(x.budget)}</span>
                  <span className="rounded bg-info-bg px-1.5 text-[10.5px] font-bold text-info">NUEVO</span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </AppWindow>
      <div className="flex flex-col justify-center gap-3">
        <Reveal t={t} at={400}><AgentPulse code="C01" label="Lee los portales cada mañana" active={t < 5400} done={t >= 5400} /></Reveal>
        <Reveal t={t} at={5400}><div className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10"><div className="text-[40px] font-semibold leading-none text-gold-light"><CountUp t={t} from={5400} value={TENDERS.length} format={(v) => String(Math.round(v))} /></div><div className="mt-1 text-[13px] text-secondary">anuncios nuevos de obras, servicios y suministros</div></div></Reveal>
      </div>
    </div>
  );
}

function Filter({ t }: { t: number }) {
  const results = TENDERS.map((x) => screenTender(x));
  const order = [...results].sort((a, b) => Number(a.applies) - Number(b.applies));
  const at = (i: number) => 1600 + i * 520;
  return (
    <div className="flex h-full flex-col gap-4">
      <Reveal t={t} at={200}>
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/[0.05] px-4 py-3 ring-1 ring-white/10">
          <span className="mr-2 text-[12px] font-semibold uppercase tracking-wider text-gold-light">Perfil · {COMPANY.name}</span>
          {[...COMPANY.cpvPrefixes.slice(0, 4).map((c) => `CPV ${c.code}…`), COMPANY.regions.join(', '), `${eur(COMPANY.minBudget)}–${eur(COMPANY.maxBudget)}`, ...COMPANY.classifications.slice(0, 2).map((c) => `${c.grupo}-${c.subgrupo} cat. ${c.categoria}`)].map((x) => <span key={x} className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] text-white">{x}</span>)}
        </div>
      </Reveal>
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        {[true, false].map((col) => (
          <div key={String(col)} className={cx('flex min-h-0 flex-col rounded-2xl p-3 ring-1', col ? 'bg-[#16a34a]/10 ring-[#16a34a]/30' : 'bg-white/[0.03] ring-white/10')}>
            <div className={cx('mb-2 flex items-center gap-2 text-[13px] font-semibold', col ? 'text-[#86efac]' : 'text-[#fca5a5]')}>{col ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}{col ? 'Aplican a la empresa' : 'Descartadas con motivo'} <span className="tabular">({order.filter((r, i) => r.applies === col && t >= at(i)).length})</span></div>
            <div className="space-y-2 overflow-hidden">
              <AnimatePresence initial={false}>
                {order.map((r, i) => r.applies === col && t >= at(i) && (
                  <motion.div key={r.tender.id} layout initial={{ opacity: 0, x: col ? -40 : 40, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                    className={cx('rounded-xl px-3 py-2', col ? 'bg-white text-ink' : 'bg-white/[0.05]')}>
                    <div className={cx('truncate text-[13px] font-semibold', col ? 'text-ink' : 'text-secondary')}>{r.tender.title}</div>
                    <div className={cx('truncate text-[11.5px]', col ? 'text-ok' : 'text-[#fca5a5]')}>{col ? r.passed.slice(0, 2).join(' · ') : r.rejected[0]}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pliegos({ t, id }: { t: number; id: string }) {
  const x = TENDERS.find((y) => y.id === id)!;
  const p = x.pliego ?? [];
  const text = p.map((q, i) => `Cláusula ${q.doc.split('cláusula ')[1] ?? i + 1}. ${q.fragment}`).join('\n\n');
  const at = (i: number) => 1200 + i * 1000;
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <AppWindow section={`Licitaciones › ${x.expediente} › Pliego de cláusulas administrativas`} className="h-full" right={<img src={PORTAL_SRC[x.portal]} alt={x.portal} className="h-5" />}>
        <div className="relative h-full overflow-hidden bg-[#eef1f6] p-5">
          <ScanLine t={t} from={200} dur={1000} />
          <div className="mx-auto max-w-[640px] rounded-md bg-white p-6 shadow-lg">
            <div className="border-b-2 border-ink pb-2 text-center text-[12px] font-bold uppercase tracking-wide text-ink">Pliego de cláusulas administrativas particulares</div>
            <div className="mt-1 text-center text-[11.5px] text-ink-3">{x.organismo} · Exp. {x.expediente}</div>
            <MultiHighlight className="mt-4 block whitespace-pre-wrap font-serif text-[13.5px] leading-[1.7] text-ink-2" text={text} marks={p.map((q, i) => ({ needle: q.fragment, on: t >= at(i), active: t >= at(i) && t < at(i + 1) }))} />
          </div>
        </div>
      </AppWindow>
      <div className="space-y-2">
        <div className="text-[11.5px] font-semibold uppercase tracking-wider text-gold-light">Datos clave · C02</div>
        {p.map((q, i) => (
          <Reveal key={q.label} t={t} at={at(i) + 300} x={24} y={0}>
            <div className="rounded-xl bg-white/[0.06] px-3 py-2 ring-1 ring-white/10"><div className="text-[11.5px] text-muted">{q.label} · {q.doc}</div><div className="text-[13.5px] font-semibold text-white">{q.label.startsWith('Presupuesto') ? eur(x.budget) : q.value}</div></div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

function Prices({ t, id }: { t: number; id: string }) {
  const x = TENDERS.find((y) => y.id === id)!;
  const used = new Set((x.partidas ?? []).map((p) => p.baseRef).filter(Boolean) as string[]);
  const docs: CloudDoc[] = [
    ...PRICE_BASE.map((p) => ({ id: p.ref, label: p.description, sub: `${p.ref} · ${p.unitsPerDay} ${p.unit}/día`, kind: 'dataset' as const })),
    ...(x.partidas ?? []).filter((p) => !p.baseRef).map((p) => ({ id: `missing-${p.code}`, label: p.description.slice(0, 28), sub: `${p.code} · proyecto`, kind: 'norma' as const })),
  ];
  const missing = (x.partidas ?? []).filter((p) => !p.baseRef);
  return (
    <BrainCloud t={t} docs={docs} selected={[...used].filter((r) => r !== 'SYS-PA')} rejected={missing.map((p) => ({ id: `missing-${p.code}`, reason: 'Sin precio en la base: se pide oferta al proveedor' }))}
      query={`${x.partidas?.length} partidas de medición · ${x.expediente}`} centerLabel="C07 · Base de precios" centerSub="descompuestos y rendimientos"
      scanAt={1000} matchAt={3600} flyAt={4600} selectedTitle="Precios encontrados" rejectedTitle="Partidas sin precio"
      renderSelected={(d) => { const it = PRICE_BASE.find((p) => p.ref === d.id)!; const cost = it.labourH * 27.5 + it.machineH * 52 + it.materials; return <div className="flex items-center justify-between gap-2"><div className="min-w-0"><div className="truncate text-[12.5px] font-semibold text-white">{it.description}</div><div className="text-[11px] text-secondary">{it.ref} · {it.crew}</div></div><span className="shrink-0 font-mono text-[11.5px] text-gold-light">{num(cost, 2)} €/{it.unit}</span></div>; }} />
  );
}

function Costs({ t, id }: { t: number; id: string }) {
  const e = useEst(id);
  const max = Math.max(...e.chapters.map((c) => c.project));
  const steps: [string, number][] = [['Coste de ejecución', e.totals.ownPEM], ['+ Gastos generales 9 %', e.totals.costWithGG - e.totals.ownPEM], ['+ Margen', e.totals.offer - e.totals.costWithGG]];
  return (
    <div className="grid h-full gap-4 lg:grid-cols-2">
      <div className="rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10">
        <div className="mb-3 flex items-center justify-between text-[11.5px] font-semibold uppercase tracking-wider text-gold-light"><span>Por capítulo · proyecto vs. nuestro coste</span></div>
        <div className="mb-3 flex gap-4 text-[12px] text-secondary"><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-white/30" />Proyecto</span><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-gold" />Nuestro coste</span></div>
        <div className="space-y-3">
          {e.chapters.map((c, i) => (
            <Reveal key={c.name} t={t} at={400 + i * 500}>
              <div className="text-[13px] text-white">{c.name}</div>
              <div className="mt-1 space-y-1">
                <div className="flex items-center gap-2"><div className="h-2.5 rounded-r-[4px] bg-white/30" style={{ width: `${(c.project / max) * 75}%` }} /><span className="text-[11.5px] tabular text-muted">{eur(c.project)}</span></div>
                <div className="flex items-center gap-2"><motion.div className="h-2.5 rounded-r-[4px] bg-gold" initial={{ width: 0 }} animate={{ width: `${(c.cost / max) * 75}%` }} transition={{ duration: 0.8, delay: 0.2 }} /><span className="text-[11.5px] font-semibold tabular text-gold-light">{eur(c.cost)}</span></div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {steps.map(([k, v], i) => (
          <Reveal key={k} t={t} at={3200 + i * 600}><div className="flex items-center justify-between rounded-xl bg-white/[0.06] px-4 py-2.5 ring-1 ring-white/10"><span className="text-[13.5px] text-secondary">{k}</span><span className="text-[15px] font-semibold tabular text-white">{eur(v)}</span></div></Reveal>
        ))}
        <Reveal t={t} at={5200}>
          <div className="rounded-2xl bg-gold/12 p-4 ring-1 ring-gold/40">
            <div className="flex items-end justify-between gap-3">
              <div><div className="text-[12px] text-gold-light">Nuestra oferta (sin IVA)</div><div className="text-[34px] font-semibold leading-none tracking-tight text-white"><CountUp t={t} from={5200} value={e.totals.offer} format={eur} /></div></div>
              <div className="text-right"><div className="text-[12px] text-gold-light">Baja</div><div className="text-[28px] font-semibold text-white"><CountUp t={t} from={5200} value={e.totals.bajaPct} format={(v) => `${num(v, 1)} %`} /></div></div>
            </div>
            <div className="mt-2 text-[12.5px] text-secondary">Presupuesto base {eur(e.totals.baseBudget)} · media histórica de bajas {num(e.totals.avgHist, 1)} % · equilibrio {num(e.totals.breakEvenBaja, 1)} %</div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function Gantt({ t, id }: { t: number; id: string }) {
  const e = useEst(id);
  const crews = useStudio((s) => s.tenders?.[id]?.params.extraCrews ?? {});
  const span = Math.max(e.plazoDays, e.totalDays) * 1.08;
  const fixed = Object.keys(crews).length > 0;
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <AppWindow section="Licitaciones › Planificación de obra" className="h-full">
        <div className="relative space-y-3 p-6">
          <div className="pointer-events-none absolute inset-y-4 z-10 border-l-2 border-dashed border-err" style={{ left: `calc(24px + 210px + (100% - 48px - 210px) * ${e.plazoDays / span})` }}><span className="absolute -top-1 right-1 whitespace-nowrap rounded bg-err px-1.5 py-0.5 text-[11px] font-medium text-white">Plazo {e.plazoDays} días</span></div>
          {Object.entries(e.schedule).map(([name, s], i) => (
            <Reveal key={name} t={t} at={300 + i * 350}>
              <div className="flex items-center gap-3 pt-4">
                <div className="w-[198px] shrink-0 text-[13px] font-medium text-ink">{name}{(crews[name] ?? 0) > 0 && <span className="ml-1 rounded bg-gold/20 px-1 text-[11px] text-[#7a5600]">×{1 + crews[name]}</span>}</div>
                <div className="relative h-7 flex-1 rounded-md bg-ink/[0.04]">
                  <div className={cx('absolute top-1 h-5 rounded-[5px] transition-[left,width] duration-1000 ease-[var(--ease-out)]', name.startsWith('Seguridad') ? 'bg-ink/15' : name === e.critical ? 'bg-[#c8921a]' : 'bg-[#2a78d6]')} style={{ left: `${(s.start / span) * 100}%`, width: `${((s.end - s.start) / span) * 100}%` }} />
                </div>
              </div>
            </Reveal>
          ))}
          <Reveal t={t} at={2600}><div className={cx('mt-3 rounded-xl px-4 py-2.5 text-[14px] font-medium', e.totalDays <= e.plazoDays ? 'bg-ok-bg text-ok' : 'bg-err-bg text-err')}>{Math.ceil(e.totalDays)} días hábiles de {e.plazoDays} · {e.totalDays <= e.plazoDays ? `holgura de ${Math.floor(e.plazoDays - e.totalDays)} días` : `exceso de ${Math.ceil(e.totalDays - e.plazoDays)} días en ${e.critical}`}</div></Reveal>
        </div>
      </AppWindow>
      <div className="space-y-3">
        <Reveal t={t} at={400}><AgentPulse code="C05" label="Planifica con rendimientos reales" active={t < 3000} done={t >= 3000} /></Reveal>
        {fixed ? (
          <Reveal t={t} at={1}><div className="rounded-2xl bg-gold/12 p-4 text-[13.5px] text-white ring-1 ring-gold/40"><Users className="mb-1 size-5 text-gold-light" />Segunda cuadrilla en el camino crítico: el plan vuelve a entrar en plazo. Su coste ya está en la oferta (mismas horas, más equipos).</div></Reveal>
        ) : (
          <Reveal t={t} at={3000}><div className="rounded-2xl bg-white/[0.05] p-4 text-[13px] text-secondary ring-1 ring-white/10">Duración de cada capítulo = medición ÷ rendimiento de la cuadrilla, con los solapes que permite el proyecto.</div></Reveal>
        )}
      </div>
    </div>
  );
}

function Decision({ t, id }: { t: number; id: string }) {
  const e = useEst(id);
  const work = useStudio((s) => s.tenders?.[id]);
  const x = TENDERS.find((y) => y.id === id)!;
  const docs = ['DEUC', 'Declaración de clasificación y solvencia', 'Memoria técnica', 'Oferta económica', 'Programa de trabajos', 'Garantía definitiva'];
  return (
    <div className="grid h-full gap-4 lg:grid-cols-2">
      <div className="relative rounded-3xl bg-white p-6 text-ink shadow-2xl">
        <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Comité de ofertas · {x.expediente}</div>
        <h2 className="mt-1 text-[22px] font-semibold">¿Presentamos la oferta?</h2>
        <ul className="mt-3 space-y-1.5">{e.checks.map((c, i) => <Reveal key={c.text} t={t} at={300 + i * 450}><li className={cx('flex gap-2 text-[13.5px]', c.level === 'error' ? 'text-err' : c.level === 'warning' ? 'text-warn' : 'text-ink-2')}>{c.level === 'ok' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}{c.text}</li></Reveal>)}</ul>
        <Reveal t={t} at={300 + e.checks.length * 450}><div className="mt-3 rounded-xl bg-canvas px-3 py-2 text-[13.5px] ring-1 ring-line"><b>Recomendación:</b> {e.recommendation}</div></Reveal>
        <AnimatePresence>{work?.decision?.go && (
          <motion.div initial={{ opacity: 0, scale: 2.2, rotate: -25 }} animate={{ opacity: 1, scale: 1, rotate: -8 }} transition={{ type: 'spring', duration: 0.6, bounce: 0.35 }} className="absolute -right-3 -top-5 flex items-center gap-2 rounded-2xl border-4 border-ok bg-white px-4 py-2 text-ok shadow-xl">
            <Stamp className="size-6" /><div><div className="text-[22px] font-black">GO</div><div className="font-mono text-[11px]">{eur(work.decision.offer)} · baja {num(work.decision.bajaPct, 1)} %</div></div>
          </motion.div>
        )}</AnimatePresence>
      </div>
      <div className="space-y-3">
        <div className="text-[11.5px] font-semibold uppercase tracking-wider text-gold-light">Documentación preparada · C02 + C06</div>
        {docs.map((d, i) => (
          <Reveal key={d} t={t} at={5200 + i * 300} x={20} y={0}><div className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2 text-[13.5px] text-white ring-1 ring-white/10">{work?.docsPrepared ? <CheckCircle2 className="size-4 text-[#86efac]" /> : <FileText className="size-4 text-muted" />}{d}</div></Reveal>
        ))}
        <Reveal t={t} at={7400}><div className="flex items-start gap-2 rounded-2xl bg-white/[0.04] p-4 text-[13px] text-secondary ring-1 ring-white/10"><FileSignature className="mt-0.5 size-4 shrink-0 text-gold-light" />Listo para que el apoderado firme y presente en el portal antes del {dateEs(x.deadline)}. Los agentes nunca presentan ofertas por su cuenta.</div></Reveal>
      </div>
    </div>
  );
}

export function buildTenderScenario(id: 'lic-urb' | 'lic-reh'): DemoScenario {
  const x = TENDERS.find((y) => y.id === id)!;
  const isReh = id === 'lic-reh';
  return {
    id: `tender-${id}`, title: isReh ? 'Licitación · Rehabilitación energética' : 'Licitación · Reurbanización de calle', subtitle: x.title, reference: 'Construcción · PLACSP y TED',
    prepare: () => S().resetTender(id),
    finale: [{ label: 'Abrir el estudio de la licitación', to: () => `/licitaciones/${id}/oferta` }, { label: 'Ver todas las licitaciones', to: () => '/licitaciones' }],
    scenes: [
      { id: 'portal', section: 'Portal', where: { label: 'Licitaciones', to: '/licitaciones' }, title: 'Cada mañana, los portales', narration: 'El agente lee los anuncios nuevos de la Plataforma de Contratación del Sector Público y de TED: obras, servicios y suministros de toda España y Europa.', agents: ['C01'], duration: 7500, Component: Portal },
      { id: 'filter', section: 'Filtro', where: { label: 'Licitaciones', to: '/licitaciones' }, title: 'Solo lo que aplica a tu empresa', narration: 'Se cruzan con el perfil de la constructora: actividad (CPV), zona, importe, clasificación exigida y días para preparar la oferta. Cada descarte queda explicado.', agents: ['C02'], duration: 9000, enter: () => S().screenPortal(), Component: Filter },
      { id: 'pliegos', section: 'Pliegos', where: { label: 'Licitación › Pliegos', to: `/licitaciones/${id}/pliegos` }, title: 'Se leen los pliegos', narration: 'Presupuesto, plazo, clasificación, garantías, penalidades y condiciones especiales, cada dato con la cláusula exacta de la que sale.', agents: ['C02', 'OCR'], duration: 8500, enter: () => S().analyzeTender(id, 'pliegos'), Component: ({ t }) => <Pliegos t={t} id={id} /> },
      { id: 'precios', section: 'Mediciones', where: { label: 'Licitación › Mediciones y costes', to: `/licitaciones/${id}/costes` }, title: 'Mediciones contra la base de precios', narration: 'Cada partida del proyecto se valora con nuestros descompuestos (mano de obra, maquinaria y materiales) y rendimientos. Lo que no está en la base se marca para pedir precio.', agents: ['C07'], duration: 8000, enter: () => S().analyzeTender(id, 'mediciones'), Component: ({ t }) => <Prices t={t} id={id} /> },
      { id: 'costes', section: 'Costes', where: { label: 'Licitación › Mediciones y costes', to: `/licitaciones/${id}/costes` }, title: 'Coste real y oferta', narration: 'Coste de ejecución, gastos generales de la empresa y margen objetivo frente al presupuesto base. Se ve la baja, la media histórica del órgano y dónde se empezaría a perder dinero.', agents: ['C02', 'TME'], duration: 8500, enter: () => S().analyzeTender(id, 'costes'), Component: ({ t }) => <Costs t={t} id={id} /> },
      { id: 'plan', section: 'Plazo', where: { label: 'Licitación › Planificación', to: `/licitaciones/${id}/plan` }, title: isReh ? 'El plazo no cabe… y se resuelve' : '¿Llegamos en plazo?', narration: isReh ? 'Con una cuadrilla, el SATE se sale del plazo. El agente lo detecta en el camino crítico y propone una segunda cuadrilla: el plan vuelve a cumplir.' : 'Planificación por capítulos con rendimientos y solapes. La obra cabe en el plazo con holgura.', agents: ['C05'], duration: isReh ? 9500 : 7000,
        enter: () => S().analyzeTender(id, 'riesgos'),
        at: isReh ? [{ t: 4200, run: () => S().setTenderParams(id, { extraCrews: { 'Envolvente térmica (SATE)': 1 } }, 'segunda cuadrilla de SATE') }] : undefined,
        Component: ({ t }) => <Gantt t={t} id={id} /> },
      { id: 'decision', section: 'Decisión', where: { label: 'Licitación › Oferta y decisión', to: `/licitaciones/${id}/oferta` }, title: 'El comité decide', narration: 'Comprobaciones de calidad, recomendación y decisión humana. Con el GO se prepara la documentación; la firma y presentación las hace el apoderado.', agents: ['C08', 'HUM', 'C02'], duration: 9000,
        at: [{ t: 3600, run: () => S().decideTender(id, true, 'Aprobado en la demo guiada') }, { t: 5000, run: () => S().prepareTenderDocs(id) }],
        Component: ({ t }) => <Decision t={t} id={id} /> },
    ],
  };
}

