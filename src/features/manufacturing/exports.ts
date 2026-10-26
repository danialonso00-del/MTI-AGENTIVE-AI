import type { EstimateResult, ManufacturingRequest } from '@/domain/types';
import { MATERIALS } from '@/fixtures/manufacturing';
import { estimate } from '@/services/estimation/engine';

const n = (v: number, d = 4) => v.toFixed(d).replace('.', ',');
const q = (s: string) => `"${s.replace(/"/g, '""')}"`;

/** CSV (separador «;», decimales con coma) con los mismos tiempos, cantidades, moneda y supuestos visibles. */
export function buildCsv(req: ManufacturingRequest, r: EstimateResult = estimate(req.draft), versionLabel = 'borrador actual'): string {
  const mat = req.draft.material ? MATERIALS[req.draft.material].name : 'SIN MATERIAL';
  const head = [
    ['Solicitud', req.ref], ['Cliente', req.customer.company], ['Pieza', `${req.partNumber} rev. ${req.draft.revision}`], ['Versión', versionLabel],
    ['Cantidad (uds)', String(req.draft.quantity)], ['Material', mat], ['Hash de inputs', r.inputHash], ['Modo', 'Demo · datos de ejemplo'], ['Moneda', 'EUR (sin IVA)'],
  ].map(([k, v]) => `${q(k)};${q(v)}`);
  const cols = ['Operación', 'Máquina', 'Preparación lote (min)', 'Ciclo base (min/ud)', 'Factor corrección', 'Ciclo corregido (min/ud)', 'Cantidad', 'Total (min)', 'Tarifa (€/h)', 'Coste (€)', 'Método', 'Supuestos'];
  const rows = r.operations.map((o) => [q(o.name), q(o.machineId), n(o.setupMin), n(o.cycleMin), n(o.correctionFactor, 2), n(o.correctedCycleMin), String(o.quantity), n(o.totalMin), n(o.rateEurH, 2), n(o.costEur, 2), q(o.method), q(o.assumptions.join(' | '))].join(';'));
  const totals = [
    ['Preparación total (min)', n(r.setupTotalMin)], ['Tiempo base lote (min)', n(r.baseLotMin)], ['Tiempo estimado lote (min)', n(r.estimatedLotMin)],
    ['Tiempo estimado lote (h)', n(r.estimatedLotMin / 60)], ['Tiempo imputado por pieza (min)', n(r.perPieceMin)],
    ['Banda de escenario de ejemplo ±15 % (min)', `${n(r.bandMin[0])} – ${n(r.bandMin[1])}`], ['Horas de trabajo humano (h)', n(r.laborHours)],
    ...r.cost.lines.map((l) => [`${l.label} (€)`, n(l.amountEur, 2)]), ['Coste total (€)', n(r.cost.totalCostEur, 2)], ['Regla comercial', r.cost.ruleText],
    ['Precio unitario (€)', n(r.cost.commercialUnitEur, 2)], ['Precio total (€)', n(r.cost.commercialTotalEur, 2)],
    ['Plazo orientativo (días hábiles)', `${r.leadTime.minDays}–${r.leadTime.maxDays}`],
  ].map(([k, v]) => `${q(k)};${q(v)}`);
  const assumptions = r.assumptions.map((a) => `${q('Supuesto')};${q(a)}`);
  return ['﻿' + head.join('\n'), '', cols.join(';'), ...rows, '', ...totals, '', ...assumptions].join('\n');
}

export function downloadCsv(req: ManufacturingRequest, r?: EstimateResult, label?: string) {
  const blob = new Blob([buildCsv(req, r, label)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Estimacion_${req.ref}_rev${req.draft.revision}${label ? `_${label.replace(/\s+/g, '')}` : ''}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
