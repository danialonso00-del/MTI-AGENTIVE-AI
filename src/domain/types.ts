// Contrato de dominio de MTI Agentive AI Studio (sección 10.1 de la especificación, ampliado).
// Las cantidades llevan la unidad en el nombre del campo (Min, Mm, Kg, Eur...) para evitar ambigüedades.

export const SCHEMA_VERSION = 4;

export type ConnectorMode = 'demo' | 'sandbox';
export type StepStatus = 'idle' | 'running' | 'completed' | 'needs_input' | 'failed';
export type ProvenanceKind = 'source' | 'rule' | 'fixture' | 'model' | 'human';

export interface Evidence {
  id: string;
  sourceId: string; // id de adjunto, email, dataset o regla
  locator: string; // ubicación legible: "Plano rev. B · cajetín · MATERIAL"
  excerpt?: string;
  kind: ProvenanceKind;
  /** Ancla visual opcional (zona del plano, fragmento de correo, fila de hoja) para resaltar. */
  anchor?: string;
}

export interface RunEvent {
  eventId: string;
  runId: string;
  seq: number;
  stepId: string;
  status: StepStatus;
  timestamp: string;
  outputRef?: string;
  note?: string;
  durationMs?: number;
}

// ── Fabricación ────────────────────────────────────────────────────────────

export type MaterialId = 'al-6082-t6' | 'steel-s275' | 'ss-304';
export type PartFamily = 'prismatico-fresado' | 'torneado';

/** Rasgos geométricos y técnicos de la pieza. Los valores proceden del modelo/plano de ejemplo. */
export interface PartFeatures {
  family: PartFamily;
  lengthMm: number; // envolvente X
  widthMm: number; // envolvente Y (en torneado: diámetro)
  heightMm: number; // envolvente Z (en torneado: espesor)
  pocket?: { lengthMm: number; widthMm: number; depthMm: number };
  holes: { count: number; diameterMm: number; fit?: string };
  criticalDims: number; // cotas críticas a inspeccionar
  blankMm: { length: number; width: number; height: number }; // bruto de partida
}

export type FieldKey =
  | 'quantity'
  | 'material'
  | 'tolerance'
  | 'finish'
  | 'revision'
  | 'dueDate'
  | 'partNumber';

export type FieldStatus = 'extracted' | 'confirmed' | 'assumed' | 'missing';

export interface ExtractedField {
  key: FieldKey;
  label: string;
  value: string | null;
  unit?: string;
  status: FieldStatus;
  evidenceIds: string[];
  /** Valores encontrados por fuente; si difieren hay contradicción. */
  candidates: { value: string; evidenceId: string }[];
  note?: string;
  confirmedBy?: string;
}

export type AttachmentKind = 'email' | 'pdf' | 'step' | 'dxf' | 'glb' | 'csv' | 'image' | 'text' | 'unknown';

export type ReadCapability =
  | 'fixture_parsed' // contenido de ejemplo con extracción precalculada y declarada
  | 'header_read' // lectura real de cabecera/entidades (STEP/DXF)
  | 'text_read' // lectura real de texto/CSV
  | 'preview_only' // vista previa sin extracción
  | 'unsupported';

export interface Attachment {
  id: string;
  fileName: string;
  kind: AttachmentKind;
  sizeBytes: number;
  sha256?: string;
  revision?: string;
  url?: string; // asset local en /public
  capability: ReadCapability;
  substituteNote?: string; // p. ej. STEP representado por modelo de ejemplo
  uploadedByUser?: boolean;
  readSummary?: string[]; // qué se consiguió leer realmente
  textPreview?: string;
  addedAt: string;
}

export interface EmailMessage {
  id: string;
  from: string;
  fromName: string;
  to: string;
  date: string;
  subject: string;
  body: string;
  attachmentIds: string[];
  direction: 'in' | 'out';
  draft?: boolean;
}

export interface Machine {
  id: string;
  name: string;
  workcenter: string;
  capabilities: OperationKind[];
  rateEurH: number;
  /** >1 significa más lenta que la referencia de la operación. */
  speedFactor: Partial<Record<OperationKind, number>>;
  attendance: number; // fracción de presencia humana durante el ciclo
  enabled: boolean;
}

export type OperationKind =
  | 'corte'
  | 'fresado'
  | 'bolsillo'
  | 'taladrado'
  | 'torneado'
  | 'desbarbado'
  | 'inspeccion';

export interface OperationOverride {
  opId: string;
  setupMin?: number;
  cycleBaseMin?: number;
  correctionFactor?: number;
  machineId?: string;
  reason: string;
  previous: { setupMin: number; cycleBaseMin: number; correctionFactor: number; machineId: string; totalMin: number };
  by: string;
  at: string;
}

export interface OperationEstimate {
  id: string;
  kind: OperationKind;
  name: string;
  setupMin: number;
  cycleMin: number; // ciclo base por pieza (regla + material + máquina)
  quantity: number;
  correctionFactor: number;
  correctedCycleMin: number;
  totalMin: number; // preparación + cantidad × ciclo corregido
  machineId: string;
  machineName: string;
  rateEurH: number;
  costEur: number;
  evidenceIds: string[];
  assumptions: string[];
  method: 'rule' | 'fixture_correction' | 'trained_model' | 'manual';
  ruleText: string;
  override?: OperationOverride;
  blocked?: string;
}

export type PricingRule = { kind: 'margin'; marginPct: number } | { kind: 'markup'; markupPct: number };

