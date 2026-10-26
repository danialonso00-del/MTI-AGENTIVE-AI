import { useCallback, useMemo, useRef, useState } from 'react';
import type { ManufacturingRequest } from '@/domain/types';
import { estimate } from '@/services/estimation/engine';
import { useStudio } from '@/store/useStudio';
import { approvalValid, nextRunnableStep } from '@/store/requestOps';
import { MANUFACTURING_FLOW } from '@/services/runs/manufacturingFlow';
import { useMotionOff } from '@/lib/useMotion';

export function useRequest(id?: string) {
  return useStudio((s) => s.requests.find((r) => r.id === id));
}

export function useEstimate(req?: ManufacturingRequest) {
  return useMemo(() => (req ? estimate(req.draft) : undefined), [req]);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Ejecuta pasos con una fase visual «en curso» breve; el trabajo real lo hace el store. */
export function useStepRunner(reqId: string) {
  const [runningId, setRunningId] = useState<string | null>(null);
  const busy = useRef(false);
  const motionOff = useMotionOff();
  const speed = useStudio((s) => s.ui.speed);
  const store = useStudio;

  const runOne = useCallback(async (stepId?: string) => {
    if (busy.current) return null;
    const req = store.getState().requests.find((r) => r.id === reqId);
    if (!req) return null;
    const id = stepId ?? nextRunnableStep(req);
    if (!id) return null;
    busy.current = true;
    setRunningId(id);
    if (!motionOff) await sleep(650 / speed);
    if (stepId) await store.getState().runStep(reqId, stepId);
    else await store.getState().runNext(reqId);
    setRunningId(null);
    busy.current = false;
    return id;
  }, [reqId, motionOff, speed, store]);

  const runToReview = useCallback(async () => {
    for (let i = 0; i < 8; i++) {
      const req = store.getState().requests.find((r) => r.id === reqId)!;
      const id = nextRunnableStep(req);
      if (!id || id === 'output') return;
      const idx = MANUFACTURING_FLOW.findIndex((s) => s.id === id);
      const prev = idx > 0 ? req.steps[MANUFACTURING_FLOW[idx - 1].id]?.status : 'completed';
      if (prev !== 'completed') return;
      if (id === 'review' && req.steps.review?.status === 'needs_input') return;
      await runOne();
      const after = store.getState().requests.find((r) => r.id === reqId)!;
      if (after.steps[id]?.status !== 'completed') return;
      if (!motionOff) await sleep(900 / speed);
    }
  }, [reqId, runOne, motionOff, speed, store]);

  return { runningId, runOne, runToReview, busy: runningId !== null };
}

export interface NextAction {
  kind: 'run' | 'review' | 'erp' | 'open' | 'input' | 'revision';
  label: string;
  stepId?: string;
  disabledReason?: string;
}

export function nextAction(req: ManufacturingRequest): NextAction {
  if (req.pendingRevision) return { kind: 'revision', label: `Incorporar rev. ${req.pendingRevision.revision}` };
  const blockedStep = MANUFACTURING_FLOW.find((s) => req.steps[s.id]?.status === 'needs_input' && s.id !== 'review' && s.id !== 'output');
  if (blockedStep) return { kind: 'input', label: blockedStep.id === 'estimate' ? 'Resolver bloqueo' : 'Completar dato', stepId: blockedStep.id };
  const id = nextRunnableStep(req);
  if (!id) return { kind: 'open', label: `Abrir ${req.erpRef?.name ?? 'presupuesto'}` };
  if (id === 'review') return { kind: 'review', label: 'Revisar y aprobar' };
  if (id === 'output') {
    if (req.steps.output?.status === 'needs_input') return { kind: 'input', label: 'Dar de alta contacto', stepId: 'output' };
    return approvalValid(req) ? { kind: 'erp', label: 'Crear presupuesto en Odoo' } : { kind: 'review', label: 'Revisar y aprobar' };
  }
  const def = MANUFACTURING_FLOW.find((s) => s.id === id)!;
  return { kind: 'run', label: `Ejecutar: ${def.title}`, stepId: id };
}
