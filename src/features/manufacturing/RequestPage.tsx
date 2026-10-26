import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft, ChevronDown, Download, FileText, GitBranch, Mail, MoreHorizontal, Play, RotateCcw, Sparkles, UserPlus,
} from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, RouteTabs, StatePill } from '@/components/ui';
import { EvidenceProvider } from '@/components/evidence/Evidence';
import { useStudio } from '@/store/useStudio';
import { approvalValid } from '@/store/requestOps';
import { cx, dateTimeEs } from '@/lib/format';
import { nextAction, useEstimate, useRequest, useStepRunner } from './hooks';
import { ApproveModal } from './ApproveModal';
import { downloadCsv } from './exports';
import { FlowTab } from './tabs/FlowTab';
import { MailTab } from './tabs/MailTab';
import { EstimateTab } from './tabs/EstimateTab';
import { HistoryTab } from './tabs/HistoryTab';
import { OfferTab } from './tabs/OfferTab';
import { VersionsTab } from './tabs/VersionsTab';
import { ActivityTab } from './tabs/ActivityTab';

const PartTab = lazy(() => import('./tabs/PartTab'));

const TABS = [
  ['flujo', 'Flujo'], ['correo', 'Correo y adjuntos'], ['pieza', 'Pieza'], ['historico', 'Histórico'],
  ['estimacion', 'Estimación'], ['oferta', 'Oferta'], ['versiones', 'Versiones'], ['actividad', 'Actividad'],
] as const;

