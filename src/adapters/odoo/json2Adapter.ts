// Adapter Odoo 19 · API externa JSON-2 (POST /json/2/<model>/<method>, API key Bearer) [S1].
// ESTADO: implementado y probado contra un fetch simulado; NO verificado contra una instancia real.
// Debe ejecutarse en servidor (middleware). Nunca en el navegador: la API key no puede exponerse.
// Cada llamada es su propia transacción en Odoo; por eso el presupuesto y sus líneas se crean
// en UNA llamada `create` con comandos one2many, y se reconcilia por clave antes de reintentar.
import type { ErpRecordRef } from '@/domain/types';
import type {
  ApprovedQuotationInput, Availability, AvailabilityQuery, Customer, CustomerQuery, ErpAdapter, ErpCapabilities,
  HistoricalOrderLine, HistoryQuery, OrderContext, Product, QuotationInput, QuotationPreview,
} from '../ErpAdapter';
import { ErpTimeoutError, ErpValidationError } from '../ErpAdapter';

export interface Json2Config {
  baseUrl: string;
  apiKey: string;
  database?: string; // cabecera X-Odoo-Database: depende del despliegue
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

type Domain = (string | [string, string, unknown])[];

export class OdooJson2Transport {
  constructor(private cfg: Json2Config) {}

