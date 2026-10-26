// Expedientes de solicitud de oferta (sintéticos). Las extracciones de los adjuntos de ejemplo están
// precalculadas y se declaran como tales (capability: 'fixture_parsed').
import type {
  Attachment,
  EmailMessage,
  Evidence,
  ExtractedField,
  FieldKey,
  ManufacturingRequest,
  MaterialId,
  StepRecord,
} from '@/domain/types';
import { SCHEMA_VERSION } from '@/domain/types';
import { DATASET_VERSION, FEATURES_BR210, FEATURES_PL040, FEATURES_SP118_B, FEATURES_SP118_C, FEATURES_SP126, MATERIAL_ALIASES } from './manufacturing';

export const STEP_IDS = ['intake', 'classify', 'cad', 'history', 'estimate', 'offer', 'review', 'output'] as const;
export type StepId = (typeof STEP_IDS)[number];

export const emptySteps = (): Record<string, StepRecord> =>
  Object.fromEntries(STEP_IDS.map((id) => [id, { stepId: id, status: 'idle' as const }]));

export const FIELD_LABEL: Record<FieldKey, string> = {
  quantity: 'Cantidad',
  material: 'Material',
  tolerance: 'Tolerancias',
  finish: 'Acabado',
  revision: 'Revisión',
  dueDate: 'Fecha solicitada',
  partNumber: 'Referencia',
};

export function resolveMaterial(text: string | null): MaterialId | null {
  if (!text) return null;
  const t = text.toLowerCase();
  for (const [alias, id] of Object.entries(MATERIAL_ALIASES)) if (t.includes(alias)) return id;
  return null;
}

type FieldSeed = [FieldKey, string | null, ExtractedField['status'], [string, string][], string?, string?];
function fields(seeds: FieldSeed[]): ExtractedField[] {
  return seeds.map(([key, value, status, cands, unit, note]) => ({
    key, label: FIELD_LABEL[key], value, status, unit, note,
    candidates: cands.map(([v, evidenceId]) => ({ value: v, evidenceId })),
    evidenceIds: cands.map(([, e]) => e),
  }));
}

const att = (a: Omit<Attachment, 'addedAt'> & { addedAt?: string }): Attachment => ({ addedAt: '2026-10-05T09:12:00+02:00', ...a });

// ── RFQ-2026-0042 · estrella ───────────────────────────────────────────────

const RFQ42_EMAIL_1 = `Buenos días:

Os enviamos solicitud de oferta para 50 unidades del soporte SP-118, revisión B, en aluminio 6082-T6 según plano adjunto. El acabado será anodizado negro.

Adjuntamos plano en PDF, modelo STEP, DXF de contorno y la hoja de requisitos con tolerancias y fecha objetivo. Necesitaríamos la oferta antes del 16/10 si fuera posible.

Un saludo,
Irene Castro
Compras · Marina Norte`;

const RFQ42_EMAIL_2 = `Hola de nuevo:

¿Podéis indicarnos también un plazo orientativo de entrega? Si un lote de 100 uds mejorase el precio unitario, valoraríamos ampliarlo.

Gracias,
Irene`;

export const RFQ42_REV_C_EMAIL = `Buenas tardes:

Os adjuntamos la revisión C del plano del SP-118: el bolsillo pasa a 16 mm de profundidad y se añaden dos taladros Ø8 H7 (6 en total). El resto se mantiene.

El modelo 3D actualizado os lo enviamos la semana que viene. Por favor, actualizad la oferta con la revisión C.

Irene Castro
Compras · Marina Norte`;

