// Store central (Zustand + persistencia local versionada). Grafo, inspector, tablas y ERP leen este estado.
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { ErpInboxItem, ErpState, ProposedAction, SaleLine } from '@/domain/erp';
import type {
  Attachment, EstimateInputs, FieldKey, IntegrationConfig, ManufacturingRequest, MaterialId, OperationOverride, PartFeatures, RunEvent, StepStatus,
} from '@/domain/types';
import { SCHEMA_VERSION } from '@/domain/types';
import { DemoErpAdapter, writeDraftQuotation as writeDraftQuotationSync, writePartner } from '@/adapters/demo/demoErpAdapter';
import { ErpTimeoutError } from '@/adapters/ErpAdapter';
import { templateModel } from '@/adapters/llm/languageModel';
import { ERP_STEPS, seedErp } from '@/fixtures/erp';
import { seedIntegrations, CONNECTORS } from '@/fixtures/integrations';
import { DATASET_VERSION, MATERIALS } from '@/fixtures/manufacturing';
import { emptySteps, FIELD_LABEL, REV_C_FIXTURE, resolveMaterial, seedRequests } from '@/fixtures/requests';
import { estimate } from '@/services/estimation/engine';
import { executeErpStep } from '@/services/runs/erpFlow';
import { MANUFACTURING_FLOW, newActivity } from '@/services/runs/manufacturingFlow';
import { stableHash } from '@/lib/hash';
import { buildCrmActions, parseVoiceNote, type CrmAction, type VoiceParse } from '@/services/crm/voiceNote';
import type { Lead } from '@/domain/erp';
import { TENDERS } from '@/fixtures/tenders';
import { DEFAULT_TENDER_PARAMS, estimateTender, screenTender, type TenderParams } from '@/services/tenders/tenderEngine';
import { uid } from '@/lib/format';
import {
  afterDraftChange, applyStepResult, approvalValid, approveVersion, deriveState, nextRunnableStep, saveVersion, updateDraft,
} from './requestOps';

export const DEMO_USER = 'Usuario demo (Oficina técnica)';
const now = () => new Date().toISOString();

export interface RunSnapshot { stepId: string; status: StepStatus; summary?: string; outputs?: Record<string, unknown>; at: string }
export interface Run {
  id: string; kind: 'manufacturing' | 'erp' | 'catalog' | 'crm' | 'tender'; subjectId: string; subjectRef: string; title: string; scenario: string;
  startedAt: string; updatedAt: string; status: 'running' | 'needs_input' | 'completed' | 'failed';
  mode: 'work' | 'guided'; events: RunEvent[]; outputs: Record<string, RunSnapshot>;
}

export interface UiState {
  mode: 'work' | 'guided';
  meeting: boolean;
  speed: 0.5 | 1 | 2;
  motion: 'system' | 'reduced' | 'full';
  user: string;
  role?: string;
  sidebarCollapsed?: boolean;
}

export interface Settings {
  company: string;
  defaultMarginPct: number;
  defaultIndirectPct: number;
  autoProcessInbox: boolean;
}

export const DEFAULT_SETTINGS: Settings = { company: 'Talleres Delta', defaultMarginPct: 22, defaultIndirectPct: 12, autoProcessInbox: false };

export interface VoiceNote {
  id: string; at: string; source: 'micrófono' | 'ejemplo' | 'texto'; sampleId?: string; transcript: string;
  parse: Omit<VoiceParse, 'partner' | 'lead'> & { partnerId?: string; partnerName?: string; leadId?: string; leadName?: string };
  actions: CrmAction[]; runId?: string;
}
export const VOICE_FLOW = [
  { id: 'transcribe', title: 'Transcripción', agent: 'C03' },
  { id: 'structure', title: 'Estructura', agent: 'C03' },
  { id: 'context', title: 'Contexto CRM', agent: 'C04' },
  { id: 'proposal', title: 'Cambios propuestos', agent: 'C04' },
];

export interface TenderWork {
  steps: string[]; params: TenderParams; runId?: string;
  decision?: { go: boolean; by: string; at: string; comment?: string; offer: number; bajaPct: number; hash: string; invalidatedAt?: string };
  docsPrepared?: string;
}

export interface Toast { id: string; kind: 'success' | 'info' | 'warning' | 'error'; text: string }

interface StudioState {
  schemaVersion: number;
  requests: ManufacturingRequest[];
  erp: ErpState;
  runs: Run[];
  integrations: IntegrationConfig[];
  ui: UiState;
  settings: Settings;
  manualSeq: number;
  voiceNotes: VoiceNote[];
  portalScreenedAt?: string;
  tenders: Record<string, TenderWork>;
  toasts: Toast[];

  toast(kind: Toast['kind'], text: string): void;
  dismissToast(id: string): void;
  setUi(p: Partial<UiState>): void;
  updateSettings(p: Partial<Settings>): void;

  // Fabricación
  runStep(reqId: string, stepId: string): Promise<void>;
  runNext(reqId: string): Promise<string | null>;
  runUntil(reqId: string, stopAt?: string): Promise<void>;
  confirmField(reqId: string, key: FieldKey, value: string): void;
  updateDraft(reqId: string, patch: Partial<EstimateInputs>, reason: string): void;
  setOverride(reqId: string, ov: Omit<OperationOverride, 'by' | 'at'>): void;
  clearOverride(reqId: string, opId: string): void;
  toggleMachine(reqId: string, machineId: string): void;
  saveVersion(reqId: string, note?: string): string;
  approve(reqId: string, versionId: string, comment?: string): void;
  createErpDraft(reqId: string): Promise<void>;
  createPartnerForRequest(reqId: string): void;
  receiveRevisionC(reqId: string): void;
  applyPendingRevision(reqId: string): void;
  addComment(reqId: string, text: string, opId?: string): void;
  addAttachment(reqId: string, att: Attachment): void;
  createManualRequest(input: ManualRequestInput): string;
  resetRequest(reqId: string): void;

  // ERP
  runErpStep(itemId: string, stepId: string): Promise<void>;
  runErpAll(itemId: string): Promise<void>;
  chooseErp(itemId: string, key: string, value: string): Promise<void>;
  updateActionPayload(itemId: string, actionId: string, payload: Record<string, unknown>): void;
  applyErpAction(itemId: string, actionId: string): Promise<void>;
  rejectErpAction(itemId: string, actionId: string): void;
  markReplySent(itemId: string): void;
  confirmSaleOrder(orderId: string): void;
  setSimulateTimeout(v: boolean): void;
  resetErpItem(itemId: string): void;

