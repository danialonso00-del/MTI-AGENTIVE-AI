// Historia guiada «De un plano a una oferta». Cada escena ejecuta el paso real del motor sobre
// RFQ-2026-0042 y muestra su resultado con animación; nada de lo que se ve está precocinado.
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Bell, Box, CheckCircle2, FileText, Inbox, Paperclip, PenLine, Send, Stamp } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { BrandLogo } from '@/components/layout/Brand';
import { PartDrawing } from '@/components/part/PartDrawing';
import { DRAWINGS } from '@/fixtures/drawings';
import { HISTORICAL_JOBS, MATERIALS, OPERATION_LABEL } from '@/fixtures/manufacturing';
import { templateModel } from '@/adapters/llm/languageModel';
import { findComparables } from '@/services/estimation/comparables';
import { estimate } from '@/services/estimation/engine';
import { partVolumeCm3 } from '@/services/estimation/rules';
import { useStudio } from '@/store/useStudio';
import { cx, dateTimeEs, eur, num, numSmart } from '@/lib/format';
import { AgentPulse, AppWindow, CountUp, MultiHighlight, Reveal, ScanLine, Typewriter } from './kit';
import { BrainCloud, type CloudDoc } from './BrainCloud';
import type { DemoScenario } from './types';

const PartViewer3D = lazy(() => import('@/components/part/PartViewer3D'));
const STAR = 'rfq-2026-0042';
const S = () => useStudio.getState();
const useReq = () => useStudio((s) => s.requests.find((r) => r.id === STAR)!);
const W = `/fabricacion/${STAR}`;