function rfq42(): ManufacturingRequest {
  const attachments: Attachment[] = [
    att({ id: 'att-42-plano-b', fileName: 'SP-118_revB.pdf', kind: 'pdf', sizeBytes: 0, revision: 'B', url: '/demo-assets/SP-118_revB.pdf', capability: 'fixture_parsed', readSummary: ['Cajetín: referencia, revisión, material', 'Notas 1–4: tolerancias, taladros H7, aristas, rugosidad', 'Cotas principales 110 × 70 × 20 mm'] }),
    att({ id: 'att-42-step-b', fileName: 'SP-118_revB.step', kind: 'step', sizeBytes: 0, revision: 'B', capability: 'fixture_parsed',
      substituteNote: 'El STEP del cliente no forma parte de la demo. Se visualiza un modelo de ejemplo generado desde los rasgos (conversión precalculada).',
      readSummary: ['Envolvente 110 × 70 × 20 mm', 'Bolsillo 50 × 30 × 12 mm', '4 taladros pasantes Ø8'] }),
    att({ id: 'att-42-dxf-b', fileName: 'SP-118_revB.dxf', kind: 'dxf', sizeBytes: 0, revision: 'B', url: '/demo-assets/SP-118_revB.dxf', capability: 'header_read' }),
    att({ id: 'att-42-req', fileName: 'Requisitos_RFQ-2026-0042.pdf', kind: 'pdf', sizeBytes: 0, url: '/demo-assets/Requisitos_RFQ-2026-0042.pdf', capability: 'fixture_parsed', readSummary: ['9 filas de requisitos: lote, material, acabado, tolerancias, fecha, embalaje, certificados'] }),
  ];
  const emails: EmailMessage[] = [
    { id: 'mail-42-1', from: 'compras@marinanorte.example', fromName: 'Irene Castro · Marina Norte', to: 'ofertas@talleresdelta.example', date: '2026-10-05T09:12:00+02:00', subject: 'RFQ-2026-0042 · Soporte SP-118 rev. B — 50 uds', body: RFQ42_EMAIL_1, attachmentIds: attachments.map((a) => a.id), direction: 'in' },
    { id: 'mail-42-2', from: 'compras@marinanorte.example', fromName: 'Irene Castro · Marina Norte', to: 'ofertas@talleresdelta.example', date: '2026-10-05T11:40:00+02:00', subject: 'Re: RFQ-2026-0042 · Soporte SP-118 rev. B — 50 uds', body: RFQ42_EMAIL_2, attachmentIds: [], direction: 'in' },
  ];
  const evidence: Evidence[] = [
    { id: 'ev42-mail-qty', sourceId: 'mail-42-1', locator: 'Correo 05/10 09:12 · párrafo 1', excerpt: '50 unidades', kind: 'source', anchor: '50 unidades' },
    { id: 'ev42-req-qty', sourceId: 'att-42-req', locator: 'Hoja de requisitos · Lote', excerpt: '50 uds', kind: 'source', anchor: 'req.quantity' },
    { id: 'ev42-mail-mat', sourceId: 'mail-42-1', locator: 'Correo 05/10 09:12 · párrafo 1', excerpt: 'aluminio 6082-T6', kind: 'source', anchor: 'aluminio 6082-T6' },
    { id: 'ev42-plano-mat', sourceId: 'att-42-plano-b', locator: 'Plano rev. B · cajetín · MATERIAL', excerpt: 'EN AW-6082-T6', kind: 'source', anchor: 'tb.material' },
    { id: 'ev42-req-mat', sourceId: 'att-42-req', locator: 'Hoja de requisitos · Material', excerpt: 'EN AW-6082-T6', kind: 'source', anchor: 'req.material' },
    { id: 'ev42-plano-tol', sourceId: 'att-42-plano-b', locator: 'Plano rev. B · notas 1–2', excerpt: 'ISO 2768-mK · 4× Ø8 H7', kind: 'source', anchor: 'notes' },
    { id: 'ev42-req-tol', sourceId: 'att-42-req', locator: 'Hoja de requisitos · Tolerancias', excerpt: 'ISO 2768-mK; taladros Ø8 H7', kind: 'source', anchor: 'req.tolerance' },
    { id: 'ev42-mail-fin', sourceId: 'mail-42-1', locator: 'Correo 05/10 09:12 · párrafo 1', excerpt: 'anodizado negro', kind: 'source', anchor: 'anodizado negro' },
    { id: 'ev42-req-fin', sourceId: 'att-42-req', locator: 'Hoja de requisitos · Acabado', excerpt: 'Anodizado natural 15 µm', kind: 'source', anchor: 'req.finish' },
    { id: 'ev42-mail-rev', sourceId: 'mail-42-1', locator: 'Correo 05/10 09:12 · párrafo 1', excerpt: 'revisión B', kind: 'source', anchor: 'revisión B' },
    { id: 'ev42-plano-rev', sourceId: 'att-42-plano-b', locator: 'Plano rev. B · cajetín · REV', excerpt: 'B', kind: 'source', anchor: 'tb.revision' },
    { id: 'ev42-req-date', sourceId: 'att-42-req', locator: 'Hoja de requisitos · Fecha de entrega', excerpt: '06/11/2026', kind: 'source', anchor: 'req.dueDate' },
    { id: 'ev42-plano-pn', sourceId: 'att-42-plano-b', locator: 'Plano rev. B · cajetín · REFERENCIA', excerpt: 'SP-118', kind: 'source', anchor: 'tb.partNumber' },
    { id: 'ev42-model', sourceId: 'att-42-step-b', locator: 'Modelo de ejemplo rev. B · rasgos', excerpt: '110×70×20 · bolsillo 50×30×12 · 4× Ø8', kind: 'fixture', anchor: 'model' },
  ];
  const f = fields([
    ['partNumber', 'SP-118', 'extracted', [['SP-118', 'ev42-plano-pn']]],
    ['quantity', '50', 'extracted', [['50', 'ev42-mail-qty'], ['50', 'ev42-req-qty']], 'uds'],
    ['material', 'EN AW-6082-T6', 'extracted', [['6082-T6', 'ev42-mail-mat'], ['6082-T6', 'ev42-plano-mat'], ['6082-T6', 'ev42-req-mat']]],
    ['tolerance', 'ISO 2768-mK · taladros Ø8 H7', 'extracted', [['ISO 2768-mK · Ø8 H7', 'ev42-plano-tol'], ['ISO 2768-mK · Ø8 H7', 'ev42-req-tol']]],
    ['finish', 'Anodizado natural 15 µm', 'assumed', [['Anodizado negro', 'ev42-mail-fin'], ['Anodizado natural 15 µm', 'ev42-req-fin']], undefined, 'Se toma la hoja de requisitos como documento técnico de referencia; requiere confirmación (el correo indica negro).'],
    ['revision', 'B', 'extracted', [['B', 'ev42-mail-rev'], ['B', 'ev42-plano-rev']]],
    ['dueDate', '2026-11-06', 'extracted', [['2026-11-06', 'ev42-req-date']]],
  ]);
  return {
    id: 'rfq-2026-0042', ref: 'RFQ-2026-0042', schemaVersion: SCHEMA_VERSION,
    subject: 'Soporte SP-118 rev. B — 50 uds', partNumber: 'SP-118', partName: 'Soporte mecanizado',
    customer: { company: 'Marina Norte', contact: 'Irene Castro', email: 'compras@marinanorte.example' },
    receivedAt: '2026-10-05T09:12:00+02:00', channel: 'email', priority: 'alta', state: 'received',
    emails, attachments, fields: f, evidence,
    revisions: [{ revision: 'B', receivedAt: '2026-10-05T09:12:00+02:00', attachmentIds: ['att-42-plano-b', 'att-42-step-b', 'att-42-dxf-b'], features: FEATURES_SP118_B }],
    currentRevision: 'B',
    draft: {
      revision: 'B', quantity: 50, material: 'al-6082-t6', features: FEATURES_SP118_B, finish: 'Anodizado natural 15 µm',
      disabledMachineIds: [], rateOverrides: {}, overrides: [], pricing: { kind: 'margin', marginPct: 22 }, indirectPct: 12, datasetVersion: DATASET_VERSION,
    },
    versions: [], steps: emptySteps(), activity: [
      { id: 'a42-1', at: '2026-10-05T09:12:05+02:00', actor: 'C01', text: 'Solicitud recibida en ofertas@talleresdelta.example con 4 adjuntos', kind: 'info' },
    ],
    comments: [], contradictions: [], tags: ['Mecanizado', 'Aluminio'],
  };
}

