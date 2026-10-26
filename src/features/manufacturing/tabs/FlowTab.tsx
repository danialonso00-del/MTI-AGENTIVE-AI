import { AnimatePresence, motion } from 'motion/react';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { Clock3, FastForward, Pause, Play, RefreshCw, RotateCcw, SkipForward, Wrench } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ManufacturingRequest } from '@/domain/types';
import { FlowGraph, type FlowNode } from '@/components/flow/FlowGraph';
import { Badge, Button, Segmented, STEP_STATUS } from '@/components/ui';
import { EvidenceChip } from '@/components/evidence/Evidence';
import { AGENTS, agentByCode } from '@/fixtures/agents';
import { MANUFACTURING_FLOW } from '@/services/runs/manufacturingFlow';
import { useStudio } from '@/store/useStudio';
import { approvalValid, nextRunnableStep } from '@/store/requestOps';
import { cx } from '@/lib/format';
import { useMotionOff } from '@/lib/useMotion';
import { StepOutput } from '../StepOutput';
import type { useStepRunner } from '../hooks';

type Runner = ReturnType<typeof useStepRunner>;

const STEP_INPUT: Record<string, (r: ManufacturingRequest) => string> = {
  intake: (r) => `${r.emails.filter((e) => e.direction === 'in').length} correos · ${r.attachments.length} adjuntos (${r.attachments.map((a) => a.kind.toUpperCase()).join(', ')})`,
  classify: (r) => `Asunto, cuerpo y ${r.fields.filter((f) => f.value).length} campos extraídos`,
  cad: (r) => `Plano y modelo de la rev. ${r.draft.revision}; campos de material y tolerancias de los documentos`,
  history: (r) => `Rasgos de la pieza, material ${r.draft.material ?? '—'} y lote ${r.draft.quantity} uds; histórico ${'sintético v2026.09-r3'}`,
  estimate: () => 'Ruta de operaciones, reglas de proceso, tabla de material, máquinas habilitadas y factores de corrección',
  offer: () => 'Tiempos estimados, tarifas por centro, material, subcontratación, indirectos y regla comercial',
  review: () => 'Versión guardada de inputs y cálculo, incertidumbres y comentarios',
  output: () => 'Versión aprobada (hash), contacto resuelto en el ERP y plantilla de respuesta',
};

function stepEvidence(req: ManufacturingRequest, stepId: string): string[] {
  switch (stepId) {
    case 'intake': return req.fields.flatMap((f) => f.evidenceIds).filter((v, i, a) => a.indexOf(v) === i).slice(0, 8);
    case 'cad': return req.evidence.filter((e) => e.anchor === 'model' || e.anchor?.startsWith('tb.') || e.anchor === 'notes').map((e) => e.id).slice(0, 5);
    case 'history': return (req.steps.history?.outputs?.comparables as { ref: string; included: boolean }[] | undefined)?.filter((c) => c.included).map((c) => `ev-hist-${c.ref}`) ?? [];
    case 'estimate': return ['ev-rules', 'ev-materials', 'ev-machines'];
    case 'offer': return ['ev-machines', 'ev-materials'];
    case 'review': return req.evidence.filter((e) => e.kind === 'human').map((e) => e.id).slice(-3);
    default: return [];
  }
}

const CAPTION: Record<string, string> = {
  intake: 'C01 lee el correo y los adjuntos. Cada campo queda con su fuente y estado: extraído, confirmado, supuesto o ausente.',
  classify: 'El orquestador identifica una solicitud de oferta, elabora el plan y elige especialistas. Solo se permite escribir un presupuesto borrador tras aprobación.',
  cad: 'Lectura técnica: rasgos del modelo y del plano. El material sale de los documentos, no de la forma. Se detectan contradicciones.',
  history: 'C07 recupera tres trabajos comparables y descarta los no transferibles, con motivo explícito.',
  estimate: 'Motor de tiempos: reglas explícitas + corrección por histórico (simulada). C08 comprueba consistencia y plazos.',
  offer: 'C02 traduce minutos y tarifas a coste y precio. Minutos no equivalen a precio: se suman material, subcontratación e indirectos.',
  review: 'Una persona revisa incertidumbres y aprueba una versión exacta: la aprobación queda ligada al hash de inputs.',
  output: 'El adapter crea el presupuesto borrador en el ERP (demo) y prepara la respuesta. Nada se envía automáticamente.',
};

