import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ArrowRight, Calculator, ChevronDown, Cog, FileCheck2, Pencil, RotateCcw, Scale, ShieldAlert, Undo2 } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import type { EstimateInputs, ManufacturingRequest, MaterialId, OperationEstimate } from '@/domain/types';
import { Badge, Button, Card, CardHeader, Field, Input, Segmented, Select, Stat } from '@/components/ui';
import { EvidenceChip } from '@/components/evidence/Evidence';
import { MACHINES, MATERIALS } from '@/fixtures/manufacturing';
import { estimate } from '@/services/estimation/engine';
import { useStudio } from '@/store/useStudio';
import { approvalValid } from '@/store/requestOps';
import { cx, eur, num, numSmart } from '@/lib/format';
import { useEstimate } from '../hooks';

const METHOD: Record<OperationEstimate['method'], { label: string; tone: 'neutral' | 'gold' | 'info' | 'ok' }> = {
  rule: { label: 'Regla', tone: 'neutral' },
  fixture_correction: { label: 'Regla + corrección', tone: 'gold' },
  trained_model: { label: 'Modelo', tone: 'info' },
  manual: { label: 'Manual', tone: 'info' },
};

export function EstimateTab({ req, onApprove }: { req: ManufacturingRequest; onApprove: () => void }) {
  const r = useEstimate(req)!;
  const valid = approvalValid(req, r.inputHash);
  const approved = req.approval && req.versions.find((v) => v.id === req.approval!.versionId);
  return (
    <div className="space-y-4">
      <StatusBanner req={req} valid={valid} approvedNumber={approved?.number} onApprove={onApprove} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          {r.operations.length > 0 && <Totals req={req} />}
          <OperationsTable req={req} />
        </div>
        <div className="space-y-4">
          <ParamsCard req={req} />
          <ScenarioCard req={req} />
          <MachinesCard req={req} />
        </div>
      </div>
    </div>
  );
}

function StatusBanner({ req, valid, approvedNumber, onApprove }: { req: ManufacturingRequest; valid: boolean; approvedNumber?: number; onApprove: () => void }) {
  const r = useEstimate(req)!;
  if (r.blocked.length) {
    return (
      <div className="flex flex-wrap items-start gap-3 rounded-2xl bg-warn-bg px-4 py-3 ring-1 ring-warn/25" role="alert">
        <ShieldAlert className="mt-0.5 size-5 text-warn" />
        <div className="flex-1 text-[13.5px] text-[#7c3d06]"><b>Estimación bloqueada.</b> {r.blocked.join(' · ')}. Ninguna cifra se presenta hasta resolverlo.</div>
      </div>
    );
  }
  if (req.approval?.invalidatedAt) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-warn-bg px-4 py-3 ring-1 ring-warn/25">
        <AlertTriangle className="size-5 text-warn" />
        <div className="flex-1 text-[13.5px] text-[#7c3d06]"><b>Aprobación de v{approvedNumber} anulada</b> — {req.approval.invalidatedReason}. Los inputs actuales (hash <span className="font-mono">{r.inputHash.slice(0, 8)}</span>) necesitan una nueva aprobación.</div>
        <Button variant="primary" icon={<FileCheck2 />} onClick={onApprove}>Revisar y aprobar</Button>
      </div>
    );
  }
  if (valid) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-ok-bg px-4 py-3 ring-1 ring-ok/20">
        <FileCheck2 className="size-5 text-ok" />
        <div className="flex-1 text-[13.5px] text-ok"><b>v{approvedNumber} aprobada</b> por {req.approval!.approvedBy} · hash <span className="font-mono">{r.inputHash.slice(0, 12)}</span>. Cualquier edición anulará la aprobación.</div>
      </div>
    );
  }
  return null;
}