export const REV_C_FIXTURE = {
  requestId: 'rfq-2026-0042',
  email: {
    id: 'mail-42-3', from: 'compras@marinanorte.example', fromName: 'Irene Castro · Marina Norte', to: 'ofertas@talleresdelta.example',
    subject: 'RFQ-2026-0042 · Revisión C del SP-118', body: RFQ42_REV_C_EMAIL, attachmentIds: ['att-42-plano-c', 'att-42-dxf-c'], direction: 'in' as const,
  },
  attachments: [
    { id: 'att-42-plano-c', fileName: 'SP-118_revC.pdf', kind: 'pdf' as const, sizeBytes: 0, revision: 'C', url: '/demo-assets/SP-118_revC.pdf', capability: 'fixture_parsed' as const, readSummary: ['Cajetín rev. C', 'Bolsillo profundidad 16 mm', '6× Ø8 H7'] },
    { id: 'att-42-dxf-c', fileName: 'SP-118_revC.dxf', kind: 'dxf' as const, sizeBytes: 0, revision: 'C', url: '/demo-assets/SP-118_revC.dxf', capability: 'header_read' as const },
  ],
  evidence: [
    { id: 'ev42c-plano-rev', sourceId: 'att-42-plano-c', locator: 'Plano rev. C · cajetín · REV', excerpt: 'C', kind: 'source' as const, anchor: 'tb.revision' },
    { id: 'ev42c-plano-geo', sourceId: 'att-42-plano-c', locator: 'Plano rev. C · vista y notas', excerpt: 'Bolsillo prof. 16 · 6× Ø8 H7', kind: 'source' as const, anchor: 'notes' },
    { id: 'ev42c-mail', sourceId: 'mail-42-3', locator: 'Correo rev. C · párrafo 1', excerpt: 'el bolsillo pasa a 16 mm de profundidad', kind: 'source' as const, anchor: 'el bolsillo pasa a 16 mm de profundidad' },
  ],
  features: FEATURES_SP118_C,
  changes: ['Bolsillo: profundidad 12 → 16 mm', 'Taladros Ø8 H7: 4 → 6', 'Cotas críticas: 5 → 6', 'Modelo 3D: no actualizado por el cliente (se usan rasgos del plano rev. C)'],
};

