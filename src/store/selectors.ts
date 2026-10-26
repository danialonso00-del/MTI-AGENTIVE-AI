// Datos derivados del estado: una sola fuente para Panel, Bandeja, Aprobaciones, Recursos y Analítica.
import type { ErpInboxItem, ProposedAction } from '@/domain/erp';
import type { ManufacturingRequest } from '@/domain/types';
import { ERP_STEPS } from '@/fixtures/erp';
import { HISTORICAL_JOBS, MACHINES } from '@/fixtures/manufacturing';
import { estimate } from '@/services/estimation/engine';
import { MANUFACTURING_FLOW } from '@/services/runs/manufacturingFlow';
import { approvalValid } from './requestOps';
import type { Run } from './useStudio';

// ── Bandeja unificada ──
export type InboxKind = 'Oferta de fabricación' | 'Solicitud de oferta' | 'Pedido' | 'Consulta de estado' | 'Pricing';
export interface UnifiedItem {
  id: string; kind: InboxKind; channel: 'email' | 'whatsapp' | 'manual'; from: string; subject: string; preview: string;
  receivedAt: string; status: 'Nuevo' | 'En curso' | 'Requiere acción' | 'Resuelto'; agent: string; to: string;
  source: { type: 'request'; req: ManufacturingRequest } | { type: 'erp'; item: ErpInboxItem };
}
const ERP_KIND: Record<ErpInboxItem['scenario'], InboxKind> = { rfq: 'Solicitud de oferta', order: 'Pedido', status: 'Consulta de estado', pricing: 'Pricing' };

