// Ejecutor de los escenarios de la bandeja operativa + Odoo. Lee mediante el ErpAdapter y
// propone acciones; ninguna escritura ocurre sin que la persona aplique la acción.
import type { ErpInboxItem, ErpState, ProposedAction } from '@/domain/erp';
import type { StepStatus } from '@/domain/types';
import type { ErpAdapter } from '@/adapters/ErpAdapter';
import { ARPA_FIXTURE } from '@/fixtures/erp';
import { stableHash } from '@/lib/hash';
import { eur, num, dateEs } from '@/lib/format';

export interface ErpStepExecution {
  status: StepStatus;
  summary: string;
  outputs: Record<string, unknown>;
  actions?: ProposedAction[];
  replyDraft?: string;
  state?: ErpInboxItem['state'];
}

interface ParsedLine { qty: number; ref: string | null; text: string; size?: number }

export function parseLines(body: string): ParsedLine[] {
  const out: ParsedLine[] = [];
  const re = /(\d+)\s+([a-záéíóúñ]+(?:\s+(?:de|inox|bronce))*)(?:\s+([A-Z]{2}-\d+[A-Z]?))?(?:\s+(?:de\s+)?(\d+)\b)?/gi;
  for (const m of body.matchAll(re)) {
    const qty = Number(m[1]);
    const words = m[2].toLowerCase();
    if (!/(casquillo|eje|ánodo|anodo|junta|filtro|válvula|valvula)/.test(words)) continue;
    out.push({ qty, ref: m[3]?.toUpperCase() ?? null, text: m[0].trim(), size: m[4] ? Number(m[4]) : undefined });
  }
  return out;
}

export const marginPct = (price: number, cost: number) => ((price - cost) / price) * 100;
export function arpaCost(ref: string, qty: number) {
  const tiers = ARPA_FIXTURE.costs[ref] ?? [];
  const tier = [...tiers].reverse().find((t) => qty >= t.minQty);
  return tier ? { cost: tier.cost, tier: `≥ ${tier.minQty} uds` } : null;
}
export function maxDiscountForMargin(list: number, cost: number, minMargin: number) {
  const raw = (1 - cost / (list * (1 - minMargin / 100))) * 100;
  return Math.floor(raw * 2) / 2; // múltiplos de 0,5 %
}

const action = (item: ErpInboxItem, a: Omit<ProposedAction, 'status' | 'idempotencyKey'>): ProposedAction => ({
  ...a, status: 'proposed', idempotencyKey: `${item.id}:${a.kind}:${stableHash(a.payload)}`,
});