// ── 1 · Llega el correo ─────────────────────────────────────────────────────
function MailArrives({ t }: { t: number }) {
  const req = useReq();
  const others = useStudio((s) => s.requests).filter((r) => r.id !== STAR && r.channel === 'email').slice(0, 3);
  const mail = req.emails[0];
  return (
    <div className="relative h-full">
      <AppWindow section="Bandeja de correo · ofertas@talleresdelta.example" className="h-full" right={<span className="flex gap-1"><BrandLogo src="/brands/gmail.svg" name="Gmail" size={20} plate={false} /><BrandLogo src="/brands/outlook.svg" name="Outlook" size={20} plate={false} /></span>}>
        <div className="grid h-full grid-cols-[170px_minmax(0,1fr)]">
          <div className="space-y-1 border-r border-line bg-[#f8fafc] p-3 text-[13px] text-ink-2">
            <div className="flex items-center justify-between rounded-lg bg-gold/15 px-2.5 py-1.5 font-semibold text-ink"><span className="flex items-center gap-2"><Inbox className="size-4" />Entrada</span><span className="tabular">{t >= 900 ? 1 : 0}</span></div>
            {['Ofertas enviadas', 'Pedidos', 'Proveedores', 'Archivo'].map((f) => <div key={f} className="px-2.5 py-1.5 text-ink-3">{f}</div>)}
          </div>
          <div>
            <Reveal t={t} at={900} y={-24}>
              <div className="flex items-center gap-3 border-b border-line bg-gold/[0.08] px-4 py-3.5">
                <span className="size-2 rounded-full bg-gold" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[13px]"><b>{mail.fromName}</b><span className="rounded bg-gold px-1.5 text-[10.5px] font-bold text-navy">NUEVO</span><span className="ml-auto text-ink-3">{dateTimeEs(mail.date)}</span></div>
                  <div className="truncate text-[14px] font-semibold">{mail.subject}</div>
                  <div className="truncate text-[12.5px] text-ink-3">{mail.body.split('\n')[2]}</div>
                </div>
                <span className="flex items-center gap-1 text-[12px] text-ink-3"><Paperclip className="size-3.5" />4</span>
              </div>
            </Reveal>
            {others.map((r) => (
              <div key={r.id} className="flex items-center gap-3 border-b border-line px-4 py-3 opacity-70">
                <span className="size-2" />
                <div className="min-w-0 flex-1"><div className="text-[12.5px] text-ink-3">{r.emails[0].fromName}</div><div className="truncate text-[13.5px]">{r.emails[0].subject}</div></div>
              </div>
            ))}
            <div className="space-y-2 p-4">
              <Reveal t={t} at={2600}><AgentPulse code="C01" label="Correo · detecta la solicitud y la clasifica" active={t < 4600} done={t >= 4600} /></Reveal>
              <Reveal t={t} at={4600} className="flex flex-wrap gap-1.5">
                {['Solicitud de oferta', 'Cliente: Marina Norte', 'Plano PDF', 'Modelo STEP', 'DXF', 'Hoja de requisitos'].map((x, i) => (
                  <motion.span key={x} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.12 }} className="rounded-full bg-navy px-2.5 py-1 text-[12px] text-white">{x}</motion.span>
                ))}
              </Reveal>
            </div>
          </div>
        </div>
      </AppWindow>
      <AnimatePresence>
        {t >= 900 && t < 6500 && (
          <motion.div initial={{ opacity: 0, x: 80, y: -10 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={{ opacity: 0, x: 80 }} transition={{ type: 'spring', duration: 0.6, bounce: 0.25 }}
            className="absolute right-4 top-14 z-20 flex w-[330px] items-start gap-3 rounded-2xl bg-white p-3.5 text-ink shadow-[0_20px_50px_-12px_rgb(0_0_0/0.6)] ring-1 ring-gold/50">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold text-navy"><Bell className="size-5" /></span>
            <div className="min-w-0"><div className="text-[13px] font-semibold">Nuevo correo · requerimiento de cliente</div><div className="truncate text-[12.5px] text-ink-3">{mail.subject}</div><div className="mt-0.5 text-[11.5px] text-ink-3">4 adjuntos · procesado automáticamente</div></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── 2 · Se lee el correo ────────────────────────────────────────────────────
const MARKS: { needle: string; key: string | null; label?: string }[] = [
  { needle: '50 unidades', key: 'quantity' },
  { needle: 'soporte SP-118', key: 'partNumber' },
  { needle: 'revisión B', key: 'revision' },
  { needle: 'aluminio 6082-T6', key: 'material' },
  { needle: 'anodizado negro', key: 'finish' },
  { needle: 'antes del 16/10', key: null, label: 'Plazo de la oferta' },
];
const STATUS = { extracted: ['Extraído', 'bg-info-bg text-info'], confirmed: ['Confirmado', 'bg-ok-bg text-ok'], assumed: ['Supuesto', 'bg-gold/15 text-[#8a6100]'], missing: ['Ausente', 'bg-warn-bg text-warn'] } as const;

function ReadEmail({ t }: { t: number }) {
  const req = useReq();
  const mail = req.emails[0];
  const step = (i: number) => 2600 + i * 750;
  return (
    <AppWindow section="Fabricación › Expediente RFQ-2026-0042 › Correo y adjuntos" className="h-full">
      <div className="grid h-full lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative overflow-hidden p-6">
          <ScanLine t={t} from={300} dur={2100} />
          <div className="text-[12.5px] text-ink-3">{mail.fromName} &lt;{mail.from}&gt;</div>
          <h2 className="mt-1 text-[19px] font-semibold text-ink">{mail.subject}</h2>
          <MultiHighlight className="mt-4 block whitespace-pre-wrap text-[15.5px] leading-[1.75] text-ink-2" text={mail.body}
            marks={MARKS.map((m, i) => ({ needle: m.needle, on: t >= step(i), active: t >= step(i) && t < step(i + 1) }))} />
          <div className="mt-4 flex flex-wrap gap-2">{req.attachments.slice(0, 4).map((a) => <span key={a.id} className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2 py-1 font-mono text-[12px] text-ink-2 ring-1 ring-line"><Paperclip className="size-3" />{a.fileName}</span>)}</div>
        </div>
        <div className="border-l border-line bg-[#f8fafc] p-4">
          <div className="mb-3 flex items-center justify-between"><span className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Campos extraídos</span><AgentPulseLight active={t < step(MARKS.length)} /></div>
          <div className="space-y-2">
            {MARKS.map((m, i) => {
              const f = m.key ? req.fields.find((x) => x.key === m.key) : undefined;
              const st = f ? STATUS[f.status] : null;
              return (
                <Reveal key={m.needle} t={t} at={step(i) + 250} x={30} y={0}>
                  <div className={cx('rounded-xl bg-white px-3 py-2 ring-1', m.key === 'finish' ? 'ring-warn/40' : 'ring-line')}>
                    <div className="flex items-center justify-between gap-2"><span className="text-[12px] text-ink-3">{f?.label ?? m.label}</span>{st && <span className={cx('rounded-full px-2 py-px text-[11px] font-medium', st[1])}>{st[0]}</span>}</div>
                    <div className="text-[14px] font-semibold text-ink">{f?.value ?? '16/10/2026'}{f?.unit ? ` ${f.unit}` : ''}</div>
                    {m.key === 'finish' && <div className="mt-0.5 flex items-center gap-1 text-[11.5px] text-warn"><AlertTriangle className="size-3" />El correo dice «negro»; la hoja de requisitos, «natural 15 µm»</div>}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </AppWindow>
  );
}
function AgentPulseLight({ active }: { active: boolean }) {
  return <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium', active ? 'bg-gold/15 text-[#8a6100]' : 'bg-ok-bg text-ok')}><span className={cx('size-1.5 rounded-full', active ? 'animate-pulse bg-gold' : 'bg-ok')} />{active ? 'C01 extrayendo' : 'C01 completado'}</span>;
}

// ── 3 · Adjuntos: se abre el plano ──────────────────────────────────────────
function Attachments({ t }: { t: number }) {
  const req = useReq();
  const spec = DRAWINGS[`SP-118:${req.draft.revision}`];
  const atts = req.attachments.slice(0, 4);
  const plan = req.steps.classify?.outputs as { plan?: string[] } | undefined;
  const results = ['Cajetín, notas 1–4 y cotas principales', 'Sustituido por modelo de ejemplo generado desde rasgos', 'Lectura real: 8 LINE · 8 ARC · 4 CIRCLE', '9 requisitos: lote, material, acabado, fecha…'];
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <AppWindow section="Fabricación › Documentos del expediente" className="h-full">
        <div className="flex h-full flex-col">
          <div className="flex flex-wrap gap-2 border-b border-line p-3">
            {atts.map((a, i) => (
              <span key={a.id} className={cx('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[12px] ring-1 transition-all duration-500', i === 0 && t >= 800 ? 'bg-gold/20 text-ink ring-gold shadow-[0_0_0_4px_rgb(230_168_23/0.2)]' : 'bg-canvas text-ink-2 ring-line')}>
                {a.kind === 'step' ? <Box className="size-3.5" /> : a.kind === 'dxf' ? <PenLine className="size-3.5" /> : <FileText className="size-3.5" />}{a.fileName}
              </span>
            ))}
          </div>
          <div className="relative flex-1 bg-[#eef1f6] p-4">
            {t < 1700 && <div className="flex h-full items-center justify-center text-[13px] text-ink-3"><Reveal t={t} at={800}><span className="rounded-full bg-navy px-3 py-1.5 text-white">C01 abre el adjunto SP-118_revB.pdf…</span></Reveal></div>}
            <AnimatePresence>
              {t >= 1700 && spec && (
                <motion.div initial={{ opacity: 0, scale: 0.6, y: -60, rotate: -2 }} animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }} transition={{ type: 'spring', duration: 0.9, bounce: 0.2 }} className="mx-auto max-w-[900px] overflow-hidden rounded-lg shadow-xl ring-1 ring-line">
                  <PartDrawing spec={spec} className="w-full" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </AppWindow>
      <div className="space-y-3">
        <div className="rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/10">
          <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-gold-light">Lectura de adjuntos</div>
          {atts.map((a, i) => (
            <Reveal key={a.id} t={t} at={2600 + i * 700}>
              <div className="flex gap-2 border-t border-white/10 py-2 first:border-0"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#22c55e]" /><div><div className="font-mono text-[12px] text-white">{a.fileName}</div><div className="text-[12px] text-muted">{results[i]}</div></div></div>
            </Reveal>
          ))}
        </div>
        <Reveal t={t} at={5600}>
          <div className="rounded-2xl bg-gold/10 p-3.5 ring-1 ring-gold/40">
            <div className="text-[11.5px] font-semibold uppercase tracking-wider text-gold-light">MTI · Orquestador</div>
            <div className="mt-1 text-[14px] font-semibold">Solicitud de oferta de fabricación</div>
            <ol className="mt-2 space-y-1 text-[12px] text-secondary">{(plan?.plan ?? []).map((p, i) => <li key={p}><span className="mr-1 font-mono text-gold">{i + 3}</span>{p}</li>)}</ol>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

// ── 4 · Extracción de medidas ───────────────────────────────────────────────
function Extraction({ t }: { t: number }) {
  const req = useReq();
  const spec = DRAWINGS[`SP-118:${req.draft.revision}`];
  const f = req.draft.features;
  const mat = req.draft.material ? MATERIALS[req.draft.material] : null;
  const vol = partVolumeCm3(f);
  const seq: { at: number; anchor: string; label: string; value: string }[] = [
    { at: 600, anchor: 'dims.overall', label: 'Envolvente', value: `${f.lengthMm} × ${f.widthMm} mm` },
    { at: 1900, anchor: 'dims.height', label: 'Altura', value: `${f.heightMm} mm` },
    { at: 3100, anchor: 'dims.pocket', label: 'Bolsillo', value: f.pocket ? `${f.pocket.lengthMm} × ${f.pocket.widthMm} × ${f.pocket.depthMm} mm` : '—' },
    { at: 4300, anchor: 'dims.holes', label: 'Taladros', value: `${f.holes.count} × Ø${f.holes.diameterMm} ${f.holes.fit ?? ''}` },
    { at: 5500, anchor: 'tb.material', label: 'Material (cajetín)', value: spec.materialText },
    { at: 6500, anchor: 'tb.revision', label: 'Revisión', value: spec.revision },
    { at: 7500, anchor: 'notes', label: 'Tolerancias', value: spec.generalTolerance },
  ];
  const cur = [...seq].reverse().find((s) => t >= s.at);
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
      <AppWindow section="Fabricación › Pieza › Lectura técnica (CAD / OCR)" className="h-full" right={<span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11.5px] font-medium text-[#8a6100]">{cur ? `Leyendo: ${cur.label}` : 'Preparando'}</span>}>
        <div className="relative h-full overflow-hidden bg-[#eef1f6] p-4">
          <ScanLine t={t} from={0} dur={600} />
          <PartDrawing spec={spec} highlight={t < 8600 ? cur?.anchor : null} className="mx-auto w-full max-w-[920px] rounded-lg shadow-lg ring-1 ring-line" />
        </div>
      </AppWindow>
      <div className="space-y-3">
        <div className="rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/10">
          <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-gold-light">Medidas y datos extraídos</div>
          {seq.map((s) => (
            <Reveal key={s.label} t={t} at={s.at + 350} x={24} y={0}>
              <div className={cx('flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 transition-colors duration-500', cur?.label === s.label && t < 8600 ? 'bg-gold/15' : '')}>
                <span className="text-[12.5px] text-muted">{s.label}</span><span className="font-mono text-[13px] font-semibold text-white">{s.value}</span>
              </div>
            </Reveal>
          ))}
          <Reveal t={t} at={8600}>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
              <div><div className="text-[11.5px] text-muted">Volumen</div><div className="text-[16px] font-semibold"><CountUp t={t} from={8600} value={vol} format={(v) => `${num(v, 1)} cm³`} /></div></div>
              <div><div className="text-[11.5px] text-muted">Masa ({mat?.shortName})</div><div className="text-[16px] font-semibold"><CountUp t={t} from={8600} value={mat ? (vol * mat.densityGcm3) / 1000 : 0} format={(v) => `${num(v, 3)} kg`} /></div></div>
            </div>
          </Reveal>
        </div>
        <Reveal t={t} at={9600}>
          <div className="relative h-[150px] overflow-hidden rounded-2xl ring-1 ring-white/10">
            <Suspense fallback={<div className="h-full bg-navy-mid" />}><PartViewer3D features={f} material={req.draft.material} highlight="bolsillo" /></Suspense>
            <span className="absolute left-2 top-2 rounded-full bg-navy/80 px-2 py-0.5 text-[11px] text-secondary">Modelo de ejemplo</span>
          </div>
        </Reveal>
        <Reveal t={t} at={10400}>
          <div className="flex gap-2 rounded-2xl bg-[#f59e0b]/12 p-3 text-[12.5px] text-[#fcd34d] ring-1 ring-[#f59e0b]/40"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><span><b>C08 · Calidad:</b> acabado contradictorio entre correo y hoja de requisitos. Queda marcado para revisión humana.</span></div>
        </Reveal>
      </div>
    </div>
  );
}

// ── 5 · Cerebro: conocimiento e histórico ──────────────────────────────────
function Brain({ t }: { t: number }) {
  const req = useReq();
  const comps = findComparables(req.draft.features, req.draft.material, req.draft.quantity);
  const docs: CloudDoc[] = [
    ...HISTORICAL_JOBS.map((j) => ({ id: j.ref, label: j.partName, sub: `${j.ref} · ${j.quantity} uds · ${MATERIALS[j.material].shortName}`, kind: 'job' as const })),
    { id: 'ds-rules', label: 'Reglas de proceso', sub: 'v2026.10-r1', kind: 'dataset' },
    { id: 'ds-mat', label: 'Tabla de materiales', sub: 'v2026.09-r1', kind: 'dataset' },
    { id: 'ds-mach', label: 'Máquinas y tarifas', sub: '7 centros', kind: 'dataset' },
    { id: 'n-iso', label: 'ISO 2768-mK', sub: 'Tolerancias generales', kind: 'norma' },
    { id: 'n-anod', label: 'Especificación anodizado', sub: 'Subcontratación', kind: 'norma' },
  ];
  const selected = comps.filter((c) => c.included).map((c) => c.job.ref);
  const rejected = comps.filter((c) => !c.included && !c.exclusionReason?.startsWith('Similitud baja')).map((c) => ({ id: c.job.ref, reason: c.exclusionReason! }));
  const factors = (req.steps.history?.outputs?.factors as { kind: string; factor: number; applied: boolean }[] | undefined) ?? [];
  const f = req.draft.features;
  return (
    <div className="h-full">
      <BrainCloud t={t} docs={docs} selected={selected} rejected={rejected}
        query={`${req.partNumber} · prismático · ${MATERIALS[req.draft.material!].shortName} · bolsillo ${f.pocket?.lengthMm}×${f.pocket?.widthMm}×${f.pocket?.depthMm} · ${f.holes.count}×Ø${f.holes.diameterMm} · ${req.draft.quantity} uds`}
        centerLabel="C07 · Conocimiento" centerSub={`${docs.length} documentos indexados (fixture)`}
        scanAt={1800} matchAt={5200} flyAt={6400} selectedTitle="Trabajos comparables" rejectedTitle="Descartados con motivo"
        renderSelected={(d) => { const c = comps.find((x) => x.job.ref === d.id)!; return (
          <div className="flex items-center justify-between gap-2"><div><div className="text-[12.5px] font-semibold text-white">{c.job.partName}</div><div className="text-[11.5px] text-secondary">{c.job.ref} · real {numSmart(c.job.realLotMin, 1)} min</div></div><span className="font-mono text-[12px] text-gold-light">{num(c.score, 2)}</span></div>
        ); }}
        footer={t >= 8200 ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/10">
            <div className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-gold-light">ML correctivo (simulado)</div>
            <div className="flex flex-wrap gap-1.5">{factors.map((x, i) => <motion.span key={x.kind} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.12 }} className={cx('rounded-md px-1.5 py-0.5 font-mono text-[11.5px]', x.factor !== 1 ? 'bg-gold/20 text-gold-light' : 'bg-white/[0.07] text-secondary')}>{OPERATION_LABEL[x.kind as keyof typeof OPERATION_LABEL]} ×{num(x.factor, 2)}</motion.span>)}</div>
            <div className="mt-1.5 text-[11px] text-muted">Mediana real/regla en los comparables. No es un modelo entrenado.</div>
          </motion.div>
        ) : null}
      />
    </div>
  );
}

// ── 6 · Cálculo de tiempos ─────────────────────────────────────────────────
function Calc({ t }: { t: number }) {
  const req = useReq();
  const r = estimate(req.draft);
  const max = Math.max(...r.operations.map((o) => o.totalMin), 1);
  const end = 600 + r.operations.length * 850;
  return (
    <AppWindow section="Fabricación › Estimación · Motor de tiempos + C08" className="h-full">
      <div className="flex h-full flex-col p-5">
        <div className="space-y-2">
          {r.operations.map((o, i) => (
            <Reveal key={o.id} t={t} at={600 + i * 850} x={-30} y={0}>
              <div className="grid grid-cols-[150px_70px_minmax(0,1fr)_110px] items-center gap-3 rounded-xl bg-canvas px-3 py-2.5 ring-1 ring-line">
                <div><div className="text-[14px] font-semibold text-ink">{o.name}</div><div className="truncate font-mono text-[11px] text-ink-3">{o.ruleText.split(' · ')[0]}</div></div>
                <span className="rounded-md bg-navy px-1.5 py-0.5 text-center font-mono text-[11.5px] text-white">{o.machineId}</span>
                <div className="relative h-3 overflow-hidden rounded-full bg-ink/[0.07]">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-gold-dark to-gold-light" initial={{ width: 0 }} animate={{ width: `${(o.totalMin / max) * 100}%` }} transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }} />
                </div>
                <div className="text-right">
                  <div className="text-[15px] font-semibold text-ink"><CountUp t={t} from={600 + i * 850} dur={700} value={o.totalMin} format={(v) => `${numSmart(v, 1)} min`} /></div>
                  {o.correctionFactor !== 1 && <div className="font-mono text-[11px] text-[#8a6100]">corrección ×{num(o.correctionFactor, 2)}</div>}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal t={t} at={end} className="mt-auto pt-4">
          <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-navy px-5 py-4 text-white">
            <div>
              <div className="text-[12px] text-muted">Tiempo estimado del lote · {req.draft.quantity} uds</div>
              <div className="text-[38px] font-semibold leading-none tracking-tight text-gold-light"><CountUp t={t} from={end} dur={1400} value={r.estimatedLotMin} format={(v) => `${numSmart(v, 1)} min`} /></div>
              <div className="mt-1 font-mono text-[12px] text-secondary">{numSmart(r.setupTotalMin)} prep. + {req.draft.quantity} × {num(r.cycleCorrectedTotalMin, 2)} min/ud · preparación una sola vez</div>
            </div>
            <div className="text-right text-[12.5px] text-secondary">
              <div>{num(r.perPieceMin, 2)} min/pieza · {num(r.estimatedLotMin / 60, 2)} h</div>
              <div>Base por reglas: {numSmart(r.baseLotMin, 1)} min</div>
              <div>Banda de ejemplo ±15 %: {numSmart(r.bandMin[0], 0)}–{numSmart(r.bandMin[1], 0)} min</div>
            </div>
          </div>
        </Reveal>
      </div>
    </AppWindow>
  );
}

// ── 7 · Generación de la oferta ────────────────────────────────────────────
function Offer({ t }: { t: number }) {
  const req = useReq();
  const r = estimate(req.draft);
  const total = r.cost.totalCostEur;
  const colors = ['bg-gold', 'bg-[#60a5fa]', 'bg-[#a78bfa]', 'bg-[#94a3b8]'];
  const text = templateModel.draftOfferText(req, r);
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4 rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10">
        <div className="text-[11.5px] font-semibold uppercase tracking-wider text-gold-light">C02 · De minutos a precio</div>
        <div className="flex h-5 overflow-hidden rounded-full bg-white/10">
          {r.cost.lines.map((l, i) => <motion.div key={l.label} className={colors[i]} initial={{ width: 0 }} animate={{ width: t >= 600 + i * 700 ? `${(l.amountEur / total) * 100}%` : 0 }} transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }} />)}
        </div>
        <div className="space-y-2">
          {r.cost.lines.map((l, i) => (
            <Reveal key={l.label} t={t} at={600 + i * 700}>
              <div className="flex items-center gap-3"><span className={cx('size-2.5 rounded-full', colors[i])} /><span className="flex-1"><span className="text-[14px] font-medium">{l.label}</span><span className="block text-[11.5px] text-muted">{l.detail}</span></span><span className="text-[14px] tabular">{eur(l.amountEur)}</span></div>
            </Reveal>
          ))}
        </div>
        <Reveal t={t} at={3600}>
          <div className="rounded-xl bg-white/[0.05] px-3 py-2 text-[12.5px] text-secondary">{r.cost.ruleText} · IVA excluido</div>
        </Reveal>
        <Reveal t={t} at={4200} className="mt-auto">
          <div className="rounded-2xl bg-gold/12 p-4 ring-1 ring-gold/40">
            <div className="text-[12px] text-gold-light">Precio de oferta (sin IVA)</div>
            <div className="text-[40px] font-semibold leading-none tracking-tight"><CountUp t={t} from={4200} dur={1300} value={r.cost.commercialTotalEur} format={eur} /></div>
            <div className="mt-1 text-[13px] text-secondary">{eur(r.cost.commercialUnitEur)}/ud · plazo orientativo {r.leadTime.minDays}–{r.leadTime.maxDays} días hábiles</div>
          </div>
        </Reveal>
      </div>
      <AppWindow section="Fabricación › Oferta · borrador" className="h-full">
        <div className="h-full bg-[#eef1f6] p-5">
          <div className="mx-auto h-full max-w-[560px] rounded-lg bg-white p-6 shadow-lg ring-1 ring-line">
            <div className="flex items-center justify-between border-b-2 border-navy pb-2"><span className="text-[15px] font-semibold text-ink">Oferta</span><span className="font-mono text-[11.5px] text-ink-3">{req.ref}</span></div>
            {t >= 5000 && <Typewriter t={t} from={5000} text={text} cps={110} className="mt-3 block font-sans text-[13.5px] leading-relaxed text-ink-2" />}
          </div>
        </div>
      </AppWindow>
    </div>
  );
}

// ── 8 · Revisión humana ────────────────────────────────────────────────────
function Review({ t }: { t: number }) {
  const req = useReq();
  const v = req.approval ? req.versions.find((x) => x.id === req.approval!.versionId) : undefined;
  const items = [
    ...req.contradictions.map((c) => c.description),
    'Escariado Ø8 H7 incluido en el ciclo de taladrado (supuesto)',
    'Plazo orientativo: requiere planificación real',
  ];
  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative w-full max-w-[720px] rounded-3xl bg-white p-7 text-ink shadow-[0_30px_80px_-30px_rgb(0_0_0/0.7)]">
        <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Revisión humana · {req.ref}</div>
        <h2 className="mt-1 text-[22px] font-semibold">¿Aprobamos esta versión?</h2>
        <ul className="mt-4 space-y-2">
          {items.map((x, i) => <Reveal key={x} t={t} at={400 + i * 600}><li className="flex gap-2 rounded-xl bg-warn-bg px-3 py-2 text-[13.5px] text-[#7c3d06]"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />{x}</li></Reveal>)}
        </ul>
        <Reveal t={t} at={2400}>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-canvas px-4 py-3 ring-1 ring-line text-[13px]"><span>Hash de inputs y cálculo</span><span className="font-mono font-semibold">{estimate(req.draft).inputHash}</span></div>
        </Reveal>
        <AnimatePresence>
          {t >= 3400 && (
            <motion.div initial={{ opacity: 0, scale: 2.2, rotate: -25 }} animate={{ opacity: 1, scale: 1, rotate: -8 }} transition={{ type: 'spring', duration: 0.6, bounce: 0.35 }}
              className="absolute -right-4 -top-6 flex items-center gap-2 rounded-2xl border-4 border-ok bg-white px-4 py-2 text-ok shadow-xl">
              <Stamp className="size-6" /><div><div className="text-[20px] font-black uppercase tracking-wide">Aprobado</div><div className="font-mono text-[11px]">{v ? `v${v.number} · ${v.approval?.approvedBy.split(' (')[0]}` : '…'}</div></div>
            </motion.div>
          )}
        </AnimatePresence>
        <Reveal t={t} at={4400}><p className="mt-4 text-[13px] text-ink-3">La aprobación queda ligada a esta versión exacta: cualquier edición posterior la anula automáticamente.</p></Reveal>
      </div>
    </div>
  );
}

// ── 9 · Odoo ───────────────────────────────────────────────────────────────
function OdooRecord({ t }: { t: number }) {
  const req = useReq();
  const so = useStudio((s) => (req.erpRef ? s.erp.saleOrders.find((o) => o.id === req.erpRef!.localId) : undefined));
  const partner = useStudio((s) => s.erp.partners.find((p) => p.id === so?.partnerId));
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <AppWindow section={`Odoo › Ventas › Presupuestos › ${so?.name ?? 'creando…'}`} className="h-full" right={<BrandLogo src="/brands/odoo.svg" name="Odoo" size={22} />}>
        <div className="h-full p-5">
          {!so ? <div className="flex h-full items-center justify-center text-[14px] text-ink-3"><span className="animate-pulse">Adapter ERP escribiendo el borrador…</span></div> : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="flex items-center gap-1">{['Presupuesto', 'Enviado', 'Pedido de venta'].map((s, i) => <div key={s} className={cx('flex h-8 flex-1 items-center justify-center text-[12.5px] font-medium first:rounded-l-lg last:rounded-r-lg', i === 0 ? 'bg-[#714b67] text-white' : 'bg-canvas text-ink-3')}>{s}</div>)}</div>
              <div className="mt-4 flex items-baseline justify-between"><h2 className="text-[28px] font-semibold text-ink">{so.name}</h2><span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[12px] font-medium text-[#8a6100]">Creado por MTI · C02</span></div>
              <Reveal t={t} at={900}>
                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13.5px]">
                  <span className="text-ink-3">Cliente</span><span className="font-medium text-ink">{partner?.name}</span>
                  <span className="text-ink-3">Origen</span><span className="font-medium text-ink">{so.origin}</span>
                  <span className="text-ink-3">Aprobado por</span><span className="font-medium text-ink">{so.createdBy.replace('MTI · C02 (aprobado por ', '').replace(')', '')}</span>
                </div>
              </Reveal>
              <Reveal t={t} at={1800}>
                <table className="mt-4 w-full text-[13.5px]"><thead><tr className="border-b border-line text-[12px] text-ink-3"><th className="py-1.5 text-left font-medium">Producto</th><th className="py-1.5 text-right font-medium">Cant.</th><th className="py-1.5 text-right font-medium">Precio</th></tr></thead>
                  <tbody>{so.lines.map((l) => <tr key={l.id} className="border-b border-line text-ink"><td className="py-2">{l.name}</td><td className="py-2 text-right tabular">{l.qty}</td><td className="whitespace-nowrap py-2 text-right tabular">{eur(l.priceUnit)}</td></tr>)}</tbody></table>
                <div className="mt-3 text-right text-[18px] font-semibold text-ink">Base imponible {eur(so.lines.reduce((a, l) => a + l.qty * l.priceUnit, 0))}</div>
              </Reveal>
              <Reveal t={t} at={2800}><div className="mt-3 rounded-lg bg-canvas px-3 py-2 font-mono text-[11.5px] text-ink-3">hash {so.inputHash} · idempotencia {so.idempotencyKey?.slice(0, 32)}…</div></Reveal>
            </motion.div>
          )}
        </div>
      </AppWindow>
      <div className="flex flex-col gap-3">
        <Reveal t={t} at={3800}>
          <div className="rounded-2xl bg-white p-4 text-ink shadow-xl">
            <div className="mb-2 flex items-center gap-2 text-[12.5px] text-ink-3"><Send className="size-4" />Respuesta al cliente · <b className="text-ink-2">borrador, no enviado</b></div>
            {t >= 4200 && <Typewriter t={t} from={4200} text={req.replyDraft ?? ''} cps={120} className="block font-sans text-[13px] leading-relaxed text-ink-2" />}
          </div>
        </Reveal>
        <Reveal t={t} at={8200}>
          <div className="rounded-2xl bg-[#16a34a]/12 p-4 text-[14px] text-[#86efac] ring-1 ring-[#16a34a]/40"><CheckCircle2 className="mb-1 size-5" />Del correo al presupuesto trazable en Odoo, con cada dato explicado y una persona decidiendo.</div>
        </Reveal>
      </div>
    </div>
  );
}

export function buildManufacturingScenario(): DemoScenario {
  return {
    id: 'ofertas', title: 'De un plano a una oferta', subtitle: 'Correo con plano y CAD → estimación explicable → presupuesto en Odoo', reference: 'GALMETEC · PROMEGA',
    prepare: () => S().resetRequest(STAR),
    finale: [
      { label: 'Abrir el expediente RFQ-2026-0042', to: () => `${W}/flujo` },
      { label: 'Ver la estimación editable', to: () => `${W}/estimacion` },
      { label: 'Abrir el presupuesto en Odoo', to: () => { const r = S().requests.find((x) => x.id === STAR); return r?.erpRef ? `/odoo/ventas/${r.erpRef.localId}` : '/odoo/ventas'; } },
    ],
    scenes: [
      { id: 'mail', section: 'Correo', where: { label: 'Bandeja unificada', to: '/bandeja' }, title: 'Ha llegado un nuevo requerimiento', narration: 'Un cliente envía una solicitud de oferta con plano, modelo 3D y hoja de requisitos. Nadie tiene que reenviarla: el agente de Correo la detecta y la clasifica automáticamente.', agents: ['C01'], duration: 7500, Component: MailArrives },
      { id: 'read', section: 'Correo', where: { label: 'Expediente › Correo y adjuntos', to: `${W}/correo` }, title: 'Se analiza el email', narration: 'El agente lee el correo y extrae cantidad, referencia, revisión, material, acabado y plazo. Cada dato queda con su fuente y su estado; si dos documentos se contradicen, se marca.', agents: ['C01'], duration: 8000, enter: () => S().runStep(STAR, 'intake'), Component: ReadEmail },
      { id: 'docs', section: 'Documentos', where: { label: 'Expediente › Correo y adjuntos', to: `${W}/correo` }, title: 'Se toman y se abren los adjuntos', narration: 'Se accede a los archivos: el plano en PDF, el modelo, el DXF y la hoja de requisitos. El orquestador confirma que es una solicitud de oferta y planifica qué especialistas intervienen.', agents: ['C01', 'MTI'], duration: 8000, enter: () => S().runStep(STAR, 'classify'), Component: Attachments },
      { id: 'extract', section: 'Medidas', where: { label: 'Piezas y planos › SP-118', to: '/piezas/SP-118' }, title: 'Se extraen las medidas del plano', narration: 'Lectura técnica de cotas, bolsillo, taladros, material y tolerancias. El material sale de los documentos, no de la forma. Calidad detecta la contradicción del acabado.', agents: ['C08', 'CAD', 'OCR'], duration: 12000, enter: () => S().runStep(STAR, 'cad'), Component: Extraction },
      { id: 'brain', section: 'Cerebro', where: { label: 'Conocimiento', to: '/conocimiento' }, title: 'Se consulta el cerebro de la empresa', narration: 'El agente de Conocimiento busca entre trabajos anteriores, reglas y normas. Se queda con los tres trabajos realmente comparables y descarta los que no son transferibles, explicando por qué.', agents: ['C07', 'MLC'], duration: 11500, enter: () => S().runStep(STAR, 'history'), Component: Brain },
      { id: 'calc', section: 'Cálculo', where: { label: 'Ofertas › Estimación', to: `${W}/estimacion` }, title: 'Se calculan los tiempos por operación', narration: 'Reglas de proceso explícitas más la corrección aprendida del histórico. La preparación se cuenta una vez por lote. Cada fila es editable y tiene su origen.', agents: ['TME', 'MLC', 'C08'], duration: 8500, enter: () => S().runStep(STAR, 'estimate'), Component: Calc },
      { id: 'offer', section: 'Oferta', where: { label: 'Ofertas › Oferta', to: `${W}/oferta` }, title: 'Se genera la oferta', narration: 'Los minutos no son precio: se suman transformación, material, subcontratación e indirectos, se aplica la regla comercial y se redacta el borrador de oferta.', agents: ['C02'], duration: 11000, enter: () => S().runStep(STAR, 'offer'), Component: Offer },
      { id: 'review', section: 'Revisión', where: { label: 'Aprobaciones', to: '/aprobaciones' }, title: 'Una persona decide', narration: 'El técnico revisa las incertidumbres y aprueba una versión exacta. La aprobación queda vinculada al hash de los datos: si algo cambia, se anula.', agents: ['MTI', 'HUM'], duration: 6500,
        enter: () => S().runStep(STAR, 'review'),
        at: [{ t: 3000, run: () => { const id = S().saveVersion(STAR, 'Versión de la demo guiada'); S().approve(STAR, id, 'Aprobación de demostración'); } }],
        Component: Review },
      { id: 'odoo', section: 'Odoo', where: { label: 'ERP Odoo › Ventas', to: '/odoo/ventas' }, title: 'El presupuesto llega a Odoo', narration: 'El adapter crea el presupuesto borrador, sin duplicados aunque se reintente, y prepara la respuesta al cliente. Nada se envía ni se confirma sin una persona.', agents: ['C02', 'C01', 'ERP'], duration: 10000, enter: () => S().createErpDraft(STAR), Component: OdooRecord },
    ],
  };
}
