import { Box, GitCompare, Info, Layers } from 'lucide-react';
import { lazy, Suspense, useMemo, useState } from 'react';
import type { ManufacturingRequest, OperationKind, PartFeatures } from '@/domain/types';
import { Badge, Card, CardHeader, Segmented } from '@/components/ui';
import { PartDrawing } from '@/components/part/PartDrawing';
import { DRAWINGS } from '@/fixtures/drawings';
import { MATERIALS, OPERATION_LABEL } from '@/fixtures/manufacturing';
import { estimate } from '@/services/estimation/engine';
import { partVolumeCm3, routeFor } from '@/services/estimation/rules';
import { cx, num, numSmart } from '@/lib/format';
import { useMotionOff } from '@/lib/useMotion';
import { useEstimate } from '../hooks';

const PartViewer3D = lazy(() => import('@/components/part/PartViewer3D'));

const OP_ZONE: Record<OperationKind, string> = {
  corte: 'Bruto completo (envolvente de partida)',
  fresado: 'Contorno exterior',
  bolsillo: 'Bolsillo central',
  taladrado: 'Taladros pasantes',
  torneado: 'Superficies de revolución',
  desbarbado: 'Aristas y bordes de taladros',
  inspeccion: 'Cotas críticas y envolvente',
};

export default function PartTab({ req }: { req: ManufacturingRequest }) {
  const r = useEstimate(req)!;
  const motionOff = useMotionOff();
  const [op, setOp] = useState<OperationKind | null>('bolsillo');
  const [view, setView] = useState<'3d' | 'plano'>('3d');
  const f = req.draft.features;
  const kinds = routeFor(f);
  const spec = DRAWINGS[`${req.partNumber}:${req.draft.revision}`];
  const anchor = op === 'bolsillo' ? 'dims.pocket' : op === 'taladrado' ? 'dims.holes' : op === 'inspeccion' ? 'notes' : null;
  const opRow = r.operations.find((o) => o.kind === op);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="overflow-hidden">
          <CardHeader title={`${req.partNumber} · rev. ${req.draft.revision}`} icon={<Box />}
            subtitle={view === '3d' ? 'Modelo de ejemplo generado desde rasgos (sustituye al STEP del cliente)' : spec ? 'Plano de ejemplo · zonas resaltadas según la operación' : 'Sin plano asociado'}
            actions={<Segmented size="sm" label="Vista" value={view} onChange={setView} options={[{ value: '3d', label: 'Modelo 3D' }, { value: 'plano', label: 'Plano' }]} />} />
          {view === '3d' ? (
            <div className="relative h-[460px] md:h-[540px]">
              <Suspense fallback={<div className="skeleton h-full" />}>
                <PartViewer3D features={f} material={req.draft.material} highlight={op} autoRotate={!motionOff} />
              </Suspense>
              <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
                <Badge tone="dark">Modelo de ejemplo</Badge>
                {op && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[12px] font-medium text-gold-light ring-1 ring-gold/40">Asociación de ejemplo: {OP_ZONE[op]}</span>}
              </div>
              <div className="pointer-events-none absolute bottom-3 left-3 text-[12px] text-muted">Arrastra para rotar · rueda para acercar</div>
            </div>
          ) : spec ? (
            <div className="bg-canvas p-4"><PartDrawing spec={spec} highlight={anchor} className="w-full rounded-lg shadow-sm ring-1 ring-line" /></div>
          ) : (
            <div className="p-10 text-center text-[14px] text-ink-3">Esta solicitud no tiene plano de ejemplo: los rasgos se introdujeron manualmente.</div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Operaciones" icon={<Layers />} subtitle="Selecciona para resaltar zona y fila" />
            <ul className="p-1.5">
              {kinds.map((k) => {
                const row = r.operations.find((o) => o.kind === k);
                return (
                  <li key={k}>
                    <button onClick={() => setOp(op === k ? null : k)} aria-pressed={op === k} className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors', op === k ? 'bg-gold/12 ring-1 ring-gold/40' : 'hover:bg-ink/[0.03]')}>
                      <span className={cx('size-2.5 rounded-full', op === k ? 'bg-gold' : 'bg-ink/15')} />
                      <span className="flex-1 text-[13.5px] font-medium">{OPERATION_LABEL[k]}</span>
                      <span className="text-[12.5px] tabular text-ink-3">{row ? `${numSmart(row.totalMin, 1)} min` : '—'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {opRow && (
              <div className="border-t border-line px-4 py-3 text-[12.5px] text-ink-2">
                <div className="font-mono text-[12px]">{opRow.ruleText}</div>
                <div className="mt-1 text-ink-3">{opRow.machineId} · prep. {numSmart(opRow.setupMin)} min · ciclo corregido {num(opRow.correctedCycleMin, 2)} min/ud</div>
              </div>
            )}
          </Card>
          <FeaturesCard f={f} material={req.draft.material} />
          <p className="flex gap-2 px-1 text-[12.5px] text-ink-3"><Info className="mt-0.5 size-4 shrink-0" />La geometría no determina por sí sola material, proceso ni estrategia. Integración futura: worker con Open CASCADE para convertir STEP y extraer propiedades verificables.</p>
        </div>
      </div>
      {req.revisions.length > 1 && <RevisionCompare req={req} />}
    </div>
  );
}

function FeaturesCard({ f, material }: { f: PartFeatures; material: ManufacturingRequest['draft']['material'] }) {
  const vol = partVolumeCm3(f);
  const rows: [string, string][] = [
    ['Familia', f.family === 'torneado' ? 'Torneado' : 'Prismático fresado'],
    ['Envolvente', `${f.lengthMm} × ${f.widthMm} × ${f.heightMm} mm`],
    ['Bruto', `${f.blankMm.length} × ${f.blankMm.width} × ${f.blankMm.height} mm`],
    ['Bolsillo', f.pocket ? `${f.pocket.lengthMm} × ${f.pocket.widthMm} × ${f.pocket.depthMm} mm` : '—'],
    ['Taladros', `${f.holes.count} × Ø${numSmart(f.holes.diameterMm)}${f.holes.fit ? ` ${f.holes.fit}` : ''}`],
    ['Cotas críticas', String(f.criticalDims)],
    ['Volumen pieza', `${num(vol, 1)} cm³`],
    ['Masa', material ? `${num((vol * MATERIALS[material].densityGcm3) / 1000, 3)} kg (${MATERIALS[material].shortName})` : 'Sin material'],
  ];
  return (
    <Card>
      <CardHeader title="Rasgos" subtitle="Calculados desde el modelo de ejemplo" />
      <dl className="divide-y divide-line text-[13px]">
        {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3 px-4 py-2"><dt className="text-ink-3">{k}</dt><dd className="text-right font-medium tabular">{v}</dd></div>)}
      </dl>
    </Card>
  );
}

function RevisionCompare({ req }: { req: ManufacturingRequest }) {
  const [a, b] = [req.revisions.at(-2)!, req.revisions.at(-1)!];
  const ea = useMemo(() => estimate({ ...req.draft, revision: a.revision, features: a.features, overrides: [] }), [req.draft, a]);
  const eb = useMemo(() => estimate({ ...req.draft, revision: b.revision, features: b.features, overrides: [] }), [req.draft, b]);
  const diff = (x: string, y: string) => (x !== y ? 'font-semibold text-[#8a6100]' : '');
  const rows: [string, string, string][] = [
    ['Bolsillo', a.features.pocket ? `${a.features.pocket.lengthMm}×${a.features.pocket.widthMm}×${a.features.pocket.depthMm}` : '—', b.features.pocket ? `${b.features.pocket.lengthMm}×${b.features.pocket.widthMm}×${b.features.pocket.depthMm}` : '—'],
    ['Taladros', `${a.features.holes.count} × Ø${a.features.holes.diameterMm}`, `${b.features.holes.count} × Ø${b.features.holes.diameterMm}`],
    ['Cotas críticas', String(a.features.criticalDims), String(b.features.criticalDims)],
    ['Tiempo lote', `${numSmart(ea.estimatedLotMin, 1)} min`, `${numSmart(eb.estimatedLotMin, 1)} min`],
    ['Precio unitario', `${num(ea.cost.commercialUnitEur, 2)} €`, `${num(eb.cost.commercialUnitEur, 2)} €`],
  ];
  return (
    <Card>
      <CardHeader title={`Comparación rev. ${a.revision} → rev. ${b.revision}`} icon={<GitCompare />} subtitle="Mismos parámetros comerciales; la rev. anterior y sus versiones se conservan" />
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr_320px]">
        {[a, b].map((rv) => {
          const spec = DRAWINGS[`${req.partNumber}:${rv.revision}`];
          return spec ? <div key={rv.revision}><div className="mb-1.5 text-[12.5px] font-medium text-ink-3">Rev. {rv.revision}</div><PartDrawing spec={spec} highlight="dims.pocket" className="w-full rounded-lg ring-1 ring-line" /></div> : null;
        })}
        <table className="h-fit text-[13px]">
          <thead><tr className="text-[12px] text-ink-3"><th className="py-1 text-left font-medium" /><th className="py-1 text-right font-medium">Rev. {a.revision}</th><th className="py-1 text-right font-medium">Rev. {b.revision}</th></tr></thead>
          <tbody>{rows.map(([k, x, y]) => <tr key={k} className="border-t border-line"><td className="py-1.5 text-ink-3">{k}</td><td className="py-1.5 text-right tabular">{x}</td><td className={cx('py-1.5 text-right tabular', diff(x, y))}>{y}</td></tr>)}</tbody>
        </table>
      </div>
      {b.changes && <div className="border-t border-line px-4 py-3 text-[12.5px] text-ink-2">{b.changes.map((c) => <div key={c}>· {c}</div>)}</div>}
    </Card>
  );
}
