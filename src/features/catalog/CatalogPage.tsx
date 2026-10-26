import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, FastForward, FlaskConical, History, RotateCcw, SkipForward } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { StepStatus } from '@/domain/types';
import { FlowGraph, type FlowNode } from '@/components/flow/FlowGraph';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { CATALOG, type CatalogCase, type CatalogOutput } from '@/fixtures/catalog';
import { useStudio } from '@/store/useStudio';
import { cx } from '@/lib/format';
import { useMotionOff } from '@/lib/useMotion';

export default function CatalogPage() {
  const { caseId } = useParams();
  const c = CATALOG.find((x) => x.id === caseId);
  if (!c) return <CatalogGrid />;
  return <MiniDemo key={c.id} c={c} />;
}

function CatalogGrid() {
  return (
    <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6">
      <p className="text-[13px] font-medium text-[#8a6100]">Catálogo de casos · presentación v.02</p>
      <h1 className="mt-1 text-[28px] font-semibold tracking-tight md:text-[34px]">Mismo motor, otros procesos</h1>
      <p className="mt-1 max-w-2xl text-[14.5px] text-ink-3">Recorridos simplificados de casos reales de la presentación. Los clientes identifican la referencia; los datos interactivos son ficticios.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {CATALOG.map((c) => <CaseCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}

export function CaseCard({ c, dense }: { c: CatalogCase; dense?: boolean }) {
  return (
    <Link to={`/catalogo/${c.id}`} className="group flex flex-col rounded-[14px] border border-line bg-white p-4 shadow-[var(--shadow-card)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-[0_10px_30px_-12px_rgb(10_15_30/0.25)]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11.5px] font-semibold tracking-wide text-ink-3">{c.ref}</span>
        <Badge tone="neutral">{c.sector}</Badge>
      </div>
      <div className="mt-2 text-[15px] font-semibold text-ink">{c.title}</div>
      {!dense && <p className="mt-1 line-clamp-2 text-[13px] text-ink-3">{c.summary}</p>}
      <div className="mt-3 flex items-center gap-1 text-[12px] text-ink-3">
        {c.steps.map((s, i) => <span key={s.id} className="flex items-center gap-1">{i > 0 && <ArrowRight className="size-3 text-ink-3/50" />}<span>{s.title}</span></span>).slice(0, dense ? 3 : 5)}
      </div>
      <div className="mt-auto flex items-center justify-between pt-3 text-[12.5px]">
        <span className="text-ink-3">{c.pages}</span>
        <span className="font-medium text-[#8a6100] opacity-80 transition-opacity group-hover:opacity-100">Abrir mini demo →</span>
      </div>
    </Link>
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function MiniDemo({ c }: { c: CatalogCase }) {
  const [inputId, setInputId] = useState(c.inputs[0].id);
  const [results, setResults] = useState<Record<string, { summary: string; output: CatalogOutput; data?: unknown }>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [sel, setSel] = useState(c.steps[0].id);
  const [runId, setRunId] = useState<string | null>(null);
  const record = useStudio((s) => s.recordCatalogRun);
  const speed = useStudio((s) => s.ui.speed);
  const motionOff = useMotionOff();
  const nav = useNavigate();
  const input = c.inputs.find((i) => i.id === inputId)!;
  const next = c.steps.find((s) => !results[s.id]);

  const exec = async (id: string, acc: typeof results) => {
    setRunning(id); setSel(id);
    if (!motionOff) await sleep(600 / speed);
    const step = c.steps.find((s) => s.id === id)!;
    const prev = Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, v.data]));
    const r = step.run(input.data, prev);
    const out = { ...acc, [id]: r };
    setResults(out);
    setRunning(null);
    if (Object.keys(out).length === c.steps.length) {
      setRunId(record(c.id, c.title, input.label, c.steps.map((s) => ({ stepId: s.id, summary: out[s.id].summary, outputs: { output: out[s.id].output } }))));
    }
    return out;
  };
  const runAll = async () => {
    let acc = results;
    for (const s of c.steps) {
      if (acc[s.id]) continue;
      acc = await exec(s.id, acc);
      if (!motionOff) await sleep(450 / speed);
    }
  };
  const reset = () => { setResults({}); setSel(c.steps[0].id); setRunId(null); };

  const nodes: FlowNode[] = useMemo(() => c.steps.map((s) => ({
    id: s.id, title: s.title, short: '', agents: [s.agent],
    status: (running === s.id ? 'running' : results[s.id] ? 'completed' : 'idle') as StepStatus,
    summary: running === s.id ? 'Ejecutando…' : results[s.id]?.summary,
  })), [c, results, running]);
  const selRes = results[sel];

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6">
      <Link to="/catalogo" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink"><ArrowLeft className="size-3.5" /> Catálogo</Link>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><span className="font-mono text-[12.5px] text-ink-3">{c.ref} · {c.pages}</span><Badge tone="gold"><FlaskConical className="size-3" /> Simulación con datos ficticios</Badge></div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{c.title}</h1>
          <p className="max-w-3xl text-[14px] text-ink-3">{c.summary}</p>
        </div>
        {runId && <Button icon={<History />} onClick={() => nav(`/ejecuciones/${runId}`)}>Ver ejecución registrada</Button>}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Input" subtitle="Elige un caso de ejemplo; cambiarlo reinicia el recorrido" />
            <div className="flex flex-wrap gap-2 p-4">
              {c.inputs.map((i) => (
                <button key={i.id} onClick={() => { setInputId(i.id); reset(); }} aria-pressed={i.id === inputId}
                  className={cx('rounded-xl px-3.5 py-2.5 text-left text-[13.5px] ring-1 transition-colors', i.id === inputId ? 'bg-gold/10 font-medium text-ink ring-gold/50' : 'bg-white text-ink-2 ring-line hover:ring-line-strong')}>{i.label}</button>
              ))}
            </div>
          </Card>
          <section className="tech-grid overflow-hidden rounded-2xl ring-1 ring-navy-border">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] px-4 py-3">
              <span className="mr-auto text-[13px] text-secondary">{Object.keys(results).length}/{c.steps.length} pasos</span>
              <Button size="sm" variant="outline-dark" icon={<SkipForward />} disabled={!next || running !== null} disabledReason="Recorrido completado" onClick={() => next && exec(next.id, results)}>Paso siguiente</Button>
              <Button size="sm" variant="primary" icon={<FastForward />} disabled={!next || running !== null} disabledReason="Recorrido completado" onClick={runAll}>Ejecutar todo</Button>
              <Button size="sm" variant="outline-dark" icon={<RotateCcw />} onClick={reset} disabled={running !== null}>Reiniciar</Button>
            </div>
            <div className="px-2 py-1"><FlowGraph nodes={nodes} compact cols={c.steps.length} selectedId={sel} onSelect={setSel} packetLabel={c.ref.split(' ')[0]} /></div>
          </section>
        </div>
        <Card className="h-fit">
          <CardHeader title={c.steps.find((s) => s.id === sel)?.title ?? ''} subtitle={selRes?.summary ?? 'Paso pendiente'} actions={<span className="rounded-md bg-gold/12 px-1.5 py-0.5 font-mono text-[11.5px] text-[#7a5600]">{c.steps.find((s) => s.id === sel)?.agent}</span>} />
          <div className="p-4">
            <AnimatePresence mode="wait">
              <motion.div key={sel + (selRes ? '1' : '0')} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
                {running === sel ? <div className="skeleton h-28 rounded-xl" /> : selRes ? <CatalogOutputView o={selRes.output} /> : <p className="text-[13.5px] text-ink-3">Ejecuta el paso para ver su salida.</p>}
              </motion.div>
            </AnimatePresence>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function CatalogOutputView({ o }: { o: CatalogOutput }) {
  return (
    <div className="space-y-2 text-[13.5px]">
      {o.kind === 'text' && <p className="leading-relaxed text-ink-2">{o.text}</p>}
      {o.kind === 'list' && <ul className="space-y-1">{o.items.map((x) => <li key={x} className="text-ink-2">· {x}</li>)}</ul>}
      {o.kind === 'kv' && <dl className="divide-y divide-line rounded-xl ring-1 ring-line">{o.items.map(([k, v]) => <div key={k} className="flex justify-between gap-3 px-3 py-2"><dt className="text-ink-3">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}</dl>}
      {o.kind === 'table' && (
        <div className="overflow-x-auto rounded-xl ring-1 ring-line scroll-thin">
          <table className="w-full"><thead className="bg-canvas"><tr>{o.columns.map((c) => <th key={c} className="px-3 py-1.5 text-left text-[12px] font-medium text-ink-3">{c}</th>)}</tr></thead>
            <tbody>{o.rows.map((r, i) => <tr key={i} className="border-t border-line">{r.map((v, j) => <td key={j} className="px-3 py-1.5 tabular">{v}</td>)}</tr>)}</tbody></table>
        </div>
      )}
      {o.note && <p className="text-[12px] text-ink-3">{o.note}</p>}
    </div>
  );
}
