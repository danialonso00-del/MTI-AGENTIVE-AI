import { ArrowUpRight, Copy, Download, FileCheck2, FileText, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ManufacturingRequest } from '@/domain/types';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { templateModel } from '@/adapters/llm/languageModel';
import { useStudio } from '@/store/useStudio';
import { approvalValid } from '@/store/requestOps';
import { eur } from '@/lib/format';
import { useEstimate } from '../hooks';
import { downloadCsv } from '../exports';

export function OfferTab({ req, onApprove }: { req: ManufacturingRequest; onApprove: () => void }) {
  const r = useEstimate(req)!;
  const createErp = useStudio((s) => s.createErpDraft);
  const toast = useStudio((s) => s.toast);
  const valid = approvalValid(req, r.inputHash);
  const so = useStudio((s) => (req.erpRef ? s.erp.saleOrders.find((o) => o.id === req.erpRef!.localId) : undefined));
  const version = req.approval ? req.versions.find((v) => v.id === req.approval!.versionId) : req.versions.at(-1);
  if (!r.operations.length) return <Card className="p-10 text-center text-[14px] text-ink-3">La oferta se genera cuando la estimación no está bloqueada.</Card>;
  const offerText = templateModel.draftOfferText(req, r);
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4">
        <Card>
          <CardHeader title="Coste y precio" icon={<Receipt />} subtitle="Los minutos no son precio: se añaden material, subcontratación e indirectos de forma explícita" />
          <table className="w-full text-[14px]">
            <tbody>
              {r.cost.lines.map((l) => (
                <tr key={l.label} className="border-b border-line">
                  <td className="px-4 py-3"><div className="font-medium">{l.label}</div><div className="text-[12.5px] text-ink-3">{l.detail}</div></td>
                  <td className="px-4 py-3 text-right tabular">{eur(l.amountEur)}</td>
                </tr>
              ))}
              <tr className="border-b border-line bg-canvas/70 font-semibold"><td className="px-4 py-3">Coste total</td><td className="px-4 py-3 text-right tabular">{eur(r.cost.totalCostEur)}</td></tr>
              <tr className="border-b border-line"><td className="px-4 py-3"><div className="font-medium">Regla comercial</div><div className="text-[12.5px] text-ink-3">{r.cost.ruleText}</div></td><td className="px-4 py-3 text-right tabular">{eur(r.cost.priceEur)}</td></tr>
              <tr className="bg-gold/10"><td className="px-4 py-3.5"><div className="font-semibold text-[#7a5600]">Precio de oferta (sin IVA)</div><div className="text-[12.5px] text-[#7a5600]/80">Unitario redondeado a céntimos: {eur(r.cost.commercialUnitEur)} × {req.draft.quantity} uds</div></td><td className="px-4 py-3.5 text-right text-[20px] font-semibold tabular text-[#7a5600]">{eur(r.cost.commercialTotalEur)}</td></tr>
            </tbody>
          </table>
        </Card>
        <Card>
          <CardHeader title="Borrador de oferta" icon={<FileText />} subtitle={templateModel.label} actions={<Button size="sm" icon={<Copy />} onClick={() => { navigator.clipboard?.writeText(offerText); toast('info', 'Texto copiado'); }}>Copiar</Button>} />
          <pre className="whitespace-pre-wrap px-4 py-4 font-sans text-[14px] leading-relaxed text-ink-2">{offerText}</pre>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader title="Presupuesto en el ERP" icon={<img src="/brands/odoo.svg" alt="" className="h-3.5" />} subtitle="Representación MTI de datos Odoo · modo demo" />
          <div className="space-y-3 p-4">
            {so ? (
              <Link to={`/odoo/ventas/${so.id}`} className="flex items-center justify-between rounded-xl bg-ok-bg px-4 py-3 ring-1 ring-ok/20 transition-shadow hover:ring-ok/50">
                <div><div className="text-[15px] font-semibold text-ok">{so.name}</div><div className="text-[12.5px] text-ok/80">sale.order · {so.state === 'draft' ? 'borrador' : so.state} · {so.origin}</div></div>
                <ArrowUpRight className="size-5 text-ok" />
              </Link>
            ) : (
              <p className="text-[13.5px] text-ink-3">Aún no hay presupuesto. La primera escritura permitida es un presupuesto borrador de una versión aprobada.</p>
            )}
            {so && !valid && <p className="rounded-lg bg-warn-bg px-3 py-2 text-[12.5px] text-warn">El presupuesto {so.name} corresponde a una versión anterior. Aprueba la versión actual para crear uno nuevo.</p>}
            {!valid ? (
              <Button variant="primary" className="w-full" icon={<FileCheck2 />} onClick={onApprove}>Revisar y aprobar</Button>
            ) : (
              <Button variant="primary" className="w-full" onClick={() => createErp(req.id)} disabled={Boolean(so && req.steps.output?.status === 'completed')} disabledReason="Ya existe el presupuesto de esta versión">Crear presupuesto borrador</Button>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Exportar" icon={<Download />} subtitle="Mismos tiempos, cantidades, moneda y supuestos" />
          <div className="flex flex-col gap-2 p-4">
            <Button icon={<Download />} onClick={() => downloadCsv(req)}>CSV de la estimación actual</Button>
            <Button icon={<FileText />} disabled={!version} disabledReason="Guarda una versión para generar el informe" onClick={() => window.open(`/informe/${req.id}/${version!.id}`, '_blank')}>Informe PDF {version ? `(v${version.number})` : ''}</Button>
            <p className="text-[12px] text-ink-3">El informe se genera con el contenido real de la versión y se guarda como PDF desde el diálogo de impresión.</p>
          </div>
        </Card>
        {req.replyDraft && req.steps.output?.status === 'completed' && (
          <Card>
            <CardHeader title="Respuesta al cliente" subtitle="Borrador · no enviado" actions={<Badge tone="neutral">Borrador</Badge>} />
            <pre className="whitespace-pre-wrap px-4 py-3 font-sans text-[13.5px] leading-relaxed text-ink-2">{req.replyDraft}</pre>
          </Card>
        )}
      </div>
    </div>
  );
}
