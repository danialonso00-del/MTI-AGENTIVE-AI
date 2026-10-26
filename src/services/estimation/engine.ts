// Motor de tiempos y costes. Determinista: mismos inputs → mismo resultado y mismo hash.
// Ruta serial simplificada en minutos de proceso; no reproduce la planificación avanzada de Odoo.
import type {
  CostBreakdown,
  EstimateInputs,
  EstimateResult,
  Machine,
  OperationEstimate,
  OperationKind,
  PricingRule,
} from '@/domain/types';
import { FINISH_COSTS, MACHINE_PREFERENCE, MACHINES, MATERIALS, OPERATION_LABEL } from '@/fixtures/manufacturing';
import { stableHash } from '@/lib/hash';
import { correctionFactors, findComparables } from './comparables';
import { applyRule, blankVolumeCm3, routeFor } from './rules';

export const BAND_PCT = 0.15;
export const SCRAP_PCT = 0.05;
export const HOURS_AVAILABLE_PER_DAY = 7.5 * 0.6; // turno 7,5 h × disponibilidad 60 % (fixture)
export const MATERIAL_LEAD_DAYS: Record<string, number> = { 'al-6082-t6': 2, 'steel-s275': 3, 'ss-304': 5 };

export function inputHash(inputs: EstimateInputs): string {
  return stableHash(inputs);
}

export function priceFromCost(cost: number, rule: PricingRule): number {
  return rule.kind === 'margin' ? cost / (1 - rule.marginPct / 100) : cost * (1 + rule.markupPct / 100);
}

export function pricingRuleText(rule: PricingRule): string {
  return rule.kind === 'margin'
    ? `Margen sobre venta ${rule.marginPct} %: precio = coste / (1 − ${rule.marginPct / 100})`
    : `Recargo sobre coste ${rule.markupPct} %: precio = coste × (1 + ${rule.markupPct / 100})`;
}

function pickMachine(family: string, kind: OperationKind, disabled: string[], forced?: string): { machine?: Machine; alternative: boolean; reason?: string } {
  const pref = MACHINE_PREFERENCE[`${family}:${kind}`] ?? [];
  if (forced) {
    const m = MACHINES.find((x) => x.id === forced);
    if (!m || !m.capabilities.includes(kind)) return { alternative: false, reason: `${forced} no puede realizar ${OPERATION_LABEL[kind]}` };
    if (disabled.includes(forced)) return { alternative: false, reason: `${forced} está desactivada` };
    return { machine: m, alternative: pref[0] !== forced };
  }
  const candidates = pref.map((id) => MACHINES.find((m) => m.id === id)!).filter(Boolean);
  const chosen = candidates.find((m) => !disabled.includes(m.id));
  if (!chosen) {
    return { alternative: false, reason: `Sin capacidad válida para ${OPERATION_LABEL[kind]}: ${candidates.map((c) => c.id).join(', ')} desactivadas` };
  }
  return { machine: chosen, alternative: chosen.id !== pref[0] };
}

