// Adapter demo: mismas interfaces que Odoo, sobre el estado local persistente.
// Escrituras permitidas por lista explícita (presupuesto borrador, oportunidad, nueva versión de presupuesto).
import type { ErpState, Lead, SaleOrder } from '@/domain/erp';
import { lineSubtotal, ODOO_MODELS } from '@/domain/erp';
import type { ErpRecordRef } from '@/domain/types';
import type {
  ApprovedQuotationInput, Availability, Customer, CustomerQuery, ErpAdapter, ErpCapabilities, HistoricalOrderLine,
  HistoryQuery, OrderContext, Product, QuotationInput, QuotationPreview,
} from '../ErpAdapter';
import { ErpTimeoutError, ErpValidationError } from '../ErpAdapter';

export interface ErpIO {
  get(): ErpState;
  set(next: ErpState): void;
  now(): string;
}

export class DemoErpAdapter implements ErpAdapter {
  constructor(private io: ErpIO) {}

  async capabilities(): Promise<ErpCapabilities> {
    return {
      adapter: 'demo', canRead: true, canCreateDraftQuotation: true, transactionalQuotation: true,
      notes: ['Datos sintéticos locales con la estructura de modelos candidatos de Odoo.', 'No escribe en ningún sistema externo.'],
    };
  }

  async findCustomers(q: CustomerQuery): Promise<Customer[]> {
    const s = this.io.get();
    const company = (pid?: string) => s.partners.find((p) => p.id === pid);
    const toCustomer = (p: ErpState['partners'][number], matchedBy: Customer['matchedBy'], exact: boolean): Customer => ({
      id: p.id, erpId: p.erpId, name: p.name, email: p.email, phone: p.phone, matchedBy, exact,
      companyName: p.isCompany ? p.name : company(p.parentId)?.name, companyId: p.isCompany ? p.id : p.parentId,
    });
    const out: Customer[] = [];
    if (q.email) for (const p of s.partners) if (p.email?.toLowerCase() === q.email.toLowerCase()) out.push(toCustomer(p, 'email', true));
    if (q.phone) for (const p of s.partners) if (p.phone && p.phone.replace(/\s/g, '') === q.phone.replace(/\s/g, '')) out.push(toCustomer(p, 'phone', true));
    if (q.name) {
      const needle = q.name.toLowerCase();
      for (const p of s.partners) if (p.isCompany && p.name.toLowerCase().includes(needle) && !out.some((c) => c.id === p.id)) out.push(toCustomer(p, 'name', false));
    }
    return out;
  }

