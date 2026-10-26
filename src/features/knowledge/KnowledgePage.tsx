import { Brain, ChevronDown, Search } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import type { MaterialId, OperationKind } from '@/domain/types';
import { Badge, Button, Card, Input, Select } from '@/components/ui';
import { DRAWINGS } from '@/fixtures/drawings';
import { DATASET, HISTORICAL_JOBS, MACHINES, MATERIALS, OPERATION_LABEL, FEATURES_SP118_B } from '@/fixtures/manufacturing';
import { correctionFactors, findComparables } from '@/services/estimation/comparables';
import { applyRule, routeFor } from '@/services/estimation/rules';
import { useMotionOff } from '@/lib/useMotion';
import { cx, dateEs, num, numSmart } from '@/lib/format';
import { BrainCloud, type CloudDoc } from '../demo/BrainCloud';

const DOCS: { id: string; title: string; kind: string; version: string; summary: string }[] = [
  { id: 'iso2768', title: 'ISO 2768-1/-2 · Tolerancias generales', kind: 'Norma', version: 'resumen interno 2024', summary: 'Clases f/m/c/v para cotas sin tolerancia y tolerancias geométricas K/L.' },
  { id: 'anod', title: 'Especificación de anodizado', kind: 'Proveedor', version: 'v3 · 2026-02', summary: 'Natural y negro, 10–20 µm, plazo 4 días, enmascarado de taladros H7.' },
  { id: 'tools', title: 'Catálogo de herramientas de fresado', kind: 'Catálogo', version: '2026.1', summary: 'Diámetros mínimos y radios interiores alcanzables por máquina.' },
  { id: 'proc-ofertas', title: 'Procedimiento de ofertas', kind: 'Procedimiento', version: 'PO-07 rev. 4', summary: 'Quién aprueba, márgenes por tipo de cliente, validez de 30 días.' },
  { id: 'cert31', title: 'Certificados de material 3.1', kind: 'Calidad', version: 'IT-12', summary: 'Requisitos de trazabilidad cuando el cliente pide certificado 3.1.' },
];