function Totals({ req }: { req: ManufacturingRequest }) {
  const r = useEstimate(req)!;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Tiempo estimado del lote" value={<span data-testid="estimated-lot">{numSmart(r.estimatedLotMin, 1)} min</span>} sub={`${num(r.estimatedLotMin / 60, 3)} h · base ${numSmart(r.baseLotMin, 1)} min`} tone="gold" />
        <Stat label="Tiempo imputado por pieza" value={`${num(r.perPieceMin, 2)} min`} sub={`Preparación ${numSmart(r.setupTotalMin)} min una vez por lote`} />
        <Stat label="Precio unitario (sin IVA)" value={eur(r.cost.commercialUnitEur)} sub={`Total ${eur(r.cost.commercialTotalEur)}`} />
        <Stat label="Banda de escenario de ejemplo" value={`±15 %`} sub={`${numSmart(r.bandMin[0], 1)} – ${numSmart(r.bandMin[1], 1)} min · no calibrada`} />
      </div>
      <Card className="grid gap-0 divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-3"><Cog className="size-3.5" />Tiempo de máquina</div>
          <ul className="mt-1.5 space-y-0.5 text-[13px]">
            {Object.entries(r.machineMinByWorkcenter).map(([wc, m]) => <li key={wc} className="flex justify-between gap-2"><span className="text-ink-2">{wc}</span><span className="tabular">{numSmart(m, 1)} min</span></li>)}
          </ul>
        </div>
        <div className="px-4 py-3">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Horas de trabajo humano</div>
          <div className="mt-1 text-[20px] font-semibold tabular">{num(r.laborHours, 2)} h</div>
          <p className="text-[12.5px] text-ink-3">Preparación completa + ciclo × factor de presencia por centro (CNC 0,30; manual 1,00). No se suma a la ocupación de máquina.</p>
        </div>
        <div className="px-4 py-3">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Plazo calendario orientativo</div>
          <div className="mt-1 text-[20px] font-semibold tabular">{r.leadTime.minDays}–{r.leadTime.maxDays} días hábiles</div>
          <details className="text-[12.5px] text-ink-3"><summary className="cursor-pointer select-none">Supuestos del plazo</summary><ul className="mt-1 space-y-0.5">{r.leadTime.assumptions.map((a) => <li key={a}>· {a}</li>)}</ul></details>
        </div>
      </Card>
    </div>
  );
}

type RowEdit = { setupMin: string; cycleBaseMin: string; correctionFactor: string; machineId: string; reason: string };