// ── RFQ-2026-0045 · incompleta (sin material) ──────────────────────────────

function rfq45(): ManufacturingRequest {
  const attachments: Attachment[] = [
    att({ id: 'att-45-plano', fileName: 'BR-210_revA.pdf', kind: 'pdf', sizeBytes: 0, revision: 'A', url: '/demo-assets/BR-210_revA.pdf', capability: 'fixture_parsed', readSummary: ['Cajetín: MATERIAL «SEGÚN PEDIDO»', 'Ø160 × 20 mm, 6× Ø11'], addedAt: '2026-10-04T16:20:00+02:00' }),
  ];
  const body = `Buenas tardes:

¿Nos podéis pasar precio para 30 bridas BR-210 según el plano adjunto? Las necesitaríamos para finales de noviembre.

Gracias,
Brais Otero
Aprovisionamiento · Náutica Cíes`;
  return {
    id: 'rfq-2026-0045', ref: 'RFQ-2026-0045', schemaVersion: SCHEMA_VERSION,
    subject: 'Brida BR-210 — 30 uds', partNumber: 'BR-210', partName: 'Brida de amarre',
    customer: { company: 'Náutica Cíes', contact: 'Brais Otero', email: 'aprovisionamiento@nauticacies.example' },
    receivedAt: '2026-10-04T16:20:00+02:00', channel: 'email', priority: 'normal', state: 'received',
    emails: [{ id: 'mail-45-1', from: 'aprovisionamiento@nauticacies.example', fromName: 'Brais Otero · Náutica Cíes', to: 'ofertas@talleresdelta.example', date: '2026-10-04T16:20:00+02:00', subject: 'Petición de precio brida BR-210 (30 uds)', body, attachmentIds: ['att-45-plano'], direction: 'in' }],
    attachments,
    evidence: [
      { id: 'ev45-mail-qty', sourceId: 'mail-45-1', locator: 'Correo 04/10 16:20 · párrafo 1', excerpt: '30 bridas', kind: 'source', anchor: '30 bridas' },
      { id: 'ev45-plano-mat', sourceId: 'att-45-plano', locator: 'Plano rev. A · cajetín · MATERIAL', excerpt: 'SEGÚN PEDIDO', kind: 'source', anchor: 'tb.material' },
      { id: 'ev45-plano-tol', sourceId: 'att-45-plano', locator: 'Plano rev. A · nota 1', excerpt: 'ISO 2768-m', kind: 'source', anchor: 'notes' },
      { id: 'ev45-plano-rev', sourceId: 'att-45-plano', locator: 'Plano rev. A · cajetín · REV', excerpt: 'A', kind: 'source', anchor: 'tb.revision' },
      { id: 'ev45-mail-date', sourceId: 'mail-45-1', locator: 'Correo 04/10 16:20 · párrafo 1', excerpt: 'finales de noviembre', kind: 'source', anchor: 'finales de noviembre' },
      { id: 'ev45-plano-pn', sourceId: 'att-45-plano', locator: 'Plano rev. A · cajetín · REFERENCIA', excerpt: 'BR-210', kind: 'source', anchor: 'tb.partNumber' },
    ],
    fields: fields([
      ['partNumber', 'BR-210', 'extracted', [['BR-210', 'ev45-plano-pn']]],
      ['quantity', '30', 'extracted', [['30', 'ev45-mail-qty']], 'uds'],
      ['material', null, 'missing', [['SEGÚN PEDIDO', 'ev45-plano-mat']], undefined, 'El plano indica «según pedido» y el correo no lo especifica.'],
      ['tolerance', 'ISO 2768-m', 'extracted', [['ISO 2768-m', 'ev45-plano-tol']]],
      ['finish', null, 'missing', [], undefined, 'Sin acabado indicado: se ofertará en bruto mecanizado salvo indicación.'],
      ['revision', 'A', 'extracted', [['A', 'ev45-plano-rev']]],
      ['dueDate', '2026-11-27', 'assumed', [['finales de noviembre', 'ev45-mail-date']], undefined, '«Finales de noviembre» interpretado como 27/11/2026 (viernes).'],
    ]),
    revisions: [{ revision: 'A', receivedAt: '2026-10-04T16:20:00+02:00', attachmentIds: ['att-45-plano'], features: FEATURES_BR210 }],
    currentRevision: 'A',
    draft: {
      revision: 'A', quantity: 30, material: null, features: FEATURES_BR210, finish: null,
      disabledMachineIds: [], rateOverrides: {}, overrides: [], pricing: { kind: 'margin', marginPct: 22 }, indirectPct: 12, datasetVersion: DATASET_VERSION,
    },
    versions: [], steps: emptySteps(),
    activity: [{ id: 'a45-1', at: '2026-10-04T16:20:04+02:00', actor: 'C01', text: 'Solicitud recibida con 1 adjunto', kind: 'info' }],
    comments: [], contradictions: [], tags: ['Torneado'],
  };
}

