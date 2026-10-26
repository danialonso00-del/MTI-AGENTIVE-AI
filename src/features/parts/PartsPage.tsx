import { ArrowLeft, Box, Download, FileText, PenTool, Search } from 'lucide-react';
import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { PartFeatures } from '@/domain/types';
import { Badge, Card, CardHeader, EmptyState, Input, Segmented, StatePill } from '@/components/ui';
import { PartDrawing } from '@/components/part/PartDrawing';
import { DRAWINGS, type DrawingSpec } from '@/fixtures/drawings';
import { MATERIALS } from '@/fixtures/manufacturing';
import { partVolumeCm3, routeFor } from '@/services/estimation/rules';
import { useStudio } from '@/store/useStudio';
import { cx, dateEs, num, numSmart } from '@/lib/format';

const PartViewer3D = lazy(() => import('@/components/part/PartViewer3D'));

interface PartEntry { pn: string; name: string; customer: string; revisions: { rev: string; date: string; features: PartFeatures; spec?: DrawingSpec }[]; family: string }

function useParts(): PartEntry[] {
  const requests = useStudio((s) => s.requests);
  return useMemo(() => {
    const map = new Map<string, PartEntry>();
    for (const spec of Object.values(DRAWINGS)) {
      const e = map.get(spec.partNumber) ?? { pn: spec.partNumber, name: spec.partName, customer: spec.customer.replace(' (ficticio)', ''), revisions: [], family: spec.features.family };
      e.revisions.push({ rev: spec.revision, date: spec.revisionDate, features: spec.features, spec });
      map.set(spec.partNumber, e);
    }
    for (const r of requests) {
      for (const rv of r.revisions) {
        const e = map.get(r.partNumber) ?? { pn: r.partNumber, name: r.partName, customer: r.customer.company, revisions: [], family: rv.features.family };
        if (!e.revisions.some((x) => x.rev === rv.revision)) e.revisions.push({ rev: rv.revision, date: rv.receivedAt.slice(0, 10), features: rv.features });
        map.set(r.partNumber, e);
      }
    }
    return [...map.values()].map((e) => ({ ...e, revisions: e.revisions.sort((a, b) => a.rev.localeCompare(b.rev)) })).sort((a, b) => a.pn.localeCompare(b.pn));
  }, [requests]);
}

export default function PartsPage() {
  const { pn } = useParams();
  const parts = useParts();
  if (pn) {
    const p = parts.find((x) => x.pn === pn);
    return p ? <PartDetail part={p} /> : <div className="p-8"><EmptyState title="Pieza no encontrada" action={<Link to="/piezas" className="text-info underline">Volver</Link>} /></div>;
  }
  return <PartList parts={parts} />;
}

