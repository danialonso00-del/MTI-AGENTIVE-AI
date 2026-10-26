// Definición declarativa del recorrido de estimación y ejecutor puro de cada paso.
// El grafo, el inspector y los resultados leen estas salidas: un único estado y dataset.
import type { ActivityEntry, Contradiction, ManufacturingRequest, RunState, StepStatus } from '@/domain/types';
import { MATERIALS } from '@/fixtures/manufacturing';
import { DRAWINGS } from '@/fixtures/drawings';
import { templateModel } from '@/adapters/llm/languageModel';
import { findComparables, correctionFactors } from '../estimation/comparables';
import { estimate } from '../estimation/engine';
import { blankVolumeCm3, partVolumeCm3, routeFor } from '../estimation/rules';
import { uid } from '@/lib/format';

export interface FlowStepDef {
  id: string;
  title: string;
  short: string;
  agents: string[];
  tools: string[];
  description: string;
  deliverable: string;
  runState: RunState;
}

export const MANUFACTURING_FLOW: FlowStepDef[] = [
  { id: 'intake', title: 'Entrada', short: 'Correo', agents: ['C01'], tools: [], runState: 'extracting',
    description: 'Lee el correo y los adjuntos; extrae cantidad, material, tolerancias, acabado, revisión y fecha con su fuente.', deliverable: 'Campos extraídos con fuente y estado' },
  { id: 'classify', title: 'Clasificación', short: 'Orquestador', agents: ['MTI'], tools: [], runState: 'extracting',
    description: 'Identifica la intención, elabora el plan y selecciona especialistas.', deliverable: 'Intención, plan y especialistas' },
  { id: 'cad', title: 'Lectura técnica', short: 'CAD / plano', agents: ['C08'], tools: ['CAD', 'OCR'], runState: 'extracting',
    description: 'Lee rasgos del modelo y del plano; detecta contradicciones entre plano, modelo y correo.', deliverable: 'Rasgos, volumen, complejidad y contradicciones' },
  { id: 'history', title: 'Histórico', short: 'Conocimiento', agents: ['C07'], tools: [], runState: 'retrieving',
    description: 'Recupera trabajos comparables y descarta los no transferibles con motivo.', deliverable: 'Tabla de comparables y factores' },
  { id: 'estimate', title: 'Estimación', short: 'Motor + calidad', agents: ['C08'], tools: ['TME', 'MLC'], runState: 'estimating',
    description: 'Construye operaciones, tiempos base, correcciones y comprobaciones de consistencia.', deliverable: 'Operaciones y tiempos del lote' },
  { id: 'offer', title: 'Oferta', short: 'Ofertas', agents: ['C02'], tools: [], runState: 'estimating',
    description: 'Traduce tiempos y tarifas a coste y precio con la regla comercial seleccionada.', deliverable: 'Desglose de coste y borrador de oferta' },
  { id: 'review', title: 'Revisión', short: 'Persona', agents: ['MTI'], tools: ['HUM'], runState: 'reviewing',
    description: 'Una persona revisa incertidumbres, edita y aprueba una versión exacta.', deliverable: 'Aprobación vinculada a hash de inputs' },
  { id: 'output', title: 'Salida', short: 'Odoo', agents: ['C02', 'C01'], tools: ['ERP'], runState: 'draft_created',
    description: 'Crea el presupuesto borrador en el ERP, prepara la respuesta y las exportaciones.', deliverable: 'Presupuesto borrador y respuesta' },
];

export interface StepExecution {
  status: StepStatus;
  summary: string;
  outputs: Record<string, unknown>;
  patch: Partial<ManufacturingRequest>;
  activity: Omit<ActivityEntry, 'id' | 'at'>[];
}

const norm = (v: string) => v.toLowerCase().replace(/\s+/g, ' ').trim();