export async function executeErpStep(item: ErpInboxItem, stepId: string, adapter: ErpAdapter, erp: ErpState): Promise<ErpStepExecution> {
  const firstName = item.fromName.split(/[·\s]/)[0];

  if (stepId === 'read') {
    if (item.scenario === 'status') {
      const ref = item.body.match(/S\d{5}/)?.[0] ?? null;
      return { status: ref ? 'completed' : 'needs_input', summary: ref ? `Consulta de estado del pedido ${ref}` : 'No se encuentra referencia de pedido', outputs: { intent: 'Consulta de estado', orderRef: ref, deadline: /jueves/i.test(item.body) ? 'jueves (08/10/2026)' : null } };
    }
    if (item.scenario === 'pricing') {
      const ref = item.body.match(/S\d{5}/)?.[0] ?? null;
      const qty = Number(item.body.match(/(\d+)\s+válvulas/i)?.[1] ?? 0);
      const disc = Number(item.body.match(/(\d+(?:[.,]\d+)?)\s*%/)?.[1]?.replace(',', '.') ?? 0);
      return { status: 'completed', summary: `Revisión de precio: ${qty} uds con ${disc} % de descuento sobre ${ref}`, outputs: { intent: 'Revisión de cantidad/descuento', orderRef: ref, requestedQty: qty, requestedDiscountPct: disc } };
    }
    const lines = parseLines(item.body);
    return {
      status: 'completed',
      summary: `${item.scenario === 'order' ? 'Pedido' : 'Solicitud de oferta'} · ${lines.length} líneas detectadas`,
      outputs: { intent: item.scenario === 'order' ? 'Pedido multicanal' : 'Solicitud de oferta', channel: item.channel, lines },
    };
  }

  // ── Solicitud de oferta ──
  if (item.scenario === 'rfq') {
    const lines = parseLines(item.body);
    if (stepId === 'partner') {
      const exact = await adapter.findCustomers({ email: item.from });
      const byName = await adapter.findCustomers({ name: 'Conservas Océano' });
      const resolved = exact[0];
      const candidates = byName.map((c) => ({ name: c.name, id: c.id, decision: c.id === resolved?.companyId ? 'Empresa del contacto (coincidencia exacta de email)' : 'Descartado: solo coincidencia parcial de nombre' }));
      if (!resolved) return { status: 'needs_input', summary: 'Contacto no resuelto: elegir candidato', outputs: { candidates } };
      return { status: 'completed', summary: `${resolved.name} → ${resolved.companyName}`, outputs: { resolved, candidates, rule: 'Resolución por email exacto; no se asocia por coincidencia parcial de nombre' } };
    }
    if (stepId === 'context') {
      const products = await adapter.getProducts(lines.map((l) => l.ref!).filter(Boolean));
      const company = (await adapter.findCustomers({ email: item.from }))[0]?.companyId;
      const history = await adapter.getManufacturingHistory({ partnerId: company, productIds: products.map((p) => p.id) });
      const availability = await adapter.getAvailability({ productIds: products.map((p) => p.id) });
      return { status: 'completed', summary: `${products.length} productos · ${history.length} líneas históricas`, outputs: { products, history, availability } };
    }
    if (stepId === 'proposal') {
      const products = await adapter.getProducts(lines.map((l) => l.ref!).filter(Boolean));
      const contact = (await adapter.findCustomers({ email: item.from }))[0];
      const qLines = lines.map((l) => {
        const p = products.find((x) => x.ref === l.ref)!;
        return { productId: p.id, name: p.name, qty: l.qty, uom: p.uom, priceUnit: p.listPrice, discountPct: 0 };
      });
      const preview = await adapter.previewQuotation({ partnerId: contact.companyId!, lines: qLines, origin: item.subject });
      const availability = await adapter.getAvailability({ productIds: products.map((p) => p.id) });
      const short = availability.filter((a) => a.available < (qLines.find((l) => l.productId === a.productId)?.qty ?? 0));
      const reply = `Hola ${firstName}:

Gracias por vuestra solicitud. Adjuntamos presupuesto para ${qLines.map((l) => `${num(l.qty, 0)} × ${l.name}`).join(' y ')}: ${eur(preview.amountUntaxed)} (IVA no incluido).
${short.length ? `\nPlazo: ${short.map((s) => products.find((p) => p.id === s.productId)!.ref).join(', ')} con disponibilidad parcial; confirmamos fecha al aceptar.` : '\nDisponibilidad inmediata de stock.'}

Un saludo,
Ventas · Talleres Delta`;
      const actions = [
        action(item, { id: 'a-lead', kind: 'create_lead', agent: 'C04', title: 'Crear oportunidad (crm.lead)', description: `«${qLines.map((l) => l.name.split(' ').slice(-1)[0]).join(' + ')} — línea de cierre» para ${contact.companyName}`, payload: { name: `${qLines.map((l) => l.name.split(' ').slice(-1)[0]).join(' + ')} — línea de cierre`, partnerId: contact.companyId, contactName: contact.name, email: contact.email, expectedRevenue: preview.amountUntaxed } }),
        action(item, { id: 'a-quote', kind: 'create_quotation', agent: 'C02', title: 'Crear presupuesto borrador (sale.order)', description: `${qLines.length} líneas · ${eur(preview.amountUntaxed)} sin IVA`, payload: { partnerId: contact.companyId, lines: qLines, origin: item.subject } }),
        action(item, { id: 'a-reply', kind: 'reply_draft', agent: 'C01', title: 'Preparar respuesta en borrador', description: 'El correo queda en borrador hasta aprobación', payload: { text: reply } }),
      ];
      return { status: 'completed', summary: `Presupuesto preparado: ${eur(preview.amountUntaxed)}`, outputs: { preview, availability }, actions, replyDraft: reply, state: 'actions_ready' };
    }
  }

  // ── Pedido multicanal ──
  if (item.scenario === 'order') {
    const lines = parseLines(item.body);
    const resolveLines = () => lines.map((l, i) => {
      if (l.ref) {
        const p = erp.products.find((x) => x.defaultCode === l.ref);
        return { ...l, index: i, productId: p?.id ?? null, productName: p?.name ?? null, candidates: [] as { id: string; ref: string; name: string }[] };
      }
      const size = l.size ? String(l.size) : null;
      const cands = erp.products.filter((p) => /junta/i.test(p.name) && size && p.defaultCode.includes(size)).map((p) => ({ id: p.id, ref: p.defaultCode, name: p.name }));
      const chosen = item.choices[`line-${i}`];
      const p = erp.products.find((x) => x.id === chosen);
      return { ...l, index: i, productId: p?.id ?? null, productName: p?.name ?? null, candidates: cands };
    });
    if (stepId === 'normalize') {
      const partner = (await adapter.findCustomers({ phone: item.from }))[0];
      const norm = resolveLines();
      const ambiguous = norm.filter((l) => !l.productId);
      return {
        status: ambiguous.length ? 'needs_input' : 'completed',
        summary: ambiguous.length ? `Referencia ambigua: «${ambiguous[0].text}»` : `${norm.length} líneas normalizadas · ${partner?.name ?? 'cliente sin resolver'}`,
        outputs: { partner, lines: norm },
        state: ambiguous.length ? 'needs_input' : 'in_progress',
      };
    }
    const norm = resolveLines();
    const ids = norm.map((l) => l.productId!).filter(Boolean);
    const avail = await adapter.getAvailability({ productIds: ids });
    const rows = norm.map((l) => {
      const a = avail.find((x) => x.productId === l.productId)!;
      return { ...l, available: a.available, incoming: a.incoming, now: Math.min(l.qty, a.available), backorder: Math.max(0, l.qty - a.available) };
    });
    if (stepId === 'stock') {
      const short = rows.filter((r) => r.backorder > 0);
      return { status: 'completed', summary: short.length ? `${short.length} línea con stock insuficiente` : 'Stock suficiente', outputs: { rows, note: 'stock.quant es contexto; no equivale a disponibilidad prometible' } };
    }
    if (stepId === 'proposal') {
      const partner = (await adapter.findCustomers({ phone: item.from }))[0];
      const qLines = rows.map((r) => {
        const p = erp.products.find((x) => x.id === r.productId)!;
        return { productId: p.id, name: p.name, qty: r.qty, uom: p.uom, priceUnit: p.listPrice, discountPct: 0 };
      });
      const preview = await adapter.previewQuotation({ partnerId: partner.id, lines: qLines, origin: 'WhatsApp' });
      const short = rows.filter((r) => r.backorder > 0);
      const reply = `¡Hola! Recibido. Preparamos: ${rows.map((r) => `${r.qty} ${r.productName}`).join(', ')}.${short.length ? ` De ${short.map((s) => s.productName).join(', ')} hay ${short.map((s) => s.now).join(', ')} uds para mañana; el resto (${short.map((s) => s.backorder).join(', ')}) en cuanto entre stock.` : ''} Total ${eur(preview.amountUntaxed)} + IVA. ¿Lo confirmamos?`;
      const actions = [
        action(item, { id: 'a-quote', kind: 'create_quotation', agent: 'C05', title: 'Crear propuesta de pedido (sale.order borrador)', description: `${qLines.length} líneas · ${eur(preview.amountUntaxed)} · sin confirmar`, payload: { partnerId: partner.id, lines: qLines, origin: 'WhatsApp · Taller Naval Bueu', note: short.length ? `Entrega parcial: ${short.map((s) => `${s.productName} ${s.now}/${s.qty}`).join('; ')}` : '' } }),
        action(item, { id: 'a-reply', kind: 'reply_draft', agent: 'C01', title: 'Respuesta WhatsApp en borrador', description: 'No se envía automáticamente', payload: { text: reply } }),
      ];
      return { status: 'completed', summary: `Propuesta: ${eur(preview.amountUntaxed)} · ${short.length ? 'entrega parcial' : 'completa'}`, outputs: { preview, rows }, actions, replyDraft: reply, state: 'actions_ready' };
    }
  }

  // ── Consulta de estado ──
  if (item.scenario === 'status') {
    const ref = item.body.match(/S\d{5}/)?.[0] ?? '';
    const ctx = await adapter.getOrderContext(ref);
    if (stepId === 'lookup') return { status: 'completed', summary: `${ctx.order.name} · ${ctx.order.partnerName} · ${ctx.order.state === 'sale' ? 'confirmado' : ctx.order.state}`, outputs: { order: ctx.order } };
    const d = ctx.deliveries[0];
    if (stepId === 'delivery') return { status: d ? 'completed' : 'needs_input', summary: d ? `${d.name} · ${d.state === 'done' ? `entregado al transportista el ${dateEs(d.dateDone!)}` : d.state}` : 'Sin entrega vinculada', outputs: { deliveries: ctx.deliveries } };
    if (stepId === 'reply') {
      const reply = d && d.state === 'done'
        ? `Buenos días:

Sí: vuestro pedido ${ctx.order.name} salió el ${dateEs(d.dateDone!)} con ${d.carrier} (seguimiento ${d.trackingRef}), albarán ${d.name}. Con el plazo habitual de la agencia debería llegar antes del jueves; si no lo recibís mañana, avisadnos y lo reclamamos.

Un saludo,
Logística · Talleres Delta`
        : `Buenos días: el pedido ${ctx.order.name} todavía no ha salido. Os confirmamos fecha en breve.`;
      return {
        status: 'completed', summary: 'Respuesta preparada en borrador', outputs: { reply }, replyDraft: reply, state: 'actions_ready',
        actions: [action(item, { id: 'a-reply', kind: 'reply_draft', agent: 'C06', title: 'Respuesta con datos de entrega', description: `Incluye albarán ${d?.name} y seguimiento`, payload: { text: reply } })],
      };
    }
  }

  // ── Pricing ──
  if (item.scenario === 'pricing') {
    const ref = item.body.match(/S\d{5}/)?.[0] ?? '';
    const order = erp.saleOrders.find((o) => o.name === ref)!;
    const line = order.lines[0];
    const product = erp.products.find((p) => p.id === line.productId)!;
    const qty = Number(item.body.match(/(\d+)\s+válvulas/i)?.[1] ?? line.qty);
    const reqDisc = Number(item.body.match(/(\d+(?:[.,]\d+)?)\s*%/)?.[1]?.replace(',', '.') ?? 0);
    if (stepId === 'quote') return { status: 'completed', summary: `${order.name} v${order.version}: ${line.qty} × ${product.defaultCode} al ${line.discountPct} %`, outputs: { order: { id: order.id, name: order.name, version: order.version, state: order.state }, line, product: { ref: product.defaultCode, listPrice: product.listPrice } } };
    const arpa = arpaCost(product.defaultCode, qty)!;
    if (stepId === 'arpa') return { status: 'completed', summary: `Coste ${eur(arpa.cost)} (tramo ${arpa.tier}) · simulado`, outputs: { ...arpa, simulated: true, note: ARPA_FIXTURE.note, version: ARPA_FIXTURE.version } };
    if (stepId === 'margin') {
      const reqPrice = product.listPrice * (1 - reqDisc / 100);
      const reqMargin = marginPct(reqPrice, arpa.cost);
      const maxDisc = maxDiscountForMargin(product.listPrice, arpa.cost, ARPA_FIXTURE.minMarginPct);
      const proposedDisc = reqMargin >= ARPA_FIXTURE.minMarginPct ? reqDisc : maxDisc;
      const propPrice = product.listPrice * (1 - proposedDisc / 100);
      const reply = `Hola:

Para ${num(qty, 0)} válvulas VB-2 podemos aplicar un ${num(proposedDisc, 1)} % de descuento (${eur(propPrice)}/ud, total ${eur(propPrice * qty)} sin IVA). ${proposedDisc < reqDisc ? `El ${num(reqDisc, 0)} % queda por debajo de nuestra política de margen para este volumen.` : ''}

Os enviamos el presupuesto ${order.name} actualizado.

Un saludo,
Ventas · Talleres Delta`;
      return {
        status: 'completed', summary: `Propuesta ${num(proposedDisc, 1)} % (margen ${num(marginPct(propPrice, arpa.cost), 1)} %)`, replyDraft: reply, state: 'actions_ready',
        outputs: {
          scenarios: [
            { label: 'Actual', qty: line.qty, discountPct: line.discountPct, price: product.listPrice * (1 - line.discountPct / 100), cost: arpaCost(product.defaultCode, line.qty)!.cost },
            { label: 'Solicitado', qty, discountPct: reqDisc, price: reqPrice, cost: arpa.cost },
            { label: 'Propuesto', qty, discountPct: proposedDisc, price: propPrice, cost: arpa.cost },
          ].map((s) => ({ ...s, margin: marginPct(s.price, s.cost), total: s.price * s.qty })),
          minMarginPct: ARPA_FIXTURE.minMarginPct, maxDiscountPct: maxDisc,
        },
        actions: [
          action(item, { id: 'a-revise', kind: 'update_quotation', agent: 'C02', title: `Nueva versión de ${order.name}`, description: `${qty} uds · ${num(proposedDisc, 1)} % · margen ${num(marginPct(propPrice, arpa.cost), 1)} %`, payload: { orderId: order.id, qty, discountPct: proposedDisc, listPrice: product.listPrice, cost: arpa.cost } }),
          action(item, { id: 'a-reply', kind: 'reply_draft', agent: 'C01', title: 'Respuesta en borrador', description: 'Explica el descuento propuesto', payload: { text: reply } }),
        ],
      };
    }
  }
  return { status: 'failed', summary: `Paso ${stepId} no disponible`, outputs: {} };
}
