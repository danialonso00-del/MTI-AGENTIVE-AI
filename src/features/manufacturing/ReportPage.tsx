import { Printer } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MtiLogo } from '@/components/layout/Brand';
import { PartDrawing } from '@/components/part/PartDrawing';
import { DRAWINGS } from '@/fixtures/drawings';
import { MATERIALS } from '@/fixtures/manufacturing';
import { findComparables } from '@/services/estimation/comparables';
import { useStudio } from '@/store/useStudio';
import { dateTimeEs, eur, num, numSmart } from '@/lib/format';
import { FIELD_STATUS_LABEL } from './StepOutput';

export default function ReportPage() {
  const { reqId, versionId } = useParams();
  const req = useStudio((s) => s.requests.find((r) => r.id === reqId));
  const v = req?.versions.find((x) => x.id === versionId);
  useEffect(() => { if (req && v) document.title = `Informe ${req.ref} v${v.number}`; }, [req, v]);
  if (!req || !v) return <div className="p-10">Versión no encontrada. <Link to="/fabricacion" className="text-info underline">Volver</Link></div>;
  const r = v.result;
  const approvalValid = req.approval?.versionId === v.id && !req.approval.invalidatedAt;
  const spec = DRAWINGS[`${req.partNumber}:${v.revision}`];
  const comps = findComparables(v.inputs.features, v.inputs.material, v.quantity).filter((c) => c.included);
  const th = 'border-b border-[#cfd7e3] px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b]';
  const td = 'border-b border-[#e3e8ef] px-2 py-1.5';
  return (
    <div className="min-h-full bg-[#e9edf3] py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between">
        <Link to={`/fabricacion/${req.id}/versiones`} className="text-[13px] text-ink-3 hover:text-ink">← Volver al expediente</Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-[10px] bg-gold px-4 py-2 text-[14px] font-semibold text-navy hover:bg-gold-light"><Printer className="size-4" /> Imprimir / Guardar PDF</button>
      </div>
      <article className="mx-auto max-w-[210mm] bg-white px-[14mm] py-[12mm] text-[12.5px] leading-relaxed text-ink shadow-xl print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <header className="flex items-start justify-between border-b-2 border-navy pb-4">
          <div>
            <div className="rounded-md bg-navy px-3 py-2"><MtiLogo height={18} /></div>
            <h1 className="mt-3 text-[22px] font-semibold tracking-tight">Informe de estimación</h1>
            <p className="text-[13px] text-ink-3">{req.ref} · {req.partNumber} {req.partName} · rev. {v.revision}</p>
          </div>
          <div className="text-right text-[11.5px] text-ink-3">
            <div className="inline-block rounded bg-[#fdf3e2] px-2 py-0.5 font-semibold text-[#b45309]">Modo demo · datos de ejemplo</div>
            <div className="mt-2">Versión <b className="text-ink">v{v.number}</b> · {dateTimeEs(v.createdAt)}</div>
            <div>Hash de inputs <span className="font-mono text-ink">{v.inputHash}</span></div>
            <div>Datasets {v.inputs.datasetVersion}</div>
            <div className="mt-1">{v.approval ? (approvalValid ? `Aprobada por ${v.approval.approvedBy}` : 'Aprobación anulada por cambios posteriores') : 'Sin aprobar'}</div>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-6">
          <div>
            <h2 className="mb-1.5 text-[13px] font-semibold">Cliente y requisitos</h2>
            <table className="w-full"><tbody>
              <tr><td className={td}>Cliente</td><td className={td}>{req.customer.company} · {req.customer.contact}</td></tr>
              <tr><td className={td}>Cantidad</td><td className={td}>{v.quantity} uds</td></tr>
              <tr><td className={td}>Material</td><td className={td}>{v.inputs.material ? MATERIALS[v.inputs.material].name : '—'}</td></tr>
              <tr><td className={td}>Acabado</td><td className={td}>{v.inputs.finish ?? '—'}</td></tr>
              {req.fields.filter((f) => ['tolerance', 'dueDate'].includes(f.key)).map((f) => <tr key={f.key}><td className={td}>{f.label}</td><td className={td}>{f.value ?? '—'} <span className="text-ink-3">({FIELD_STATUS_LABEL[f.status].toLowerCase()})</span></td></tr>)}
            </tbody></table>
          </div>
          <div>{spec && <PartDrawing spec={spec} className="w-full rounded border border-[#e3e8ef]" />}</div>
        </section>

        <section className="mt-5">
          <h2 className="mb-1.5 text-[13px] font-semibold">Operaciones (ruta serial simplificada)</h2>
          <table className="w-full tabular">
            <thead><tr><th className={th}>Operación</th><th className={th}>Máquina</th><th className={`${th} text-right`}>Prep. (min)</th><th className={`${th} text-right`}>Ciclo base</th><th className={`${th} text-right`}>Factor</th><th className={`${th} text-right`}>Ciclo corr.</th><th className={`${th} text-right`}>Total (min)</th><th className={`${th} text-right`}>Coste</th></tr></thead>
            <tbody>{r.operations.map((o) => <tr key={o.id}><td className={td}>{o.name}{o.method === 'manual' && ' *'}</td><td className={`${td} font-mono`}>{o.machineId}</td><td className={`${td} text-right`}>{numSmart(o.setupMin, 2)}</td><td className={`${td} text-right`}>{num(o.cycleMin, 2)}</td><td className={`${td} text-right`}>{num(o.correctionFactor, 2)}</td><td className={`${td} text-right`}>{num(o.correctedCycleMin, 2)}</td><td className={`${td} text-right`}>{numSmart(o.totalMin, 2)}</td><td className={`${td} text-right`}>{eur(o.costEur)}</td></tr>)}</tbody>
            <tfoot><tr className="font-semibold"><td className={td} colSpan={2}>Total</td><td className={`${td} text-right`}>{numSmart(r.setupTotalMin, 2)}</td><td className={`${td} text-right`}>{num(r.cycleBaseTotalMin, 2)}</td><td className={td} /><td className={`${td} text-right`}>{num(r.cycleCorrectedTotalMin, 2)}</td><td className={`${td} text-right`}>{numSmart(r.estimatedLotMin, 2)}</td><td className={`${td} text-right`}>{eur(r.cost.transformationEur)}</td></tr></tfoot>
          </table>
          {r.operations.some((o) => o.method === 'manual') && <p className="mt-1 text-[11px] text-ink-3">* Ajuste manual: {r.operations.filter((o) => o.override).map((o) => `${o.name}: «${o.override!.reason}» (previo ${numSmart(o.override!.previous.totalMin, 1)} min)`).join(' · ')}</p>}
        </section>

        <section className="mt-5 grid grid-cols-3 gap-3">
          {[
            ['Tiempo estimado del lote', `${numSmart(r.estimatedLotMin, 2)} min (${num(r.estimatedLotMin / 60, 3)} h)`, `Base por reglas ${numSmart(r.baseLotMin, 1)} min · ${num(r.perPieceMin, 2)} min/pieza imputados`],
            ['Horas de trabajo humano', `${num(r.laborHours, 2)} h`, 'Distinto de la ocupación de máquina'],
            ['Plazo calendario orientativo', `${r.leadTime.minDays}–${r.leadTime.maxDays} días hábiles`, 'Requiere planificación real'],
          ].map(([k, v1, s]) => <div key={k} className="rounded-lg border border-[#e3e8ef] p-3"><div className="text-[11px] text-ink-3">{k}</div><div className="text-[15px] font-semibold">{v1}</div><div className="text-[11px] text-ink-3">{s}</div></div>)}
        </section>
        <p className="mt-1.5 text-[11px] text-ink-3">Banda de escenario de ejemplo ±15 %: {numSmart(r.bandMin[0], 1)}–{numSmart(r.bandMin[1], 1)} min. No es un intervalo estadístico calibrado.</p>

        <section className="mt-5 grid grid-cols-2 gap-6">
          <div>
            <h2 className="mb-1.5 text-[13px] font-semibold">Coste y precio (EUR, sin IVA)</h2>
            <table className="w-full tabular"><tbody>
              {r.cost.lines.map((l) => <tr key={l.label}><td className={td}>{l.label}<div className="text-[10.5px] text-ink-3">{l.detail}</div></td><td className={`${td} text-right`}>{eur(l.amountEur)}</td></tr>)}
              <tr className="font-semibold"><td className={td}>Coste total</td><td className={`${td} text-right`}>{eur(r.cost.totalCostEur)}</td></tr>
              <tr><td className={td}>{r.cost.ruleText}</td><td className={`${td} text-right`}>{eur(r.cost.priceEur)}</td></tr>
              <tr className="font-semibold"><td className={td}>Precio de oferta ({eur(r.cost.commercialUnitEur)}/ud × {v.quantity})</td><td className={`${td} text-right`}>{eur(r.cost.commercialTotalEur)}</td></tr>
            </tbody></table>
          </div>
          <div>
            <h2 className="mb-1.5 text-[13px] font-semibold">Comparables del histórico (sintético)</h2>
            <ul className="space-y-0.5">{comps.length ? comps.map((c) => <li key={c.job.ref}>{c.job.ref} · {c.job.partName} · {c.job.quantity} uds · similitud {num(c.score, 2)}</li>) : <li>Sin comparables: estimación solo por reglas.</li>}</ul>
            <h2 className="mb-1.5 mt-3 text-[13px] font-semibold">Supuestos</h2>
            <ul className="space-y-0.5 text-[11.5px]">{[...r.assumptions, ...r.leadTime.assumptions].map((a) => <li key={a}>· {a}</li>)}</ul>
          </div>
        </section>
        <footer className="mt-6 border-t border-[#e3e8ef] pt-3 text-[10.5px] text-ink-3">
          Generado por MTI Agentive AI Studio en modo demo. Cifras, clientes y datasets ficticios para demostrar relaciones; no son resultados de clientes ni métricas medidas.
        </footer>
      </article>
    </div>
  );
}