export function detectContradictions(req: ManufacturingRequest): Contradiction[] {
  const out: Contradiction[] = [];
  for (const f of req.fields) {
    const distinct = new Set(f.candidates.map((c) => norm(c.value)));
    if (distinct.size > 1 && f.status !== 'confirmed') {
      out.push({
        id: `ct-${f.key}`, field: f.key, severity: 'warning', sources: f.candidates.map((c) => c.evidenceId),
        description: `${f.label}: ${f.candidates.map((c) => `«${c.value}»`).join(' vs ')}`,
      });
    }
  }
  const rev = req.revisions.find((r) => r.revision === req.currentRevision);
  const hasModel = rev?.attachmentIds.some((id) => req.attachments.find((a) => a.id === id && (a.kind === 'step' || a.kind === 'glb')));
  if (rev && !hasModel && req.revisions.length > 1) {
    out.push({
      id: 'ct-geometry', field: 'geometry', severity: 'warning', sources: [],
      description: `Modelo 3D no recibido para rev. ${rev.revision}: se usan los rasgos del plano; el modelo disponible es de una revisión anterior.`,
    });
  }
  return out;
}

export function complexity(req: ManufacturingRequest) {
  const f = req.draft.features;
  let score = 1;
  const reasons: string[] = [];
  if (f.pocket) { score += 1; reasons.push('Bolsillo cerrado'); }
  if (f.holes.fit) { score += 1; reasons.push(`Ajuste ${f.holes.fit}`); }
  if (f.holes.count > 4) { score += 0.5; reasons.push(`${f.holes.count} taladros`); }
  if (f.criticalDims > 5) { score += 0.5; reasons.push(`${f.criticalDims} cotas críticas`); }
  return { score, label: score >= 3 ? 'Alta' : score >= 2 ? 'Media' : 'Baja', reasons };
}