function OperationsTable({ req }: { req: ManufacturingRequest }) {
  const r = useEstimate(req)!;
  const setOverride = useStudio((s) => s.setOverride);
  const clearOverride = useStudio((s) => s.clearOverride);
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<Record<string, RowEdit>>({});
  const [open, setOpen] = useState<string | null>(null);

  const start = () => {
    setRows(Object.fromEntries(r.operations.map((o) => [o.id, { setupMin: String(o.setupMin), cycleBaseMin: String(+o.cycleMin.toFixed(4)), correctionFactor: String(o.correctionFactor), machineId: o.machineId, reason: o.override?.reason ?? '' }])));
    setEditing(true);
  };
  const changed = (o: OperationEstimate) => {
    const e = rows[o.id];
    return e && (Number(e.setupMin) !== o.setupMin || Math.abs(Number(e.cycleBaseMin) - o.cycleMin) > 1e-4 || Number(e.correctionFactor) !== o.correctionFactor || e.machineId !== o.machineId);
  };
  const errors = (o: OperationEstimate): string | null => {
    const e = rows[o.id];
    if (!e) return null;
    if (!(Number(e.setupMin) >= 0) || e.setupMin === '') return 'Preparación ≥ 0';
    if (!(Number(e.cycleBaseMin) > 0)) return 'Ciclo > 0';
    const f = Number(e.correctionFactor);
    if (!(f >= 0.5 && f <= 2)) return 'Factor entre 0,5 y 2';
    if (changed(o) && e.reason.trim().length < 5) return 'Indica el motivo (mín. 5 caracteres)';
    return null;
  };
  const anyError = editing && r.operations.some((o) => errors(o));
  const save = () => {
    for (const o of r.operations) {
      if (!changed(o)) continue;
      const e = rows[o.id];
      setOverride(req.id, {
        opId: o.id, setupMin: Number(e.setupMin), cycleBaseMin: Number(e.cycleBaseMin), correctionFactor: Number(e.correctionFactor), machineId: e.machineId, reason: e.reason.trim(),
        previous: o.override?.previous ?? { setupMin: o.setupMin, cycleBaseMin: o.cycleMin, correctionFactor: o.correctionFactor, machineId: o.machineId, totalMin: o.totalMin },
      });
    }
    setEditing(false);
  };
  const preview = useMemo(() => {
    if (!editing) return null;
    const ovs = r.operations.filter(changed).map((o) => {
      const e = rows[o.id];
      return { opId: o.id, setupMin: Number(e.setupMin), cycleBaseMin: Number(e.cycleBaseMin), correctionFactor: Number(e.correctionFactor), machineId: e.machineId, reason: e.reason, by: '', at: '', previous: { setupMin: 0, cycleBaseMin: 0, correctionFactor: 1, machineId: '', totalMin: 0 } };
    });
    if (!ovs.length || r.operations.some((o) => errors(o) && changed(o) && !errors(o)!.startsWith('Indica'))) return null;
    return estimate({ ...req.draft, overrides: [...req.draft.overrides.filter((x) => !ovs.some((o) => o.opId === x.opId)), ...ovs] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, rows, req.draft]);

  if (!r.operations.length) {
    return (
      <Card>
        <CardHeader title="Operaciones" icon={<Calculator />} />
        <div className="px-6 py-10 text-center text-[14px] text-ink-3">{r.missingFields.includes('material') ? 'Sin material confirmado no se construyen operaciones: completa el dato en «Correo y adjuntos».' : 'Sin operaciones.'}</div>
      </Card>
    );
  }

  const cell = 'px-3 py-2.5 text-right tabular whitespace-nowrap';
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Operaciones y tiempos" icon={<Calculator />} subtitle={`Ruta serial simplificada · ${r.operations.length} operaciones · ${req.draft.quantity} uds`}
        actions={editing ? (
          <>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button size="sm" variant="primary" onClick={save} disabled={anyError || !r.operations.some(changed)} disabledReason={anyError ? 'Corrige los errores marcados' : 'No hay cambios'}>Guardar ajustes</Button>
          </>
        ) : <Button size="sm" icon={<Pencil />} onClick={start} data-testid="edit-ops">Ajustar operaciones</Button>} />
      <div className="overflow-x-auto scroll-thin">
        <table className="w-full min-w-[920px] text-[13.5px]">
          <thead className="bg-canvas text-[12px] text-ink-3">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Operación</th>
              <th className="px-3 py-2 text-left font-medium">Máquina</th>
              <th className="px-3 py-2 text-right font-medium">Prep. lote<br />(min)</th>
              <th className="px-3 py-2 text-right font-medium">Ciclo base<br />(min/ud)</th>
              <th className="px-3 py-2 text-right font-medium">Corrección</th>
              <th className="px-3 py-2 text-right font-medium">Ciclo corr.<br />(min/ud)</th>
              <th className="px-3 py-2 text-right font-medium">Total<br />(min)</th>
              <th className="px-3 py-2 text-right font-medium">Coste</th>
              <th className="px-3 py-2 text-left font-medium">Origen</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {r.operations.map((o) => {
              const e = rows[o.id];
              const err = editing ? errors(o) : null;
              const isOpen = open === o.id;
              return (
                <Fragment key={o.id}>
                  <tr className={cx('border-t border-line align-middle transition-colors', !editing && 'cursor-pointer hover:bg-gold/[0.04]', isOpen && 'bg-gold/[0.05]', o.blocked && 'bg-warn-bg/60')} onClick={() => !editing && setOpen(isOpen ? null : o.id)} data-op={o.kind}>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-ink">{o.name}</div>
                      <div className="mt-0.5"><Badge tone={METHOD[o.method].tone}>{METHOD[o.method].label}</Badge></div>
                    </td>
                    <td className="px-3 py-2.5">
                      {editing ? (
                        <Select value={e.machineId} onChange={(ev) => setRows({ ...rows, [o.id]: { ...e, machineId: ev.target.value } })} className="h-8 py-1 text-[13px]" aria-label={`Máquina de ${o.name}`}>
                          {MACHINES.filter((m) => m.capabilities.includes(o.kind)).map((m) => <option key={m.id} value={m.id} disabled={req.draft.disabledMachineIds.includes(m.id)}>{m.id}{req.draft.disabledMachineIds.includes(m.id) ? ' (desactivada)' : ''}</option>)}
                        </Select>
                      ) : o.blocked ? <span className="text-[12.5px] text-warn">{o.blocked}</span> : <span className="font-mono text-[12.5px]">{o.machineId}</span>}
                    </td>
                    {editing ? (
                      <>
                        <td className="px-2 py-2"><NumIn v={e.setupMin} on={(v) => setRows({ ...rows, [o.id]: { ...e, setupMin: v } })} label="Preparación" /></td>
                        <td className="px-2 py-2"><NumIn v={e.cycleBaseMin} on={(v) => setRows({ ...rows, [o.id]: { ...e, cycleBaseMin: v } })} label="Ciclo base" /></td>
                        <td className="px-2 py-2"><NumIn v={e.correctionFactor} on={(v) => setRows({ ...rows, [o.id]: { ...e, correctionFactor: v } })} label="Factor" step="0.01" /></td>
                      </>
                    ) : (
                      <>
                        <td className={cell}>{numSmart(o.setupMin, 2)}</td>
                        <td className={cell}>{num(o.cycleMin, 2)}</td>
                        <td className={cx(cell, o.correctionFactor !== 1 && 'text-[#8a6100]')}>× {num(o.correctionFactor, 2)}</td>
                      </>
                    )}
                    <td className={cell}>{num(o.correctedCycleMin, 2)}</td>
                    <td className={cx(cell, 'font-semibold')}>{numSmart(o.totalMin, 2)}</td>
                    <td className={cell}>{eur(o.costEur)}</td>
                    <td className="max-w-[200px] px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">{o.evidenceIds.slice(0, 2).map((id) => <EvidenceChip key={id} id={id} />)}{o.evidenceIds.length > 2 && <span className="text-[12px] text-ink-3">+{o.evidenceIds.length - 2}</span>}</div>
                    </td>
                    <td className="px-2 text-ink-3">{!editing && <ChevronDown className={cx('size-4 transition-transform', isOpen && 'rotate-180')} />}</td>
                  </tr>
                  {editing && (changed(o) || err) && (
                    <tr className="bg-gold/[0.04]">
                      <td colSpan={10} className="px-3 pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Input value={e.reason} onChange={(ev) => setRows({ ...rows, [o.id]: { ...e, reason: ev.target.value } })} placeholder={`Motivo del ajuste en ${o.name.toLowerCase()} (obligatorio)`} className="h-8 max-w-[520px] py-1 text-[13px]" aria-invalid={Boolean(err)} aria-label="Motivo del ajuste" />
                          {err && <span className="text-[12.5px] text-err">{err}</span>}
                        </div>
                      </td>
                    </tr>
                  )}
                  <AnimatePresence initial={false}>
                    {isOpen && !editing && (
                      <tr>
                        <td colSpan={10} className="p-0">
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }} className="overflow-hidden">
                            <OpDetail req={req} o={o} onClear={() => clearOverride(req.id, o.id)} />
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </Fragment>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-line-strong bg-canvas/70 font-semibold">
            <tr>
              <td className="px-3 py-2.5" colSpan={2}>Total</td>
              <td className={cell}>{numSmart(r.setupTotalMin, 2)}</td>
              <td className={cell}>{num(r.cycleBaseTotalMin, 2)}</td>
              <td className={cell}>—</td>
              <td className={cell}>{num(r.cycleCorrectedTotalMin, 2)}</td>
              <td className={cell}>{numSmart(r.estimatedLotMin, 2)}</td>
              <td className={cell}>{eur(r.cost.transformationEur)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-line px-4 py-2.5 text-[12.5px] text-ink-3">
        <span>T<sub>lote</sub> = preparación + cantidad × ciclo corregido = {numSmart(r.setupTotalMin, 2)} + {req.draft.quantity} × {num(r.cycleCorrectedTotalMin, 2)} = <b className="text-ink tabular">{numSmart(r.estimatedLotMin, 2)} min</b></span>
        {preview && <span className="text-[#8a6100]">Vista previa con ajustes: <b className="tabular">{numSmart(preview.estimatedLotMin, 2)} min</b> · {eur(preview.cost.commercialTotalEur)}</span>}
      </div>
    </Card>
  );
}

function NumIn({ v, on, label, step = 'any' }: { v: string; on: (v: string) => void; label: string; step?: string }) {
  return <Input type="number" step={step} value={v} onChange={(e) => on(e.target.value)} className="h-8 w-[88px] py-1 text-right text-[13px] tabular" aria-label={label} onClick={(e) => e.stopPropagation()} />;
}

function OpDetail({ req, o, onClear }: { req: ManufacturingRequest; o: OperationEstimate; onClear: () => void }) {
  const addComment = useStudio((s) => s.addComment);
  const [text, setText] = useState('');
  const comments = req.comments.filter((c) => c.opId === o.id);
  return (
    <div className="grid gap-4 border-t border-dashed border-line bg-white px-4 py-3 md:grid-cols-3">
      <div>
        <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Regla aplicada</div>
        <p className="mt-1 font-mono text-[12.5px] text-ink-2">{o.ruleText}</p>
        <p className="mt-1 text-[12.5px] text-ink-3">Máquina: {o.machineName} · {num(o.rateEurH, 2)} €/h</p>
      </div>
      <div>
        <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Supuestos</div>
        <ul className="mt-1 space-y-0.5 text-[12.5px] text-ink-2">{o.assumptions.length ? o.assumptions.map((a) => <li key={a}>· {a}</li>) : <li className="text-ink-3">Sin supuestos adicionales</li>}</ul>
        {o.override && (
          <div className="mt-2 rounded-lg bg-info-bg px-2.5 py-2 text-[12.5px] text-info">
            <div className="font-medium">Ajuste manual de {o.override.by}</div>
            <div>«{o.override.reason}»</div>
            <div className="mt-0.5">Resultado previo: {numSmart(o.override.previous.totalMin, 2)} min ({o.override.previous.machineId}, ciclo {num(o.override.previous.cycleBaseMin, 2)}, × {num(o.override.previous.correctionFactor, 2)}) <ArrowRight className="inline size-3" /> {numSmart(o.totalMin, 2)} min</div>
            <button className="mt-1 inline-flex items-center gap-1 font-medium hover:underline" onClick={onClear}><Undo2 className="size-3" />Quitar ajuste</button>
          </div>
        )}
      </div>
      <div>
        <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Comentarios</div>
        {comments.map((c) => <p key={c.id} className="mt-1 text-[12.5px] text-ink-2"><b>{c.by.split(' (')[0]}:</b> {c.text}</p>)}
        <div className="mt-1.5 flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Añadir comentario" className="h-8 py-1 text-[13px]" aria-label="Comentario de la operación" onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { addComment(req.id, text.trim(), o.id); setText(''); } }} />
          <Button size="sm" disabled={!text.trim()} disabledReason="Escribe un comentario" onClick={() => { addComment(req.id, text.trim(), o.id); setText(''); }}>Añadir</Button>
        </div>
      </div>
    </div>
  );
}

function ParamsCard({ req }: { req: ManufacturingRequest }) {
  const update = useStudio((s) => s.updateDraft);
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState(() => toForm(req.draft));
  const qty = Number(f.quantity);
  const pctV = Number(f.pct);
  const indirect = Number(f.indirect);
  const errors = {
    quantity: !Number.isInteger(qty) || qty < 1 || qty > 100000 ? 'Entero entre 1 y 100.000' : null,
    pct: !(pctV >= 0 && pctV < (f.rule === 'margin' ? 90 : 300)) ? (f.rule === 'margin' ? 'Margen entre 0 y 89 %' : 'Recargo entre 0 y 299 %') : null,
    indirect: !(indirect >= 0 && indirect <= 100) ? 'Entre 0 y 100 %' : null,
  };
  const invalid = Object.values(errors).some(Boolean);
  const save = () => {
    const patch: Partial<EstimateInputs> = {
      quantity: qty, material: (f.material || null) as MaterialId | null, finish: f.finish.trim() || null, indirectPct: indirect,
      pricing: f.rule === 'margin' ? { kind: 'margin', marginPct: pctV } : { kind: 'markup', markupPct: pctV },
    };
    const changes: string[] = [];
    if (patch.quantity !== req.draft.quantity) changes.push(`lote ${req.draft.quantity} → ${patch.quantity}`);
    if (patch.material !== req.draft.material) changes.push(`material ${req.draft.material ? MATERIALS[req.draft.material].shortName : '—'} → ${patch.material ? MATERIALS[patch.material].shortName : '—'}`);
    if (patch.finish !== req.draft.finish) changes.push('acabado');
    if (JSON.stringify(patch.pricing) !== JSON.stringify(req.draft.pricing)) changes.push('regla comercial');
    if (patch.indirectPct !== req.draft.indirectPct) changes.push('indirectos');
    if (changes.length) update(req.id, patch, `Parámetros editados: ${changes.join(', ')}`);
    setEditing(false);
  };
  return (
    <Card>
      <CardHeader title="Parámetros" icon={<Scale />} actions={editing ? (
        <>
          <Button size="sm" variant="ghost" onClick={() => { setF(toForm(req.draft)); setEditing(false); }}>Cancelar</Button>
          <Button size="sm" variant="primary" onClick={save} disabled={invalid} disabledReason="Corrige los valores marcados">Guardar</Button>
        </>
      ) : <Button size="sm" icon={<Pencil />} onClick={() => { setF(toForm(req.draft)); setEditing(true); }} data-testid="edit-params">Editar</Button>} />
      <div className="grid grid-cols-2 gap-3 p-4">
        <Field label="Cantidad (uds)" error={editing ? errors.quantity : null} htmlFor="p-qty">
          <Input id="p-qty" type="number" min={1} value={f.quantity} disabled={!editing} onChange={(e) => setF({ ...f, quantity: e.target.value })} aria-invalid={Boolean(editing && errors.quantity)} />
        </Field>
        <Field label="Material" htmlFor="p-mat" hint={!f.material ? 'Sin material: la estimación queda bloqueada' : undefined}>
          <Select id="p-mat" value={f.material} disabled={!editing} onChange={(e) => setF({ ...f, material: e.target.value })}>
            <option value="">Sin especificar</option>
            {Object.values(MATERIALS).map((m) => <option key={m.id} value={m.id}>{m.shortName}</option>)}
          </Select>
        </Field>
        <Field label="Acabado" className="col-span-2" htmlFor="p-fin">
          <Input id="p-fin" value={f.finish} disabled={!editing} onChange={(e) => setF({ ...f, finish: e.target.value })} placeholder="p. ej. Anodizado natural 15 µm" />
        </Field>
        <div className="col-span-2">
          <div className="mb-1.5 text-[13px] font-medium text-ink-2">Regla comercial</div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented size="sm" label="Regla comercial" value={f.rule} onChange={(rule) => editing && setF({ ...f, rule })} options={[{ value: 'margin', label: 'Margen' }, { value: 'markup', label: 'Recargo' }]} />
            <Input type="number" value={f.pct} disabled={!editing} onChange={(e) => setF({ ...f, pct: e.target.value })} className="w-20 text-right" aria-label="Porcentaje" aria-invalid={Boolean(editing && errors.pct)} />
            <span className="text-[13px] text-ink-3">%</span>
          </div>
          {editing && errors.pct && <p className="mt-1 text-[12.5px] text-err">{errors.pct}</p>}
          <p className="mt-1 text-[12px] text-ink-3">{f.rule === 'margin' ? 'Margen sobre venta: precio = coste / (1 − m)' : 'Recargo sobre coste: precio = coste × (1 + r)'} · IVA excluido</p>
        </div>
        <Field label="Indirectos (% s/ transformación)" error={editing ? errors.indirect : null} htmlFor="p-ind" className="col-span-2">
          <Input id="p-ind" type="number" value={f.indirect} disabled={!editing} onChange={(e) => setF({ ...f, indirect: e.target.value })} />
        </Field>
      </div>
    </Card>
  );
}

const toForm = (d: EstimateInputs) => ({
  quantity: String(d.quantity), material: d.material ?? '', finish: d.finish ?? '', rule: d.pricing.kind as 'margin' | 'markup',
  pct: String(d.pricing.kind === 'margin' ? d.pricing.marginPct : d.pricing.markupPct), indirect: String(d.indirectPct),
});

function ScenarioCard({ req }: { req: ManufacturingRequest }) {
  const update = useStudio((s) => s.updateDraft);
  const [qty, setQty] = useState(req.draft.quantity === 100 ? 50 : 100);
  const [mat, setMat] = useState<MaterialId | ''>('');
  const cur = useEstimate(req)!;
  const alt = useMemo(() => (qty > 0 ? estimate({ ...req.draft, quantity: qty, material: (mat || req.draft.material) as MaterialId | null }) : null), [req.draft, qty, mat]);
  if (!cur.operations.length || !alt || !alt.operations.length) return null;
  const rows: [string, string, string][] = [
    ['Lote', `${req.draft.quantity} uds`, `${qty} uds`],
    ['Material', req.draft.material ? MATERIALS[req.draft.material].shortName : '—', MATERIALS[(mat || req.draft.material)!].shortName],
    ['Tiempo lote', `${numSmart(cur.estimatedLotMin, 1)} min`, `${numSmart(alt.estimatedLotMin, 1)} min`],
    ['Preparación', `${numSmart(cur.setupTotalMin)} min`, `${numSmart(alt.setupTotalMin)} min`],
    ['Por pieza', `${num(cur.perPieceMin, 2)} min`, `${num(alt.perPieceMin, 2)} min`],
    ['Precio unitario', eur(cur.cost.commercialUnitEur), eur(alt.cost.commercialUnitEur)],
    ['Total', eur(cur.cost.commercialTotalEur), eur(alt.cost.commercialTotalEur)],
  ];
  return (
    <Card>
      <CardHeader title="Comparar escenario" subtitle="Sin modificar el expediente" />
      <div className="flex gap-2 px-4 pt-3">
        <Input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-24" aria-label="Cantidad alternativa" />
        <Select value={mat} onChange={(e) => setMat(e.target.value as MaterialId | '')} aria-label="Material alternativo">
          <option value="">Mismo material</option>
          {Object.values(MATERIALS).map((m) => <option key={m.id} value={m.id}>{m.shortName}</option>)}
        </Select>
      </div>
      <table className="mx-4 my-3 w-[calc(100%-32px)] text-[13px]">
        <thead><tr className="text-[12px] text-ink-3"><th className="py-1 text-left font-medium" /><th className="py-1 text-right font-medium">Actual</th><th className="py-1 text-right font-medium text-[#8a6100]">Escenario</th></tr></thead>
        <tbody>{rows.map(([k, a, b]) => <tr key={k} className="border-t border-line"><td className="py-1.5 text-ink-3">{k}</td><td className="py-1.5 text-right tabular">{a}</td><td className={cx('py-1.5 text-right font-medium tabular', a !== b && 'text-[#8a6100]')}>{b}</td></tr>)}</tbody>
      </table>
      <div className="flex justify-end border-t border-line px-4 py-2.5">
        <Button size="sm" icon={<RotateCcw />} onClick={() => update(req.id, { quantity: qty, ...(mat ? { material: mat } : {}) }, `Escenario aplicado: lote ${qty}${mat ? `, ${MATERIALS[mat].shortName}` : ''}`)}>Aplicar al expediente</Button>
      </div>
    </Card>
  );
}

function MachinesCard({ req }: { req: ManufacturingRequest }) {
  const toggle = useStudio((s) => s.toggleMachine);
  const update = useStudio((s) => s.updateDraft);
  const [rateEdit, setRateEdit] = useState<string | null>(null);
  const [rate, setRate] = useState('');
  return (
    <Card>
      <CardHeader title="Máquinas y tarifas" icon={<Cog />} subtitle="Desactivar una máquina propone alternativa o bloquea" />
      <ul className="divide-y divide-line">
        {MACHINES.map((m) => {
          const on = !req.draft.disabledMachineIds.includes(m.id);
          const r = req.draft.rateOverrides[m.id] ?? m.rateEurH;
          return (
            <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
              <button role="switch" aria-checked={on} aria-label={`${on ? 'Desactivar' : 'Activar'} ${m.id}`} onClick={() => toggle(req.id, m.id)}
                className={cx('relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200', on ? 'bg-ok' : 'bg-ink/20')}>
                <span className={cx('absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform duration-200 ease-[var(--ease-out)]', on ? 'translate-x-[18px]' : 'translate-x-0.5')} />
              </button>
              <div className="min-w-0 flex-1">
                <div className={cx('truncate text-[13px] font-medium', !on && 'text-ink-3 line-through')}><span className="font-mono">{m.id}</span> · {m.workcenter}</div>
                <div className="truncate text-[12px] text-ink-3">{m.capabilities.join(', ')}</div>
              </div>
              {rateEdit === m.id ? (
                <span className="flex items-center gap-1">
                  <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="h-7 w-16 py-0.5 text-right text-[12.5px]" aria-label={`Tarifa de ${m.id}`} autoFocus />
                  <Button size="sm" variant="primary" className="h-7 px-2" disabled={!(Number(rate) > 0)} disabledReason="Tarifa > 0" onClick={() => { update(req.id, { rateOverrides: { ...req.draft.rateOverrides, [m.id]: Number(rate) } }, `Tarifa ${m.id}: ${r} → ${rate} €/h`); setRateEdit(null); }}>OK</Button>
                  <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => setRateEdit(null)}>✕</Button>
                </span>
              ) : (
                <button className="rounded-md px-1.5 py-0.5 text-[12.5px] tabular text-ink-2 hover:bg-ink/5" onClick={() => { setRate(String(r)); setRateEdit(m.id); }} title="Editar tarifa">{r} €/h</button>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
