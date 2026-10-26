import { describe, expect, it } from 'vitest';
import { seedErp } from '@/fixtures/erp';
import { VOICE_SAMPLES } from '@/fixtures/voice';
import { buildCrmActions, customer360, parseVoiceNote, resolveDate } from './voiceNote';

const today = new Date('2026-10-06T10:00:00'); // martes
const erp = seedErp();
const sample = (id: string) => VOICE_SAMPLES.find((v) => v.id === id)!.transcript;

describe('asistente comercial · notas de voz', () => {
  it('fechas habladas', () => {
    expect(resolveDate('les llamo el jueves', today)).toBe('2026-10-08');
    expect(resolveDate('la oferta mañana', today)).toBe('2026-10-07');
    expect(resolveDate('la semana que viene', today)).toBe('2026-10-12');
    expect(resolveDate('en marzo', today)).toBe('2027-03-03');
  });

  it('visita a Conservas Océano: resuelve cliente por contacto y propone cambios', () => {
    const p = parseVoiceNote(sample('v-oceano'), erp, today);
    expect(p.partner?.id).toBe('p-oceano');
    expect(p.contactName).toBe('Uxía Méndez');
    expect(p.discarded.map((d) => d.name)).toContain('Conservas Océano Vigo');
    expect(p.lead?.id).toBe('l-115');
    expect(p.stage).toMatchObject({ from: 'Propuesta', to: 'Negociación' });
    expect(p.revenue?.to).toBeCloseTo(300 * 6.8, 6);
    expect(p.risks.map((r) => r.label)).toEqual(['Competencia', 'Preocupación']);
    expect(p.activities.map((a) => [a.type, a.dueDate])).toEqual([['Email', '2026-10-07'], ['Llamada', '2026-10-08']]);
    const actions = buildCrmActions(p, sample('v-oceano'));
    expect(actions.map((a) => a.kind)).toEqual(['update_lead', 'create_activity', 'create_activity']);
  });

  it('feria: sin oportunidad abierta → crea una nueva con el importe dictado', () => {
    const p = parseVoiceNote(sample('v-cies'), erp, today);
    expect(p.partner?.id).toBe('p-cies');
    expect(p.lead).toBeUndefined();
    expect(p.revenue?.to).toBe(6000);
    expect(p.activities[0]).toMatchObject({ type: 'Reunión', dueDate: '2026-10-12' });
    expect(buildCrmActions(p, sample('v-cies'))[0].kind).toBe('create_lead');
  });

  it('pérdida: etapa Perdido con motivo y visita futura', () => {
    const p = parseVoiceNote(sample('v-lameiro'), erp, today);
    expect(p.lead?.id).toBe('l-112');
    expect(p.stage?.to).toBe('Perdido');
    expect(p.lostReason).toMatch(/15 por ciento/);
    expect(p.activities[0]).toMatchObject({ type: 'Reunión', dueDate: '2027-03-03' });
  });

  it('texto sin cliente reconocible no propone escrituras', () => {
    const p = parseVoiceNote('Recordar comprar café para la oficina', erp, today);
    expect(p.ambiguous).toBe(true);
    expect(buildCrmActions(p, 'x')).toEqual([]);
  });

  it('ficha 360 de Marina Norte', () => {
    const c = customer360(erp, 'p-marina', []);
    expect(c.confirmed.map((o) => o.name)).toContain('S00031');
    expect(c.talking.length).toBeGreaterThan(0);
  });
});