export function executeStep(req: ManufacturingRequest, stepId: string): StepExecution {
  switch (stepId) {
    case 'intake': {
      const required = ['quantity', 'material'];
      const missing = req.fields.filter((f) => required.includes(f.key) && (f.status === 'missing' || !f.value)).map((f) => f.key);
      const fields = req.fields.map((f) => ({ key: f.key, label: f.label, value: f.value, status: f.status, sources: f.evidenceIds.length }));
      const attachments = req.attachments.map((a) => ({ fileName: a.fileName, capability: a.capability }));
      if (missing.length) {
        return {
          status: 'needs_input',
          summary: `Requiere dato: ${missing.map((m) => req.fields.find((f) => f.key === m)?.label.toLowerCase()).join(', ')}`,
          outputs: { fields, attachments, missing },
          patch: { state: 'needs_input', replyDraft: templateModel.draftMissingDataQuestion(req, missing) },
          activity: [{ actor: 'C01', kind: 'warning', text: `Falta ${missing.join(', ')}: estado «Requiere dato» y pregunta en borrador. No se completa con suposiciones.` }],
        };
      }
      const assumed = req.fields.filter((f) => f.status === 'assumed').length;
      return {
        status: 'completed',
        summary: `${req.fields.filter((f) => f.value).length} campos extraídos · ${assumed} supuesto${assumed === 1 ? '' : 's'} · ${req.attachments.length} adjuntos`,
        outputs: { fields, attachments, missing: [] },
        patch: { state: 'extracting' },
        activity: [{ actor: 'C01', kind: 'info', text: `Extraídos ${req.fields.length} campos de correo y ${req.attachments.length} adjuntos` }],
      };
    }
    case 'classify': {
      const kinds = new Set(req.attachments.map((a) => a.kind));
      const signals = [
        /rfq|oferta|presupuesto|precio/i.test(req.emails[0]?.subject + req.emails[0]?.body) ? 'Léxico de petición de oferta («oferta», «precio», «RFQ»)' : null,
        req.fields.find((f) => f.key === 'quantity')?.value ? `Cantidad explícita: ${req.fields.find((f) => f.key === 'quantity')!.value} uds` : null,
        kinds.has('pdf') ? 'Plano técnico adjunto' : null,
        kinds.has('step') || kinds.has('dxf') ? 'Geometría CAD adjunta' : null,
      ].filter(Boolean);
      return {
        status: 'completed',
        summary: 'Intención: solicitud de oferta de fabricación',
        outputs: {
          intent: 'Solicitud de oferta de fabricación',
          signals,
          discarded: [
            { intent: 'Pedido en firme', reason: 'No hay número de pedido ni aceptación de oferta' },
            { intent: 'Consulta de estado', reason: 'No referencia pedidos existentes' },
          ],
          plan: MANUFACTURING_FLOW.slice(2).map((s) => `${s.title} → ${[...s.agents, ...s.tools].join(' · ')}`),
          specialists: ['CAD', 'OCR', 'C07', 'TME', 'MLC', 'C08', 'C02'],
          writePolicy: 'Escritura permitida: solo presupuesto borrador tras aprobación humana',
        },
        patch: { state: 'extracting' },
        activity: [{ actor: 'MTI', kind: 'info', text: 'Plan de 6 pasos con especialistas CAD, OCR, C07, Motor de tiempos, ML correctivo, C08 y C02' }],
      };
    }
    case 'cad': {
      const f = req.draft.features;
      const contradictions = detectContradictions(req);
      const mat = req.draft.material ? MATERIALS[req.draft.material] : null;
      const vol = partVolumeCm3(f);
      const drawing = DRAWINGS[`${req.partNumber}:${req.draft.revision}`];
      const cx = complexity(req);
      return {
        status: 'completed',
        summary: `${f.lengthMm}×${f.widthMm}×${f.heightMm} mm · complejidad ${cx.label.toLowerCase()} · ${contradictions.length} contradicción${contradictions.length === 1 ? '' : 'es'}`,
        outputs: {
          features: f, volumeCm3: vol, blankVolumeCm3: blankVolumeCm3(f), massKg: mat ? (vol * mat.densityGcm3) / 1000 : null,
          route: routeFor(f), complexity: cx, contradictions,
          sources: [drawing ? `Plano ${drawing.partNumber} rev. ${drawing.revision}` : 'Rasgos introducidos manualmente', 'Modelo de ejemplo (rasgos precalculados)'],
          materialNote: 'El material procede de documentos (plano/requisitos/correo); la geometría no lo determina.',
        },
        patch: { contradictions },
        activity: [
          { actor: 'CAD', kind: 'info', text: `Rasgos: envolvente ${f.lengthMm}×${f.widthMm}×${f.heightMm} mm${f.pocket ? `, bolsillo ${f.pocket.lengthMm}×${f.pocket.widthMm}×${f.pocket.depthMm}` : ''}, ${f.holes.count}× Ø${f.holes.diameterMm}` },
          ...contradictions.map((c) => ({ actor: 'C08', kind: 'warning' as const, text: `Contradicción: ${c.description}` })),
        ],
      };
    }
    case 'history': {
      const comps = findComparables(req.draft.features, req.draft.material, req.draft.quantity);
      const factors = correctionFactors(comps, routeFor(req.draft.features));
      const used = comps.filter((c) => c.included);
      return {
        status: 'completed',
        summary: `${used.length} comparables · ${comps.filter((c) => !c.included).length} descartados con motivo`,
        outputs: {
          comparables: comps.map((c) => ({ ref: c.job.ref, partName: c.job.partName, material: MATERIALS[c.job.material].shortName, quantity: c.job.quantity, score: c.score, included: c.included, reason: c.included ? c.reasons.join(' · ') : c.exclusionReason, realLotMin: c.job.realLotMin })),
          factors: Object.values(factors).map((x) => ({ kind: x.kind, factor: x.factor, applied: x.applied, note: x.note })),
        },
        patch: { state: 'retrieving' },
        activity: [{ actor: 'C07', kind: 'info', text: `Comparables: ${used.map((c) => c.job.ref).join(', ') || 'ninguno'}` }],
      };
    }
    case 'estimate': {
      const r = estimate(req.draft);
      if (r.missingFields.length || r.blocked.length) {
        return {
          status: 'needs_input', summary: r.blocked[0] ?? 'Faltan datos', outputs: { blocked: r.blocked, inputHash: r.inputHash },
          patch: { state: 'needs_input' },
          activity: [{ actor: 'C08', kind: 'warning', text: `Estimación bloqueada: ${r.blocked.join('; ')}` }],
        };
      }
      const checks: { level: 'ok' | 'warning'; text: string }[] = [];
      for (const c of req.contradictions) checks.push({ level: 'warning', text: `${c.description} — confirmar en revisión` });
      const corr = r.operations.filter((o) => o.method === 'fixture_correction').length;
      checks.push({ level: corr ? 'ok' : 'warning', text: corr ? `Corrección aplicada en ${corr} operaciones con ${r.comparablesUsed.length} comparables` : 'Sin corrección por histórico: estimación solo por reglas' });
      const due = req.fields.find((f) => f.key === 'dueDate')?.value;
      if (due) {
        const days = Math.round((new Date(due).getTime() - new Date('2026-10-05').getTime()) / 86400000 * 5 / 7);
        checks.push({ level: days >= r.leadTime.maxDays ? 'ok' : 'warning', text: `Fecha solicitada a ~${days} días hábiles; plazo orientativo ${r.leadTime.minDays}–${r.leadTime.maxDays}` });
      }
      for (const o of r.operations) for (const a of o.assumptions.filter((x) => x.includes('supuesto'))) checks.push({ level: 'warning', text: `${o.name}: ${a}` });
      return {
        status: 'completed',
        summary: `${r.estimatedLotMin.toLocaleString('es-ES', { maximumFractionDigits: 1 })} min para ${req.draft.quantity} uds`,
        outputs: {
          inputHash: r.inputHash, estimatedLotMin: r.estimatedLotMin, baseLotMin: r.baseLotMin, perPieceMin: r.perPieceMin, band: r.bandMin,
          setupTotalMin: r.setupTotalMin, laborHours: r.laborHours,
          operations: r.operations.map((o) => ({ name: o.name, setupMin: o.setupMin, cycleMin: o.cycleMin, factor: o.correctionFactor, corrected: o.correctedCycleMin, totalMin: o.totalMin, machine: o.machineId, method: o.method })),
          checks,
        },
        patch: { state: 'estimating' },
        activity: [
          { actor: 'TME', kind: 'info', text: `Tiempos base: ${r.baseLotMin.toFixed(1)} min · corregidos: ${r.estimatedLotMin.toFixed(1)} min` },
          { actor: 'C08', kind: checks.some((c) => c.level === 'warning') ? 'warning' : 'success', text: `${checks.filter((c) => c.level === 'warning').length} puntos a revisar` },
        ],
      };
    }
    case 'offer': {
      const r = estimate(req.draft);
      if (r.blocked.length) return { status: 'needs_input', summary: 'Estimación bloqueada', outputs: {}, patch: {}, activity: [] };
      return {
        status: 'completed',
        summary: `${r.cost.commercialUnitEur.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}/ud · total ${r.cost.commercialTotalEur.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`,
        outputs: { inputHash: r.inputHash, cost: r.cost, leadTime: r.leadTime, offerText: templateModel.draftOfferText(req, r), writer: templateModel.label },
        patch: { state: 'reviewing' },
        activity: [{ actor: 'C02', kind: 'info', text: `Borrador de oferta: ${r.cost.ruleText}` }],
      };
    }
    case 'review': {
      const r = estimate(req.draft);
      const ok = req.approval && !req.approval.invalidatedAt && req.approval.approvedInputHash === r.inputHash;
      return ok
        ? { status: 'completed', summary: `Aprobado por ${req.approval!.approvedBy}`, outputs: { approval: req.approval }, patch: { state: 'approved' }, activity: [] }
        : { status: 'needs_input', summary: 'Pendiente de revisión humana', outputs: { pending: true, inputHash: r.inputHash }, patch: { state: 'reviewing' }, activity: [{ actor: 'MTI', kind: 'info', text: 'Solicita revisión humana: guardar versión y aprobar' }] };
    }
    default:
      return { status: 'failed', summary: `Paso desconocido ${stepId}`, outputs: {}, patch: {}, activity: [] };
  }
}

export const newActivity = (a: Omit<ActivityEntry, 'id' | 'at'>, at: string): ActivityEntry => ({ ...a, id: uid('act'), at });