export interface EstimateInputs {
  revision: string;
  quantity: number;
  material: MaterialId | null;
  features: PartFeatures;
  finish: string | null;
  disabledMachineIds: string[];
  rateOverrides: Record<string, number>;
  overrides: OperationOverride[];
  pricing: PricingRule;
  indirectPct: number;
  datasetVersion: string;
}

export interface EstimateResult {
  inputHash: string;
  operations: OperationEstimate[];
  setupTotalMin: number;
  cycleBaseTotalMin: number;
  cycleCorrectedTotalMin: number;
  baseLotMin: number;
  estimatedLotMin: number;
  perPieceMin: number;
  bandMin: [number, number];
  machineMinByWorkcenter: Record<string, number>;
  laborHours: number;
  leadTime: { minDays: number; maxDays: number; assumptions: string[] };
  cost: CostBreakdown;
  missingFields: string[];
  blocked: string[];
  assumptions: string[];
  comparablesUsed: string[];
}

export interface CostBreakdown {
  transformationEur: number;
  materialEur: number;
  subcontractEur: number;
  indirectEur: number;
  totalCostEur: number;
  priceEur: number; // precisión interna
  unitPriceEur: number; // precisión interna
  /** Precio comercial: unitario redondeado a céntimos; total = cantidad × unitario. Usado en oferta, ERP y exportaciones. */
  commercialUnitEur: number;
  commercialTotalEur: number;
  rule: PricingRule;
  ruleText: string;
  currency: 'EUR';
  vatExcluded: true;
  lines: { label: string; amountEur: number; detail: string }[];
}

export interface Approval {
  versionId: string;
  approvedInputHash: string;
  approvedBy: string;
  approvedAt: string;
  comment?: string;
  invalidatedAt?: string;
  invalidatedReason?: string;
}

export interface EstimateVersion {
  id: string;
  requestId: string;
  number: number; // v1, v2...
  revision: string;
  inputHash: string;
  quantity: number;
  inputs: EstimateInputs;
  result: EstimateResult;
  assumptions: string[];
  missingFields: string[];
  createdAt: string;
  createdBy: string;
  note?: string;
  approval?: { approvedInputHash: string; approvedBy: string; approvedAt: string; comment?: string };
}

export interface HistoricalJob {
  id: string;
  ref: string;
  partName: string;
  family: PartFamily;
  material: MaterialId;
  machineId: string;
  quantity: number;
  date: string;
  features: Pick<PartFeatures, 'lengthMm' | 'widthMm' | 'heightMm' | 'pocket' | 'holes'>;
  /** ciclo por pieza según regla vs. real observado (sintético), por operación */
  ops: { kind: OperationKind; ruleCycleMin: number; realCycleMin: number }[];
  realLotMin: number;
}

export interface ComparableResult {
  job: HistoricalJob;
  score: number;
  reasons: string[];
  included: boolean;
  exclusionReason?: string;
}

export type RunState =
  | 'received'
  | 'extracting'
  | 'retrieving'
  | 'estimating'
  | 'reviewing'
  | 'approved'
  | 'draft_created'
  | 'needs_input'
  | 'failed'
  | 'cancelled';

export interface ActivityEntry {
  id: string;
  at: string;
  actor: string; // código de agente, herramienta o persona
  text: string;
  kind: 'info' | 'success' | 'warning' | 'error' | 'human';
}

export interface RevisionRecord {
  revision: string;
  receivedAt: string;
  attachmentIds: string[];
  features: PartFeatures;
  changes?: string[];
}

export interface Quotation {
  id: string;
  requestId: string;
  versionId: string;
  draftText: string;
  createdAt: string;
}

export interface ErpRecordRef {
  model: string;
  localId: string;
  erpId: number;
  name: string;
  mode: ConnectorMode;
  idempotencyKey: string;
}

export interface ManufacturingRequest {
  id: string;
  ref: string;
  schemaVersion: number;
  subject: string;
  partNumber: string;
  partName: string;
  customer: { company: string; contact: string; email: string };
  receivedAt: string;
  channel: 'email' | 'manual';
  priority: 'alta' | 'normal' | 'baja';
  state: RunState;
  emails: EmailMessage[];
  attachments: Attachment[];
  fields: ExtractedField[];
  evidence: Evidence[];
  revisions: RevisionRecord[];
  pendingRevision?: RevisionRecord; // revisión recibida aún no incorporada
  currentRevision: string;
  draft: EstimateInputs;
  versions: EstimateVersion[];
  approval?: Approval;
  steps: Record<string, StepRecord>;
  activity: ActivityEntry[];
  comments: { id: string; at: string; by: string; text: string; opId?: string }[];
  replyDraft?: string;
  erpRef?: ErpRecordRef;
  currentRunId?: string;
  contradictions: Contradiction[];
  tags: string[];
}

export interface Contradiction {
  id: string;
  field: FieldKey | 'geometry';
  description: string;
  sources: string[]; // evidence ids
  resolution?: string;
  severity: 'info' | 'warning' | 'blocking';
}

export interface StepRecord {
  stepId: string;
  status: StepStatus;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  summary?: string;
  outputs?: Record<string, unknown>;
}

// ── Integraciones ──────────────────────────────────────────────────────────

export type ConnectorStatus = 'demo' | 'pending' | 'sandbox' | 'error';

export interface IntegrationConfig {
  id: string;
  name: string;
  status: ConnectorStatus;
  lastTest?: { at: string; ok: boolean; message: string };
  settings: Record<string, string>;
}