export function estimate(inputs: EstimateInputs): EstimateResult {
  const hash = inputHash(inputs);
  const f = inputs.features;
  const missingFields: string[] = [];
  if (!inputs.material) missingFields.push('material');
  if (!(inputs.quantity > 0)) missingFields.push('quantity');

  const emptyCost: CostBreakdown = {
    transformationEur: 0, materialEur: 0, subcontractEur: 0, indirectEur: 0, totalCostEur: 0, priceEur: 0, unitPriceEur: 0, commercialUnitEur: 0, commercialTotalEur: 0,
    rule: inputs.pricing, ruleText: pricingRuleText(inputs.pricing), currency: 'EUR', vatExcluded: true, lines: [],
  };

  if (missingFields.length) {
    return {
      inputHash: hash, operations: [], setupTotalMin: 0, cycleBaseTotalMin: 0, cycleCorrectedTotalMin: 0, baseLotMin: 0,
      estimatedLotMin: 0, perPieceMin: 0, bandMin: [0, 0], machineMinByWorkcenter: {}, laborHours: 0,
      leadTime: { minDays: 0, maxDays: 0, assumptions: [] }, cost: emptyCost, missingFields,
      blocked: missingFields.map((m) => (m === 'material' ? 'Falta el material: no se estima con una suposición silenciosa' : 'Cantidad no válida')),
      assumptions: [], comparablesUsed: [],
    };
  }

  const material = MATERIALS[inputs.material!];
  const qty = inputs.quantity;
  const kinds = routeFor(f);
  const comparables = findComparables(f, inputs.material, qty);
  const factors = correctionFactors(comparables, kinds);
  const blocked: string[] = [];

  const operations: OperationEstimate[] = kinds.map((kind) => {
    const opId = `op-${kind}`;
    const rule = applyRule(kind, f);
    const ov = inputs.overrides.find((o) => o.opId === opId);
    const pick = pickMachine(f.family, kind, inputs.disabledMachineIds, ov?.machineId);
    const assumptions = [...rule.assumptions];
    const evidenceIds = ['ev-rules', 'ev-materials', 'ev-machines'];
    let setupMin = rule.setupMin + (material.setupExtraMin[kind] ?? 0);
    let cycleMin = rule.cycleMin * material.cycleMultiplier[kind];
    if (material.cycleMultiplier[kind] !== 1) assumptions.push(`Multiplicador ${material.shortName} × ${material.cycleMultiplier[kind].toFixed(2).replace('.', ',')} (tabla de material)`);
    if (material.setupExtraMin[kind]) assumptions.push(`+${material.setupExtraMin[kind]} min de preparación por ${material.shortName}`);

    const machine = pick.machine;
    if (machine) {
      const sf = machine.speedFactor[kind] ?? 1;
      cycleMin *= sf;
      if (pick.alternative) assumptions.push(`Máquina alternativa ${machine.id}${sf !== 1 ? ` (velocidad × ${sf.toFixed(2).replace('.', ',')})` : ''}`);
    } else {
      blocked.push(pick.reason!);
    }

    const corr = factors[kind];
    let correctionFactor = corr.factor;
    let method: OperationEstimate['method'] = corr.applied ? 'fixture_correction' : 'rule';
    if (!corr.applied) assumptions.push(corr.note);
    else evidenceIds.push(...corr.samples.map((s) => `ev-hist-${s.jobRef}`));

    if (ov) {
      if (ov.setupMin !== undefined) setupMin = ov.setupMin;
      if (ov.cycleBaseMin !== undefined) cycleMin = ov.cycleBaseMin;
      if (ov.correctionFactor !== undefined) correctionFactor = ov.correctionFactor;
      method = 'manual';
      assumptions.push(`Ajuste manual: ${ov.reason}`);
    }

    const correctedCycleMin = cycleMin * correctionFactor;
    const totalMin = setupMin + qty * correctedCycleMin;
    const rate = machine ? inputs.rateOverrides[machine.id] ?? machine.rateEurH : 0;
    return {
      id: opId, kind, name: OPERATION_LABEL[kind], setupMin, cycleMin, quantity: qty, correctionFactor, correctedCycleMin, totalMin,
      machineId: machine?.id ?? '—', machineName: machine?.name ?? 'Sin máquina', rateEurH: rate, costEur: machine ? (totalMin / 60) * rate : 0,
      evidenceIds, assumptions, method, ruleText: `${rule.ruleText} · ${rule.inputsText}`, override: ov,
      blocked: machine ? undefined : pick.reason,
    };
  });

  const setupTotalMin = operations.reduce((s, o) => s + o.setupMin, 0);
  const cycleBaseTotalMin = operations.reduce((s, o) => s + o.cycleMin, 0);
  const cycleCorrectedTotalMin = operations.reduce((s, o) => s + o.correctedCycleMin, 0);
  const baseLotMin = setupTotalMin + qty * cycleBaseTotalMin;
  const estimatedLotMin = setupTotalMin + qty * cycleCorrectedTotalMin;

  const machineMinByWorkcenter: Record<string, number> = {};
  let laborMin = 0;
  for (const op of operations) {
    const m = MACHINES.find((x) => x.id === op.machineId);
    if (!m) continue;
    machineMinByWorkcenter[m.workcenter] = (machineMinByWorkcenter[m.workcenter] ?? 0) + op.totalMin;
    laborMin += op.setupMin + qty * op.correctedCycleMin * m.attendance;
  }

  // Costes
  const transformationEur = operations.reduce((s, o) => s + o.costEur, 0);
  const blankKg = (blankVolumeCm3(f) * material.densityGcm3) / 1000;
  const materialEur = blankKg * material.priceEurKg * (1 + SCRAP_PCT) * qty;
  const finish = inputs.finish ? FINISH_COSTS.find((fc) => fc.match.test(inputs.finish!)) : undefined;
  const subcontractEur = finish ? finish.eurPerPiece * qty : 0;
  const indirectEur = transformationEur * (inputs.indirectPct / 100);
  const totalCostEur = transformationEur + materialEur + subcontractEur + indirectEur;
  const priceEur = priceFromCost(totalCostEur, inputs.pricing);
  const commercialUnitEur = Math.round((priceEur / qty) * 100) / 100;
  const cost: CostBreakdown = {
    transformationEur, materialEur, subcontractEur, indirectEur, totalCostEur, priceEur, unitPriceEur: priceEur / qty,
    commercialUnitEur, commercialTotalEur: Math.round(commercialUnitEur * qty * 100) / 100,
    rule: inputs.pricing, ruleText: pricingRuleText(inputs.pricing), currency: 'EUR', vatExcluded: true,
    lines: [
      { label: 'Transformación', amountEur: transformationEur, detail: 'Σ (minutos de operación / 60) × tarifa del centro' },
      { label: 'Material', amountEur: materialEur, detail: `${qty} × ${blankKg.toFixed(3).replace('.', ',')} kg de bruto × ${material.priceEurKg.toFixed(2).replace('.', ',')} €/kg × (1 + ${SCRAP_PCT * 100} % merma)` },
      { label: 'Subcontratación', amountEur: subcontractEur, detail: finish ? `${finish.label}: ${finish.eurPerPiece.toFixed(2).replace('.', ',')} €/pieza` : 'Sin acabado subcontratado' },
      { label: 'Indirectos', amountEur: indirectEur, detail: `${inputs.indirectPct} % sobre transformación` },
    ],
  };

  // Plazo calendario orientativo (no planificación)
  const machineHours = estimatedLotMin / 60;
  const productionDays = Math.ceil(machineHours / HOURS_AVAILABLE_PER_DAY);
  const matDays = MATERIAL_LEAD_DAYS[material.id] ?? 3;
  const minDays = matDays + productionDays + (finish?.leadDays ?? 0) + 1;
  const maxDays = minDays + Math.ceil(minDays * 0.3);

  const assumptions = [
    'Ruta serial simplificada en minutos de proceso; no considera solapes entre operaciones.',
    'La preparación se imputa una vez por lote, independientemente de la cantidad.',
    'Factores de corrección: simulación a partir de comparables (no es un modelo entrenado).',
    `Banda ±${BAND_PCT * 100} %: banda de escenario de ejemplo, no intervalo estadístico calibrado.`,
    'Precios sin IVA; el margen se calcula sobre la base imponible.',
  ];

  return {
    inputHash: hash, operations, setupTotalMin, cycleBaseTotalMin, cycleCorrectedTotalMin, baseLotMin, estimatedLotMin,
    perPieceMin: estimatedLotMin / qty, bandMin: [estimatedLotMin * (1 - BAND_PCT), estimatedLotMin * (1 + BAND_PCT)],
    machineMinByWorkcenter, laborHours: laborMin / 60,
    leadTime: {
      minDays, maxDays,
      assumptions: [
        `Material disponible en ${matDays} días hábiles (fixture)`,
        `${productionDays} días de taller: ${machineHours.toFixed(1).replace('.', ',')} h de proceso / ${HOURS_AVAILABLE_PER_DAY.toString().replace('.', ',')} h disponibles por día`,
        ...(finish ? [`${finish.label}: ${finish.leadDays} días`] : []),
        '1 día de inspección final y expedición',
        'Rango superior +30 % por carga de taller; requiere planificación real',
      ],
    },
    cost, missingFields, blocked, assumptions,
    comparablesUsed: comparables.filter((c) => c.included).map((c) => c.job.ref),
  };
}