// ── RFQ-2026-0038 · ya ofertada (se completa en el seed) ───────────────────

function rfq38(): ManufacturingRequest {
  const body = `Hola:

Necesitamos oferta para 120 placas base PL-040 rev. A en EN AW-6082-T6, anodizado natural 10 µm. Plano adjunto.

Saludos,
Irene Castro
Compras · Marina Norte`;
  return {
    id: 'rfq-2026-0038', ref: 'RFQ-2026-0038', schemaVersion: SCHEMA_VERSION,
    subject: 'Placa base PL-040 — 120 uds', partNumber: 'PL-040', partName: 'Placa base',
    customer: { company: 'Marina Norte', contact: 'Irene Castro', email: 'compras@marinanorte.example' },
    receivedAt: '2026-09-24T10:02:00+02:00', channel: 'email', priority: 'normal', state: 'received',
    emails: [{ id: 'mail-38-1', from: 'compras@marinanorte.example', fromName: 'Irene Castro · Marina Norte', to: 'ofertas@talleresdelta.example', date: '2026-09-24T10:02:00+02:00', subject: 'Oferta placa PL-040 (120 uds)', body, attachmentIds: ['att-38-plano'], direction: 'in' }],
    attachments: [att({ id: 'att-38-plano', fileName: 'PL-040_revA.pdf', kind: 'pdf', sizeBytes: 0, revision: 'A', url: '/demo-assets/PL-040_revA.pdf', capability: 'fixture_parsed', readSummary: ['Cajetín completo', '140 × 90 × 12 mm, 6× Ø6,5'], addedAt: '2026-09-24T10:02:00+02:00' })],
    evidence: [
      { id: 'ev38-mail-qty', sourceId: 'mail-38-1', locator: 'Correo 24/09 · párrafo 1', excerpt: '120 placas', kind: 'source', anchor: '120 placas' },
      { id: 'ev38-plano-mat', sourceId: 'att-38-plano', locator: 'Plano rev. A · cajetín · MATERIAL', excerpt: 'EN AW-6082-T6', kind: 'source', anchor: 'tb.material' },
      { id: 'ev38-mail-fin', sourceId: 'mail-38-1', locator: 'Correo 24/09 · párrafo 1', excerpt: 'anodizado natural 10 µm', kind: 'source', anchor: 'anodizado natural 10 µm' },
      { id: 'ev38-plano-rev', sourceId: 'att-38-plano', locator: 'Plano rev. A · cajetín · REV', excerpt: 'A', kind: 'source', anchor: 'tb.revision' },
      { id: 'ev38-plano-tol', sourceId: 'att-38-plano', locator: 'Plano rev. A · nota 1', excerpt: 'ISO 2768-m', kind: 'source', anchor: 'notes' },
    ],
    fields: fields([
      ['partNumber', 'PL-040', 'extracted', [['PL-040', 'ev38-plano-rev']]],
      ['quantity', '120', 'confirmed', [['120', 'ev38-mail-qty']], 'uds'],
      ['material', 'EN AW-6082-T6', 'confirmed', [['6082-T6', 'ev38-plano-mat']]],
      ['tolerance', 'ISO 2768-m', 'extracted', [['ISO 2768-m', 'ev38-plano-tol']]],
      ['finish', 'Anodizado natural 10 µm', 'confirmed', [['Anodizado natural 10 µm', 'ev38-mail-fin']]],
      ['revision', 'A', 'confirmed', [['A', 'ev38-plano-rev']]],
      ['dueDate', null, 'missing', []],
    ]),
    revisions: [{ revision: 'A', receivedAt: '2026-09-24T10:02:00+02:00', attachmentIds: ['att-38-plano'], features: FEATURES_PL040 }],
    currentRevision: 'A',
    draft: {
      revision: 'A', quantity: 120, material: 'al-6082-t6', features: FEATURES_PL040, finish: 'Anodizado natural 10 µm',
      disabledMachineIds: [], rateOverrides: {}, overrides: [], pricing: { kind: 'margin', marginPct: 22 }, indirectPct: 12, datasetVersion: DATASET_VERSION,
    },
    versions: [], steps: emptySteps(),
    activity: [{ id: 'a38-1', at: '2026-09-24T10:02:05+02:00', actor: 'C01', text: 'Solicitud recibida con 1 adjunto', kind: 'info' }],
    comments: [], contradictions: [], tags: ['Mecanizado', 'Aluminio'],
  };
}

