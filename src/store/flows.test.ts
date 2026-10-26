import { beforeEach, describe, expect, it } from 'vitest';
import { estimate } from '@/services/estimation/engine';
import { useStudio } from './useStudio';
import { approvalValid } from './requestOps';
import { OdooJson2Adapter } from '@/adapters/odoo/json2Adapter';
import { parseLines } from '@/services/runs/erpFlow';

const S = () => useStudio.getState();
const req = (id: string) => S().requests.find((r) => r.id === id)!;
const R42 = 'rfq-2026-0042';

beforeEach(() => {
  S().resetDemo();
});

describe('recorrido estrella RFQ-2026-0042 (E2E de dominio)', () => {
  it('desde el correo hasta el presupuesto borrador en el ERP', async () => {
    await S().runUntil(R42, 'review');
    const r = req(R42);
    expect(r.steps.intake.status).toBe('completed');
    expect(r.steps.history.outputs?.comparables).toBeDefined();
    expect(r.steps.estimate.outputs?.estimatedLotMin).toBeCloseTo(733.5, 9);
    expect(r.steps.review.status).toBe('needs_input');
    expect(r.state).toBe('reviewing');
    expect(r.contradictions.map((c) => c.field)).toContain('finish');

    const vId = S().saveVersion(R42, 'v para cliente');
    S().approve(R42, vId, 'OK producción');
    expect(req(R42).state).toBe('approved');

    const before = S().erp.saleOrders.length;
    await S().runNext(R42);
    const after = req(R42);
    expect(after.state).toBe('draft_created');
    expect(after.erpRef?.model).toBe('sale.order');
    expect(S().erp.saleOrders.length).toBe(before + 1);
    const so = S().erp.saleOrders.find((o) => o.id === after.erpRef!.localId)!;
    expect(so.state).toBe('draft');
    expect(so.lines[0].qty).toBe(50);
    expect(so.inputHash).toBe(estimate(after.draft).inputHash);

    // Reintentar la escritura no duplica (idempotencia)
    await S().createErpDraft(R42);
    expect(S().erp.saleOrders.length).toBe(before + 1);
    // El run registra eventos con salida por paso
    const run = S().runs.find((x) => x.id === after.currentRunId)!;
    expect(run.events.filter((e) => e.status === 'completed').map((e) => e.stepId)).toEqual(['intake', 'classify', 'cad', 'history', 'estimate', 'offer', 'review', 'output']);
  });

  it('cambiar el lote a 100 recalcula (1.397 min) y anula la aprobación', async () => {
    await S().runUntil(R42, 'review');
    const v = S().saveVersion(R42);
    S().approve(R42, v);
    expect(approvalValid(req(R42))).toBe(true);
    S().updateDraft(R42, { quantity: 100 }, 'Lote 100');
    const r = req(R42);
    expect(approvalValid(r)).toBe(false);
    expect(r.approval?.invalidatedAt).toBeDefined();
    expect(r.steps.estimate.outputs?.estimatedLotMin).toBeCloseTo(1397, 9);
    expect(r.state).toBe('reviewing');
    // Sin aprobación vigente no se escribe en el ERP
    const n = S().erp.saleOrders.length;
    await S().createErpDraft(R42);
    expect(S().erp.saleOrders.length).toBe(n);
  });

  it('timeout tras la escritura: reconcilia y no duplica', async () => {
    await S().runUntil(R42, 'review');
    S().approve(R42, S().saveVersion(R42));
    S().setSimulateTimeout(true);
    const n = S().erp.saleOrders.length;
    await S().createErpDraft(R42);
    expect(S().erp.saleOrders.length).toBe(n + 1);
    expect(req(R42).activity.some((a) => a.text.includes('reconciliado'))).toBe(true);
    expect(req(R42).state).toBe('draft_created');
  });

  it('Rev. C conserva la rev. B y abre una nueva versión de estimación', async () => {
    await S().runUntil(R42, 'review');
    const vB = S().saveVersion(R42);
    S().approve(R42, vB);
    S().receiveRevisionC(R42);
    expect(req(R42).pendingRevision?.revision).toBe('C');
    S().applyPendingRevision(R42);
    let r = req(R42);
    expect(r.currentRevision).toBe('C');
    expect(r.revisions.map((x) => x.revision)).toEqual(['B', 'C']);
    expect(r.versions[0].revision).toBe('B');
    expect(approvalValid(r)).toBe(false);
    await S().runUntil(R42, 'review');
    r = req(R42);
    expect(r.contradictions.some((c) => c.field === 'geometry')).toBe(true);
    const vC = S().saveVersion(R42);
    r = req(R42);
    expect(r.versions.map((v) => v.revision)).toEqual(['B', 'C']);
    expect(r.versions.find((v) => v.id === vC)!.result.estimatedLotMin).toBeGreaterThan(733.5);
  });

  it('material ausente: «Requiere dato», pregunta en borrador y sin estimación silenciosa', async () => {
    const id = 'rfq-2026-0045';
    await S().runUntil(id, 'review');
    let r = req(id);
    expect(r.state).toBe('needs_input');
    expect(r.steps.intake.status).toBe('needs_input');
    expect(r.steps.estimate.status).toBe('idle');
    expect(r.replyDraft).toMatch(/material/);
    S().confirmField(id, 'material', 'al-6082-t6');
    r = req(id);
    expect(r.steps.intake.status).toBe('completed');
    await S().runUntil(id, 'review');
    r = req(id);
    expect(r.steps.estimate.status).toBe('completed');
    expect(r.fields.find((f) => f.key === 'material')!.status).toBe('confirmed');
  });

  it('desactivar ambas fresadoras bloquea la estimación', async () => {
    await S().runUntil(R42, 'review');
    S().toggleMachine(R42, 'CM-01');
    expect(req(R42).steps.estimate.status).toBe('completed');
    S().toggleMachine(R42, 'CM-02');
    expect(req(R42).steps.estimate.status).toBe('needs_input');
    expect(req(R42).state).toBe('needs_input');
  });

  it('solicitud manual completa el recorrido sin el tour', async () => {
    const id = S().createManualRequest({
      company: 'Marina Norte', contact: 'Irene Castro', email: 'compras@marinanorte.example', partNumber: 'TS-001', partName: 'Tapa', revision: 'A',
      quantity: 20, material: 'al-6082-t6', finish: '', dueDate: '', tolerance: 'ISO 2768-m', notes: '',
      features: { family: 'prismatico-fresado', lengthMm: 80, widthMm: 60, heightMm: 15, holes: { count: 4, diameterMm: 6 }, criticalDims: 3, blankMm: { length: 90, width: 70, height: 20 } },
    });
    await S().runUntil(id, 'review');
    S().approve(id, S().saveVersion(id));
    await S().runNext(id);
    expect(req(id).state).toBe('draft_created');
  });

  it('el seed RFQ-2026-0038 ya tiene presupuesto coherente con su estimación', () => {
    const r = req('rfq-2026-0038');
    expect(r.state).toBe('draft_created');
    const so = S().erp.saleOrders.find((o) => o.id === r.erpRef!.localId)!;
    expect(so.lines[0].priceUnit).toBe(estimate(r.draft).cost.commercialUnitEur);
  });
});