function PartList({ parts }: { parts: PartEntry[] }) {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const list = parts.filter((p) => `${p.pn} ${p.name} ${p.customer}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-[#8a6100]">Ingeniería · Lectura CAD y extracción técnica</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight md:text-[32px]">Piezas y planos</h1>
          <p className="mt-1 max-w-2xl text-[14.5px] text-ink-3">Biblioteca técnica: cada pieza con sus revisiones, plano, modelo, rasgos extraídos y las ofertas en las que aparece.</p>
        </div>
        <div className="relative w-full max-w-[320px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar referencia, pieza o cliente" className="pl-9" aria-label="Buscar piezas" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {list.map((p) => {
          const last = p.revisions.at(-1)!;
          return (
            <button key={p.pn} onClick={() => nav(`/piezas/${p.pn}`)} className="group overflow-hidden rounded-2xl bg-white text-left shadow-[var(--shadow-card)] ring-1 ring-line transition-[box-shadow,transform] hover:-translate-y-0.5 hover:ring-gold/50">
              <div className="tech-grid-light relative h-[170px] bg-[#f6f8fb] p-2">
                {last.spec ? <PartDrawing spec={last.spec} className="h-full w-full rounded-md" /> : <div className="flex h-full items-center justify-center text-[12.5px] text-ink-3"><Box className="mr-1.5 size-4" />Rasgos introducidos manualmente</div>}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2"><span className="font-mono text-[13px] font-semibold">{p.pn}</span><Badge tone="neutral">Rev. {last.rev}{p.revisions.length > 1 ? ` · ${p.revisions.length} rev.` : ''}</Badge></div>
                <div className="mt-1 text-[15px] font-semibold">{p.name}</div>
                <div className="text-[12.5px] text-ink-3">{p.customer} · {p.family === 'torneado' ? 'Torneado' : 'Prismático fresado'} · {last.features.lengthMm}×{last.features.widthMm}×{last.features.heightMm} mm</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PartDetail({ part }: { part: PartEntry }) {
  const [rev, setRev] = useState(part.revisions.at(-1)!.rev);
  const [view, setView] = useState<'plano' | '3d'>('plano');
  const requests = useStudio((s) => s.requests).filter((r) => r.partNumber === part.pn);
  const r = part.revisions.find((x) => x.rev === rev)!;
  const f = r.features;
  const material = requests[0]?.draft.material ?? null;
  const rows: [string, string][] = [
    ['Familia', f.family === 'torneado' ? 'Torneado' : 'Prismático fresado'],
    ['Envolvente', `${f.lengthMm} × ${f.widthMm} × ${f.heightMm} mm`],
    ['Bruto', `${f.blankMm.length} × ${f.blankMm.width} × ${f.blankMm.height} mm`],
    ['Bolsillo', f.pocket ? `${f.pocket.lengthMm} × ${f.pocket.widthMm} × ${f.pocket.depthMm} mm` : '—'],
    ['Taladros', `${f.holes.count} × Ø${numSmart(f.holes.diameterMm)}${f.holes.fit ? ` ${f.holes.fit}` : ''}`],
    ['Cotas críticas', String(f.criticalDims)],
    ['Volumen', `${num(partVolumeCm3(f), 1)} cm³`],
    ['Ruta prevista', routeFor(f).join(' → ')],
  ];
  return (
    <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6">
      <Link to="/piezas" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink"><ArrowLeft className="size-3.5" /> Piezas y planos</Link>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div><div className="font-mono text-[13px] text-ink-3">{part.pn}</div><h1 className="text-[26px] font-semibold tracking-tight">{part.name}</h1><p className="text-[13.5px] text-ink-3">{part.customer}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Revisión" value={rev} onChange={setRev} options={part.revisions.map((x) => ({ value: x.rev, label: `Rev. ${x.rev}` }))} />
          <Segmented label="Vista" value={view} onChange={setView} options={[{ value: 'plano', label: 'Plano' }, { value: '3d', label: 'Modelo 3D' }]} />
        </div>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden">
          {view === 'plano' ? (r.spec ? <div className="bg-canvas p-4"><PartDrawing spec={r.spec} className="w-full rounded-lg shadow-sm ring-1 ring-line" /></div> : <EmptyState icon={<PenTool />} title="Sin plano">Esta revisión se dio de alta con rasgos manuales.</EmptyState>) : (
            <div className="relative h-[520px]"><Suspense fallback={<div className="skeleton h-full" />}><PartViewer3D features={f} material={material} highlight={null} /></Suspense><span className="absolute left-3 top-3 rounded-full bg-navy/80 px-2.5 py-0.5 text-[12px] text-secondary">Modelo de ejemplo generado desde rasgos</span></div>
          )}
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Rasgos extraídos" subtitle={`Rev. ${rev} · ${dateEs(r.date)}`} />
            <dl className="divide-y divide-line text-[13px]">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3 px-4 py-2"><dt className="text-ink-3">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}</dl>
          </Card>
          {r.spec && (
            <Card>
              <CardHeader title="Archivos" />
              <div className="space-y-2 p-4">
                {[['pdf', <FileText key="f" />], ['dxf', <PenTool key="d" />]].map(([ext, icon]) => (
                  <a key={ext as string} href={`/demo-assets/${part.pn}_rev${rev}.${ext}`} download className="flex items-center gap-2.5 rounded-xl bg-canvas px-3 py-2 text-[13px] ring-1 ring-line hover:ring-gold/50">
                    <span className="text-ink-3 [&>svg]:size-4">{icon}</span><span className="flex-1 font-mono">{part.pn}_rev{rev}.{ext as string}</span><Download className="size-4 text-ink-3" />
                  </a>
                ))}
                <p className="text-[12px] text-ink-3">Material del cajetín: {r.spec.materialText} · {r.spec.generalTolerance}</p>
              </div>
            </Card>
          )}
          <Card>
            <CardHeader title="Ofertas relacionadas" />
            {requests.length === 0 ? <p className="px-4 py-3 text-[13px] text-ink-3">Sin ofertas.</p> : (
              <ul className="divide-y divide-line">{requests.map((q) => (
                <li key={q.id}><Link to={`/fabricacion/${q.id}`} className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-gold/[0.04]"><span className="text-[13px]"><span className="font-mono text-ink-3">{q.ref}</span> · {q.draft.quantity} uds · {q.draft.material ? MATERIALS[q.draft.material].shortName : 'sin material'}</span><StatePill state={q.state} /></Link></li>
              ))}</ul>
            )}
          </Card>
        </div>
      </div>
      {part.revisions.length > 1 && (
        <Card className="mt-4">
          <CardHeader title="Historial de revisiones" />
          <ol className="divide-y divide-line">{[...part.revisions].reverse().map((x) => <li key={x.rev} className={cx('flex items-center gap-3 px-4 py-2.5 text-[13.5px]', x.rev === rev && 'bg-gold/[0.05]')}><span className="font-mono font-semibold">Rev. {x.rev}</span><span className="text-ink-3">{dateEs(x.date)}</span><span className="flex-1 text-ink-2">{x.spec?.revisionHistory.find((h) => h.rev === x.rev)?.text ?? 'Alta manual'}</span></li>)}</ol>
        </Card>
      )}
    </div>
  );
}