// ── RFQ-2026-0047 · acero ──────────────────────────────────────────────────

function rfq47(): ManufacturingRequest {
  const body = `Buenas:

Solicitamos presupuesto para 200 soportes de bancada SP-126 rev. A en acero S275JR, zincado blanco. Adjuntamos plano.

Plazo deseado: diciembre.

Noa Rial
Compras · Astilleros Lérez`;
  return {
    id: 'rfq-2026-0047', ref: 'RFQ-2026-0047', schemaVersion: SCHEMA_VERSION,
    subject: 'Soporte de bancada SP-126 — 200 uds', partNumber: 'SP-126', partName: 'Soporte de bancada',
    customer: { company: 'Astilleros Lérez', contact: 'Noa Rial', email: 'compras@astilleroslerez.example' },
    receivedAt: '2026-10-04T17:30:00+02:00', channel: 'email', priority: 'normal', state: 'received',
    emails: [{ id: 'mail-47-1', from: 'compras@astilleroslerez.example', fromName: 'Noa Rial · Astilleros Lérez', to: 'ofertas@talleresdelta.example', date: '2026-10-04T17:30:00+02:00', subject: 'Presupuesto SP-126 (200 uds)', body, attachmentIds: ['att-47-plano'], direction: 'in' }],
    attachments: [att({ id: 'att-47-plano', fileName: 'SP-126_revA.pdf', kind: 'pdf', sizeBytes: 0, revision: 'A', url: '/demo-assets/SP-126_revA.pdf', capability: 'fixture_parsed', readSummary: ['Cajetín completo', '125 × 75 × 22 mm, bolsillo 60×32×10, 4× Ø10'], addedAt: '2026-10-04T17:30:00+02:00' })],
    evidence: [
      { id: 'ev47-mail-qty', sourceId: 'mail-47-1', locator: 'Correo 04/10 · párrafo 1', excerpt: '200 soportes', kind: 'source', anchor: '200 soportes' },
      { id: 'ev47-mail-mat', sourceId: 'mail-47-1', locator: 'Correo 04/10 · párrafo 1', excerpt: 'acero S275JR', kind: 'source', anchor: 'acero S275JR' },
      { id: 'ev47-plano-mat', sourceId: 'att-47-plano', locator: 'Plano rev. A · cajetín · MATERIAL', excerpt: 'S275JR', kind: 'source', anchor: 'tb.material' },
      { id: 'ev47-mail-fin', sourceId: 'mail-47-1', locator: 'Correo 04/10 · párrafo 1', excerpt: 'zincado blanco', kind: 'source', anchor: 'zincado blanco' },
      { id: 'ev47-plano-rev', sourceId: 'att-47-plano', locator: 'Plano rev. A · cajetín · REV', excerpt: 'A', kind: 'source', anchor: 'tb.revision' },
      { id: 'ev47-plano-tol', sourceId: 'att-47-plano', locator: 'Plano rev. A · nota 1', excerpt: 'ISO 2768-m', kind: 'source', anchor: 'notes' },
      { id: 'ev47-mail-date', sourceId: 'mail-47-1', locator: 'Correo 04/10 · párrafo 3', excerpt: 'diciembre', kind: 'source', anchor: 'Plazo deseado: diciembre' },
    ],
    fields: fields([
      ['partNumber', 'SP-126', 'extracted', [['SP-126', 'ev47-plano-rev']]],
      ['quantity', '200', 'extracted', [['200', 'ev47-mail-qty']], 'uds'],
      ['material', 'Acero S275JR', 'extracted', [['S275', 'ev47-mail-mat'], ['S275', 'ev47-plano-mat']]],
      ['tolerance', 'ISO 2768-m', 'extracted', [['ISO 2768-m', 'ev47-plano-tol']]],
      ['finish', 'Zincado blanco 8 µm', 'extracted', [['Zincado blanco', 'ev47-mail-fin']]],
      ['revision', 'A', 'extracted', [['A', 'ev47-plano-rev']]],
      ['dueDate', '2026-12-18', 'assumed', [['diciembre', 'ev47-mail-date']], undefined, '«Diciembre» interpretado como antes del cierre navideño (18/12/2026).'],
    ]),
    revisions: [{ revision: 'A', receivedAt: '2026-10-04T17:30:00+02:00', attachmentIds: ['att-47-plano'], features: FEATURES_SP126 }],
    currentRevision: 'A',
    draft: {
      revision: 'A', quantity: 200, material: 'steel-s275', features: FEATURES_SP126, finish: 'Zincado blanco 8 µm',
      disabledMachineIds: [], rateOverrides: {}, overrides: [], pricing: { kind: 'margin', marginPct: 22 }, indirectPct: 12, datasetVersion: DATASET_VERSION,
    },
    versions: [], steps: emptySteps(),
    activity: [{ id: 'a47-1', at: '2026-10-04T17:30:04+02:00', actor: 'C01', text: 'Solicitud recibida con 1 adjunto', kind: 'info' }],
    comments: [], contradictions: [], tags: ['Mecanizado', 'Acero'],
  };
}

export const seedRequests = (): ManufacturingRequest[] => [rfq42(), rfq45(), rfq47(), rfq38()];

/** Plano asociado a una solicitud y revisión (si existe fixture). */
export const drawingKey = (partNumber: string, revision: string) => `${partNumber}:${revision}`;