describe('workspace Odoo', () => {
  it('parsea líneas con referencias y tallas', () => {
    expect(parseLines('40 ánodos AZ-12, 10 juntas de 50 y 6 filtros FG-8.')).toMatchObject([
      { qty: 40, ref: 'AZ-12' }, { qty: 10, ref: null, size: 50 }, { qty: 6, ref: 'FG-8' },
    ]);
  });

  it('solicitud de oferta: resuelve por email exacto y crea oportunidad + presupuesto sin duplicar', async () => {
    await S().runErpAll('in-rfq');
    const item = S().erp.inbox.find((i) => i.id === 'in-rfq')!;
    expect(item.steps.partner.outputs?.resolved).toMatchObject({ name: 'Uxía Méndez', companyName: 'Conservas Océano S.A.' });
    expect(item.state).toBe('actions_ready');
    const n = S().erp.saleOrders.length;
    await S().applyErpAction('in-rfq', 'a-lead');
    await S().applyErpAction('in-rfq', 'a-quote');
    await S().applyErpAction('in-rfq', 'a-quote');
    expect(S().erp.saleOrders.length).toBe(n + 1);
    const so = S().erp.saleOrders.at(-1)!;
    expect(so.partnerId).toBe('p-oceano');
    expect(so.state).toBe('draft');
    expect(so.leadId).toBeDefined();
  });

  it('pedido multicanal: referencia ambigua requiere elección humana y detecta stock insuficiente', async () => {
    await S().runErpAll('in-order');
    let item = S().erp.inbox.find((i) => i.id === 'in-order')!;
    expect(item.steps.normalize.status).toBe('needs_input');
    await S().chooseErp('in-order', 'line-1', 'pr-jt50');
    await S().runErpAll('in-order');
    item = S().erp.inbox.find((i) => i.id === 'in-order')!;
    const rows = item.steps.stock.outputs?.rows as { productName: string; backorder: number }[];
    expect(rows.find((r) => r.productName.includes('FG-8'))!.backorder).toBe(2);
  });

  it('consulta de estado: entrega vinculada y respuesta en borrador', async () => {
    await S().runErpAll('in-status');
    const item = S().erp.inbox.find((i) => i.id === 'in-status')!;
    expect(item.replyDraft).toContain('WH/OUT/00027');
    expect(item.replyStatus).toBe('draft');
  });

  it('pricing: respeta el margen mínimo con coste ARPA simulado y crea nueva versión', async () => {
    await S().runErpAll('in-pricing');
    const item = S().erp.inbox.find((i) => i.id === 'in-pricing')!;
    const a = item.actions.find((x) => x.kind === 'update_quotation')!;
    expect(a.payload.discountPct).toBe(11.5);
    await S().applyErpAction('in-pricing', 'a-revise');
    const so = S().erp.saleOrders.find((o) => o.name === 'S00035')!;
    expect(so.version).toBe(2);
    expect(so.lines[0].qty).toBe(250);
  });
});