  async call<T>(model: string, method: string, body: Record<string, unknown>, opts: { idempotencyKey?: string } = {}): Promise<T> {
    const f = this.cfg.fetchImpl ?? fetch;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.cfg.timeoutMs ?? 15000);
    try {
      const res = await f(`${this.cfg.baseUrl.replace(/\/$/, '')}/json/2/${model}/${method}`, {
        method: 'POST',
        headers: {
          Authorization: `bearer ${this.cfg.apiKey}`,
          'Content-Type': 'application/json',
          ...(this.cfg.database ? { 'X-Odoo-Database': this.cfg.database } : {}),
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new ErpValidationError(`Odoo ${model}.${method} → HTTP ${res.status} ${text.slice(0, 200)}`);
      }
      return (await res.json()) as T;
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw new ErpTimeoutError(opts.idempotencyKey ?? '');
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const MTI_ORIGIN_PREFIX = 'MTI:';

export class OdooJson2Adapter implements ErpAdapter {
  private t: OdooJson2Transport;
  constructor(cfg: Json2Config) {
    this.t = new OdooJson2Transport(cfg);
  }

  async capabilities(): Promise<ErpCapabilities> {
    const version = await this.t.call<{ server_version?: string }>('ir.module.module', 'search_read', {
      domain: [['name', '=', 'base']], fields: ['latest_version'], limit: 1,
    }).then((r) => (Array.isArray(r) ? (r[0] as { latest_version?: string })?.latest_version : undefined)).catch(() => undefined);
    return {
      adapter: 'odoo-json2', version, canRead: true, canCreateDraftQuotation: true, transactionalQuotation: false,
      notes: ['Verificar módulos sale/crm/stock/mrp y permisos del usuario técnico.', 'Reconciliación por origin con prefijo MTI: no garantiza unicidad bajo concurrencia sin restricción en servidor.'],
    };
  }

  async findCustomers(q: CustomerQuery): Promise<Customer[]> {
    const domain: Domain = q.email ? [['email', '=ilike', q.email]] : q.phone ? [['phone', '=', q.phone]] : [['name', 'ilike', q.name ?? ''], ['is_company', '=', true]];
    const rows = await this.t.call<{ id: number; name: string; email?: string; phone?: string; parent_id?: [number, string] | false }[]>('res.partner', 'search_read', {
      domain, fields: ['id', 'name', 'email', 'phone', 'parent_id'], limit: 10,
    });
    return rows.map((r) => ({
      id: String(r.id), erpId: r.id, name: r.name, email: r.email || undefined, phone: r.phone || undefined,
      companyId: r.parent_id ? String(r.parent_id[0]) : String(r.id), companyName: r.parent_id ? r.parent_id[1] : r.name,
      matchedBy: q.email ? 'email' : q.phone ? 'phone' : 'name', exact: Boolean(q.email || q.phone),
    }));
  }

  async getProducts(refs: string[]): Promise<Product[]> {
    const rows = await this.t.call<{ id: number; default_code: string; name: string; uom_id: [number, string]; lst_price: number }[]>('product.product', 'search_read', {
      domain: [['default_code', 'in', refs]], fields: ['id', 'default_code', 'name', 'uom_id', 'lst_price'],
    });
    return rows.map((r) => ({ id: String(r.id), erpId: r.id, ref: r.default_code, name: r.name, uom: r.uom_id?.[1] ?? '', listPrice: r.lst_price }));
  }

  async getAvailability(q: AvailabilityQuery): Promise<Availability[]> {
    const rows = await this.t.call<{ product_id: [number, string]; quantity: number; reserved_quantity: number }[]>('stock.quant', 'search_read', {
      domain: [['product_id', 'in', q.productIds.map(Number)], ['location_id.usage', '=', 'internal']], fields: ['product_id', 'quantity', 'reserved_quantity'],
    });
    return q.productIds.map((id) => {
      const mine = rows.filter((r) => String(r.product_id[0]) === id);
      const onHand = mine.reduce((a, r) => a + r.quantity, 0);
      const reserved = mine.reduce((a, r) => a + r.reserved_quantity, 0);
      return { productId: id, onHand, reserved, available: onHand - reserved, incoming: 0 };
    });
  }

  async getOrderContext(orderRef: string): Promise<OrderContext> {
    const [o] = await this.t.call<{ id: number; name: string; state: string; partner_id: [number, string]; amount_untaxed: number; date_order: string }[]>('sale.order', 'search_read', {
      domain: [['name', '=', orderRef]], fields: ['id', 'name', 'state', 'partner_id', 'amount_untaxed', 'date_order'], limit: 1,
    });
    if (!o) throw new ErpValidationError(`No existe el pedido ${orderRef}`);
    const pickings = await this.t.call<{ id: number; name: string; state: string; scheduled_date: string; date_done?: string; carrier_tracking_ref?: string }[]>('stock.picking', 'search_read', {
      domain: [['sale_id', '=', o.id]], fields: ['id', 'name', 'state', 'scheduled_date', 'date_done', 'carrier_tracking_ref'],
    });
    return {
      order: { id: String(o.id), erpId: o.id, name: o.name, state: o.state, partnerName: o.partner_id[1], amountUntaxed: o.amount_untaxed, dateOrder: o.date_order, lines: [] },
      deliveries: pickings.map((p) => ({ id: String(p.id), name: p.name, state: p.state, scheduledDate: p.scheduled_date, dateDone: p.date_done || undefined, trackingRef: p.carrier_tracking_ref || undefined })),
    };
  }

  async getManufacturingHistory(q: HistoryQuery): Promise<HistoricalOrderLine[]> {
    const domain: Domain = [['state', '=', 'sale']];
    if (q.partnerId) domain.push(['order_partner_id', '=', Number(q.partnerId)]);
    const rows = await this.t.call<{ order_id: [number, string]; product_id: [number, string]; name: string; product_uom_qty: number; price_unit: number; discount: number; create_date: string }[]>('sale.order.line', 'search_read', {
      domain, fields: ['order_id', 'product_id', 'name', 'product_uom_qty', 'price_unit', 'discount', 'create_date'], limit: q.limit ?? 10, order: 'create_date desc',
    });
    return rows.map((r) => ({ orderName: r.order_id[1], date: r.create_date, productId: String(r.product_id[0]), name: r.name, qty: r.product_uom_qty, priceUnit: r.price_unit, discountPct: r.discount }));
  }

  async previewQuotation(input: QuotationInput): Promise<QuotationPreview> {
    const lines = input.lines.map((l) => ({ ...l, subtotal: l.qty * l.priceUnit * (1 - l.discountPct / 100) }));
    return { lines, amountUntaxed: lines.reduce((a, l) => a + l.subtotal, 0), currency: 'EUR', warnings: ['Impuestos y tarifas los calcula Odoo al crear el borrador'] };
  }

  async findOperation(key: string): Promise<ErpRecordRef | null> {
    const rows = await this.t.call<{ id: number; name: string }[]>('sale.order', 'search_read', {
      domain: [['origin', '=', `${MTI_ORIGIN_PREFIX}${key}`]], fields: ['id', 'name'], limit: 2,
    });
    if (rows.length > 1) throw new ErpValidationError(`Reconciliación ambigua: ${rows.length} presupuestos con la clave ${key}`);
    return rows[0] ? { model: 'sale.order', localId: String(rows[0].id), erpId: rows[0].id, name: rows[0].name, mode: 'sandbox', idempotencyKey: key } : null;
  }

  async createDraftQuotation(input: ApprovedQuotationInput): Promise<ErpRecordRef> {
    if (!input.approval?.inputHash) throw new ErpValidationError('Escritura sin aprobación vinculada a versión');
    const existing = await this.findOperation(input.idempotencyKey);
    if (existing) return existing;
    const ids = await this.t.call<number[]>('sale.order', 'create', {
      vals_list: [{
        partner_id: Number(input.partnerId),
        origin: `${MTI_ORIGIN_PREFIX}${input.idempotencyKey}`,
        note: input.note ?? '',
        order_line: input.lines.map((l) => [0, 0, {
          ...(l.productId ? { product_id: Number(l.productId) } : {}),
          name: l.name, product_uom_qty: l.qty, price_unit: l.priceUnit, discount: l.discountPct,
        }]),
      }],
    }, { idempotencyKey: input.idempotencyKey });
    const id = ids[0];
    const [rec] = await this.t.call<{ id: number; name: string }[]>('sale.order', 'read', { ids: [id], fields: ['name'] });
    return { model: 'sale.order', localId: String(id), erpId: id, name: rec?.name ?? `#${id}`, mode: 'sandbox', idempotencyKey: input.idempotencyKey };
  }
}

/**
 * Odoo 18 o anterior: usar el transporte RPC disponible en la instancia. No se envía JSON-2.
 * ESTADO: pendiente. Se implementará tras el discovery de versión/edición.
 */
export class OdooRpcAdapterPending {
  readonly status = 'pending' as const;
  readonly reason = 'Adapter RPC pendiente: validar transporte y edición instalada (Odoo ≤ 18).';
}