  // Asistente comercial (CRM por voz)
  processVoiceNote(text: string, source: VoiceNote['source'], sampleId?: string): string;
  applyCrmAction(noteId: string, actionId: string): void;
  rejectCrmAction(noteId: string, actionId: string): void;
  completeActivity(id: string): void;
  resetCrmDemo(): void;

  // Licitaciones
  screenPortal(): void;
  analyzeTender(id: string, until?: string): void;
  setTenderParams(id: string, p: Partial<TenderParams>, reason: string): void;
  decideTender(id: string, go: boolean, comment?: string): void;
  prepareTenderDocs(id: string): void;
  resetTender(id: string): void;

  // Catálogo y ejecuciones
  recordCatalogRun(caseId: string, title: string, inputLabel: string, steps: { stepId: string; summary: string; outputs: Record<string, unknown> }[]): string;

  // Integraciones
  updateIntegration(id: string, settings: Record<string, string>): void;
  testIntegration(id: string): void;

  resetDemo(): void;
}

export interface ManualRequestInput {
  company: string; contact: string; email: string; partNumber: string; partName: string; revision: string;
  quantity: number; material: MaterialId | null; finish: string; dueDate: string; tolerance: string; features: PartFeatures; notes: string;
}

// ── Seed ────────────────────────────────────────────────────────────────────

function seedState() {
  let requests = seedRequests();
  let erp = seedErp();
  const runs: Run[] = [];
  // RFQ-2026-0038 ya ofertada: se ejecuta el mismo motor para que el histórico sea coherente.
  const at = '2026-09-24T12:30:00+02:00';
  requests = requests.map((r) => {
    if (r.id !== 'rfq-2026-0038') return r;
    let req = r;
    const run = newRun('manufacturing', req, 'work', at);
    for (const id of MANUFACTURING_FLOW.map((s) => s.id).slice(0, 6)) {
      req = applyStepResult(req, id, at);
      pushEvents(run, req, id, at);
    }
    const saved = saveVersion(req, 'M. Pereira (Oficina técnica)', at, 'Versión enviada al cliente');
    req = approveVersion(saved.req, saved.version.id, 'M. Pereira (Oficina técnica)', at, 'Revisado con producción');
    pushEvents(run, req, 'review', at);
    const res = estimate(req.draft);
    const write = writeQuotationForRequest(erp, req, 'p-marina', at);
    erp = write.erp;
    req = finishOutput(req, write.ref, res, at);
    pushEvents(run, req, 'output', at);
    run.status = 'completed';
    runs.push(run);
    return { ...req, currentRunId: run.id };
  });
  return { requests, erp, runs };
}

function newRun(kind: Run['kind'], subject: { id: string; ref?: string; subject: string }, mode: Run['mode'], at: string, scenario = 'Estimación de fabricación'): Run {
  return { id: uid('run'), kind, subjectId: subject.id, subjectRef: subject.ref ?? subject.id, title: subject.subject, scenario, startedAt: at, updatedAt: at, status: 'running', mode, events: [], outputs: {} };
}

function pushEvents(run: Run, req: { steps: Record<string, { status: StepStatus; summary?: string; outputs?: Record<string, unknown>; durationMs?: number }> }, stepId: string, at: string) {
  const s = req.steps[stepId];
  const seq = run.events.length + 1;
  run.events.push({ eventId: uid('ev'), runId: run.id, seq, stepId, status: 'running', timestamp: at });
  const outputRef = `${run.id}#${seq + 1}`;
  run.events.push({ eventId: uid('ev'), runId: run.id, seq: seq + 1, stepId, status: s.status, timestamp: at, outputRef, durationMs: s.durationMs });
  run.outputs[outputRef] = { stepId, status: s.status, summary: s.summary, outputs: s.outputs ? structuredClone(s.outputs) : undefined, at };
  run.updatedAt = at;
  run.status = s.status === 'needs_input' ? 'needs_input' : s.status === 'failed' ? 'failed' : 'running';
}

function quotationLines(req: ManufacturingRequest) {
  const r = estimate(req.draft);
  const mat = req.draft.material ? MATERIALS[req.draft.material].shortName : '';
  return [{
    productId: 'pr-mec', name: `${req.partNumber} rev. ${req.draft.revision} — ${req.partName} · ${mat}${req.draft.finish ? ` · ${req.draft.finish}` : ''}`,
    qty: req.draft.quantity, uom: 'Unidades', priceUnit: r.cost.commercialUnitEur, discountPct: 0,
  }];
}

function quotationInput(req: ManufacturingRequest, partnerId: string) {
  const v = req.versions.find((x) => x.id === req.approval!.versionId)!;
  return {
    partnerId, lines: quotationLines(req), origin: `${req.ref} · v${v.number}`, requestId: req.id,
    note: `Estimación ${req.ref} v${v.number} (rev. ${v.revision}) · hash ${v.inputHash}. Plazo orientativo ${v.result.leadTime.minDays}–${v.result.leadTime.maxDays} días hábiles. Precios sin IVA.`,
    idempotencyKey: `${req.id}:${v.id}:${v.inputHash}`,
    approval: { approvedBy: req.approval!.approvedBy, approvedAt: req.approval!.approvedAt, inputHash: req.approval!.approvedInputHash, versionId: v.id },
    attachments: [`Informe_${req.ref}_v${v.number}.pdf`, `Estimacion_${req.ref}_v${v.number}.csv`],
  };
}

function writeQuotationForRequest(erp: ErpState, req: ManufacturingRequest, partnerId: string, at: string) {
  const { next, ref } = writeDraftQuotationSync(erp, quotationInput(req, partnerId), at);
  return { erp: next, ref };
}

function finishOutput(req: ManufacturingRequest, ref: NonNullable<ManufacturingRequest['erpRef']>, r: ReturnType<typeof estimate>, at: string): ManufacturingRequest {
  const reply = templateModel.draftReply(req, r, ref.name);
  const next: ManufacturingRequest = {
    ...req, erpRef: ref, replyDraft: reply,
    steps: { ...req.steps, output: { stepId: 'output', status: 'completed', startedAt: at, finishedAt: at, summary: `Presupuesto ${ref.name} creado en ERP demo`, outputs: { erpRef: ref, reply, exports: ['Informe PDF', 'CSV de operaciones'] } } },
    activity: [...req.activity, newActivity({ actor: 'C02', kind: 'success', text: `Presupuesto borrador ${ref.name} creado (${ref.model}, modo demo)` }, at), newActivity({ actor: 'C01', kind: 'info', text: 'Respuesta al cliente preparada en borrador (no enviada)' }, at)],
  };
  return { ...next, state: deriveState(next) };
}

