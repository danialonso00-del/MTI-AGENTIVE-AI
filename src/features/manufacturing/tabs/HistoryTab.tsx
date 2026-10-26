import { CheckCircle2, Database, Info, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ManufacturingRequest } from '@/domain/types';
import { Badge, Card, CardHeader } from '@/components/ui';
import { EvidenceChip } from '@/components/evidence/Evidence';
import { DATASET, MATERIALS, OPERATION_LABEL } from '@/fixtures/manufacturing';
import { correctionFactors, findComparables, MIN_COMPARABLES_FOR_CORRECTION, SIMILARITY_THRESHOLD } from '@/services/estimation/comparables';
import { routeFor } from '@/services/estimation/rules';
import { cx, dateEs, num, numSmart } from '@/lib/format';

export function HistoryTab({ req }: { req: ManufacturingRequest }) {
  const comps = useMemo(() => findComparables(req.draft.features, req.draft.material, req.draft.quantity), [req.draft]);
  const factors = useMemo(() => correctionFactors(comps, routeFor(req.draft.features)), [comps, req.draft.features]);
  const [sel, setSel] = useState<string | null>(comps.find((c) => c.included)?.job.ref ?? null);
  const job = comps.find((c) => c.job.ref === sel)?.job;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
        <Database className="size-4" /> {DATASET.history.label} · v{DATASET.history.version} ({dateEs(DATASET.history.date)}) · umbral de similitud {num(SIMILARITY_THRESHOLD, 2)} · máx. 3 comparables
        <Badge tone="neutral">Recuperación sobre fixture, no sobre el repositorio del cliente</Badge>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="overflow-hidden">
          <CardHeader title="Trabajos históricos" subtitle={`${comps.filter((c) => c.included).length} comparables · ${comps.filter((c) => !c.included).length} descartados con motivo`} />
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[760px] text-[13.5px]">
              <thead className="bg-canvas text-[12px] text-ink-3">
                <tr><th className="px-3 py-2 text-left font-medium">Trabajo</th><th className="px-3 py-2 text-left font-medium">Material</th><th className="px-3 py-2 text-right font-medium">Lote</th><th className="px-3 py-2 text-right font-medium">Real lote</th><th className="px-3 py-2 text-right font-medium">Similitud</th><th className="px-3 py-2 text-left font-medium">Motivo</th></tr>
              </thead>
              <tbody>
                {comps.map((c) => (
                  <tr key={c.job.ref} onClick={() => setSel(c.job.ref)} className={cx('cursor-pointer border-t border-line transition-colors', sel === c.job.ref ? 'bg-gold/[0.07]' : 'hover:bg-ink/[0.02]', !c.included && 'text-ink-3')}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {c.included ? <CheckCircle2 className="size-4 text-ok" /> : <XCircle className="size-4 text-ink-3/60" />}
                        <div><div className={cx('font-medium', c.included && 'text-ink')}>{c.job.partName}</div><div className="font-mono text-[11.5px]">{c.job.ref} · {dateEs(c.job.date)}</div></div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">{MATERIALS[c.job.material].shortName}</td>
                    <td className="px-3 py-2.5 text-right tabular">{c.job.quantity}</td>
                    <td className="px-3 py-2.5 text-right tabular">{numSmart(c.job.realLotMin, 1)} min</td>
                    <td className="px-3 py-2.5 text-right tabular">{c.included || c.score ? num(c.score, 2) : '—'}</td>
                    <td className="max-w-[300px] px-3 py-2.5 text-[12.5px]">{c.included ? c.reasons.join(' · ') : c.exclusionReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Corrector simulado por operación" subtitle={`Mediana de real/regla en comparables (mín. ${MIN_COMPARABLES_FOR_CORRECTION})`} />
            <ul className="divide-y divide-line">
              {Object.values(factors).map((f) => (
                <li key={f.kind} className="px-4 py-2.5">
                  <div className="flex items-center justify-between"><span className="text-[13.5px] font-medium">{OPERATION_LABEL[f.kind]}</span><span className={cx('font-mono text-[13px]', f.applied ? 'text-[#8a6100]' : 'text-ink-3')}>× {num(f.factor, 2)}</span></div>
                  <div className="mt-0.5 text-[12px] text-ink-3">{f.applied ? f.samples.map((s) => `${s.jobRef}: ${s.ratio.toFixed(3).replace('.', ',')}`).join(' · ') : f.note}</div>
                </li>
              ))}
            </ul>
            <p className="flex gap-2 border-t border-line px-4 py-3 text-[12.5px] text-ink-3"><Info className="mt-0.5 size-4 shrink-0" />No es un modelo entrenado. Un ML real requiere separar entrenamiento y evaluación por familia y tiempo, y medir MAE antes de afirmar precisión.</p>
          </Card>
          {job && (
            <Card>
              <CardHeader title={`${job.ref} · ${job.partName}`} subtitle={`${job.features.lengthMm}×${job.features.widthMm}×${job.features.heightMm} mm · ${job.machineId}`} actions={<EvidenceChip id={`ev-hist-${job.ref}`} label="Fuente" />} />
              <table className="w-full text-[13px]">
                <thead className="text-[12px] text-ink-3"><tr><th className="px-4 py-1.5 text-left font-medium">Operación</th><th className="px-2 py-1.5 text-right font-medium">Regla</th><th className="px-2 py-1.5 text-right font-medium">Real</th><th className="px-4 py-1.5 text-right font-medium">Ratio</th></tr></thead>
                <tbody>{job.ops.map((o) => <tr key={o.kind} className="border-t border-line"><td className="px-4 py-1.5">{OPERATION_LABEL[o.kind]}</td><td className="px-2 py-1.5 text-right tabular">{num(o.ruleCycleMin, 2)}</td><td className="px-2 py-1.5 text-right tabular">{num(o.realCycleMin, 2)}</td><td className="px-4 py-1.5 text-right tabular">{(Math.round((o.realCycleMin / o.ruleCycleMin) * 1000) / 1000).toFixed(3).replace('.', ',')}</td></tr>)}</tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
