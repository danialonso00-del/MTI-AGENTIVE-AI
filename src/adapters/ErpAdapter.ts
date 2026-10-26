// Contrato independiente del transporte (sección 7.5). La demo y Odoo (JSON-2 / RPC) lo implementan.
import type { ErpRecordRef } from '@/domain/types';

export interface ErpCapabilities {
  adapter: 'demo' | 'odoo-json2' | 'odoo-rpc';
  version?: string;
  canRead: boolean;
  canCreateDraftQuotation: boolean;
  transactionalQuotation: boolean; // true solo con método de negocio propio en Odoo.sh / autogestionado
  notes: string[];
}

export interface CustomerQuery { email?: string; phone?: string; name?: string }
export interface Customer {
  id: string; erpId: number; name: string; email?: string; phone?: string; companyName?: string; companyId?: string;
  matchedBy: 'email' | 'phone' | 'name'; exact: boolean;
}
export interface Product { id: string; erpId: number; ref: string; name: string; uom: string; listPrice: number }
export interface AvailabilityQuery { productIds: string[] }
export interface Availability { productId: string; onHand: number; reserved: number; available: number; incoming: number }
export interface OrderContext {
  order: { id: string; erpId: number; name: string; state: string; partnerName: string; amountUntaxed: number; dateOrder: string; lines: { name: string; qty: number }[] };
  deliveries: { id: string; name: string; state: string; scheduledDate: string; dateDone?: string; carrier?: string; trackingRef?: string }[];
}
export interface HistoryQuery { partnerId?: string; productIds?: string[]; limit?: number }
export interface HistoricalOrderLine { orderName: string; date: string; productId?: string; name: string; qty: number; priceUnit: number; discountPct: number }

export interface QuotationLineInput { productId?: string; name: string; qty: number; uom: string; priceUnit: number; discountPct: number }
export interface QuotationInput { partnerId: string; lines: QuotationLineInput[]; origin: string; note?: string; leadId?: string }
export interface QuotationPreview { lines: (QuotationLineInput & { subtotal: number })[]; amountUntaxed: number; currency: 'EUR'; warnings: string[] }
export interface ApprovedQuotationInput extends QuotationInput {
  idempotencyKey: string;
  approval: { approvedBy: string; approvedAt: string; inputHash: string; versionId?: string };
  requestId?: string;
  attachments?: string[];
}

export interface ErpAdapter {
  capabilities(): Promise<ErpCapabilities>;
  findCustomers(query: CustomerQuery): Promise<Customer[]>;
  getProducts(refs: string[]): Promise<Product[]>;
  getAvailability(query: AvailabilityQuery): Promise<Availability[]>;
  getOrderContext(orderRef: string): Promise<OrderContext>;
  getManufacturingHistory(query: HistoryQuery): Promise<HistoricalOrderLine[]>;
  previewQuotation(input: QuotationInput): Promise<QuotationPreview>;
  createDraftQuotation(input: ApprovedQuotationInput): Promise<ErpRecordRef>;
  /** Reconciliación: busca el resultado de una operación previa antes de reintentar. */
  findOperation(idempotencyKey: string): Promise<ErpRecordRef | null>;
}

export class ErpTimeoutError extends Error {
  constructor(public idempotencyKey: string) {
    super('Tiempo de espera agotado al confirmar la escritura en el ERP');
    this.name = 'ErpTimeoutError';
  }
}

export class ErpValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErpValidationError';
  }
}
