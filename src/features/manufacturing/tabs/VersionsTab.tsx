import { Download, FileCheck2, FileText, GitBranch, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { EstimateVersion, ManufacturingRequest } from '@/domain/types';
import { Badge, Button, Card, CardHeader, EmptyState, Input, Select } from '@/components/ui';
import { MATERIALS } from '@/fixtures/manufacturing';
import { useStudio } from '@/store/useStudio';
import { cx, dateTimeEs, eur, num, numSmart } from '@/lib/format';
import { useEstimate } from '../hooks';
import { downloadCsv } from '../exports';

export function VersionsTab({ req }: { req: ManufacturingRequest }) {
  const r = useEstimate(req)!;
  const save = useStudio((s) => s.saveVersion);
  const approve = useStudio((s) => s.approve);
  const [note, setNote] = useState('');
  const [cmp, setCmp] = useState<[string, string]>(() => [req.versions.at(-2)?.id ?? req.versions[0]?.id ?? '', 'current']);
  const current = req.versions.find((v) => v.inputHash === r.inputHash);
  const status = (v: EstimateVersion) => {
    if (!v.approval) return null;
    const valid = req.approval?.versionId === v.id && !req.approval.invalidatedAt;
    return valid ? <Badge tone="ok">Aprobada</Badge> : <Badge tone="warn">Aprobación anulada</Badge>;
  };
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Guardar versión" icon={<Save />} subtitle={current ? `Los inputs actuales coinciden con v${current.number}` : `Inputs actuales sin guardar · hash ${r.inputHash.slice(0, 8)}`} />
        <div className="flex flex-wrap gap-2 p-4">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota de la versión (opcional)" className="max-w-[420px]" aria-label="Nota de la versión" />
          <Button variant="primary" icon={<Save />} disabled={Boolean(current) || r.blocked.length > 0} disabledReason={current ? 'Ya existe una versión con estos inputs' : 'La estimación está bloqueada'} onClick={() => { save(req.id, note || undefined); setNote(''); }}>Guardar v{req.versions.length + 1}</Button>
        </div>
      </Card>

      {req.versions.length === 0 ? (
        <Card><EmptyState icon={<GitBranch />} title="Sin versiones">Guarda una versión para poder aprobarla, generar el informe y crear el presupuesto.</EmptyState></Card>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader title="Historial de versiones" subtitle="Cada versión fija inputs, cálculo, revisión documental y hash" />
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[860px] text-[13.5px]">
              <thead className="bg-canvas text-[12px] text-ink-3">
                <tr><th className="px-4 py-2 text-left font-medium">Versión</th><th className="px-3 py-2 text-left font-medium">Rev.</th><th className="px-3 py-2 text-right font-medium">Lote</th><th className="px-3 py-2 text-left font-medium">Material</th><th className="px-3 py-2 text-right font-medium">Tiempo</th><th className="px-3 py-2 text-right font-medium">Precio</th><th className="px-3 py-2 text-left font-medium">Hash</th><th className="px-3 py-2 text-left font-medium">Estado</th><th className="px-4 py-2" /></tr>
              </thead>
              <tbody>
                {[...req.versions].reverse().map((v) => (
                  <tr key={v.id} className={cx('border-t border-line', v.inputHash === r.inputHash && 'bg-gold/[0.05]')}>
                    <td className="px-4 py-2.5"><div className="font-semibold">v{v.number}{v.inputHash === r.inputHash && <span className="ml-2 text-[12px] font-normal text-[#8a6100]">= actual</span>}</div><div className="text-[12px] text-ink-3">{dateTimeEs(v.createdAt)} · {v.createdBy.split(' (')[0]}{v.note ? ` · ${v.note}` : ''}</div></td>
                    <td className="px-3 py-2.5 font-mono">{v.revision}</td>
                    <td className="px-3 py-2.5 text-right tabular">{v.quantity}</td>
                    <td className="px-3 py-2.5">{v.inputs.material ? MATERIALS[v.inputs.material].shortName : '—'}</td>
                    <td className="px-3 py-2.5 text-right tabular">{numSmart(v.result.estimatedLotMin, 1)} min</td>
                    <td className="px-3 py-2.5 text-right tabular">{eur(v.result.cost.commercialTotalEur)}</td>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-ink-3">{v.inputHash.slice(0, 10)}</td>
                    <td className="px-3 py-2.5">{status(v)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        {v.inputHash === r.inputHash && !(req.approval?.versionId === v.id && !req.approval.invalidatedAt) && <Button size="sm" variant="primary" icon={<FileCheck2 />} onClick={() => approve(req.id, v.id)}>Aprobar</Button>}
                        <Button size="sm" icon={<FileText />} onClick={() => window.open(`/informe/${req.id}/${v.id}`, '_blank')}>Informe</Button>
                        <Button size="sm" icon={<Download />} aria-label={`CSV v${v.number}`} onClick={() => downloadCsv({ ...req, draft: v.inputs }, v.result, `v${v.number}`)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {req.versions.length > 0 && <Compare req={req} cmp={cmp} setCmp={setCmp} />}
    </div>
  );
}

function Compare({ req, cmp, setCmp }: { req: ManufacturingRequest; cmp: [string, string]; setCmp: (c: [string, string]) => void }) {
  const r = useEstimate(req)!;
  const pick = (id: string) => (id === 'current' ? { label: 'Actual (sin guardar)', inputs: req.draft, result: r } : (() => { const v = req.versions.find((x) => x.id === id)!; return v ? { label: `v${v.number} · rev. ${v.revision}`, inputs: v.inputs, result: v.result } : null; })());
  const a = pick(cmp[0]);
  const b = pick(cmp[1]);
  const ops = useMemo(() => {
    if (!a || !b) return [];
    const names = [...new Set([...a.result.operations.map((o) => o.name), ...b.result.operations.map((o) => o.name)])];
    return names.map((n) => [n, a.result.operations.find((o) => o.name === n)?.totalMin, b.result.operations.find((o) => o.name === n)?.totalMin] as const);
  }, [a, b]);
  if (!a || !b) return null;
  const opts = [...req.versions.map((v) => ({ id: v.id, label: `v${v.number} · rev. ${v.revision} · ${v.quantity} uds` })), { id: 'current', label: 'Actual' }];
  const rows: [string, string, string][] = [
    ['Revisión', a.inputs.revision, b.inputs.revision], ['Lote', `${a.inputs.quantity} uds`, `${b.inputs.quantity} uds`],
    ['Material', a.inputs.material ? MATERIALS[a.inputs.material].shortName : '—', b.inputs.material ? MATERIALS[b.inputs.material].shortName : '—'],
    ['Tiempo lote', `${numSmart(a.result.estimatedLotMin, 1)} min`, `${numSmart(b.result.estimatedLotMin, 1)} min`],
    ['Preparación', `${numSmart(a.result.setupTotalMin)} min`, `${numSmart(b.result.setupTotalMin)} min`],
    ['Por pieza', `${num(a.result.perPieceMin, 2)} min`, `${num(b.result.perPieceMin, 2)} min`],
    ['Precio total', eur(a.result.cost.commercialTotalEur), eur(b.result.cost.commercialTotalEur)],
  ];
  return (
    <Card>
      <CardHeader title="Comparar versiones" actions={
        <div className="flex gap-2">
          <Select value={cmp[0]} onChange={(e) => setCmp([e.target.value, cmp[1]])} className="h-8 py-1 text-[13px]" aria-label="Versión A">{opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</Select>
          <Select value={cmp[1]} onChange={(e) => setCmp([cmp[0], e.target.value])} className="h-8 py-1 text-[13px]" aria-label="Versión B">{opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</Select>
        </div>
      } />
      <div className="grid gap-6 p-4 lg:grid-cols-2">
        <table className="text-[13.5px]">
          <thead><tr className="text-[12px] text-ink-3"><th className="py-1 text-left font-medium" /><th className="py-1 text-right font-medium">{a.label}</th><th className="py-1 text-right font-medium">{b.label}</th></tr></thead>
          <tbody>{rows.map(([k, x, y]) => <tr key={k} className="border-t border-line"><td className="py-1.5 text-ink-3">{k}</td><td className="py-1.5 text-right tabular">{x}</td><td className={cx('py-1.5 text-right tabular', x !== y && 'font-semibold text-[#8a6100]')}>{y}</td></tr>)}</tbody>
        </table>
        <table className="text-[13.5px]">
          <thead><tr className="text-[12px] text-ink-3"><th className="py-1 text-left font-medium">Operación</th><th className="py-1 text-right font-medium">A (min)</th><th className="py-1 text-right font-medium">B (min)</th><th className="py-1 text-right font-medium">Δ</th></tr></thead>
          <tbody>{ops.map(([n, x, y]) => <tr key={n} className="border-t border-line"><td className="py-1.5">{n}</td><td className="py-1.5 text-right tabular">{x != null ? numSmart(x, 1) : '—'}</td><td className="py-1.5 text-right tabular">{y != null ? numSmart(y, 1) : '—'}</td><td className={cx('py-1.5 text-right tabular', x != null && y != null && Math.abs(y - x) > 0.01 && 'text-[#8a6100]')}>{x != null && y != null ? `${y - x >= 0 ? '+' : ''}${numSmart(y - x, 1)}` : '—'}</td></tr>)}</tbody>
        </table>
      </div>
    </Card>
  );
}