  async getProducts(refs: string[]): Promise<Product[]> {
    const s = this.io.get();
    return refs
      .map((r) => s.products.find((p) => p.defaultCode.toLowerCase() === r.toLowerCase()))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({ id: p.id, erpId: p.erpId, ref: p.defaultCode, name: p.name, uom: p.uom, listPrice: p.listPrice }));
  }

  async getAvailability(q: { productIds: string[] }): Promise<Availability[]> {
    const s = this.io.get();
    return q.productIds.map((id) => {
      const qs = s.quants.filter((x) => x.productId === id);
      const onHand = qs.reduce((a, x) => a + x.quantity, 0);
      const reserved = qs.reduce((a, x) => a + x.reserved, 0);
      return { productId: id, onHand, reserved, available: onHand - reserved, incoming: qs.reduce((a, x) => a + x.incoming, 0) };
    });
  }

  async getOrderContext(orderRef: string): Promise<OrderContext> {
    const s = this.io.get();
    const o = s.saleOrders.find((x) => x.name.toUpperCase() === orderRef.toUpperCase());
    if (!o) throw new ErpValidationError(`No existe el pedido ${orderRef}`);
    return {
      order: {
        id: o.id, erpId: o.erpId, name: o.name, state: o.state, partnerName: s.partners.find((p) => p.id === o.partnerId)?.name ?? '—',
        amountUntaxed: o.lines.reduce((a, l) => a + lineSubtotal(l), 0), dateOrder: o.dateOrder, lines: o.lines.map((l) => ({ name: l.name, qty: l.qty })),
      },
      deliveries: s.pickings.filter((p) => p.saleOrderId === o.id).map((p) => ({ id: p.id, name: p.name, state: p.state, scheduledDate: p.scheduledDate, dateDone: p.dateDone, carrier: p.carrier, trackingRef: p.trackingRef })),
    };
  }

  async getManufacturingHistory(q: HistoryQuery): Promise<HistoricalOrderLine[]> {
    const s = this.io.get();
    const rows: HistoricalOrderLine[] = [];
    for (const o of s.saleOrders) {
      if (o.state !== 'sale') continue;
      if (q.partnerId && o.partnerId !== q.partnerId) continue;
      for (const l of o.lines) {
        if (q.productIds && (!l.productId || !q.productIds.includes(l.productId))) continue;
        rows.push({ orderName: o.name, date: o.dateOrder, productId: l.productId, name: l.name, qty: l.qty, priceUnit: l.priceUnit, discountPct: l.discountPct });
      }
    }
    return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, q.limit ?? 10);
  }

  async previewQuotation(input: QuotationInput): Promise<QuotationPreview> {
    const warnings: string[] = [];
    if (!this.io.get().partners.some((p) => p.id === input.partnerId)) warnings.push('Cliente no resuelto');
    const lines = input.lines.map((l) => {
      if (l.qty <= 0) warnings.push(`Cantidad no válida en «${l.name}»`);
      if (l.priceUnit <= 0) warnings.push(`Precio no definido en «${l.name}»`);
      return { ...l, subtotal: l.qty * l.priceUnit * (1 - l.discountPct / 100) };
    });
    return { lines, amountUntaxed: lines.reduce((a, l) => a + l.subtotal, 0), currency: 'EUR', warnings };
  }

  async findOperation(key: string): Promise<ErpRecordRef | null> {
    return this.io.get().opLog.find((e) => e.key === key && e.status === 'done')?.ref ?? null;
  }

  async createDraftQuotation(input: ApprovedQuotationInput): Promise<ErpRecordRef> {
    const existing = await this.findOperation(input.idempotencyKey);
    if (existing) return existing; // idempotente: nunca duplica
    const preview = await this.previewQuotation(input);
    if (preview.warnings.length) throw new ErpValidationError(preview.warnings.join('; '));
    const s = this.io.get();
    const timeout = s.simulateTimeoutOnce;
    const { next, ref } = writeDraftQuotation(s, input, this.io.now());
    this.io.set({ ...next, simulateTimeoutOnce: false });
    if (timeout) throw new ErpTimeoutError(input.idempotencyKey); // la escritura se hizo, la confirmación no llegó
    return ref;
  }

  // ── Escrituras adicionales permitidas en la demo ──
  async createLead(input: Omit<Lead, 'id' | 'erpId' | 'createdAt'>, idempotencyKey: string): Promise<ErpRecordRef> {
    const existing = await this.findOperation(idempotencyKey);
    if (existing) return existing;
    const s = this.io.get();
    const erpId = s.seq.lead + 1;
    const lead: Lead = { ...input, id: `l-${erpId}`, erpId, createdAt: this.io.now() };
    const ref: ErpRecordRef = { model: ODOO_MODELS.lead, localId: lead.id, erpId, name: lead.name, mode: 'demo', idempotencyKey };
    this.io.set({ ...s, leads: [...s.leads, lead], seq: { ...s.seq, lead: erpId }, opLog: [...s.opLog, { key: idempotencyKey, kind: 'create_lead', status: 'done', at: this.io.now(), ref }] });
    return ref;
  }

  async reviseQuotation(orderId: string, lines: SaleOrder['lines'], summary: string, by: string, idempotencyKey: string): Promise<ErpRecordRef> {
    const existing = await this.findOperation(idempotencyKey);
    if (existing) return existing;
    const s = this.io.get();
    const o = s.saleOrders.find((x) => x.id === orderId);
    if (!o) throw new ErpValidationError('Presupuesto no encontrado');
    if (o.state === 'sale' || o.state === 'cancel') throw new ErpValidationError('Solo se pueden revisar presupuestos no confirmados');
    const updated: SaleOrder = { ...o, lines, state: 'draft', version: o.version + 1, history: [...o.history, { at: this.io.now(), by, summary }] };
    const ref: ErpRecordRef = { model: ODOO_MODELS.saleOrder, localId: o.id, erpId: o.erpId, name: `${o.name} v${updated.version}`, mode: 'demo', idempotencyKey };
    this.io.set({ ...s, saleOrders: s.saleOrders.map((x) => (x.id === orderId ? updated : x)), opLog: [...s.opLog, { key: idempotencyKey, kind: 'revise_quotation', status: 'done', at: this.io.now(), ref }] });
    return ref;
  }
}

/** Escritura síncrona e idempotente del presupuesto borrador (usada por el adapter y por el seed). */
export function writeDraftQuotation(s: ErpState, input: ApprovedQuotationInput, now: string): { next: ErpState; ref: ErpRecordRef } {
  const done = s.opLog.find((e) => e.key === input.idempotencyKey && e.status === 'done')?.ref;
  if (done) return { next: s, ref: done };
  if (!input.approval?.inputHash) throw new ErpValidationError('Escritura sin aprobación vinculada a versión');
  const erpId = s.seq.sale + 1;
  const name = `S${String(erpId).padStart(5, '0')}`;
  const order: SaleOrder = {
    id: `so-${erpId}`, erpId, name, partnerId: input.partnerId, leadId: input.leadId, state: 'draft', dateOrder: now,
    lines: input.lines.map((l, i) => ({ id: `sl-${erpId}-${i + 1}`, ...l })), origin: input.origin, note: input.note,
    idempotencyKey: input.idempotencyKey, createdBy: `MTI · C02 (aprobado por ${input.approval.approvedBy})`,
    pricelist: 'Tarifa general EUR', version: 1, attachments: input.attachments ?? [], requestId: input.requestId,
    estimateVersionId: input.approval.versionId, inputHash: input.approval.inputHash, mode: 'demo',
    history: [{ at: now, by: 'MTI · adapter demo', summary: `Presupuesto borrador creado desde ${input.origin}` }],
  };
  const ref: ErpRecordRef = { model: ODOO_MODELS.saleOrder, localId: order.id, erpId, name, mode: 'demo', idempotencyKey: input.idempotencyKey };
  return {
    next: { ...s, saleOrders: [...s.saleOrders, order], seq: { ...s.seq, sale: erpId }, opLog: [...s.opLog, { key: input.idempotencyKey, kind: 'create_draft_quotation', status: 'done', at: now, ref }] },
    ref,
  };
}

/** Alta de contacto en el ERP demo. Solo por acción explícita del usuario. */
export function writePartner(s: ErpState, p: { name: string; email: string; city?: string }): { next: ErpState; id: string } {
  const erpId = s.seq.erp + 1;
  const id = `p-new-${erpId}`;
  return { next: { ...s, partners: [...s.partners, { id, erpId, name: p.name, email: p.email, city: p.city ?? '—', isCompany: true, tags: ['Alta desde MTI'] }], seq: { ...s.seq, erp: erpId } }, id };
}