export default function KnowledgePage() {
  const [tab, setTab] = useState<'hist' | 'rules' | 'mat' | 'docs'>('hist');
  return (
    <div className="mx-auto max-w-[1680px] space-y-5 px-4 py-5 md:px-6">
      <div>
        <p className="text-[13px] font-medium text-[#8a6100]">Ingeniería · C07 Conocimiento</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight md:text-[32px]">El cerebro de la empresa</h1>
        <p className="mt-1 max-w-3xl text-[14.5px] text-ink-3">Histórico de trabajos, reglas de proceso, materiales y documentación. Los agentes consultan aquí con referencias, y tú también puedes.</p>
      </div>
      <BrainQuery />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-1 border-b border-line px-3 pt-2">
          {([['hist', `Histórico de trabajos (${HISTORICAL_JOBS.length})`], ['rules', 'Reglas de proceso'], ['mat', 'Materiales'], ['docs', `Documentos (${DOCS.length})`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={cx('relative px-3 py-2.5 text-[13.5px] font-medium', tab === k ? 'text-ink' : 'text-ink-3 hover:text-ink')}>{l}{tab === k && <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-gold" />}</button>
          ))}
        </div>
        {tab === 'hist' && <HistoryTable />}
        {tab === 'rules' && <RulesView />}
        {tab === 'mat' && <MaterialsView />}
        {tab === 'docs' && (
          <ul className="divide-y divide-line">{DOCS.map((d) => <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3"><Badge tone="neutral">{d.kind}</Badge><div className="min-w-0 flex-1"><div className="text-[14px] font-medium">{d.title}</div><div className="text-[12.5px] text-ink-3">{d.summary}</div></div><span className="font-mono text-[12px] text-ink-3">{d.version}</span></li>)}
            <li className="px-4 py-3 text-[12px] text-ink-3">Documentos de ejemplo. En un piloto se indexa el repositorio del cliente (SharePoint, Drive…) con referencias a la fuente.</li>
          </ul>
        )}
      </Card>
    </div>
  );
}

function BrainQuery() {
  const motionOff = useMotionOff();
  const specs = Object.values(DRAWINGS);
  const [partKey, setPartKey] = useState('SP-118:B');
  const [mat, setMat] = useState<MaterialId>('al-6082-t6');
  const [qty, setQty] = useState(50);
  const [t, setT] = useState(0);
  const [qStart, setQStart] = useState<number | null>(null);
  const [query, setQuery] = useState<{ key: string; mat: MaterialId; qty: number } | null>(null);
  useEffect(() => { const iv = setInterval(() => setT((x) => x + 60), 60); return () => clearInterval(iv); }, []);
  const spec = DRAWINGS[query?.key ?? partKey];
  const comps = useMemo(() => (query ? findComparables(DRAWINGS[query.key].features, query.mat, query.qty) : []), [query]);
  const docs: CloudDoc[] = [
    ...HISTORICAL_JOBS.map((j) => ({ id: j.ref, label: j.partName, sub: `${j.ref} · ${MATERIALS[j.material].shortName}`, kind: 'job' as const })),
    { id: 'ds-rules', label: 'Reglas de proceso', sub: DATASET.rules.version, kind: 'dataset' },
    { id: 'ds-mat', label: 'Tabla de materiales', sub: DATASET.materials.version, kind: 'dataset' },
    { id: 'n-iso', label: 'ISO 2768', sub: 'Norma', kind: 'norma' },
  ];
  const base = qStart ?? 1e12;
  const local = motionOff ? (qStart !== null ? 1e12 : 0) : t;
  const f = spec.features;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-end gap-3 border-b border-line px-4 py-3">
        <div className="mr-auto flex items-center gap-2"><Brain className="size-5 text-[#8a6100]" /><div><div className="text-[14px] font-semibold">Consultar el cerebro</div><div className="text-[12.5px] text-ink-3">Misma búsqueda de comparables que usa el agente C07 en cada oferta</div></div></div>
        <label className="w-[240px] text-[12px] text-ink-3">Pieza<Select value={partKey} onChange={(e) => setPartKey(e.target.value)} className="mt-1 h-9 py-1">{specs.map((s) => <option key={s.id} value={s.id}>{s.partNumber} rev. {s.revision} · {s.partName}</option>)}</Select></label>
        <label className="w-[150px] text-[12px] text-ink-3">Material<Select value={mat} onChange={(e) => setMat(e.target.value as MaterialId)} className="mt-1 h-9 py-1">{Object.values(MATERIALS).map((m) => <option key={m.id} value={m.id}>{m.shortName}</option>)}</Select></label>
        <label className="w-[90px] text-[12px] text-ink-3">Lote<Input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="mt-1 h-9 py-1" /></label>
        <Button variant="primary" icon={<Search />} disabled={!(qty > 0)} disabledReason="Lote > 0" onClick={() => { setQuery({ key: partKey, mat, qty }); setQStart(t); }}>Consultar</Button>
      </div>
      <div className="tech-grid p-4">
        <BrainCloud t={local} docs={docs}
          selected={comps.filter((c) => c.included).map((c) => c.job.ref)}
          rejected={comps.filter((c) => !c.included && c.exclusionReason && !c.exclusionReason.startsWith('Similitud baja')).map((c) => ({ id: c.job.ref, reason: c.exclusionReason! }))}
          query={query ? `${spec.partNumber} · ${f.family === 'torneado' ? 'torneado' : 'prismático'} · ${MATERIALS[query.mat].shortName} · ${query.qty} uds` : ''}
          centerLabel="C07 · Conocimiento" centerSub={`${docs.length} documentos indexados (fixture)`}
          scanAt={base + 200} matchAt={base + 2600} flyAt={base + 3600}
          selectedTitle="Comparables" rejectedTitle="Descartados con motivo"
          renderSelected={(d) => { const c = comps.find((x) => x.job.ref === d.id)!; return <div className="flex items-center justify-between gap-2"><div><div className="text-[12.5px] font-semibold text-white">{c.job.partName}</div><div className="text-[11.5px] text-secondary">{c.job.ref} · {c.reasons[0]}</div></div><span className="font-mono text-[12px] text-gold-light">{num(c.score, 2)}</span></div>; }}
          footer={query && comps.filter((c) => c.included).length === 0 && t > base + 2600 ? <div className="rounded-2xl bg-[#f59e0b]/12 p-3 text-[12.5px] text-[#fcd34d] ring-1 ring-[#f59e0b]/40">Sin comparables suficientes: el motor estimaría solo con reglas y lo indicaría como supuesto.</div> : null}
        />
      </div>
    </Card>
  );
}

function HistoryTable() {
  const [open, setOpen] = useState<string | null>(null);
  const [fam, setFam] = useState('');
  const jobs = HISTORICAL_JOBS.filter((j) => !fam || j.family === fam);
  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3 text-[12.5px] text-ink-3">
        <Select value={fam} onChange={(e) => setFam(e.target.value)} className="h-8 max-w-[200px] py-1 text-[13px]" aria-label="Familia"><option value="">Todas las familias</option><option value="prismatico-fresado">Prismático fresado</option><option value="torneado">Torneado</option></Select>
        {DATASET.history.label} · v{DATASET.history.version} ({dateEs(DATASET.history.date)})
      </div>
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full min-w-[760px] text-[13.5px]">
          <thead className="bg-canvas text-[12px] text-ink-3"><tr><th className="px-4 py-2 text-left font-medium">Trabajo</th><th className="px-3 py-2 text-left font-medium">Familia</th><th className="px-3 py-2 text-left font-medium">Material</th><th className="px-3 py-2 text-left font-medium">Máquina</th><th className="px-3 py-2 text-right font-medium">Lote</th><th className="px-3 py-2 text-right font-medium">Real lote</th><th className="w-8" /></tr></thead>
          <tbody>
            {jobs.map((j) => (
              <Fragment key={j.id}>
                <tr onClick={() => setOpen(open === j.id ? null : j.id)} className="cursor-pointer border-t border-line hover:bg-gold/[0.04]">
                  <td className="px-4 py-2.5"><div className="font-medium">{j.partName}</div><div className="font-mono text-[11.5px] text-ink-3">{j.ref} · {dateEs(j.date)}</div></td>
                  <td className="px-3 py-2.5">{j.family === 'torneado' ? 'Torneado' : 'Prismático'}</td>
                  <td className="px-3 py-2.5">{MATERIALS[j.material].shortName}</td>
                  <td className="px-3 py-2.5 font-mono text-[12.5px]">{j.machineId}</td>
                  <td className="px-3 py-2.5 text-right tabular">{j.quantity}</td>
                  <td className="px-3 py-2.5 text-right tabular">{numSmart(j.realLotMin, 1)} min</td>
                  <td className="px-2 text-ink-3"><ChevronDown className={cx('size-4 transition-transform', open === j.id && 'rotate-180')} /></td>
                </tr>
                {open === j.id && (
                  <tr><td colSpan={7} className="bg-canvas/60 px-4 py-3">
                    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{j.ops.map((o) => <div key={o.kind} className="rounded-lg bg-white px-3 py-2 ring-1 ring-line"><div className="text-[12px] text-ink-3">{OPERATION_LABEL[o.kind]}</div><div className="text-[13px] tabular">regla {num(o.ruleCycleMin, 2)} → real {num(o.realCycleMin, 2)}</div><div className="font-mono text-[11.5px] text-[#8a6100]">×{(o.realCycleMin / o.ruleCycleMin).toFixed(3).replace('.', ',')}</div></div>)}</div>
                  </td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RulesView() {
  const kinds: OperationKind[] = ['corte', 'fresado', 'bolsillo', 'taladrado', 'torneado', 'desbarbado', 'inspeccion'];
  const sample = FEATURES_SP118_B;
  const comps = findComparables(sample, 'al-6082-t6', 50);
  const factors = correctionFactors(comps, routeFor(sample));
  return (
    <div className="p-4">
      <p className="mb-3 text-[13px] text-ink-3">{DATASET.rules.label} · v{DATASET.rules.version}. Ejemplo calculado con SP-118 rev. B. Las reglas se calibran con fabricación antes de ofertar en un piloto.</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {kinds.map((k) => {
          const r = applyRule(k, { ...sample, family: k === 'torneado' ? 'torneado' : sample.family, widthMm: k === 'torneado' ? 160 : sample.widthMm });
          const fc = factors[k];
          return (
            <div key={k} className="rounded-xl bg-canvas p-3.5 ring-1 ring-line">
              <div className="flex items-center justify-between"><span className="text-[14px] font-semibold">{OPERATION_LABEL[k]}</span><span className="text-[12px] text-ink-3">prep. {r.setupMin} min</span></div>
              <div className="mt-1.5 font-mono text-[12.5px] text-ink-2">{r.ruleText}</div>
              <div className="mt-1 text-[12px] text-ink-3">Ejemplo: {r.inputsText} → {num(r.cycleMin, 2)} min/ud{fc?.applied ? ` · corrección ×${num(fc.factor, 2)}` : ''}</div>
              <div className="mt-1.5 text-[11.5px] text-ink-3">Máquinas: {MACHINES.filter((m) => m.capabilities.includes(k)).map((m) => m.id).join(', ')}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MaterialsView() {
  const kinds = Object.keys(OPERATION_LABEL) as OperationKind[];
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full min-w-[820px] text-[13.5px]">
        <thead className="bg-canvas text-[12px] text-ink-3"><tr><th className="px-4 py-2 text-left font-medium">Material</th><th className="px-3 py-2 text-right font-medium">Densidad</th><th className="px-3 py-2 text-right font-medium">€/kg</th>{kinds.map((k) => <th key={k} className="px-2 py-2 text-right font-medium">{OPERATION_LABEL[k].split(' ')[0]}</th>)}</tr></thead>
        <tbody>{Object.values(MATERIALS).map((m) => <tr key={m.id} className="border-t border-line"><td className="px-4 py-2.5 font-medium">{m.name}</td><td className="px-3 py-2.5 text-right tabular">{num(m.densityGcm3, 2)}</td><td className="px-3 py-2.5 text-right tabular">{num(m.priceEurKg, 2)}</td>{kinds.map((k) => <td key={k} className={cx('px-2 py-2.5 text-right tabular', m.cycleMultiplier[k] !== 1 && 'text-[#8a6100]')}>×{num(m.cycleMultiplier[k], 2)}</td>)}</tr>)}</tbody>
      </table>
      <p className="px-4 py-3 text-[12px] text-ink-3">Multiplicador del ciclo respecto al aluminio 6082-T6 · {DATASET.materials.label} v{DATASET.materials.version}</p>
    </div>
  );
}
