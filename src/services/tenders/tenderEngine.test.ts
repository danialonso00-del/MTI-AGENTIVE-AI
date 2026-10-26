import { describe, expect, it } from 'vitest';
import { TENDERS } from '@/fixtures/tenders';
import { estimateTender, requiredCategory, screenTender } from './tenderEngine';

const today = new Date();
const t = (id: string) => TENDERS.find((x) => x.id === id)!;

describe('licitaciones · filtrado', () => {
  it('aplican solo las obras del perfil; cada descarte tiene motivo', () => {
    const r = TENDERS.map((x) => screenTender(x, undefined, today));
    const applies = r.filter((x) => x.applies).map((x) => x.tender.id).sort();
    expect(applies).toEqual(['lic-cubierta', 'lic-reh', 'lic-urb']);
    for (const x of r.filter((y) => !y.applies)) expect(x.rejected.length).toBeGreaterThan(0);
    expect(screenTender(t('lic-dragado'), undefined, today).rejected.join()).toMatch(/Clasificación exigida F-1/);
    expect(screenTender(t('lic-sevilla'), undefined, today).rejected.join()).toMatch(/Sevilla/);
    expect(screenTender(t('lic-senda'), undefined, today).rejected.join()).toMatch(/insuficiente/);
    expect(screenTender(t('lic-limpieza'), undefined, today).rejected.join()).toMatch(/CPV 90910000/);
  });

  it('categoría por anualidad media (RD 773/2015)', () => {
    expect(requiredCategory(486_000, 6).cat).toBe(3);
    expect(requiredCategory(1_500_000, 10).cat).toBe(4);
    expect(requiredCategory(18_400_000, 30).cat).toBe(6);
  });
});

describe('licitaciones · estimación', () => {
  it('urbanización: presupuesto base = PEM × 1,19 y oferta con baja coherente', () => {
    const e = estimateTender(t('lic-urb'));
    expect(e.totals.baseBudget).toBeCloseTo(e.totals.projectPEM * 1.19, 1);
    expect(e.totals.offer).toBeCloseTo(e.totals.ownPEM * 1.09 * 1.06, 6);
    expect(e.totals.bajaPct).toBeCloseTo((1 - e.totals.offer / e.totals.baseBudget) * 100, 9);
    expect(e.totalDays).toBeLessThanOrEqual(e.plazoDays);
    expect(e.partidas.filter((p) => p.assumed).map((p) => p.code)).toEqual(['04.02']);
    expect(e.go).toBe(true);
  });

  it('rehabilitación: el SATE no cabe en plazo con una cuadrilla y sí con dos', () => {
    const one = estimateTender(t('lic-reh'));
    expect(one.totalDays).toBeGreaterThan(one.plazoDays);
    expect(one.critical).toBe('Envolvente térmica (SATE)');
    const two = estimateTender(t('lic-reh'), { marginPct: 6, extraCrews: { 'Envolvente térmica (SATE)': 1 } });
    expect(two.totalDays).toBeLessThanOrEqual(two.plazoDays);
  });

  it('más margen → menos baja; la seguridad y salud no se rebaja', () => {
    const a = estimateTender(t('lic-urb'), { marginPct: 2, extraCrews: {} });
    const b = estimateTender(t('lic-urb'), { marginPct: 12, extraCrews: {} });
    expect(a.totals.bajaPct).toBeGreaterThan(b.totals.bajaPct);
    const sys = a.partidas.find((p) => p.code === '05.01')!;
    expect(sys.unitCost).toBe(sys.projectPrice);
  });
});
