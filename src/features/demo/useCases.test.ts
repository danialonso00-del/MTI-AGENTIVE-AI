import { describe, expect, it } from 'vitest';
import { AGENTS } from '@/fixtures/agents';
import { DEPARTMENTS, SECTORS, TECHS, USE_CASES } from './useCases';
import { SCENARIOS } from './scenarios';
import { FLOWS } from './flows';
import { autoDuration } from './flowScenes';

describe('biblioteca de casos de uso', () => {
  it('cada caso tiene un recorrido reproducible y cada recorrido nuevo tiene ficha', () => {
    const ids = new Set(SCENARIOS.map((s) => s.id));
    for (const u of USE_CASES) expect(ids.has(u.id), u.id).toBe(true);
    for (const f of FLOWS) expect(USE_CASES.some((u) => u.id === f.id), f.id).toBe(true);
    expect(new Set(USE_CASES.map((u) => u.id)).size).toBe(USE_CASES.length);
  });

  it('la taxonomía solo usa valores conocidos', () => {
    const codes = new Set(AGENTS.map((a) => a.code));
    for (const u of USE_CASES) {
      expect(SECTORS).toContain(u.sector);
      u.tech.forEach((t) => expect(TECHS).toContain(t));
      u.agents.forEach((a) => expect(codes.has(a), `${u.id} ${a}`).toBe(true));
      u.departments.forEach((d) => expect(DEPARTMENTS.some((x) => x.id === d)).toBe(true));
      expect(u.input.length).toBeGreaterThan(0);
      expect(u.output.length).toBeGreaterThan(0);
    }
    // Cada departamento tiene al menos dos casos.
    for (const d of DEPARTMENTS) expect(USE_CASES.filter((u) => u.departments.includes(d.id)).length).toBeGreaterThanOrEqual(2);
  });

  it('los recorridos no usan datos reales de contacto y tienen escenas con duración', () => {
    for (const f of FLOWS) {
      const json = JSON.stringify(f);
      for (const m of json.match(/[\w.-]+@[\w.-]+\.[a-z]+/gi) ?? []) expect(m.endsWith('.example'), m).toBe(true);
      for (const s of f.steps) {
        expect(s.agents.every((a) => AGENTS.some((x) => x.code === a)), `${f.id}/${s.id}`).toBe(true);
        expect(s.duration ?? autoDuration(s.visual)).toBeGreaterThan(4000);
      }
      expect(new Set(f.steps.map((s) => s.id)).size).toBe(f.steps.length);
    }
  });

  it('los cálculos de los recorridos son coherentes', () => {
    const freight = FLOWS.find((f) => f.id === 'uc-rcfil-freight')!;
    const table = freight.steps.find((s) => s.visual.kind === 'table')!.visual;
    if (table.kind !== 'table') throw new Error();
    // El elegido es el más barato que cumple el plazo de 4 días, no el más barato absoluto.
    expect(table.tones?.filter((t) => t === 'ok')).toHaveLength(1);
    expect(table.rows[table.tones!.indexOf('ok')][0]).toContain('Ártabro');
    const route = FLOWS.find((f) => f.id === 'uc-aspol')!.steps.find((s) => s.visual.kind === 'route')!.visual;
    if (route.kind !== 'route') throw new Error();
    const total = route.routes.reduce((a, r) => a + r.km, 0);
    expect(total).toBeLessThan(route.baselineKm);
    route.routes.forEach((r) => expect(r.kg).toBeLessThanOrEqual(r.capacity));
    expect(route.routes.flatMap((r) => r.order).sort()).toEqual(route.stops.map((_, i) => i));
  });
});