export function FlowTab({ req, runner, onApprove }: { req: ManufacturingRequest; runner: Runner; onApprove: () => void }) {
  const ui = useStudio((s) => s.ui);
  const [selected, setSelected] = useState<string>(() => lastTouched(req) ?? 'intake');
  const [follow, setFollow] = useState(true);
  const prevSteps = useRef(req.steps);

  // Seguir el último paso ejecutado salvo que el usuario haya fijado otro.
  useEffect(() => {
    if (runner.runningId && follow) setSelected(runner.runningId);
  }, [runner.runningId, follow]);
  useEffect(() => {
    if (prevSteps.current !== req.steps && follow) {
      const changed = MANUFACTURING_FLOW.map((s) => s.id).filter((id) => req.steps[id]?.finishedAt !== prevSteps.current[id]?.finishedAt || req.steps[id]?.status !== prevSteps.current[id]?.status);
      if (changed.length) setSelected(changed.at(-1)!);
    }
    prevSteps.current = req.steps;
  }, [req.steps, follow]);

  const nodes: FlowNode[] = useMemo(() => MANUFACTURING_FLOW.map((s) => ({
    id: s.id, title: s.title, short: s.short, agents: [...s.agents, ...s.tools.filter((t) => t !== 'HUM')],
    status: runner.runningId === s.id ? 'running' : req.steps[s.id]?.status ?? 'idle',
    summary: runner.runningId === s.id ? 'Ejecutando…' : req.steps[s.id]?.summary,
  })), [req.steps, runner.runningId]);

  const activeAgents = new Set(MANUFACTURING_FLOW.filter((s) => req.steps[s.id]?.status !== 'idle' || runner.runningId === s.id).flatMap((s) => s.agents));
  const focusAgents = new Set(MANUFACTURING_FLOW.find((s) => s.id === selected)?.agents ?? []);

  return (
    <div className={cx('grid gap-4', ui.meeting ? 'xl:grid-cols-[minmax(0,66fr)_minmax(380px,34fr)]' : 'xl:grid-cols-[minmax(0,64fr)_minmax(340px,36fr)]')}>
      <section className="tech-grid relative overflow-hidden rounded-2xl ring-1 ring-navy-border" aria-label="Flujo de agentes">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] px-4 py-3">
          <div className="flex min-w-0 flex-1 basis-full flex-wrap items-center gap-1.5 sm:basis-auto" aria-label="Agentes">
            {AGENTS.map((a) => (
              <span key={a.code} title={`${a.code} · ${a.name}: ${a.responsibility}`}
                className={cx('inline-flex items-center gap-1 rounded-md py-0.5 pl-0.5 pr-1.5 font-mono text-[11.5px] transition-[background-color,color,opacity,filter] duration-300',
                  focusAgents.has(a.code) ? 'bg-gold text-navy' : activeAgents.has(a.code) ? 'bg-white/[0.1] text-white' : 'bg-white/[0.04] text-muted opacity-50 grayscale')}>
                <AgentIcon code={a.code} size={16} glow={focusAgents.has(a.code)} />{a.code}
              </span>
            ))}
          </div>
          {ui.mode === 'work' && !ui.meeting && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline-dark" icon={<SkipForward />} onClick={() => runner.runOne()} disabled={runner.busy || !canRunNext(req)} disabledReason={!canRunNext(req) ? 'El siguiente paso requiere una acción (dato, aprobación o alta)' : 'Hay un paso en ejecución'}>Paso siguiente</Button>
              <Button size="sm" variant="primary" icon={<FastForward />} onClick={() => runner.runToReview()} disabled={runner.busy || !canRunNext(req) || nextRunnableStep(req) === 'review' || nextRunnableStep(req) === 'output'} disabledReason="No hay pasos automáticos pendientes antes de la revisión">Hasta revisión</Button>
            </div>
          )}
        </div>

        {ui.mode === 'guided' && <GuidedBar req={req} runner={runner} />}

        <div className="px-2 py-2 md:px-3">
          <FlowGraph nodes={nodes} selectedId={selected} onSelect={(id) => { setSelected(id); setFollow(false); }} packetLabel={req.ref.replace('RFQ-2026-', 'RFQ-')} />
        </div>

        <div className="border-t border-white/[0.07] px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 rounded-md bg-gold/15 px-1.5 py-0.5 font-mono text-[11.5px] text-gold-light">{String(MANUFACTURING_FLOW.findIndex((s) => s.id === selected) + 1).padStart(2, '0')}</span>
            <AnimatePresence mode="wait">
              <motion.p key={selected} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.22 }} className={cx('text-secondary', ui.meeting ? 'text-[16px]' : 'text-[14px]')}>
                {CAPTION[selected]}
              </motion.p>
            </AnimatePresence>
            {!follow && <button onClick={() => setFollow(true)} className="ml-auto shrink-0 rounded-md px-2 py-0.5 text-[12px] text-gold-light ring-1 ring-gold/30 hover:bg-gold/10">Seguir ejecución</button>}
          </div>
        </div>
      </section>

      <Inspector req={req} stepId={selected} onApprove={onApprove} runner={runner} />
    </div>
  );
}

