// Representación MTI de datos Odoo. Los nombres de modelo son candidatos estándar (sección 7.3):
// deben comprobarse en la instancia del cliente antes de cualquier integración real.
import type { ConnectorMode, ErpRecordRef, StepRecord } from './types';

export const ODOO_MODELS = {
  partner: 'res.partner',
  lead: 'crm.lead',
  product: 'product.product',
  saleOrder: 'sale.order',
  saleLine: 'sale.order.line',
  quant: 'stock.quant',
  picking: 'stock.picking',
  production: 'mrp.production',
  workcenter: 'mrp.workcenter',
  bom: 'mrp.bom',
  message: 'mail.message',
} as const;

export interface Partner {
  id: string; erpId: number; name: string; email?: string; phone?: string; city: string;
  isCompany: boolean; parentId?: string; vat?: string; tags: string[];
}

export interface Lead {
  id: string; erpId: number; name: string; partnerId: string; contactName?: string; email?: string;
  expectedRevenue: number; probability: number; stage: LeadStage;
  source: string; requestRef?: string; createdAt: string; createdBy: string; description?: string;
  /** Chatter de la oportunidad (mail.message): notas, cambios de etapa, notas de voz. */
  log?: { at: string; by: string; text: string; source: 'voz' | 'manual' | 'sistema' }[];
  lostReason?: string; risks?: string[]; deadline?: string;
}

export type LeadStage = 'Nuevo' | 'Cualificado' | 'Propuesta' | 'Negociación' | 'Ganado' | 'Perdido';
export const LEAD_STAGES: LeadStage[] = ['Nuevo', 'Cualificado', 'Propuesta', 'Negociación', 'Ganado', 'Perdido'];

/** Actividad planificada (mail.activity). */
export interface Activity {
  id: string; erpId: number; type: 'Llamada' | 'Reunión' | 'Email' | 'Tarea'; summary: string; dueDate: string;
  leadId?: string; partnerId: string; done: boolean; doneAt?: string; createdBy: string; source: 'voz' | 'manual' | 'agente';
}

export interface Product {
  id: string; erpId: number; defaultCode: string; name: string; uom: string;
  listPrice: number; standardPrice: number; type: 'consu' | 'service'; categ: string;
}

export interface SaleLine { id: string; productId?: string; name: string; qty: number; uom: string; priceUnit: number; discountPct: number }

export interface SaleOrder {
  id: string; erpId: number; name: string; partnerId: string; leadId?: string;
  state: 'draft' | 'sent' | 'sale' | 'cancel';
  dateOrder: string; validityDate?: string; lines: SaleLine[]; origin?: string; note?: string;
  idempotencyKey?: string; createdBy: string; pricelist: string; version: number;
  history: { at: string; by: string; summary: string }[];
  attachments: string[]; requestId?: string; estimateVersionId?: string; inputHash?: string; mode: ConnectorMode;
}

export interface Quant { productId: string; location: string; quantity: number; reserved: number; incoming: number }

export interface Picking {
  id: string; erpId: number; name: string; saleOrderId?: string; partnerId: string;
  state: 'draft' | 'waiting' | 'confirmed' | 'assigned' | 'done'; scheduledDate: string; dateDone?: string;
  carrier?: string; trackingRef?: string; moves: { productId: string; qty: number; done: number }[];
}

export interface Workorder { id: string; workcenterId: string; operation: string; durationExpectedMin: number; durationMin?: number; state: 'pending' | 'progress' | 'done' }

export interface Production {
  id: string; erpId: number; name: string; productId: string; qty: number;
  state: 'confirmed' | 'progress' | 'done'; dateStart: string; origin?: string; workorders: Workorder[];
}

export interface Workcenter { id: string; erpId: number; name: string; code: string; costHour: number; capacity: number; efficiencyPct: number; machineIds: string[] }

export interface OperationLogEntry {
  key: string; kind: string; status: 'pending' | 'done' | 'failed'; at: string; ref?: ErpRecordRef; error?: string;
}

export type ErpScenario = 'rfq' | 'order' | 'status' | 'pricing';

export type ActionKind = 'create_lead' | 'create_quotation' | 'update_quotation' | 'reply_draft';

export interface ProposedAction {
  id: string; kind: ActionKind; title: string; description: string; agent: string;
  payload: Record<string, unknown>; status: 'proposed' | 'applied' | 'rejected' | 'failed';
  result?: ErpRecordRef; idempotencyKey: string; error?: string; appliedAt?: string;
}

export interface ErpInboxItem {
  id: string; scenario: ErpScenario; channel: 'email' | 'whatsapp'; from: string; fromName: string;
  subject: string; body: string; receivedAt: string;
  state: 'new' | 'in_progress' | 'needs_input' | 'actions_ready' | 'done';
  steps: Record<string, StepRecord>; actions: ProposedAction[];
  choices: Record<string, string>; // decisiones humanas (p. ej. referencia ambigua)
  replyDraft?: string; replyStatus?: 'draft' | 'sent_local';
  currentRunId?: string;
}

export interface ErpState {
  partners: Partner[]; leads: Lead[]; products: Product[]; saleOrders: SaleOrder[]; quants: Quant[]; activities: Activity[];
  pickings: Picking[]; productions: Production[]; workcenters: Workcenter[];
  opLog: OperationLogEntry[]; seq: { sale: number; lead: number; erp: number };
  inbox: ErpInboxItem[];
  simulateTimeoutOnce: boolean;
}

export const lineSubtotal = (l: SaleLine) => l.qty * l.priceUnit * (1 - l.discountPct / 100);
export const orderTotal = (o: SaleOrder) => o.lines.reduce((s, l) => s + lineSubtotal(l), 0);