describe('adapter Odoo JSON-2 (fetch simulado)', () => {
  it('envía POST /json/2/<model>/<method> con Bearer y reconcilia antes de crear', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    let created = false;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const body = JSON.parse(String(init.body));
      if (url.endsWith('/sale.order/search_read')) return new Response(JSON.stringify(created ? [{ id: 77, name: 'S00077' }] : []));
      if (url.endsWith('/sale.order/create')) { created = true; expect(body.vals_list[0].order_line[0][0]).toBe(0); return new Response(JSON.stringify([77])); }
      if (url.endsWith('/sale.order/read')) return new Response(JSON.stringify([{ id: 77, name: 'S00077' }]));
      return new Response('[]');
    }) as unknown as typeof fetch;
    const a = new OdooJson2Adapter({ baseUrl: 'https://sandbox.example', apiKey: 'k', database: 'db', fetchImpl });
    const input = { partnerId: '14', lines: [{ name: 'x', qty: 1, uom: 'u', priceUnit: 1, discountPct: 0 }], origin: 'o', idempotencyKey: 'K1', approval: { approvedBy: 'a', approvedAt: 'b', inputHash: 'h' } };
    const ref = await a.createDraftQuotation(input);
    expect(ref.name).toBe('S00077');
    expect(calls[0].url).toBe('https://sandbox.example/json/2/sale.order/search_read');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('bearer k');
    expect((calls[0].init.headers as Record<string, string>)['X-Odoo-Database']).toBe('db');
    const again = await a.createDraftQuotation(input);
    expect(again.erpId).toBe(77);
    expect(calls.filter((c) => c.url.endsWith('/create')).length).toBe(1);
  });
});