export function unifiedInbox(requests: ManufacturingRequest[], inbox: ErpInboxItem[]): UnifiedItem[] {
  const fromReq = requests.map<UnifiedItem>((r) => ({
    id: r.id, kind: 'Oferta de fabricación', channel: r.channel === 'manual' ? 'manual' : 'email', from: `${r.customer.contact} · ${r.customer.company}`,
    subject: r.subject, preview: r.emails[0]?.body.split('\n').find((l) => l.trim() && !/^(hola|buen)/i.test(l.trim())) ?? '',
    receivedAt: r.receivedAt, agent: 'C01 → MTI', to: `/fabricacion/${r.id}/flujo`,
    status: r.state === 'received' ? 'Nuevo' : r.state === 'draft_created' ? 'Resuelto' : ['needs_input', 'reviewing'].includes(r.state) ? 'Requiere acción' : 'En curso',
    source: { type: 'request', req: r },
  }));
  const fromErp = inbox.map<UnifiedItem>((i) => ({
    id: i.id, kind: ERP_KIND[i.scenario], channel: i.channel, from: i.fromName, subject: i.subject, preview: i.body.split('\n').find((l) => l.trim() && !/^(hola|buen)/i.test(l.trim())) ?? i.body,
    receivedAt: i.receivedAt, agent: ERP_STEPS[i.scenario].map((s) => s.agent).filter((v, k, a) => a.indexOf(v) === k).join(' · '), to: `/odoo/bandeja/${i.id}`,
    status: i.state === 'new' ? 'Nuevo' : i.state === 'done' ? 'Resuelto' : i.state === 'in_progress' ? 'En curso' : 'Requiere acción',
    source: { type: 'erp', item: i },
  }));
  return [...fromReq, ...fromErp].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

// ── Aprobaciones ──
export interface PendingRequestApproval { type: 'request'; req: ManufacturingRequest; minutes: number; price: number; uncertainties: number; invalidated: boolean }
export interface PendingActionApproval { type: 'action'; item: ErpInboxItem; action: ProposedAction }
export function pendingApprovals(requests: ManufacturingRequest[], inbox: ErpInboxItem[]) {
  const reqs: PendingRequestApproval[] = requests
    .filter((r) => r.steps.offer?.status === 'completed' && !approvalValid(r))
    .map((r) => { const e = estimate(r.draft); return { type: 'request', req: r, minutes: e.estimatedLotMin, price: e.cost.commercialTotalEur, uncertainties: r.contradictions.length + r.fields.filter((f) => f.status === 'assumed').length, invalidated: Boolean(r.approval?.invalidatedAt) }; });
  const actions: PendingActionApproval[] = inbox.flatMap((i) => i.actions.filter((a) => a.status === 'proposed').map((a) => ({ type: 'action' as const, item: i, action: a })));
  return { reqs, actions, count: reqs.length + actions.length };
}

// ── Carga de taller ──
export const WEEK_MIN_PER_MACHINE = 5 * 7.5 * 60 * 0.6; // 5 días × 7,5 h × 60 % disponibilidad (fixture)
export function workshopLoad(requests: ManufacturingRequest[]) {
  const byWc: Record<string, { minutes: number; machines: number; contributions: { ref: string; id: string; minutes: number }[] }> = {};
  for (const m of MACHINES) { byWc[m.workcenter] ??= { minutes: 0, machines: 0, contributions: [] }; byWc[m.workcenter].machines++; }
  for (const r of requests) {
    if (r.steps.estimate?.status !== 'completed') continue;
    const e = estimate(r.draft);
    if (e.blocked.length) continue;
    for (const [wc, min] of Object.entries(e.machineMinByWorkcenter)) {
      byWc[wc].minutes += min;
      byWc[wc].contributions.push({ ref: r.ref, id: r.id, minutes: min });
    }
  }
  return Object.entries(byWc).map(([wc, v]) => ({ workcenter: wc, ...v, capacity: v.machines * WEEK_MIN_PER_MACHINE, utilization: v.minutes / (v.machines * WEEK_MIN_PER_MACHINE) }));
}

// ── Actividad por agente ──
const STEP_AGENTS: Record<string, string[]> = Object.fromEntries(MANUFACTURING_FLOW.map((s) => [s.id, [...s.agents, ...s.tools]]));
export function agentActivity(runs: Run[]) {
  const counts: Record<string, { steps: number; last?: string }> = {};
  for (const run of runs) {
    for (const ev of run.events) {
      if (ev.status === 'running') continue;
      let agents: string[] = [];
      if (run.kind === 'manufacturing') agents = STEP_AGENTS[ev.stepId] ?? [];
      else if (run.kind === 'erp') agents = Object.values(ERP_STEPS).flat().filter((s) => s.id === ev.stepId).map((s) => s.agent).slice(0, 1);
      else agents = ['MTI'];
      for (const a of agents) {
        counts[a] ??= { steps: 0 };
        counts[a].steps++;
        if (!counts[a].last || ev.timestamp > counts[a].last!) counts[a].last = ev.timestamp;
      }
    }
  }
  return counts;
}

// ── Evaluación leave-one-out del corrector sobre el histórico sintético ──
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export function correctorEvaluation() {
  const eligible = HISTORICAL_JOBS.filter((j) => j.quantity > 5);
  return eligible.map((job) => {
    const peers = eligible.filter((p) => p.id !== job.id && p.family === job.family && p.material === job.material && Boolean(p.features.pocket) === Boolean(job.features.pocket));
    let rule = 0, real = 0, corrected = 0;
    for (const op of job.ops) {
      const ratios = peers.map((p) => p.ops.find((o) => o.kind === op.kind)).filter(Boolean).map((o) => o!.realCycleMin / o!.ruleCycleMin);
      const f = ratios.length >= 2 ? median(ratios) : 1;
      rule += op.ruleCycleMin; real += op.realCycleMin; corrected += op.ruleCycleMin * f;
    }
    return { ref: job.ref, partName: job.partName, peers: peers.length, ruleErrPct: (Math.abs(rule - real) / real) * 100, corrErrPct: (Math.abs(corrected - real) / real) * 100 };
  });
}