export default function RequestPage() {
  const { id, tab = 'flujo' } = useParams();
  const req = useRequest(id);
  const meeting = useStudio((s) => s.ui.meeting);
  const nav = useNavigate();
  const [approveOpen, setApproveOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const runner = useStepRunner(id ?? '');
  const createErp = useStudio((s) => s.createErpDraft);
  const applyRev = useStudio((s) => s.applyPendingRevision);
  const resetRequest = useStudio((s) => s.resetRequest);
  const createPartner = useStudio((s) => s.createPartnerForRequest);
  const r = useEstimate(req);

  if (!req) return <Navigate to="/fabricacion" replace />;
  if (!TABS.some(([k]) => k === tab)) return <Navigate to={`/fabricacion/${req.id}/flujo`} replace />;

  const action = nextAction(req);
  const onPrimary = async () => {
    switch (action.kind) {
      case 'run': await runner.runOne(); if (tab !== 'flujo') nav(`/fabricacion/${req.id}/flujo`); break;
      case 'review': setApproveOpen(true); break;
      case 'erp': await createErp(req.id); break;
      case 'open': if (req.erpRef) nav(`/odoo/ventas/${req.erpRef.localId}`); break;
      case 'revision': applyRev(req.id); nav(`/fabricacion/${req.id}/flujo`); break;
      case 'input':
        if (action.stepId === 'output') createPartner(req.id);
        else nav(`/fabricacion/${req.id}/${action.stepId === 'estimate' ? 'estimacion' : 'correo'}`);
        break;
    }
  };
  const approvedVersion = req.approval && req.versions.find((v) => v.id === req.approval!.versionId);
  const valid = approvalValid(req);

  return (
    <EvidenceProvider req={req}>
      <div className="min-h-[calc(100vh-56px)]">
        <div className={cx('border-b border-line bg-white', meeting && 'hidden')}>
          <div className="mx-auto max-w-[1680px] px-4 pt-4 md:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <Link to="/fabricacion" className="mb-2 inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink"><ArrowLeft className="size-3.5" /> Bandeja de ofertas</Link>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-[13px] text-ink-3">{req.ref}</span>
                  <StatePill state={req.state} />
                  <Badge tone="neutral"><GitBranch className="size-3" /> Rev. {req.currentRevision}</Badge>
                  {req.pendingRevision && <Badge tone="warn">Rev. {req.pendingRevision.revision} recibida · pendiente</Badge>}
                  {approvedVersion && (valid ? <Badge tone="ok">v{approvedVersion.number} aprobada</Badge> : <Badge tone="warn">Aprobación v{approvedVersion.number} anulada</Badge>)}
                  {req.channel === 'manual' && <Badge tone="info">Alta manual</Badge>}
                </div>
                <h1 className="mt-1.5 text-[22px] font-semibold tracking-tight text-ink md:text-[26px]">{req.subject}</h1>
                <p className="mt-0.5 text-[13.5px] text-ink-3">{req.customer.company} · {req.customer.contact} · recibida {dateTimeEs(req.receivedAt)}{r && !r.blocked.length && r.operations.length > 0 && <> · <span className="tabular text-ink-2">{r.estimatedLotMin.toLocaleString('es-ES', { maximumFractionDigits: 1 })} min · {r.cost.commercialTotalEur.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span></>}</p>
              </div>
              <div className="flex items-center gap-2">
                {action.kind === 'run' && (
                  <Button variant="secondary" icon={<Sparkles />} onClick={() => { runner.runToReview(); if (tab !== 'flujo') nav(`/fabricacion/${req.id}/flujo`); }} disabled={runner.busy} disabledReason="Hay un paso en ejecución">Hasta revisión</Button>
                )}
                <Button variant="primary" onClick={onPrimary} disabled={runner.busy} disabledReason="Hay un paso en ejecución" data-testid="primary-action"
                  icon={action.kind === 'run' ? <Play /> : action.kind === 'erp' ? <img src="/brands/odoo.svg" alt="" className="h-3.5" /> : action.kind === 'input' && action.stepId === 'output' ? <UserPlus /> : action.kind === 'review' ? <FileText /> : undefined}>
                  {action.label}
                </Button>
                <div className="relative">
                  <Button variant="secondary" icon={<MoreHorizontal />} aria-label="Más acciones" onClick={() => setMenu((v) => !v)} iconRight={<ChevronDown />} />
                  <AnimatePresence>
                    {menu && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}
                          className="absolute right-0 top-11 z-40 w-[270px] rounded-xl bg-white p-1.5 shadow-[var(--shadow-pop)] ring-1 ring-ink/10">
                          <MenuItem icon={<Download />} disabled={!r || r.operations.length === 0} onClick={() => { downloadCsv(req); setMenu(false); }}>Exportar CSV de la estimación</MenuItem>
                          <MenuItem icon={<FileText />} disabled={req.versions.length === 0} hint={req.versions.length === 0 ? 'Guarda una versión primero' : undefined} onClick={() => { window.open(`/informe/${req.id}/${(approvedVersion ?? req.versions.at(-1))!.id}`, '_blank'); setMenu(false); }}>Informe PDF de la versión</MenuItem>
                          {req.id === 'rfq-2026-0042' && !req.emails.some((e) => e.id === 'mail-42-3') && (
                            <MenuItem icon={<Mail />} onClick={() => { useStudio.getState().receiveRevisionC(req.id); setMenu(false); }}>Simular llegada de Rev. C</MenuItem>
                          )}
                          <div className="my-1 h-px bg-line" />
                          {!req.id.startsWith('rfq-2026-00') || req.channel === 'manual' ? null : (
                            <MenuItem icon={<RotateCcw />} onClick={() => { resetRequest(req.id); setMenu(false); }}>Restablecer expediente</MenuItem>
                          )}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
            <RouteTabs className="mt-3 -mb-px pb-2" tabs={TABS.map(([k, label]) => ({
              to: `/fabricacion/${req.id}/${k}`, label,
              badge: k === 'correo' && req.fields.some((f) => f.status === 'missing' && ['material', 'quantity'].includes(f.key)) ? <span className="size-1.5 rounded-full bg-warn" /> :
                k === 'versiones' && req.versions.length ? <span className="rounded-full bg-ink/[0.06] px-1.5 text-[11px] tabular">{req.versions.length}</span> : undefined,
            }))} />
          </div>
        </div>

        <div className={cx('mx-auto max-w-[1680px] px-4 py-4 md:px-6 md:py-5', meeting && 'max-w-none')}>
          {tab === 'flujo' && <FlowTab req={req} runner={runner} onApprove={() => setApproveOpen(true)} />}
          {tab === 'correo' && <MailTab req={req} />}
          {tab === 'pieza' && <Suspense fallback={<div className="skeleton h-[520px] rounded-2xl" />}><PartTab req={req} /></Suspense>}
          {tab === 'historico' && <HistoryTab req={req} />}
          {tab === 'estimacion' && <EstimateTab req={req} onApprove={() => setApproveOpen(true)} />}
          {tab === 'oferta' && <OfferTab req={req} onApprove={() => setApproveOpen(true)} />}
          {tab === 'versiones' && <VersionsTab req={req} />}
          {tab === 'actividad' && <ActivityTab req={req} />}
        </div>
      </div>
      <ApproveModal req={req} open={approveOpen} onClose={() => setApproveOpen(false)} />
    </EvidenceProvider>
  );
}

function MenuItem({ icon, children, onClick, disabled, hint }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; disabled?: boolean; hint?: string }) {
  return (
    <button disabled={disabled} title={hint} onClick={onClick} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] text-ink-2 hover:bg-ink/[0.04] hover:text-ink disabled:opacity-40 [&>svg]:size-4 [&>svg]:text-ink-3">
      {icon}<span className="flex-1">{children}</span>
    </button>
  );
}
