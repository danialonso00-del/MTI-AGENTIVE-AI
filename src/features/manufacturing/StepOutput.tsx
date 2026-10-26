// Renderiza la salida real de cada paso (estado en vivo o instantánea de un replay).
import { AlertTriangle, ArrowUpRight, CheckCircle2, CircleDashed, FileCheck2, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Contradiction, ErpRecordRef, PartFeatures } from '@/domain/types';
import { Badge } from '@/components/ui';
import { eur, num, numSmart } from '@/lib/format';
import { OPERATION_LABEL } from '@/fixtures/manufacturing';
import { cx } from '@/lib/format';

const FIELD_TONE = { extracted: 'info', confirmed: 'ok', assumed: 'gold', missing: 'warn' } as const;
export const FIELD_STATUS_LABEL = { extracted: 'Extraído', confirmed: 'Confirmado', assumed: 'Supuesto', missing: 'Ausente' } as const;
const CAP_LABEL: Record<string, string> = { fixture_parsed: 'Extracción de ejemplo precalculada', header_read: 'Lectura real de cabecera/entidades', text_read: 'Lectura real de texto', preview_only: 'Solo vista previa', unsupported: 'Formato no soportado' };

type O = Record<string, unknown>;

export function StepOutput({ stepId, outputs, dark }: { stepId: string; outputs?: O; dark?: boolean }) {
  if (!outputs) return <p className={cx('text-[13.5px]', dark ? 'text-muted' : 'text-ink-3')}>Sin salida todavía. Ejecuta el paso para ver su entregable.</p>;
  const t = dark ? 'text-secondary' : 'text-ink-2';
  const box = dark ? 'rounded-xl bg-white/[0.04] ring-1 ring-white/10' : 'rounded-xl bg-canvas ring-1 ring-line';

  switch (stepId) {
    case 'intake': {
      const fields = outputs.fields as { key: string; label: string; value: string | null; status: keyof typeof FIELD_TONE; sources: number }[];
      const atts = outputs.attachments as { fileName: string; capability: string }[];
      const missing = outputs.missing as string[];
      return (
        <div className="space-y-3">
          {missing.length > 0 && (
            <div className="flex gap-2 rounded-xl bg-warn-bg px-3 py-2.5 text-[13.5px] text-warn ring-1 ring-warn/20">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> Requiere dato: {missing.join(', ')}. Se ha preparado una pregunta en borrador; no se completa con suposiciones.
            </div>
          )}
          <div className={cx(box, 'divide-y', dark ? 'divide-white/10' : 'divide-line')}>
            {fields.map((f) => (
              <div key={f.key} className="flex items-center gap-3 px-3 py-2">
                <span className={cx('w-28 shrink-0 text-[12.5px]', dark ? 'text-muted' : 'text-ink-3')}>{f.label}</span>
                <span className={cx('min-w-0 flex-1 truncate text-[13.5px] font-medium', dark ? 'text-white' : 'text-ink')}>{f.value ?? '—'}</span>
                <Badge tone={FIELD_TONE[f.status]}>{FIELD_STATUS_LABEL[f.status]}</Badge>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            {atts.map((a) => (
              <div key={a.fileName} className={cx('flex items-center justify-between gap-2 text-[12.5px]', t)}>
                <span className="truncate font-mono">{a.fileName}</span>
                <span className={dark ? 'text-muted' : 'text-ink-3'}>{CAP_LABEL[a.capability]}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case 'classify': {
      const o = outputs as { intent: string; signals: string[]; discarded: { intent: string; reason: string }[]; plan: string[]; writePolicy: string };
      return (
        <div className="space-y-3 text-[13.5px]">
          <div className={cx(box, 'px-3 py-2.5')}>
            <div className={cx('text-[12px]', dark ? 'text-muted' : 'text-ink-3')}>Intención</div>
            <div className={cx('font-semibold', dark ? 'text-gold-light' : 'text-ink')}>{o.intent}</div>
            <ul className={cx('mt-1.5 space-y-0.5', t)}>{o.signals.map((s) => <li key={s}>· {s}</li>)}</ul>
          </div>
          <div>
            <div className={cx('mb-1 text-[12px]', dark ? 'text-muted' : 'text-ink-3')}>Plan</div>
            <ol className={cx('space-y-1', t)}>{o.plan.map((p, i) => <li key={p} className="flex gap-2"><span className="font-mono text-[11.5px] text-gold">{i + 3}</span>{p}</li>)}</ol>
          </div>
          <div className={cx('text-[12.5px]', dark ? 'text-muted' : 'text-ink-3')}>Descartado: {o.discarded.map((d) => `${d.intent} (${d.reason.toLowerCase()})`).join(' · ')}</div>
          <div className={cx('rounded-lg px-3 py-2 text-[12.5px]', dark ? 'bg-gold/10 text-gold-light' : 'bg-gold/10 text-[#7a5600]')}>{o.writePolicy}</div>
        </div>
      );
    }
    case 'cad': {
      const o = outputs as { features: PartFeatures; volumeCm3: number; massKg: number | null; complexity: { label: string; reasons: string[] }; contradictions: Contradiction[]; materialNote: string; sources: string[] };
      const f = o.features;
      const cells: [string, string][] = [
        ['Envolvente', `${f.lengthMm} × ${f.widthMm} × ${f.heightMm} mm`],
        ['Bolsillo', f.pocket ? `${f.pocket.lengthMm} × ${f.pocket.widthMm} × ${f.pocket.depthMm} mm` : '—'],
        ['Taladros', `${f.holes.count} × Ø${numSmart(f.holes.diameterMm)}${f.holes.fit ? ` ${f.holes.fit}` : ''}`],
        ['Volumen', `${num(o.volumeCm3, 1)} cm³`],
        ['Masa', o.massKg ? `${num(o.massKg, 3)} kg` : 'sin material'],
        ['Complejidad', `${o.complexity.label}${o.complexity.reasons.length ? ` · ${o.complexity.reasons.join(', ')}` : ''}`],
      ];
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {cells.map(([k, v]) => (
              <div key={k} className={cx(box, 'px-3 py-2')}>
                <div className={cx('text-[12px]', dark ? 'text-muted' : 'text-ink-3')}>{k}</div>
                <div className={cx('text-[13.5px] font-medium tabular', dark ? 'text-white' : 'text-ink')}>{v}</div>
              </div>
            ))}
          </div>
          {o.contradictions.map((c) => (
            <div key={c.id} className="flex gap-2 rounded-xl bg-warn-bg px-3 py-2 text-[13px] text-warn ring-1 ring-warn/20"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{c.description}</div>
          ))}
          <p className={cx('text-[12.5px]', dark ? 'text-muted' : 'text-ink-3')}>{o.materialNote}</p>
        </div>
      );
    }
    case 'history': {
      const o = outputs as { comparables: { ref: string; partName: string; material: string; quantity: number; score: number; included: boolean; reason: string; realLotMin: number }[]; factors: { kind: string; factor: number; applied: boolean }[] };
      return (
        <div className="space-y-3">
          <div className={cx(box, 'overflow-hidden')}>
            {o.comparables.slice(0, 7).map((c) => (
              <div key={c.ref} className={cx('flex items-start gap-2.5 border-b px-3 py-2 last:border-0', dark ? 'border-white/10' : 'border-line', !c.included && 'opacity-70')}>
                {c.included ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#22c55e]" /> : <XCircle className={cx('mt-0.5 size-4 shrink-0', dark ? 'text-muted' : 'text-ink-3')} />}
                <div className="min-w-0 flex-1">
                  <div className={cx('text-[13px] font-medium', dark ? 'text-white' : 'text-ink')}><span className="font-mono text-[12px]">{c.ref}</span> · {c.partName} · {c.material} · {c.quantity} uds</div>
                  <div className={cx('text-[12px]', dark ? 'text-muted' : 'text-ink-3')}>{c.reason}</div>
                </div>
                {c.included && <span className="font-mono text-[12px] text-gold">{c.score.toFixed(2)}</span>}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {o.factors.map((f) => (
              <span key={f.kind} className={cx('rounded-md px-2 py-1 font-mono text-[12px]', f.applied ? (dark ? 'bg-gold/15 text-gold-light' : 'bg-gold/12 text-[#7a5600]') : dark ? 'bg-white/[0.06] text-muted' : 'bg-ink/[0.05] text-ink-3')}>
                {OPERATION_LABEL[f.kind as keyof typeof OPERATION_LABEL]} × {f.factor.toFixed(2).replace('.', ',')}
              </span>
            ))}
          </div>
        </div>
      );
    }
    case 'estimate': {
      if (outputs.blocked) return <div className="flex gap-2 rounded-xl bg-warn-bg px-3 py-2.5 text-[13.5px] text-warn ring-1 ring-warn/20"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{(outputs.blocked as string[]).join(' · ')}</div>;
      const o = outputs as { estimatedLotMin: number; baseLotMin: number; perPieceMin: number; band: [number, number]; setupTotalMin: number; operations: { name: string; setupMin: number; corrected: number; totalMin: number; machine: string; method: string }[]; checks: { level: string; text: string }[] };
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[['Estimado lote', `${numSmart(o.estimatedLotMin, 1)} min`], ['Base (reglas)', `${numSmart(o.baseLotMin, 1)} min`], ['Por pieza', `${num(o.perPieceMin, 2)} min`]].map(([k, v], i) => (
              <div key={k} className={cx(box, 'px-3 py-2')}>
                <div className={cx('text-[12px]', dark ? 'text-muted' : 'text-ink-3')}>{k}</div>
                <div className={cx('text-[16px] font-semibold tabular', i === 0 ? (dark ? 'text-gold-light' : 'text-[#9a6c00]') : dark ? 'text-white' : 'text-ink')}>{v}</div>
              </div>
            ))}
          </div>
          <div className={cx('text-[12.5px]', dark ? 'text-muted' : 'text-ink-3')}>Banda de escenario de ejemplo ±15 %: {numSmart(o.band[0], 1)}–{numSmart(o.band[1], 1)} min (no es un intervalo calibrado)</div>
          <div className={cx(box, 'overflow-hidden text-[12.5px]')}>
            {o.operations.map((op) => (
              <div key={op.name} className={cx('flex items-center gap-2 border-b px-3 py-1.5 last:border-0', dark ? 'border-white/10' : 'border-line')}>
                <span className={cx('flex-1', dark ? 'text-white' : 'text-ink')}>{op.name}</span>
                <span className={cx('font-mono', dark ? 'text-muted' : 'text-ink-3')}>{op.machine}</span>
                <span className="w-20 text-right tabular">{numSmart(op.totalMin, 1)} min</span>
              </div>
            ))}
          </div>
          <ul className="space-y-1">
            {o.checks.map((c, i) => (
              <li key={i} className={cx('flex gap-2 text-[12.5px]', c.level === 'ok' ? (dark ? 'text-[#86efac]' : 'text-ok') : dark ? 'text-[#fbbf24]' : 'text-warn')}>
                {c.level === 'ok' ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />}{c.text}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case 'offer': {
      const o = outputs as { cost: { lines: { label: string; amountEur: number; detail: string }[]; totalCostEur: number; commercialUnitEur: number; commercialTotalEur: number; ruleText: string }; leadTime: { minDays: number; maxDays: number } };
      if (!o.cost) return null;
      return (
        <div className="space-y-2.5 text-[13px]">
          <div className={cx(box, 'divide-y overflow-hidden', dark ? 'divide-white/10' : 'divide-line')}>
            {o.cost.lines.map((l) => (
              <div key={l.label} className="flex items-center justify-between px-3 py-1.5"><span className={t}>{l.label}</span><span className="tabular">{eur(l.amountEur)}</span></div>
            ))}
            <div className="flex items-center justify-between px-3 py-1.5 font-semibold"><span>Coste total</span><span className="tabular">{eur(o.cost.totalCostEur)}</span></div>
          </div>
          <div className={cx('flex items-end justify-between rounded-xl px-3 py-2.5', dark ? 'bg-gold/12 ring-1 ring-gold/30' : 'bg-gold/10 ring-1 ring-gold/30')}>
            <div><div className={cx('text-[12px]', dark ? 'text-gold-light/80' : 'text-[#7a5600]')}>Precio (sin IVA)</div><div className={cx('text-[18px] font-semibold tabular', dark ? 'text-gold-light' : 'text-[#7a5600]')}>{eur(o.cost.commercialTotalEur)}</div></div>
            <div className={cx('text-right text-[12.5px]', dark ? 'text-secondary' : 'text-ink-2')}>{eur(o.cost.commercialUnitEur)}/ud<br />{o.leadTime.minDays}–{o.leadTime.maxDays} días hábiles</div>
          </div>
          <p className={cx('text-[12px]', dark ? 'text-muted' : 'text-ink-3')}>{o.cost.ruleText}</p>
        </div>
      );
    }
    case 'review': {
      const o = outputs as { approval?: { approvedBy: string; approvedAt: string; approvedInputHash: string; comment?: string }; pending?: boolean; inputHash?: string };
      if (o.approval) return (
        <div className="flex gap-2.5 rounded-xl bg-ok-bg px-3 py-2.5 text-[13.5px] text-ok ring-1 ring-ok/20">
          <FileCheck2 className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0">Aprobado por {o.approval.approvedBy}<div className="font-mono text-[12px] opacity-80">hash {o.approval.approvedInputHash}</div>{o.approval.comment && <div className="mt-0.5">«{o.approval.comment}»</div>}</div>
        </div>
      );
      return <div className={cx('flex gap-2 rounded-xl px-3 py-2.5 text-[13.5px]', dark ? 'bg-white/[0.05] text-secondary ring-1 ring-white/10' : 'bg-canvas text-ink-2 ring-1 ring-line')}><CircleDashed className="mt-0.5 size-4 shrink-0" /><span>Pendiente: revisar incertidumbres, guardar una versión y aprobarla. La aprobación quedará vinculada al hash <span className="font-mono">{o.inputHash?.slice(0, 8)}</span>.</span></div>;
    }
    case 'output': {
      const o = outputs as { erpRef?: ErpRecordRef; reply?: string; exports?: string[]; missingPartner?: { company: string } };
      if (o.missingPartner) return <div className="flex gap-2 rounded-xl bg-warn-bg px-3 py-2.5 text-[13.5px] text-warn ring-1 ring-warn/20"><AlertTriangle className="mt-0.5 size-4 shrink-0" />«{o.missingPartner.company}» no existe en el ERP. Da de alta el contacto (acción explícita) y reintenta.</div>;
      return (
        <div className="space-y-2.5 text-[13.5px]">
          {o.erpRef && (
            <Link to={`/odoo/ventas/${o.erpRef.localId}`} className={cx('flex items-center justify-between rounded-xl px-3 py-2.5 ring-1 transition-colors', dark ? 'bg-[#16a34a]/12 text-[#86efac] ring-[#16a34a]/30 hover:bg-[#16a34a]/20' : 'bg-ok-bg text-ok ring-ok/20 hover:ring-ok/50')}>
              <span><span className="font-semibold">{o.erpRef.name}</span> · {o.erpRef.model} · borrador (modo demo)</span><ArrowUpRight className="size-4" />
            </Link>
          )}
          {o.reply && <pre className={cx('max-h-40 overflow-auto whitespace-pre-wrap rounded-xl px-3 py-2 font-sans text-[12.5px] leading-relaxed', dark ? 'bg-white/[0.04] text-secondary ring-1 ring-white/10' : 'bg-canvas text-ink-2 ring-1 ring-line')}>{o.reply}</pre>}
          {o.exports && <div className={cx('text-[12.5px]', dark ? 'text-muted' : 'text-ink-3')}>Exportaciones disponibles: {o.exports.join(' · ')}</div>}
        </div>
      );
    }
  }
  return <pre className="text-[12px]">{JSON.stringify(outputs, null, 2)}</pre>;
}

