// Operaciones puras sobre un expediente. El store las orquesta; los tests las usan directamente.
import type { ActivityEntry, EstimateInputs, EstimateVersion, ManufacturingRequest, RunState, StepRecord } from '@/domain/types';
import { estimate } from '@/services/estimation/engine';
import { executeStep, MANUFACTURING_FLOW, newActivity } from '@/services/runs/manufacturingFlow';
import { uid } from '@/lib/format';

export const STEP_ORDER = MANUFACTURING_FLOW.map((s) => s.id);

export function approvalValid(req: ManufacturingRequest, hash = estimate(req.draft).inputHash): boolean {
  return Boolean(req.approval && !req.approval.invalidatedAt && req.approval.approvedInputHash === hash);
}

/** Estado del run derivado de los pasos: una única fuente de verdad. */
export function deriveState(req: ManufacturingRequest): RunState {
  const st = (id: string) => req.steps[id]?.status ?? 'idle';
  if (['intake', 'cad', 'estimate', 'offer'].some((id) => st(id) === 'needs_input')) return 'needs_input';
  if (STEP_ORDER.some((id) => st(id) === 'failed')) return 'failed';
  const valid = approvalValid(req);
  if (st('output') === 'completed' && req.erpRef && valid) return 'draft_created';
  if (st('review') === 'completed' && valid) return 'approved';
  if (st('offer') === 'completed') return 'reviewing';
  if (st('estimate') === 'completed') return 'estimating';
  if (st('history') === 'completed') return 'retrieving';
  if (st('intake') === 'completed') return 'extracting';
  return 'received';
}

export function applyStepResult(req: ManufacturingRequest, stepId: string, now: string, durationMs = 0): ManufacturingRequest {
  const ex = executeStep(req, stepId);
  const { state: _ignored, ...patch } = ex.patch;
  void _ignored;
  const step: StepRecord = { stepId, status: ex.status, startedAt: now, finishedAt: now, durationMs, summary: ex.summary, outputs: ex.outputs };
  const next: ManufacturingRequest = {
    ...req, ...patch,
    steps: { ...req.steps, [stepId]: step },
    activity: [...req.activity, ...ex.activity.map((a) => newActivity(a, now))],
  };
  return { ...next, state: deriveState(next) };
}

/** Tras cambiar inputs: recalcula pasos ya completados, anula aprobación si el hash cambia. */
export function afterDraftChange(req: ManufacturingRequest, reason: string, now: string, actor = 'Usuario'): ManufacturingRequest {
  const r = estimate(req.draft);
  let next = { ...req };
  const extra: ActivityEntry[] = [];
  if (next.approval && !next.approval.invalidatedAt && next.approval.approvedInputHash !== r.inputHash) {
    const v = next.versions.find((x) => x.id === next.approval!.versionId);
    next.approval = { ...next.approval, invalidatedAt: now, invalidatedReason: reason };
    extra.push(newActivity({ actor: 'C08', kind: 'warning', text: `Aprobación de v${v?.number ?? '?'} anulada: ${reason}` }, now));
  }
  extra.push(newActivity({ actor, kind: 'human', text: reason }, now));
  next.activity = [...next.activity, ...extra];
  for (const id of ['cad', 'history', 'estimate', 'offer', 'review'] as const) {
    const s = next.steps[id];
    if (s && s.status !== 'idle') next = applyStepResult(next, id, now);
  }
  if (next.steps.output?.status === 'completed' && !approvalValid(next)) {
    next.steps = { ...next.steps, output: { ...next.steps.output, status: 'idle', summary: `Borrador previo ${next.erpRef?.name ?? ''} vinculado a otra versión` } };
  }
  return { ...next, state: deriveState(next) };
}

export function updateDraft(req: ManufacturingRequest, patch: Partial<EstimateInputs>, reason: string, now: string, actor?: string) {
  return afterDraftChange({ ...req, draft: { ...req.draft, ...patch } }, reason, now, actor);
}

export function saveVersion(req: ManufacturingRequest, by: string, now: string, note?: string): { req: ManufacturingRequest; version: EstimateVersion } {
  const r = estimate(req.draft);
  const same = req.versions.find((v) => v.inputHash === r.inputHash);
  if (same) return { req, version: same };
  const version: EstimateVersion = {
    id: uid('ver'), requestId: req.id, number: req.versions.length + 1, revision: req.draft.revision, inputHash: r.inputHash,
    quantity: req.draft.quantity, inputs: structuredClone(req.draft), result: r, assumptions: r.assumptions, missingFields: r.missingFields,
    createdAt: now, createdBy: by, note,
  };
  return {
    req: { ...req, versions: [...req.versions, version], activity: [...req.activity, newActivity({ actor: by, kind: 'human', text: `Versión v${version.number} guardada (rev. ${version.revision}, ${version.quantity} uds, hash ${r.inputHash.slice(0, 8)})` }, now)] },
    version,
  };
}

export function approveVersion(req: ManufacturingRequest, versionId: string, by: string, now: string, comment?: string): ManufacturingRequest {
  const v = req.versions.find((x) => x.id === versionId);
  if (!v) throw new Error('Versión no encontrada');
  const current = estimate(req.draft);
  if (v.inputHash !== current.inputHash) throw new Error('La versión no coincide con los inputs actuales: guarda una versión nueva antes de aprobar');
  if (current.blocked.length) throw new Error('No se puede aprobar una estimación bloqueada');
  const approval = { approvedInputHash: v.inputHash, approvedBy: by, approvedAt: now, comment };
  let next: ManufacturingRequest = {
    ...req,
    versions: req.versions.map((x) => (x.id === versionId ? { ...x, approval } : x)),
    approval: { versionId, ...approval },
    activity: [...req.activity, newActivity({ actor: by, kind: 'success', text: `Aprobada v${v.number} · hash ${v.inputHash.slice(0, 8)}${comment ? ` · «${comment}»` : ''}` }, now)],
  };
  next = applyStepResult(next, 'review', now);
  return next;
}

export function nextRunnableStep(req: ManufacturingRequest): string | null {
  for (const id of STEP_ORDER) {
    const s = req.steps[id]?.status ?? 'idle';
    if (s === 'completed') continue;
    return id;
  }
  return null;
}
