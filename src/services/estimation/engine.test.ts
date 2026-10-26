import { describe, expect, it } from 'vitest';
import type { EstimateInputs } from '@/domain/types';
import { DATASET_VERSION, FEATURES_BR210, FEATURES_SP118_B, FEATURES_SP118_C } from '@/fixtures/manufacturing';
import { findComparables } from './comparables';
import { estimate, inputHash, priceFromCost } from './engine';

const base = (over: Partial<EstimateInputs> = {}): EstimateInputs => ({
  revision: 'B',
  quantity: 50,
  material: 'al-6082-t6',
  features: FEATURES_SP118_B,
  finish: 'Anodizado natural 15 µm',
  disabledMachineIds: [],
  rateOverrides: {},
  overrides: [],
  pricing: { kind: 'margin', marginPct: 22 },
  indirectPct: 12,
  datasetVersion: DATASET_VERSION,
  ...over,
});

describe('motor de tiempos — fixture RFQ-2026-0042', () => {
  it('reproduce la tabla de la especificación operación a operación', () => {
    const r = estimate(base());
    const rows = r.operations.map((o) => [o.name, o.setupMin, +o.cycleMin.toFixed(4), o.correctionFactor, +o.correctedCycleMin.toFixed(4)]);
    expect(rows).toEqual([
      ['Corte del bruto', 10, 0.8, 1, 0.8],
      ['Fresado exterior', 20, 3.2, 1.1, 3.52],
      ['Bolsillo', 15, 4.5, 1.08, 4.86],
      ['Taladrado', 10, 1.8, 1.05, 1.89],
      ['Desbarbado', 5, 1.2, 1, 1.2],
      ['Inspección', 10, 1, 1, 1],
    ]);
    expect(r.setupTotalMin).toBe(70);
    expect(r.cycleBaseTotalMin).toBeCloseTo(12.5, 9);
    expect(r.cycleCorrectedTotalMin).toBeCloseTo(13.27, 9);
  });

  it('50 piezas: base 695 min, estimado 733,5 min = 12,225 h, 14,67 min/pieza', () => {
    const r = estimate(base());
    expect(r.baseLotMin).toBeCloseTo(695, 9);
    expect(r.estimatedLotMin).toBeCloseTo(733.5, 9);
    expect(r.estimatedLotMin / 60).toBeCloseTo(12.225, 9);
    expect(r.perPieceMin).toBeCloseTo(14.67, 9);
    expect(r.bandMin[0]).toBeCloseTo(623.475, 9);
    expect(r.bandMin[1]).toBeCloseTo(843.525, 9);
  });

  it('100 piezas: 1.397 min sin duplicar la preparación', () => {
    const r = estimate(base({ quantity: 100 }));
    expect(r.estimatedLotMin).toBeCloseTo(1397, 9);
    expect(r.setupTotalMin).toBe(70);
  });

  it('usa exactamente tres comparables y descarta otros con motivo', () => {
    const c = findComparables(FEATURES_SP118_B, 'al-6082-t6', 50);
    expect(c.filter((x) => x.included).map((x) => x.job.ref)).toEqual(['OF-2025-118', 'OF-2025-131', 'OF-2026-007']);
    const excluded = c.filter((x) => !x.included);
    expect(excluded.length).toBeGreaterThanOrEqual(2);
    expect(excluded.every((x) => x.exclusionReason)).toBe(true);
    expect(excluded.some((x) => x.exclusionReason!.includes('Otra familia'))).toBe(true);
  });

  it('acero aplica la tabla de material por operación y cambia el hash', () => {
    const al = estimate(base());
    const st = estimate(base({ material: 'steel-s275' }));
    expect(st.inputHash).not.toBe(al.inputHash);
    const fres = st.operations.find((o) => o.kind === 'fresado')!;
    expect(fres.cycleMin).toBeCloseTo(3.2 * 1.9, 9);
    expect(fres.setupMin).toBe(25);
    expect(st.comparablesUsed).toEqual(expect.arrayContaining(['OF-2024-211', 'OF-2026-019']));
    expect(st.estimatedLotMin).toBeGreaterThan(al.estimatedLotMin);
  });

  it('desactivar CM-01 propone CM-02; desactivar ambas bloquea el bolsillo', () => {
    const alt = estimate(base({ disabledMachineIds: ['CM-01'] }));
    expect(alt.operations.find((o) => o.kind === 'bolsillo')!.machineId).toBe('CM-02');
    expect(alt.blocked).toEqual([]);
    const none = estimate(base({ disabledMachineIds: ['CM-01', 'CM-02'] }));
    expect(none.operations.find((o) => o.kind === 'taladrado')!.machineId).toBe('DR-01');
    expect(none.blocked.some((b) => b.includes('Bolsillo'))).toBe(true);
  });

  it('falta de material bloquea sin estimar en silencio', () => {
    const r = estimate(base({ material: null }));
    expect(r.missingFields).toEqual(['material']);
    expect(r.operations).toEqual([]);
    expect(r.estimatedLotMin).toBe(0);
  });

  it('ajuste manual conserva el resultado previo y recalcula el total', () => {
    const before = estimate(base());
    const op = before.operations.find((o) => o.kind === 'bolsillo')!;
    const r = estimate(base({
      overrides: [{ opId: op.id, cycleBaseMin: 5, reason: 'Radio interior R3 exige pasada adicional', by: 'Test', at: '2026-10-05T10:00:00Z',
        previous: { setupMin: op.setupMin, cycleBaseMin: op.cycleMin, correctionFactor: op.correctionFactor, machineId: op.machineId, totalMin: op.totalMin } }],
    }));
    const changed = r.operations.find((o) => o.kind === 'bolsillo')!;
    expect(changed.method).toBe('manual');
    expect(changed.override?.previous.totalMin).toBeCloseTo(15 + 50 * 4.86, 9);
    expect(r.estimatedLotMin).toBeCloseTo(733.5 + 50 * (5 * 1.08 - 4.86), 9);
  });

  it('Rev. C cambia rasgos y estimación sin tocar Rev. B', () => {
    const b = estimate(base());
    const c = estimate(base({ revision: 'C', features: FEATURES_SP118_C }));
    expect(c.inputHash).not.toBe(b.inputHash);
    expect(c.estimatedLotMin).toBeGreaterThan(b.estimatedLotMin);
  });

  it('brida torneada con un solo comparable no aplica corrección', () => {
    const r = estimate(base({ features: FEATURES_BR210, material: 'al-6082-t6', quantity: 30, finish: null }));
    expect(r.operations.every((o) => o.correctionFactor === 1)).toBe(true);
    expect(r.operations[0].assumptions.join(' ')).toContain('Solo 1 comparable');
  });

  it('margen sobre venta y recargo son reglas distintas', () => {
    expect(priceFromCost(100, { kind: 'margin', marginPct: 20 })).toBeCloseTo(125, 9);
    expect(priceFromCost(100, { kind: 'markup', markupPct: 20 })).toBeCloseTo(120, 9);
  });

  it('hash estable ante el orden de propiedades', () => {
    const a = base();
    const b = JSON.parse(JSON.stringify(a, Object.keys(a).sort()));
    expect(inputHash(a)).toBe(inputHash({ ...b, features: a.features, overrides: [], rateOverrides: {}, pricing: a.pricing, disabledMachineIds: [] }));
  });
});
