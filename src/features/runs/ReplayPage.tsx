// Replay determinista: reproduce el historial de eventos registrado. No llama a adapters ni escribe.
import { ArrowLeft, Pause, Play, RotateCcw, ShieldCheck, SkipBack, SkipForward } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { StepStatus } from '@/domain/types';
import { FlowGraph, type FlowNode } from '@/components/flow/FlowGraph';
import { Badge, Button, Card, CardHeader, EmptyState, Segmented } from '@/components/ui';
import { EvidenceProvider } from '@/components/evidence/Evidence';
import { MANUFACTURING_FLOW } from '@/services/runs/manufacturingFlow';
import { ERP_STEPS } from '@/fixtures/erp';
import { CATALOG } from '@/fixtures/catalog';
import { TENDER_FLOW } from '@/services/tenders/tenderEngine';
import { useStudio, VOICE_FLOW } from '@/store/useStudio';
import { dateTimeEs } from '@/lib/format';
import { useMotionOff } from '@/lib/useMotion';
import { StepOutput } from '../manufacturing/StepOutput';
import { RUN_STATUS, subjectPath } from './RunsPage';

export default function ReplayPage() {
  const { runId } = useParams();
  const run = useStudio((s) => s.runs.find((r) => r.id === runId));
  const inbox = useStudio((s) => s.erp.inbox);
  const req = useStudio((s) => s.requests.find((r) => r.id === run?.subjectId));
  const speed = useStudio((s) => s.ui.speed);
  const setUi = useStudio((s) => s.setUi);
  const motionOff = useMotionOff();
  const nav = useNavigate();
  const finals = useMemo(() => run?.events.filter((e) => e.status !== 'running') ?? [], [run]);
  const [pos, setPos] = useState(0); // nº de eventos finales aplicados
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    if (!playing) return;
    if (pos >= finals.length) { setPlaying(false); return; }
    const t = setTimeout(() => setPos((p) => p + 1), motionOff ? 250 : 1400 / speed);
    return () => clearTimeout(t);
  }, [playing, pos, finals.length, speed, motionOff]);

  if (!run) return <div className="mx-auto max-w-3xl p-8"><EmptyState title="Ejecución no encontrada" action={<Link to="/ejecuciones" className="text-info underline">Volver</Link>} /></div>;

  const defs: { id: string; title: string; short: string; agents: string[] }[] =
    run.kind === 'manufacturing' ? MANUFACTURING_FLOW.map((s) => ({ id: s.id, title: s.title, short: s.short, agents: s.agents }))
    : run.kind === 'erp' ? (ERP_STEPS[inbox.find((i) => i.id === run.subjectId)?.scenario ?? 'rfq'] ?? []).map((s) => ({ id: s.id, title: s.title, short: '', agents: [s.agent] }))
    : run.kind === 'crm' ? VOICE_FLOW.map((s) => ({ id: s.id, title: s.title, short: '', agents: [s.agent] }))
    : run.kind === 'tender' ? TENDER_FLOW.map((s) => ({ id: s.id, title: s.title, short: '', agents: [s.agent] }))
    : (CATALOG.find((c) => c.id === run.subjectId)?.steps ?? []).map((s) => ({ id: s.id, title: s.title, short: '', agents: [s.agent] }));

  const applied = finals.slice(0, pos);
  const statusOf = (id: string): StepStatus => {
    const last = [...applied].reverse().find((e) => e.stepId === id);
    if (!last && playing && finals[pos]?.stepId === id) return 'running';
    return last?.status ?? 'idle';
  };
  const summaryOf = (id: string) => { const last = [...applied].reverse().find((e) => e.stepId === id); return last?.outputRef ? run.outputs[last.outputRef]?.summary : undefined; };
  const nodes: FlowNode[] = defs.map((d) => ({ ...d, status: statusOf(d.id), summary: summaryOf(d.id) }));
  const current = sel ? [...applied].reverse().find((e) => e.stepId === sel) : applied.at(-1);
  const snap = current?.outputRef ? run.outputs[current.outputRef] : undefined;

  return (
    <EvidenceProvider req={req}>
      <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6">
        <Link to="/ejecuciones" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink"><ArrowLeft className="size-3.5" /> Ejecuciones</Link>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight">Replay · {run.scenario}</h1>
            <p className="text-[13.5px] text-ink-3"><span className="font-mono">{run.subjectRef}</span> · iniciada {dateTimeEs(run.startedAt)} · {finals.length} eventos registrados · <Badge tone={RUN_STATUS[run.status].tone}>{RUN_STATUS[run.status].label}</Badge></p>
          </div>
          <Button onClick={() => nav(subjectPath(run))}>Reabrir sujeto</Button>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-info-bg px-4 py-2.5 text-[13px] text-info ring-1 ring-info/15">
          <ShieldCheck className="size-4 shrink-0" /> El replay reproduce el historial registrado: no ejecuta pasos, no llama al ERP y no vuelve a crear registros.
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,64fr)_minmax(340px,36fr)]">
          <section className="tech-grid overflow-hidden rounded-2xl ring-1 ring-navy-border">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] px-4 py-3" role="toolbar" aria-label="Controles de replay">
              {playing ? <Button size="sm" variant="primary" icon={<Pause />} onClick={() => setPlaying(false)}>Pausa</Button> : <Button size="sm" variant="primary" icon={<Play />} onClick={() => { if (pos >= finals.length) setPos(0); setSel(null); setPlaying(true); }}>{pos >= finals.length && pos > 0 ? 'Repetir' : 'Reproducir'}</Button>}
              <Button size="sm" variant="outline-dark" icon={<SkipBack />} aria-label="Evento anterior" disabled={pos === 0} onClick={() => { setSel(null); setPos((p) => Math.max(0, p - 1)); }} />
              <Button size="sm" variant="outline-dark" icon={<SkipForward />} aria-label="Evento siguiente" disabled={pos >= finals.length} onClick={() => { setSel(null); setPos((p) => Math.min(finals.length, p + 1)); }} />
              <Button size="sm" variant="outline-dark" icon={<RotateCcw />} onClick={() => { setPlaying(false); setPos(0); setSel(null); }}>Reiniciar</Button>
              <Segmented dark size="sm" label="Velocidad" value={String(speed) as '0.5' | '1' | '2'} onChange={(v) => setUi({ speed: Number(v) as 0.5 | 1 | 2 })} options={[{ value: '0.5', label: '0,5×' }, { value: '1', label: '1×' }, { value: '2', label: '2×' }]} />
              <span className="ml-auto font-mono text-[12px] text-muted">evento {pos}/{finals.length}</span>
            </div>
            <div className="px-2 py-2"><FlowGraph nodes={nodes} selectedId={current?.stepId} onSelect={setSel} packetLabel={run.subjectRef.slice(0, 14)} compact={run.kind !== 'manufacturing'} cols={defs.length > 5 ? 4 : defs.length} /></div>
            <div className="h-1 bg-white/5"><div className="h-full bg-gold transition-[width] duration-300" style={{ width: `${finals.length ? (pos / finals.length) * 100 : 0}%` }} /></div>
          </section>
          <Card>
            <CardHeader title={current ? defs.find((d) => d.id === current.stepId)?.title ?? current.stepId : 'Inicio'} subtitle={current ? `${dateTimeEs(current.timestamp)} · ${current.durationMs != null ? `${current.durationMs} ms` : ''} · ${current.outputRef}` : 'Pulsa reproducir para recorrer los eventos'} />
            <div className="max-h-[560px] overflow-y-auto p-4 scroll-thin">
              {!snap ? <p className="text-[13.5px] text-ink-3">Sin evento seleccionado.</p> : run.kind === 'manufacturing' ? <StepOutput stepId={snap.stepId} outputs={snap.outputs} /> : (
                <div className="space-y-2">
                  <p className="text-[14px] font-medium">{snap.summary}</p>
                  <pre className="max-h-[420px] overflow-auto rounded-xl bg-canvas p-3 font-mono text-[11.5px] leading-relaxed text-ink-2 ring-1 ring-line scroll-thin">{JSON.stringify(snap.outputs, null, 2)}</pre>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </EvidenceProvider>
  );
}