const memory: Record<string, string> = {};
const safeStorage: StateStorage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return memory[k] ?? null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { memory[k] = v; } },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch { delete memory[k]; } },
};

const initial = () => {
  const s = seedState();
  return {
    schemaVersion: SCHEMA_VERSION, requests: s.requests, erp: s.erp, runs: s.runs, integrations: seedIntegrations(),
    ui: { mode: 'work', meeting: false, speed: 1, motion: 'system', user: DEMO_USER, role: 'Responsable de ofertas' } as UiState, settings: DEFAULT_SETTINGS, manualSeq: 48, voiceNotes: [] as VoiceNote[], tenders: {} as Record<string, TenderWork>, portalScreenedAt: undefined as string | undefined, toasts: [] as Toast[],
  };
};

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => {
      const getReq = (id: string) => get().requests.find((r) => r.id === id)!;
      const putReq = (req: ManufacturingRequest) => set((s) => ({ requests: s.requests.map((r) => (r.id === req.id ? req : r)) }));
      const erpAdapter = () => new DemoErpAdapter({ get: () => get().erp, set: (erp) => set({ erp }), now });
      const user = () => get().ui.user;

      const ensureRun = (req: ManufacturingRequest): Run => {
        const existing = get().runs.find((r) => r.id === req.currentRunId);
        if (existing) return existing;
        const run = newRun('manufacturing', req, get().ui.mode, now());
        set((s) => ({ runs: [run, ...s.runs] }));
        putReq({ ...getReq(req.id), currentRunId: run.id });
        return run;
      };
      const recordStep = (req: ManufacturingRequest, stepId: string) => {
        const run = structuredClone(ensureRun(req));
        pushEvents(run, req, stepId, now());
        if (stepId === 'output' && req.steps.output?.status === 'completed') run.status = 'completed';
        set((s) => ({ runs: s.runs.map((r) => (r.id === run.id ? run : r)) }));
      };

      const updateItem = (id: string, fn: (i: ErpInboxItem) => ErpInboxItem) => set((s) => ({ erp: { ...s.erp, inbox: s.erp.inbox.map((i) => (i.id === id ? fn(i) : i)) } }));
      const getItem = (id: string) => get().erp.inbox.find((i) => i.id === id)!;

      return {
        ...initial(),

        toast(kind, text) {
          const id = uid('t');
          set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, text }] }));
          setTimeout(() => get().dismissToast(id), 4200);
        },
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        setUi: (p) => set((s) => ({ ui: { ...s.ui, ...p } })),
        updateSettings: (p) => set((s) => ({ settings: { ...DEFAULT_SETTINGS, ...s.settings, ...p } })),

        async runStep(reqId, stepId) {
          let req = getReq(reqId);
          ensureRun(req);
          req = getReq(reqId);
          if (stepId === 'output') return get().createErpDraft(reqId);
          const t0 = performance.now();
          req = applyStepResult({ ...req, steps: { ...req.steps, [stepId]: { ...req.steps[stepId], status: 'running' } } }, stepId, now());
          req.steps[stepId] = { ...req.steps[stepId], durationMs: Math.max(1, Math.round(performance.now() - t0)) };
          putReq(req);
          recordStep(req, stepId);
        },

        async runNext(reqId) {
          const req = getReq(reqId);
          const id = nextRunnableStep(req);
          if (!id) return null;
          const prevIdx = MANUFACTURING_FLOW.findIndex((s) => s.id === id) - 1;
          const prev = prevIdx >= 0 ? req.steps[MANUFACTURING_FLOW[prevIdx].id] : undefined;
          if (prev && prev.status !== 'completed') return null;
          if (id === 'output' && !approvalValid(req)) return null;
          await get().runStep(reqId, id);
          return id;
        },

        async runUntil(reqId, stopAt = 'review') {
          for (let i = 0; i < 8; i++) {
            const id = nextRunnableStep(getReq(reqId));
            if (!id) return;
            const ran = await get().runNext(reqId);
            if (!ran) return;
            const st = getReq(reqId).steps[ran].status;
            if (st !== 'completed' || ran === stopAt) return;
          }
        },

        confirmField(reqId, key, value) {
          const at = now();
          let req = getReq(reqId);
          const evId = uid('ev-human');
          req = {
            ...req,
            fields: req.fields.map((f) => (f.key === key ? { ...f, value, status: 'confirmed', confirmedBy: user(), evidenceIds: [...f.evidenceIds, evId] } : f)),
            evidence: [...req.evidence, { id: evId, sourceId: 'human', locator: `Confirmado por ${user()} · ${new Date(at).toLocaleString('es-ES')}`, excerpt: value, kind: 'human' }],
          };
          const patch: Partial<EstimateInputs> = {};
          if (key === 'material') patch.material = (MATERIALS[value as MaterialId] ? (value as MaterialId) : resolveMaterial(value));
          if (key === 'quantity') patch.quantity = Number(value);
          if (key === 'finish') patch.finish = value || null;
          if (key === 'material' && patch.material) {
            req.fields = req.fields.map((f) => (f.key === 'material' ? { ...f, value: MATERIALS[patch.material!].name } : f));
          }
          req = updateDraft(req, patch, `${FIELD_LABEL[key]} confirmado: «${key === 'material' && patch.material ? MATERIALS[patch.material].name : value}»`, at, user());
          if (req.steps.intake?.status === 'needs_input') {
            req = applyStepResult(req, 'intake', at);
            putReq(req);
            recordStep(req, 'intake');
          } else putReq(req);
          get().toast('success', `${FIELD_LABEL[key]} confirmado`);
        },

        updateDraft(reqId, patch, reason) {
          putReq(updateDraft(getReq(reqId), patch, reason, now(), user()));
        },

        setOverride(reqId, ov) {
          const req = getReq(reqId);
          const full: OperationOverride = { ...ov, by: user(), at: now() };
          const overrides = [...req.draft.overrides.filter((o) => o.opId !== ov.opId), full];
          putReq(updateDraft(req, { overrides }, `Ajuste manual en ${ov.opId.replace('op-', '')}: ${ov.reason}`, now(), user()));
        },

        clearOverride(reqId, opId) {
          const req = getReq(reqId);
          putReq(updateDraft(req, { overrides: req.draft.overrides.filter((o) => o.opId !== opId) }, `Ajuste manual retirado en ${opId.replace('op-', '')}`, now(), user()));
        },

        toggleMachine(reqId, machineId) {
          const req = getReq(reqId);
          const off = req.draft.disabledMachineIds.includes(machineId);
          const disabled = off ? req.draft.disabledMachineIds.filter((m) => m !== machineId) : [...req.draft.disabledMachineIds, machineId];
          putReq(updateDraft(req, { disabledMachineIds: disabled }, `Máquina ${machineId} ${off ? 'reactivada' : 'desactivada'}`, now(), user()));
        },

        saveVersion(reqId, note) {
          const { req, version } = saveVersion(getReq(reqId), user(), now(), note);
          putReq(req);
          get().toast('success', `Versión v${version.number} guardada`);
          return version.id;
        },

        approve(reqId, versionId, comment) {
          try {
            const req = approveVersion(getReq(reqId), versionId, user(), now(), comment);
            putReq(req);
            recordStep(req, 'review');
            get().toast('success', 'Versión aprobada');
          } catch (e) {
            get().toast('error', (e as Error).message);
          }
        },

        async createErpDraft(reqId) {
          let req = getReq(reqId);
          if (!approvalValid(req)) {
            get().toast('warning', 'Se necesita una aprobación vigente para escribir en el ERP');
            return;
          }
          if (req.erpRef && req.steps.output?.status === 'completed') {
            get().toast('info', `Ya existe el presupuesto ${req.erpRef.name} para esta versión aprobada`);
            return;
          }
          const adapter = erpAdapter();
          const customers = await adapter.findCustomers({ email: req.customer.email });
          const partnerId = customers[0]?.companyId;
          if (!partnerId) {
            req = { ...req, steps: { ...req.steps, output: { stepId: 'output', status: 'needs_input', summary: 'Cliente no existe en el ERP: dar de alta antes de crear el presupuesto', outputs: { missingPartner: req.customer } } } };
            putReq({ ...req, state: deriveState(req) });
            recordStep(req, 'output');
            return;
          }
          const input = quotationInput(req, partnerId);
          let ref;
          try {
            ref = await adapter.createDraftQuotation(input);
          } catch (e) {
            if (e instanceof ErpTimeoutError) {
              const found = await adapter.findOperation(e.idempotencyKey);
              req = { ...req, activity: [...req.activity, newActivity({ actor: 'ERP', kind: 'warning', text: found ? `Timeout tras la escritura: reconciliado con ${found.name}, sin duplicar` : 'Timeout: no se encontró la operación; reintento seguro' }, now())] };
              ref = found ?? (await adapter.createDraftQuotation(input));
            } else {
              get().toast('error', (e as Error).message);
              return;
            }
          }
          req = finishOutput(req, ref, estimate(req.draft), now());
          putReq(req);
          recordStep(req, 'output');
          get().toast('success', `Presupuesto ${ref.name} creado en el ERP demo`);
        },

        createPartnerForRequest(reqId) {
          const req = getReq(reqId);
          const { next } = writePartner(get().erp, { name: req.customer.company, email: req.customer.email });
          set({ erp: next });
          putReq({ ...req, activity: [...req.activity, newActivity({ actor: user(), kind: 'human', text: `Contacto «${req.customer.company}» dado de alta en el ERP demo` }, now())] });
          get().toast('success', 'Contacto creado en el ERP demo');
        },

        receiveRevisionC(reqId) {
          const req = getReq(reqId);
          if (req.id !== REV_C_FIXTURE.requestId || req.emails.some((e) => e.id === REV_C_FIXTURE.email.id)) return;
          const at = now();
          putReq({
            ...req,
            emails: [...req.emails, { ...REV_C_FIXTURE.email, date: at }],
            attachments: [...req.attachments, ...REV_C_FIXTURE.attachments.map((a) => ({ ...a, addedAt: at }))],
            evidence: [...req.evidence, ...REV_C_FIXTURE.evidence],
            pendingRevision: { revision: 'C', receivedAt: at, attachmentIds: REV_C_FIXTURE.attachments.map((a) => a.id), features: REV_C_FIXTURE.features, changes: REV_C_FIXTURE.changes },
            activity: [...req.activity, newActivity({ actor: 'C01', kind: 'warning', text: 'Nueva revisión C recibida: pendiente de incorporar. La rev. B se conserva.' }, at)],
          });
          get().toast('info', 'Rev. C recibida en el hilo del expediente');
        },

        applyPendingRevision(reqId) {
          let req = getReq(reqId);
          const p = req.pendingRevision;
          if (!p) return;
          const at = now();
          req = {
            ...req,
            revisions: [...req.revisions, p], pendingRevision: undefined, currentRevision: p.revision,
            fields: req.fields.map((f) => (f.key === 'revision' ? { ...f, value: p.revision, status: 'extracted', candidates: [{ value: p.revision, evidenceId: 'ev42c-plano-rev' }], evidenceIds: ['ev42c-plano-rev'] } : f)),
            steps: { ...req.steps, ...Object.fromEntries(['cad', 'history', 'estimate', 'offer', 'review', 'output'].map((id) => [id, { stepId: id, status: 'idle' as const }])) },
            currentRunId: undefined,
          };
          req = afterDraftChange({ ...req, draft: { ...req.draft, revision: p.revision, features: p.features, overrides: [] } }, `Revisión ${p.revision} incorporada: nueva versión de estimación (rev. B conservada)`, at, user());
          putReq(req);
          get().toast('success', `Revisión ${p.revision} incorporada: ejecuta de nuevo desde «Lectura técnica»`);
        },

        addComment(reqId, text, opId) {
          const req = getReq(reqId);
          putReq({ ...req, comments: [...req.comments, { id: uid('c'), at: now(), by: user(), text, opId }], activity: [...req.activity, newActivity({ actor: user(), kind: 'human', text: `Comentario${opId ? ` en ${opId.replace('op-', '')}` : ''}: «${text}»` }, now())] });
        },

        addAttachment(reqId, att) {
          const req = getReq(reqId);
          putReq({ ...req, attachments: [...req.attachments, att], activity: [...req.activity, newActivity({ actor: 'C01', kind: att.capability === 'unsupported' ? 'warning' : 'info', text: `Archivo «${att.fileName}» añadido · ${att.capability === 'unsupported' ? 'formato no soportado' : att.capability === 'preview_only' ? 'solo vista previa' : 'lectura real'}` }, now())] });
        },

        createManualRequest(input) {
          const seq = get().manualSeq;
          const ref = `RFQ-2026-${String(seq).padStart(4, '0')}`;
          const id = ref.toLowerCase();
          const at = now();
          const ev = (k: string, v: string) => ({ id: `ev-${id}-${k}`, sourceId: 'manual', locator: `Alta manual por ${user()}`, excerpt: v, kind: 'human' as const });
          const evidence = [ev('qty', String(input.quantity)), ev('mat', input.material ? MATERIALS[input.material].name : '—'), ev('rev', input.revision), ev('tol', input.tolerance), ev('fin', input.finish), ev('due', input.dueDate), ev('pn', input.partNumber), ev('geo', 'Rasgos introducidos manualmente')];
          const fld = (key: FieldKey, value: string | null, e: string) => ({ key, label: FIELD_LABEL[key], value, status: value ? ('confirmed' as const) : ('missing' as const), evidenceIds: value ? [`ev-${id}-${e}`] : [], candidates: value ? [{ value, evidenceId: `ev-${id}-${e}` }] : [] });
          const req: ManufacturingRequest = {
            id, ref, schemaVersion: SCHEMA_VERSION, subject: `${input.partName} ${input.partNumber} — ${input.quantity} uds`, partNumber: input.partNumber, partName: input.partName,
            customer: { company: input.company, contact: input.contact, email: input.email }, receivedAt: at, channel: 'manual', priority: 'normal', state: 'received',
            emails: input.notes ? [{ id: `mail-${id}`, from: input.email, fromName: `${input.contact} · ${input.company}`, to: 'ofertas@talleresdelta.example', date: at, subject: `Solicitud manual ${ref}`, body: input.notes, attachmentIds: [], direction: 'in' }] : [],
            attachments: [], evidence,
            fields: [
              fld('partNumber', input.partNumber, 'pn'), fld('quantity', input.quantity > 0 ? String(input.quantity) : null, 'qty'),
              fld('material', input.material ? MATERIALS[input.material].name : null, 'mat'), fld('tolerance', input.tolerance || null, 'tol'),
              fld('finish', input.finish || null, 'fin'), fld('revision', input.revision, 'rev'), fld('dueDate', input.dueDate || null, 'due'),
            ],
            revisions: [{ revision: input.revision, receivedAt: at, attachmentIds: [], features: input.features }], currentRevision: input.revision,
            draft: { revision: input.revision, quantity: input.quantity, material: input.material, features: input.features, finish: input.finish || null, disabledMachineIds: [], rateOverrides: {}, overrides: [], pricing: { kind: 'margin', marginPct: get().settings?.defaultMarginPct ?? 22 }, indirectPct: get().settings?.defaultIndirectPct ?? 12, datasetVersion: DATASET_VERSION },
            versions: [], steps: emptySteps(), activity: [newActivity({ actor: user(), kind: 'human', text: 'Solicitud creada manualmente' }, at)], comments: [], contradictions: [], tags: ['Manual'],
          };
          set((s) => ({ requests: [req, ...s.requests], manualSeq: seq + 1 }));
          get().toast('success', `Solicitud ${ref} creada`);
          return id;
        },

        resetRequest(reqId) {
          const seed = seedState();
          const fresh = seed.requests.find((r) => r.id === reqId);
          if (!fresh) return;
          const clean = reqId === 'rfq-2026-0038' ? fresh : { ...fresh, currentRunId: undefined };
          set((s) => ({ requests: s.requests.map((r) => (r.id === reqId ? clean : r)) }));
          get().toast('info', `${fresh.ref} restablecido a los datos de ejemplo`);
        },

        // ── ERP ──
        async runErpStep(itemId, stepId) {
          const item = getItem(itemId);
          let run = get().runs.find((r) => r.id === item.currentRunId);
          if (!run) {
            run = newRun('erp', { id: item.id, ref: item.subject, subject: item.subject }, get().ui.mode, now(), `Odoo · ${{ rfq: 'Solicitud de oferta', order: 'Pedido multicanal', status: 'Consulta de estado', pricing: 'Pricing' }[item.scenario]}`);
            const r0 = run;
            set((s) => ({ runs: [r0, ...s.runs] }));
            updateItem(itemId, (i) => ({ ...i, currentRunId: r0.id }));
          }
          updateItem(itemId, (i) => ({ ...i, state: 'in_progress', steps: { ...i.steps, [stepId]: { stepId, status: 'running' } } }));
          const t0 = performance.now();
          try {
            const ex = await executeErpStep(getItem(itemId), stepId, erpAdapter(), get().erp);
            const at = now();
            updateItem(itemId, (i) => ({
              ...i,
              steps: { ...i.steps, [stepId]: { stepId, status: ex.status, summary: ex.summary, outputs: ex.outputs, startedAt: at, finishedAt: at, durationMs: Math.max(1, Math.round(performance.now() - t0)) } },
              actions: ex.actions ? ex.actions.map((a) => i.actions.find((x) => x.idempotencyKey === a.idempotencyKey) ?? a) : i.actions,
              replyDraft: ex.replyDraft ?? i.replyDraft,
              replyStatus: ex.replyDraft ? 'draft' : i.replyStatus,
              state: ex.state ?? (ex.status === 'needs_input' ? 'needs_input' : 'in_progress'),
            }));
          } catch (e) {
            updateItem(itemId, (i) => ({ ...i, steps: { ...i.steps, [stepId]: { stepId, status: 'failed', summary: (e as Error).message } } }));
          }
          const runCopy = structuredClone(get().runs.find((r) => r.id === getItem(itemId).currentRunId)!);
          pushEvents(runCopy, getItem(itemId), stepId, now());
          const steps = ERP_STEPS[getItem(itemId).scenario];
          if (steps.every((s) => getItem(itemId).steps[s.id]?.status === 'completed')) runCopy.status = 'completed';
          set((s) => ({ runs: s.runs.map((r) => (r.id === runCopy.id ? runCopy : r)) }));
        },

        async runErpAll(itemId) {
          for (const s of ERP_STEPS[getItem(itemId).scenario]) {
            const cur = getItem(itemId).steps[s.id]?.status;
            if (cur === 'completed') continue;
            await get().runErpStep(itemId, s.id);
            if (getItem(itemId).steps[s.id]?.status !== 'completed') return;
          }
        },

        async chooseErp(itemId, key, value) {
          updateItem(itemId, (i) => ({ ...i, choices: { ...i.choices, [key]: value } }));
          await get().runErpStep(itemId, 'normalize');
        },

        updateActionPayload(itemId, actionId, payload) {
          updateItem(itemId, (i) => ({
            ...i,
            actions: i.actions.map((a) => {
              if (a.id !== actionId || a.status === 'applied') return a;
              const merged = { ...a.payload, ...payload };
              return { ...a, payload: merged, idempotencyKey: `${i.id}:${a.kind}:${stableHash(merged)}` };
            }),
          }));
        },

        async applyErpAction(itemId, actionId) {
          const item = getItem(itemId);
          const a = item.actions.find((x) => x.id === actionId);
          if (!a || a.status === 'applied') return;
          const adapter = erpAdapter();
          const at = now();
          let result: ProposedAction['result'];
          try {
            if (a.kind === 'create_lead') {
              const p = a.payload as { name: string; partnerId: string; contactName: string; email: string; expectedRevenue: number };
              result = await adapter.createLead({ name: p.name, partnerId: p.partnerId, contactName: p.contactName, email: p.email, expectedRevenue: p.expectedRevenue, probability: 30, stage: 'Cualificado', source: item.channel === 'whatsapp' ? 'WhatsApp' : 'Correo', createdBy: `MTI · C04 (aprobado por ${user()})`, description: item.body }, a.idempotencyKey);
            } else if (a.kind === 'create_quotation') {
              const p = a.payload as { partnerId: string; lines: SaleLine[]; origin: string; note?: string };
              const leadRef = item.actions.find((x) => x.kind === 'create_lead' && x.status === 'applied')?.result;
              const input = { partnerId: p.partnerId, lines: p.lines, origin: p.origin, note: p.note, leadId: leadRef?.localId, idempotencyKey: a.idempotencyKey, approval: { approvedBy: user(), approvedAt: at, inputHash: stableHash(p) } };
              try {
                result = await adapter.createDraftQuotation(input);
              } catch (e) {
                if (!(e instanceof ErpTimeoutError)) throw e;
                result = (await adapter.findOperation(e.idempotencyKey)) ?? (await adapter.createDraftQuotation(input));
                get().toast('warning', `Timeout tras escribir: reconciliado con ${result.name}, sin duplicar`);
              }
            } else if (a.kind === 'update_quotation') {
              const p = a.payload as { orderId: string; qty: number; discountPct: number; listPrice: number };
              const o = get().erp.saleOrders.find((x) => x.id === p.orderId)!;
              const lines = o.lines.map((l, i) => (i === 0 ? { ...l, qty: p.qty, discountPct: p.discountPct, priceUnit: p.listPrice } : l));
              result = await adapter.reviseQuotation(p.orderId, lines, `Nueva versión: ${p.qty} uds al ${p.discountPct} % (aprobado por ${user()})`, `MTI · C02`, a.idempotencyKey);
            } else {
              updateItem(itemId, (i) => ({ ...i, replyDraft: String(a.payload.text), replyStatus: 'draft' }));
            }
            updateItem(itemId, (i) => {
              const actions = i.actions.map((x) => (x.id === actionId ? { ...x, status: 'applied' as const, result, appliedAt: at } : x));
              return { ...i, actions, state: actions.every((x) => x.status !== 'proposed') ? 'done' : i.state };
            });
            get().toast('success', result ? `${result.name} registrado en el ERP demo` : 'Respuesta lista en borrador');
          } catch (e) {
            updateItem(itemId, (i) => ({ ...i, actions: i.actions.map((x) => (x.id === actionId ? { ...x, status: 'failed' as const, error: (e as Error).message } : x)) }));
            get().toast('error', (e as Error).message);
          }
        },

        rejectErpAction(itemId, actionId) {
          updateItem(itemId, (i) => {
            const actions = i.actions.map((x) => (x.id === actionId ? { ...x, status: 'rejected' as const } : x));
            return { ...i, actions, state: actions.every((x) => x.status !== 'proposed') ? 'done' : i.state };
          });
        },

        markReplySent(itemId) {
          updateItem(itemId, (i) => ({ ...i, replyStatus: 'sent_local' }));
          get().toast('info', 'Marcado como enviado (solo etiqueta local; no se ha enviado ningún correo)');
        },

        confirmSaleOrder(orderId) {
          set((s) => ({ erp: { ...s.erp, saleOrders: s.erp.saleOrders.map((o) => (o.id === orderId ? { ...o, state: 'sale', history: [...o.history, { at: now(), by: user(), summary: 'Confirmado manualmente (dato local de la demo)' }] } : o)) } }));
          get().toast('success', 'Pedido confirmado en los datos locales');
        },

        setSimulateTimeout: (v) => set((s) => ({ erp: { ...s.erp, simulateTimeoutOnce: v } })),

        resetErpItem(itemId) {
          const fresh = seedErp().inbox.find((i) => i.id === itemId);
          if (fresh) updateItem(itemId, () => fresh);
        },

        processVoiceNote(text, source, sampleId) {
          const at = now();
          const parse = parseVoiceNote(text, get().erp);
          const actions = buildCrmActions(parse, text);
          const { partner, lead, ...rest } = parse;
          const id = uid('vn');
          const run = newRun('crm', { id, ref: partner?.name ?? 'Nota de voz', subject: rest.summary }, get().ui.mode, at, 'CRM · nota de voz');
          const snaps: Record<string, { summary: string; outputs: Record<string, unknown> }> = {
            transcribe: { summary: `${text.split(/\s+/).length} palabras · ${source}`, outputs: { transcript: text } },
            structure: { summary: `${rest.extracted.length} datos · ${rest.risks.length} riesgos · ${rest.activities.length} actividades`, outputs: { extracted: rest.extracted, risks: rest.risks, activities: rest.activities } },
            context: { summary: partner ? `${partner.name}${lead ? ` · ${lead.name}` : ' · sin oportunidad abierta'}` : 'Cliente sin identificar', outputs: { partner: partner?.name, lead: lead?.name, discarded: rest.discarded } },
            proposal: { summary: `${actions.length} cambios propuestos`, outputs: { actions: actions.map((a) => a.title) } },
          };
          for (const s of VOICE_FLOW) pushEvents(run, { steps: { [s.id]: { status: s.id === 'proposal' && !actions.length ? 'needs_input' : 'completed', ...snaps[s.id] } } }, s.id, at);
          run.status = actions.length ? 'completed' : 'needs_input';
          const note: VoiceNote = { id, at, source, sampleId, transcript: text, actions, runId: run.id, parse: { ...rest, partnerId: partner?.id, partnerName: partner?.name, leadId: lead?.id, leadName: lead?.name } };
          set((st) => ({ voiceNotes: [note, ...(st.voiceNotes ?? [])], runs: [run, ...st.runs] }));
          return id;
        },

        applyCrmAction(noteId, actionId) {
          const note = get().voiceNotes.find((n) => n.id === noteId);
          const a = note?.actions.find((x) => x.id === actionId);
          if (!note || !a || a.status !== 'proposed') return;
          const at = now();
          const by = user();
          const key = `${noteId}:${actionId}`;
          let erp = get().erp;
          let resultId: string | undefined = erp.opLog.find((e) => e.key === key)?.ref?.localId;
          if (!resultId) {
            const p = a.payload as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
            if (a.kind === 'update_lead') {
              const prev = erp.leads.find((l) => l.id === p.leadId)!;
              const changes: string[] = [];
              const upd: Lead = { ...prev, log: [...(prev.log ?? [])] };
              if (p.stage && p.stage !== prev.stage) { changes.push(`Etapa ${prev.stage} → ${p.stage}`); upd.stage = p.stage; upd.probability = p.stage === 'Perdido' ? 0 : p.stage === 'Negociación' ? 70 : upd.probability; }
              if (p.expectedRevenue && p.expectedRevenue !== prev.expectedRevenue) { changes.push(`Importe ${Math.round(prev.expectedRevenue)} → ${Math.round(p.expectedRevenue)} €`); upd.expectedRevenue = p.expectedRevenue; }
              if (p.lostReason) upd.lostReason = p.lostReason;
              if (p.risks?.length) upd.risks = p.risks;
              upd.log!.push({ at, by: `${by} · C03/C04`, text: `${changes.length ? `${changes.join(' · ')}. ` : ''}${p.note}`, source: 'voz' });
              erp = { ...erp, leads: erp.leads.map((l) => (l.id === prev.id ? upd : l)) };
              resultId = prev.id;
            } else if (a.kind === 'create_lead') {
              const erpId = erp.seq.lead + 1;
              const lead: Lead = { id: `l-${erpId}`, erpId, name: p.name, partnerId: p.partnerId, contactName: p.contactName, expectedRevenue: p.expectedRevenue, probability: 30, stage: 'Cualificado', source: p.source, createdAt: at, createdBy: `MTI · C04 (aprobado por ${by})`, deadline: p.deadline, log: [{ at, by: `${by} · C03/C04`, text: p.note, source: 'voz' }] };
              erp = { ...erp, leads: [...erp.leads, lead], seq: { ...erp.seq, lead: erpId } };
              resultId = lead.id;
            } else {
              const leadId = p.leadId === 'nueva' ? note.actions.find((x) => x.kind === 'create_lead')?.resultId : p.leadId;
              const erpId = erp.seq.erp + 1;
              const act = { id: `act-${erpId}`, erpId, type: p.type, summary: p.summary, dueDate: p.dueDate, leadId, partnerId: p.partnerId, done: false, createdBy: by, source: 'voz' as const };
              erp = { ...erp, activities: [...(erp.activities ?? []), act], seq: { ...erp.seq, erp: erpId } };
              resultId = act.id;
            }
            erp = { ...erp, opLog: [...erp.opLog, { key, kind: a.kind, status: 'done', at, ref: { model: a.kind === 'create_activity' ? 'mail.activity' : 'crm.lead', localId: resultId!, erpId: 0, name: a.title, mode: 'demo', idempotencyKey: key } }] };
          }
          set((st) => ({ erp, voiceNotes: st.voiceNotes.map((n) => (n.id === noteId ? { ...n, actions: n.actions.map((x) => (x.id === actionId ? { ...x, status: 'applied' as const, resultId } : x)) } : n)) }));
          get().toast('success', a.kind === 'create_activity' ? 'Actividad añadida a la agenda' : 'Oportunidad actualizada en el CRM');
        },

        rejectCrmAction(noteId, actionId) {
          set((st) => ({ voiceNotes: st.voiceNotes.map((n) => (n.id === noteId ? { ...n, actions: n.actions.map((x) => (x.id === actionId ? { ...x, status: 'rejected' as const } : x)) } : n)) }));
        },

        resetCrmDemo() {
          const seed = seedErp();
          set((st) => ({ erp: { ...st.erp, leads: seed.leads, activities: seed.activities } }));
        },

        completeActivity(id) {
          set((st) => ({ erp: { ...st.erp, activities: st.erp.activities.map((a) => (a.id === id ? { ...a, done: true, doneAt: now() } : a)) } }));
          get().toast('success', 'Actividad completada');
        },

        screenPortal() {
          const at = now();
          const results = TENDERS.map((t) => screenTender(t));
          const run = newRun('tender', { id: 'portal', ref: 'Portales', subject: 'Vigilancia de portales' }, get().ui.mode, at, 'Licitaciones · vigilancia de portales');
          pushEvents(run, { steps: { portal: { status: 'completed', summary: `${TENDERS.length} anuncios leídos (PLACSP y TED)`, outputs: { tenders: TENDERS.map((t) => t.expediente) } } } }, 'portal', at);
          pushEvents(run, { steps: { filter: { status: 'completed', summary: `${results.filter((r) => r.applies).length} aplican · ${results.filter((r) => !r.applies).length} descartadas`, outputs: { results: results.map((r) => ({ expediente: r.tender.expediente, applies: r.applies, motivos: r.applies ? r.passed : r.rejected })) } } } }, 'filter', at);
          run.status = 'completed';
          set((st) => ({ portalScreenedAt: at, runs: [run, ...st.runs] }));
          get().toast('success', `${results.filter((r) => r.applies).length} licitaciones aplican a tu perfil`);
        },

        analyzeTender(id, until = 'riesgos') {
          const t = TENDERS.find((x) => x.id === id);
          if (!t?.detailed) return;
          const at = now();
          const cur: TenderWork = get().tenders[id] ?? { steps: [], params: DEFAULT_TENDER_PARAMS };
          const e = estimateTender(t, cur.params);
          let run = get().runs.find((r) => r.id === cur.runId);
          if (!run) { run = newRun('tender', { id, ref: t.expediente, subject: t.title }, get().ui.mode, at, 'Licitaciones · estudio de oferta'); }
          run = structuredClone(run);
          const order = ['pliegos', 'mediciones', 'costes', 'plan', 'riesgos'];
          const summaries: Record<string, [string, Record<string, unknown>]> = {
            pliegos: [`${t.pliego?.length ?? 0} datos clave extraídos de ${t.documents?.length ?? 0} documentos`, { pliego: t.pliego }],
            mediciones: [`${e.partidas.length} partidas · ${e.partidas.filter((p) => p.assumed).length} sin precio en base`, { partidas: e.partidas.map((p) => ({ code: p.code, unitCost: p.unitCost, projectPrice: p.projectPrice, source: p.source })) }],
            costes: [`Oferta ${Math.round(e.totals.offer).toLocaleString('es-ES')} € · baja ${e.totals.bajaPct.toFixed(1)} %`, { totals: e.totals }],
            plan: [`${Math.ceil(e.totalDays)} de ${e.plazoDays} días hábiles`, { schedule: e.schedule, critical: e.critical }],
            riesgos: [e.recommendation, { checks: e.checks }],
          };
          const steps = [...cur.steps];
          for (const sid of order.slice(0, order.indexOf(until) + 1)) {
            if (steps.includes(sid)) continue;
            steps.push(sid);
            pushEvents(run, { steps: { [sid]: { status: sid === 'riesgos' && !e.go ? 'needs_input' : 'completed', summary: summaries[sid][0], outputs: summaries[sid][1] } } }, sid, at);
          }
          const r0 = run;
          set((st) => ({ tenders: { ...st.tenders, [id]: { ...cur, steps, runId: r0.id } }, runs: st.runs.some((x) => x.id === r0.id) ? st.runs.map((x) => (x.id === r0.id ? r0 : x)) : [r0, ...st.runs] }));
        },

        setTenderParams(id, p, reason) {
          const cur: TenderWork = get().tenders[id] ?? { steps: [], params: DEFAULT_TENDER_PARAMS };
          const params = { ...cur.params, ...p, extraCrews: { ...cur.params.extraCrews, ...(p.extraCrews ?? {}) } };
          const decision = cur.decision && !cur.decision.invalidatedAt ? { ...cur.decision, invalidatedAt: now() } : cur.decision;
          set((st) => ({ tenders: { ...st.tenders, [id]: { ...cur, params, decision } } }));
          if (cur.decision && !cur.decision.invalidatedAt) get().toast('warning', `Decisión anulada: ${reason}`);
        },

        decideTender(id, go, comment) {
          const t = TENDERS.find((x) => x.id === id)!;
          const cur: TenderWork = get().tenders[id] ?? { steps: [], params: DEFAULT_TENDER_PARAMS };
          const e = estimateTender(t, cur.params);
          const at = now();
          const decision = { go, by: user(), at, comment, offer: e.totals.offer, bajaPct: e.totals.bajaPct, hash: stableHash({ id, params: cur.params }) };
          const run = structuredClone(get().runs.find((r) => r.id === cur.runId));
          if (run) { pushEvents(run, { steps: { decision: { status: 'completed', summary: `${go ? 'GO' : 'NO GO'} · ${user()}`, outputs: { decision } } } }, 'decision', at); run.status = 'completed'; }
          set((st) => ({ tenders: { ...st.tenders, [id]: { ...cur, decision, steps: [...new Set([...cur.steps, 'decision'])] } }, runs: run ? st.runs.map((x) => (x.id === run.id ? run : x)) : st.runs }));
          get().toast(go ? 'success' : 'info', go ? 'Decisión: presentar la oferta' : 'Decisión: no presentar');
        },

        prepareTenderDocs(id) {
          const cur = get().tenders[id];
          if (!cur?.decision?.go || cur.decision.invalidatedAt) { get().toast('warning', 'Se necesita una decisión GO vigente'); return; }
          set((st) => ({ tenders: { ...st.tenders, [id]: { ...cur, docsPrepared: now() } } }));
          get().toast('success', 'Documentación preparada. La presentación requiere la firma electrónica del apoderado.');
        },

        resetTender(id) {
          set((st) => { const t = { ...st.tenders }; delete t[id]; return { tenders: t }; });
        },

        recordCatalogRun(caseId, title, inputLabel, steps) {
          const at = now();
          const run = newRun('catalog', { id: caseId, ref: caseId.toUpperCase(), subject: `${title} · ${inputLabel}` }, get().ui.mode, at, `Catálogo · ${title}`);
          for (const s of steps) pushEvents(run, { steps: { [s.stepId]: { status: 'completed', summary: s.summary, outputs: s.outputs } } }, s.stepId, at);
          run.status = 'completed';
          set((st) => ({ runs: [run, ...st.runs] }));
          return run.id;
        },

        updateIntegration(id, settings) {
          set((s) => ({ integrations: s.integrations.map((i) => (i.id === id ? { ...i, settings: { ...i.settings, ...settings } } : i)) }));
        },

        testIntegration(id) {
          const def = CONNECTORS.find((c) => c.id === id)!;
          const cfg = get().integrations.find((i) => i.id === id)!;
          const at = now();
          let result: { ok: boolean; message: string; status: IntegrationConfig['status'] };
          if (id === 'odoo' && (cfg.settings.baseUrl || cfg.settings.database)) {
            result = { ok: false, status: 'error', message: 'Sin middleware de servidor configurado: el navegador no puede usar la API key de Odoo. Estado no conectado.' };
          } else if (def.defaultStatus === 'demo') {
            result = { ok: true, status: 'demo', message: 'Fixture local disponible. Modo demo: sin conexión externa.' };
          } else {
            result = { ok: false, status: 'pending', message: 'Pendiente de configurar: no hay credenciales ni adapter activo.' };
          }
          set((s) => ({ integrations: s.integrations.map((i) => (i.id === id ? { ...i, status: result.status, lastTest: { at, ok: result.ok, message: result.message } } : i)) }));
        },

        resetDemo() {
          set({ ...initial(), ui: get().ui, settings: get().settings });
          get().toast('info', 'Datos de demostración restablecidos');
        },
      };
    },
    {
      name: 'mti-agentive-studio',
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ schemaVersion: s.schemaVersion, requests: s.requests, erp: s.erp, runs: s.runs, integrations: s.integrations, ui: s.ui, settings: s.settings, manualSeq: s.manualSeq, voiceNotes: s.voiceNotes, tenders: s.tenders, portalScreenedAt: s.portalScreenedAt }),
      migrate: () => initial() as never, // esquema distinto → datos demo frescos (documentado)
    },
  ),
);

export const flowStepIds = MANUFACTURING_FLOW.map((s) => s.id);