function canRunNext(req: ManufacturingRequest) {
  const id = nextRunnableStep(req);
  if (!id) return false;
  const idx = MANUFACTURING_FLOW.findIndex((s) => s.id === id);
  const prev = idx > 0 ? req.steps[MANUFACTURING_FLOW[idx - 1].id]?.status : 'completed';
  if (prev !== 'completed') return false;
  if (id === 'review') return true; // ejecutar «review» solicita revisión
  if (id === 'output') return approvalValid(req);
  return req.steps[id]?.status !== 'needs_input';
}

function lastTouched(req: ManufacturingRequest) {
  const done = MANUFACTURING_FLOW.filter((s) => req.steps[s.id]?.status && req.steps[s.id].status !== 'idle');
  return done.at(-1)?.id;
}

function Inspector({ req, stepId, onApprove, runner }: { req: ManufacturingRequest; stepId: string; onApprove: () => void; runner: Runner }) {
  const def = MANUFACTURING_FLOW.find((s) => s.id === stepId)!;
  const step = req.steps[stepId];
  const status = runner.runningId === stepId ? 'running' : step?.status ?? 'idle';
  const st = STEP_STATUS[status];
  const nav = useNavigate();
  const evIds = stepEvidence(req, stepId);
  const createErp = useStudio((s) => s.createErpDraft);
  const meeting = useStudio((s) => s.ui.meeting);
  return (
    <aside className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-card)]" aria-label="Inspector del paso">
      <div className="border-b border-line px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] text-ink-3">{String(MANUFACTURING_FLOW.indexOf(def) + 1).padStart(2, '0')}</span>
            <h2 className="text-[16px] font-semibold">{def.title}</h2>
          </div>
          <Badge tone={st.tone} dot>{st.label}</Badge>
        </div>
        <p className="mt-1 text-[13px] text-ink-3">{def.description}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {[...def.agents, ...def.tools].map((c) => {
            const a = agentByCode(c);
            return <span key={c} className={cx('inline-flex items-center gap-1.5 rounded-lg py-1 pl-1 pr-2 text-[12.5px] ring-1', a?.kind === 'tool' ? 'bg-canvas text-ink-2 ring-line' : a?.kind === 'human' ? 'bg-ok-bg text-ok ring-ok/20' : 'bg-gold/10 text-[#7a5600] ring-gold/30')} title={a?.responsibility}>
              <AgentIcon code={c} size={20} /><b className="font-mono text-[11.5px]">{c}</b>{a?.name}
            </span>;
          })}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 scroll-thin" style={{ maxHeight: meeting ? 'none' : 640 }}>
        <section>
          <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Entrada</h3>
          <p className="text-[13.5px] text-ink-2">{STEP_INPUT[stepId](req)}</p>
        </section>
        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Salida · {def.deliverable}</h3>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={`${stepId}-${step?.finishedAt ?? 'none'}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}>
              {status === 'running' ? <div className="space-y-2"><div className="skeleton h-10 rounded-xl" /><div className="skeleton h-24 rounded-xl" /></div> : <StepOutput stepId={stepId} outputs={step?.outputs} />}
            </motion.div>
          </AnimatePresence>
        </section>
        {evIds.length > 0 && (
          <section>
            <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Fuentes</h3>
            <div className="flex flex-wrap gap-1.5">{evIds.map((id) => <EvidenceChip key={id} id={id} />)}</div>
          </section>
        )}
        <section className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-3">
          <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" />{step?.durationMs != null ? `${step.durationMs} ms de cálculo local` : 'Sin ejecutar'}</span>
          <span className="inline-flex items-center gap-1"><Wrench className="size-3.5" />{def.tools.length ? def.tools.map((t) => agentByCode(t)?.name).join(', ') : 'Sin herramientas externas'}</span>
        </section>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line bg-canvas/60 px-4 py-3">
        {stepId === 'review' ? (
          <Button variant="primary" onClick={onApprove} disabled={req.steps.offer?.status !== 'completed'} disabledReason="Primero hay que completar la oferta">Revisar y aprobar</Button>
        ) : stepId === 'output' ? (
          <Button variant="primary" onClick={() => createErp(req.id)} disabled={!approvalValid(req) || Boolean(req.erpRef && step?.status === 'completed')} disabledReason={!approvalValid(req) ? 'Requiere una aprobación vigente' : 'El presupuesto ya existe'}>Crear presupuesto en Odoo</Button>
        ) : (
          <Button variant="secondary" icon={<RefreshCw />} onClick={() => runner.runOne(stepId)} disabled={runner.busy || !prereqDone(req, stepId)} disabledReason={runner.busy ? 'Hay un paso en ejecución' : 'Completa antes los pasos anteriores'}>
            {step?.status === 'idle' || !step ? 'Ejecutar este paso' : 'Volver a ejecutar'}
          </Button>
        )}
        {step?.status === 'needs_input' && stepId === 'intake' && <Button variant="secondary" onClick={() => nav(`/fabricacion/${req.id}/correo`)}>Completar dato</Button>}
        {step?.status === 'needs_input' && stepId === 'estimate' && <Button variant="secondary" onClick={() => nav(`/fabricacion/${req.id}/estimacion`)}>Revisar máquinas y parámetros</Button>}
        {['history', 'estimate', 'offer'].includes(stepId) && step?.status === 'completed' && (
          <Button variant="ghost" onClick={() => nav(`/fabricacion/${req.id}/${stepId === 'history' ? 'historico' : stepId === 'estimate' ? 'estimacion' : 'oferta'}`)}>Abrir detalle</Button>
        )}
      </div>
    </aside>
  );
}

function prereqDone(req: ManufacturingRequest, stepId: string) {
  const idx = MANUFACTURING_FLOW.findIndex((s) => s.id === stepId);
  return MANUFACTURING_FLOW.slice(0, idx).every((s) => req.steps[s.id]?.status === 'completed');
}

// ── Demo guiada: mismo motor y datos; controles de presentación ──

function GuidedBar({ req, runner }: { req: ManufacturingRequest; runner: Runner }) {
  const [playing, setPlaying] = useState(false);
  const speed = useStudio((s) => s.ui.speed);
  const setUi = useStudio((s) => s.setUi);
  const store = useStudio;
  const motionOff = useMotionOff();
  const nav = useNavigate();
  const done = req.state === 'draft_created';

  useEffect(() => {
    if (!playing || runner.busy) return;
    const t = setTimeout(async () => {
      const cur = store.getState().requests.find((r) => r.id === req.id)!;
      const next = nextRunnableStep(cur);
      if (!next) { setPlaying(false); return; }
      if (cur.steps.intake?.status === 'needs_input' || cur.steps.estimate?.status === 'needs_input') { setPlaying(false); return; }
      if (next === 'review' && cur.steps.review?.status === 'needs_input') {
        const vId = store.getState().saveVersion(cur.id, 'Versión de la demo guiada');
        store.getState().approve(cur.id, vId, 'Aprobación de demostración (demo guiada)');
        return;
      }
      await runner.runOne();
    }, motionOff ? 150 : 1500 / speed);
    return () => clearTimeout(t);
  }, [playing, runner, req, speed, motionOff, store]);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] bg-white/[0.03] px-4 py-2.5" role="toolbar" aria-label="Controles de presentación">
      <span className="mr-1 rounded-md bg-gold px-1.5 py-0.5 text-[11.5px] font-semibold text-navy">DEMO GUIADA</span>
      {playing ? (
        <Button size="sm" variant="primary" icon={<Pause />} onClick={() => setPlaying(false)}>Pausa</Button>
      ) : (
        <Button size="sm" variant="primary" icon={<Play />} onClick={() => setPlaying(true)} disabled={done} disabledReason="La historia ha terminado: reinicia o reproduce el replay">Reproducir</Button>
      )}
      <Button size="sm" variant="outline-dark" icon={<SkipForward />} disabled={runner.busy || done} disabledReason="Sin pasos pendientes" onClick={async () => {
        const cur = store.getState().requests.find((r) => r.id === req.id)!;
        if (nextRunnableStep(cur) === 'review' && cur.steps.review?.status === 'needs_input') {
          const vId = store.getState().saveVersion(cur.id, 'Versión de la demo guiada');
          store.getState().approve(cur.id, vId, 'Aprobación de demostración (demo guiada)');
        } else await runner.runOne();
      }}>Siguiente</Button>
      <Segmented dark size="sm" label="Velocidad" value={String(speed) as '0.5' | '1' | '2'} onChange={(v) => setUi({ speed: Number(v) as 0.5 | 1 | 2 })} options={[{ value: '0.5', label: '0,5×' }, { value: '1', label: '1×' }, { value: '2', label: '2×' }]} />
      <div className="ml-auto flex gap-2">
        <Button size="sm" variant="outline-dark" icon={<RotateCcw />} onClick={() => { setPlaying(false); store.getState().resetRequest(req.id); }}>Reiniciar</Button>
        <Button size="sm" variant="outline-dark" disabled={!req.currentRunId} disabledReason="Aún no hay ejecución que reproducir" onClick={() => nav(`/ejecuciones/${req.currentRunId}`)}>Replay</Button>
      </div>
    </div>
  );
}
