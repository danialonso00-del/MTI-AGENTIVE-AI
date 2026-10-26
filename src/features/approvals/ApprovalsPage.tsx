import { AlertTriangle, Check, CheckSquare, ExternalLink, FileCheck2, History, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, CardHeader, EmptyState } from '@/components/ui';
import { BrandLogo } from '@/components/layout/Brand';
import { useStudio } from '@/store/useStudio';
import { pendingApprovals } from '@/store/selectors';
import { dateTimeEs, eur, numSmart } from '@/lib/format';
import { ApproveModal } from '../manufacturing/ApproveModal';

export default function ApprovalsPage() {
  const requests = useStudio((s) => s.requests);
  const inbox = useStudio((s) => s.erp.inbox);
  const applyAction = useStudio((s) => s.applyErpAction);
  const reject = useStudio((s) => s.rejectErpAction);
  const pending = useMemo(() => pendingApprovals(requests, inbox), [requests, inbox]);
  const [modalId, setModalId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const modalReq = requests.find((r) => r.id === modalId);

  const history = useMemo(() => [
    ...requests.flatMap((r) => r.versions.filter((v) => v.approval).map((v) => ({ at: v.approval!.approvedAt, by: v.approval!.approvedBy, what: `${r.ref} · v${v.number} (rev. ${v.revision})`, detail: `${numSmart(v.result.estimatedLotMin, 1)} min · ${eur(v.result.cost.commercialTotalEur)}`, valid: r.approval?.versionId === v.id && !r.approval.invalidatedAt, to: `/fabricacion/${r.id}/versiones` }))),
    ...inbox.flatMap((i) => i.actions.filter((a) => a.status === 'applied').map((a) => ({ at: a.appliedAt ?? i.receivedAt, by: 'Usuario', what: a.title, detail: a.result?.name ?? 'Borrador aprobado', valid: true, to: `/odoo/bandeja/${i.id}` }))),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12), [requests, inbox]);

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6">
      <p className="text-[13px] font-medium text-[#8a6100]">Operaciones · revisión humana</p>
      <h1 className="mt-1 text-[28px] font-semibold tracking-tight md:text-[32px]">Aprobaciones</h1>
      <p className="mt-1 max-w-3xl text-[14.5px] text-ink-3">Los agentes preparan; las personas deciden. Cada aprobación queda ligada a una versión exacta y ninguna escritura en el ERP ocurre sin pasar por aquí o por su espacio de trabajo.</p>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Ofertas de fabricación" icon={<FileCheck2 />} subtitle={`${pending.reqs.length} versiones esperando aprobación`} />
            {pending.reqs.length === 0 ? <EmptyState icon={<CheckSquare />} title="Nada pendiente">Las ofertas aparecen aquí cuando los agentes terminan la estimación y el borrador.</EmptyState> : (
              <ul className="divide-y divide-line">
                {pending.reqs.map(({ req, minutes, price, uncertainties, invalidated }) => (
                  <li key={req.id} className="flex flex-wrap items-center gap-4 px-4 py-3.5" data-approval={req.id}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="font-mono text-[12px] text-ink-3">{req.ref}</span>{invalidated && <Badge tone="warn">Aprobación anterior anulada</Badge>}</div>
                      <Link to={`/fabricacion/${req.id}/estimacion`} className="text-[14.5px] font-semibold hover:underline">{req.subject}</Link>
                      <div className="text-[12.5px] text-ink-3">{req.customer.company} · rev. {req.draft.revision}</div>
                    </div>
                    <div className="text-right text-[13px]"><div className="font-semibold tabular">{eur(price)}</div><div className="text-ink-3 tabular">{numSmart(minutes, 1)} min</div></div>
                    {uncertainties > 0 ? <Badge tone="warn"><AlertTriangle className="size-3" />{uncertainties} incertidumbres</Badge> : <Badge tone="ok">Sin incertidumbres</Badge>}
                    <Button variant="primary" icon={<Check />} onClick={() => setModalId(req.id)}>Revisar y aprobar</Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title="Acciones en el ERP" icon={<BrandLogo src="/brands/odoo.svg" name="Odoo" size={18} plate={false} />} subtitle={`${pending.actions.length} escrituras propuestas por agentes`} />
            {pending.actions.length === 0 ? <EmptyState icon={<CheckSquare />} title="Nada pendiente">Ejecuta un caso de la Bandeja para que los agentes propongan acciones.</EmptyState> : (
              <ul className="divide-y divide-line">
                {pending.actions.map(({ item, action }) => (
                  <li key={action.idempotencyKey} className="flex flex-wrap items-center gap-4 px-4 py-3.5">
                    <span className="rounded-md bg-gold/12 px-1.5 py-0.5 font-mono text-[11.5px] text-[#7a5600]">{action.agent}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold">{action.title}</div>
                      <div className="text-[12.5px] text-ink-3">{action.description} · <Link className="hover:underline" to={`/odoo/bandeja/${item.id}`}>{item.subject}</Link></div>
                    </div>
                    <Button size="sm" variant="primary" icon={<Check />} disabled={busy !== null} onClick={async () => { setBusy(action.id); await applyAction(item.id, action.id); setBusy(null); }}>Aprobar y aplicar</Button>
                    <Button size="sm" variant="ghost" icon={<X />} onClick={() => reject(item.id, action.id)}>Descartar</Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card className="h-fit">
          <CardHeader title="Historial de aprobaciones" icon={<History />} />
          {history.length === 0 ? <p className="px-4 py-6 text-[13px] text-ink-3">Sin aprobaciones todavía.</p> : (
            <ol className="divide-y divide-line">
              {history.map((h, k) => (
                <li key={k} className="px-4 py-2.5">
                  <Link to={h.to} className="group flex items-start justify-between gap-2">
                    <div className="min-w-0"><div className="truncate text-[13.5px] font-medium group-hover:underline">{h.what}</div><div className="text-[12px] text-ink-3">{h.detail} · {h.by.split(' (')[0]} · {dateTimeEs(h.at)}</div></div>
                    {h.valid ? <Badge tone="ok">Vigente</Badge> : <Badge tone="warn">Anulada</Badge>}
                  </Link>
                </li>
              ))}
            </ol>
          )}
          <p className="flex items-center gap-1.5 border-t border-line px-4 py-2.5 text-[12px] text-ink-3"><ExternalLink className="size-3.5" />Cada entrada abre su versión o su caso.</p>
        </Card>
      </div>
      {modalReq && <ApproveModal req={modalReq} open onClose={() => setModalId(null)} />}
    </div>
  );
}
