// Asistente comercial: de una nota de voz (texto transcrito) a cambios propuestos en el CRM.
// Interpretación determinista y explicable (reglas + datos del ERP). Cada dato lleva el fragmento
// del que sale; nada se escribe sin aprobación. Un LLM podría sustituir el parser tras validar su
// salida contra este mismo esquema.
import type { Activity, ErpState, Lead, LeadStage, Partner } from '@/domain/erp';
import { orderTotal } from '@/domain/erp';

export interface Extracted { label: string; value: string; fragment: string }
export interface CrmAction {
  id: string;
  kind: 'update_lead' | 'create_lead' | 'create_activity';
  title: string;
  description: string;
  payload: Record<string, unknown>;
  status: 'proposed' | 'applied' | 'rejected';
  resultId?: string;
}
export interface VoiceParse {
  partner?: Partner; contactName?: string; discarded: { name: string; reason: string }[];
  lead?: Lead; extracted: Extracted[]; risks: Extracted[];
  stage?: { from?: LeadStage; to: LeadStage; fragment: string };
  revenue?: { from?: number; to: number; basis: string; fragment: string };
  activities: { type: Activity['type']; summary: string; dueDate: string; fragment: string }[];
  summary: string; lostReason?: string; ambiguous: boolean;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Fechas relativas habladas → fecha concreta (respecto a `today`). */
export function resolveDate(fragment: string, today: Date): string | null {
  const f = norm(fragment);
  const d = new Date(today);
  if (/\bpasado manana\b/.test(f)) { d.setDate(d.getDate() + 2); return iso(d); }
  if (/\bmanana\b/.test(f)) { d.setDate(d.getDate() + 1); return iso(d); }
  if (/\bhoy\b/.test(f)) return iso(d);
  if (/semana que viene|proxima semana/.test(f)) { const add = ((8 - d.getDay()) % 7) || 7; d.setDate(d.getDate() + add); return iso(d); }
  const wd = WEEKDAYS.findIndex((w) => new RegExp(`\\b${w}\\b`).test(f));
  if (wd >= 0) { let add = (wd - d.getDay() + 7) % 7; if (add === 0) add = 7; d.setDate(d.getDate() + add); return iso(d); }
  const m = MONTHS.findIndex((w) => new RegExp(`\\b${w}\\b`).test(f));
  if (m >= 0) { const y = m < d.getMonth() || (m === d.getMonth()) ? d.getFullYear() + 1 : d.getFullYear(); return iso(new Date(y, m, 3)); }
  return null;
}

const sentences = (t: string) => t.split(/(?<=[.!?])\s+|,\s+y\s+|\s+y\s+(?=les|le|hay|quedamos)/i).map((s) => s.trim()).filter(Boolean);

export function parseVoiceNote(text: string, erp: ErpState, today = new Date()): VoiceParse {
  const t = norm(text);
  const extracted: Extracted[] = [];
  const risks: Extracted[] = [];
  const discarded: VoiceParse['discarded'] = [];

  // Cliente: empresas cuyo nombre aparece; si hay varias, decide el contacto mencionado.
  const companies = erp.partners.filter((p) => p.isCompany);
  const key = (name: string) => norm(name.replace(/ S\.A\.$/, '')).split(' ').slice(0, 2).join(' ');
  const named = companies.filter((p) => t.includes(key(p.name)));
  const contacts = erp.partners.filter((p) => !p.isCompany && new RegExp(`\\b${norm(p.name.split(' ')[0])}\\b`).test(t));
  let partner: Partner | undefined;
  let contactName: string | undefined;
  if (named.length === 1) partner = named[0];
  else if (named.length > 1) {
    const byContact = named.find((c) => contacts.some((k) => k.parentId === c.id));
    partner = byContact;
    for (const c of named) if (c !== byContact) discarded.push({ name: c.name, reason: byContact ? 'Coincide el nombre pero no el contacto mencionado' : 'Varias empresas posibles' });
  }
  const contact = contacts.find((k) => k.parentId === partner?.id);
  if (contact) contactName = contact.name;
  else { const m = text.match(/(?:con|hablé con|habl[eé] con)\s+([A-ZÁÉÍÓÚ][a-záéíóúñ]+)\s+de\s/); if (m) contactName = m[1]; }
  if (partner) extracted.push({ label: 'Cliente', value: partner.name, fragment: partner.name.replace(/ S\.A\.$/, '') });
  if (contactName) extracted.push({ label: 'Contacto', value: contactName, fragment: contactName.split(' ')[0] });

  // Oportunidad abierta del cliente
  const lead = partner ? [...erp.leads].reverse().find((l) => l.partnerId === partner!.id && !['Ganado', 'Perdido'].includes(l.stage)) : undefined;

  // Cantidad y producto
  const qtyM = text.match(/(\d[\d.]*)\s+(casquillos|bridas|válvulas|valvulas|ejes|ánodos|anodos|juntas|filtros|soportes|placas)(?:\s+(?:de\s+\w+\s+)?([A-Z]{2}-\d+[A-Z]?))?/i);
  const prevQty = text.match(/en vez de\s+(\d+)/i);
  const amountM = text.match(/(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:euros|€)/i);
  let revenue: VoiceParse['revenue'];
  if (qtyM) {
    const qty = Number(qtyM[1].replace(/\./g, ''));
    const ref = qtyM[3]?.toUpperCase();
    const product = ref ? erp.products.find((p) => p.defaultCode === ref) : undefined;
    extracted.push({ label: 'Cantidad', value: `${qty} ${qtyM[2]}${ref ? ` ${ref}` : ''}${prevQty ? ` (antes ${prevQty[1]})` : ''}`, fragment: qtyM[0] });
    if (product && !amountM) revenue = { from: lead?.expectedRevenue, to: qty * product.listPrice, basis: `${qty} × ${product.listPrice.toFixed(2).replace('.', ',')} € (tarifa ${product.defaultCode})`, fragment: qtyM[0] };
  }
  if (amountM) {
    const v = Number(amountM[1].replace(/\./g, ''));
    revenue = { from: lead?.expectedRevenue, to: v, basis: 'Importe indicado por el cliente', fragment: amountM[0] };
    extracted.push({ label: 'Presupuesto del cliente', value: `${v.toLocaleString('es-ES')} €`, fragment: amountM[0] });
  }
  const material = text.match(/en (inoxidable|inox|acero|aluminio|bronce)/i);
  if (material) extracted.push({ label: 'Material', value: material[1], fragment: material[0] });
  const deadline = text.match(/para (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)|parada de (\w+)/i);
  if (deadline) extracted.push({ label: 'Necesidad', value: deadline[0].replace(/^para /, ''), fragment: deadline[0] });
  const event = text.match(/en la feria (\w+)/i);
  if (event) extracted.push({ label: 'Origen', value: `Feria ${event[1]}`, fragment: event[0] });

  // Riesgos
  const comp = text.match(/(?:comparando con |con )?otro proveedor(?: de \w+)?/i);
  if (comp && !/cerrado/i.test(text)) risks.push({ label: 'Competencia', value: comp[0].replace(/^comparando con /i, ''), fragment: comp[0] });
  const worry = text.match(/les preocupa (?:el |la )?(\w+)/i);
  if (worry) risks.push({ label: 'Preocupación', value: worry[1], fragment: worry[0] });

  // Etapa
  let stage: VoiceParse['stage'];
  let lostReason: string | undefined;
  const lost = text.match(/(?:damos (?:la oportunidad )?por perdida|han cerrado [^.]*con otro proveedor)/i);
  if (lost) {
    stage = { from: lead?.stage, to: 'Perdido', fragment: lost[0] };
    const why = text.match(/porque ([^.,]+)/i);
    lostReason = why ? why[1] : 'Sin motivo indicado';
  } else if (/para cerrar|comparando|negociando/i.test(text) && lead) {
    const frag = text.match(/para cerrar|comparando|negociando/i)![0];
    if (lead.stage !== 'Negociación') stage = { from: lead.stage, to: 'Negociación', fragment: frag };
  } else if (!lead && partner) stage = { to: 'Cualificado', fragment: text.match(/quieren|necesitan/i)?.[0] ?? '' };

  // Actividades: frases con verbo de acción + fecha
  const activities: VoiceParse['activities'] = [];
  for (const s of sentences(text)) {
    const n = norm(s);
    let type: Activity['type'] | null = null;
    let summary = '';
    if (/\bllam/.test(n)) { type = 'Llamada'; summary = /cerrar/.test(n) ? 'Llamar para cerrar' : 'Llamada de seguimiento'; }
    else if (/\b(mando|envio|enviar|mandar)\b/.test(n) && /oferta|presupuesto/.test(n)) { type = 'Email'; summary = 'Enviar oferta actualizada'; }
    else if (/\bvisit/.test(n)) { type = 'Reunión'; summary = /tarifa/.test(n) ? `Visita: ${s.match(/tarifa de \d{4}/i)?.[0] ?? 'tarifa'}` : 'Visita comercial'; }
    if (!type) continue;
    const due = resolveDate(s, today);
    if (due) activities.push({ type, summary: `${summary}${partner ? ` · ${partner.name.replace(/ S\.A\.$/, '')}` : ''}`, dueDate: due, fragment: s.replace(/\.$/, '') });
  }

  const summary = [
    partner ? `${contactName ? `${contactName} (${partner.name})` : partner.name}` : 'Cliente sin identificar',
    ...extracted.filter((e) => ['Cantidad', 'Presupuesto del cliente', 'Necesidad'].includes(e.label)).map((e) => `${e.label.toLowerCase()}: ${e.value}`),
    ...risks.map((r) => `riesgo: ${r.label.toLowerCase()} (${r.value})`),
    stage ? `etapa → ${stage.to}` : '',
  ].filter(Boolean).join(' · ');

  return { partner, contactName, discarded, lead, extracted, risks, stage, revenue, activities, summary, lostReason, ambiguous: !partner };
}

let seq = 0;
const aid = () => `crm-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function buildCrmActions(p: VoiceParse, text: string): CrmAction[] {
  if (!p.partner) return [];
  const actions: CrmAction[] = [];
  const note = `Nota de voz: «${text}»`;
  if (p.lead) {
    const changes = [p.stage && `etapa ${p.stage.from} → ${p.stage.to}`, p.revenue && `importe → ${Math.round(p.revenue.to).toLocaleString('es-ES')} €`, p.risks.length && `${p.risks.length} riesgo(s)`].filter(Boolean);
    actions.push({ id: aid(), kind: 'update_lead', status: 'proposed', title: `Actualizar oportunidad «${p.lead.name}»`, description: changes.length ? changes.join(' · ') : 'Añadir la nota al historial',
      payload: { leadId: p.lead.id, stage: p.stage?.to, expectedRevenue: p.revenue?.to, lostReason: p.lostReason, risks: p.risks.map((r) => `${r.label}: ${r.value}`), note } });
  } else {
    const what = p.extracted.find((e) => e.label === 'Cantidad')?.value ?? 'Nueva necesidad';
    actions.push({ id: aid(), kind: 'create_lead', status: 'proposed', title: `Crear oportunidad «${what}»`, description: `${p.partner.name} · ${p.revenue ? `${Math.round(p.revenue.to).toLocaleString('es-ES')} €` : 'importe por estimar'} · etapa Cualificado`,
      payload: { partnerId: p.partner.id, name: `${what.charAt(0).toUpperCase()}${what.slice(1)}`, contactName: p.contactName, expectedRevenue: p.revenue?.to ?? 0, deadline: p.extracted.find((e) => e.label === 'Necesidad')?.value, source: p.extracted.find((e) => e.label === 'Origen')?.value ?? 'Voz', note } });
  }
  for (const a of p.activities) {
    actions.push({ id: aid(), kind: 'create_activity', status: 'proposed', title: `${a.type}: ${a.summary}`, description: `Vence el ${new Date(`${a.dueDate}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}`,
      payload: { type: a.type, summary: a.summary, dueDate: a.dueDate, partnerId: p.partner.id, leadId: p.lead?.id ?? 'nueva' } });
  }
  return actions;
}

// ── Ficha 360 para preparar una reunión (C04 + C07) ──
export function customer360(erp: ErpState, partnerId: string, requests: { ref: string; subject: string; state: string; customer: { email: string }; id: string }[]) {
  const partner = erp.partners.find((p) => p.id === partnerId)!;
  const ids = new Set([partnerId, ...erp.partners.filter((p) => p.parentId === partnerId).map((p) => p.id)]);
  const orders = erp.saleOrders.filter((o) => ids.has(o.partnerId));
  const confirmed = orders.filter((o) => o.state === 'sale');
  const open = orders.filter((o) => o.state === 'draft' || o.state === 'sent');
  const leads = erp.leads.filter((l) => l.partnerId === partnerId);
  const pickings = erp.pickings.filter((p) => ids.has(p.partnerId));
  const acts = erp.activities.filter((a) => a.partnerId === partnerId && !a.done);
  const emails = new Set(erp.partners.filter((p) => ids.has(p.id)).map((p) => p.email).filter(Boolean));
  const rfqs = requests.filter((r) => emails.has(r.customer.email));
  const talking = [
    ...open.map((o) => `Presupuesto ${o.name} abierto (${Math.round(orderTotal(o)).toLocaleString('es-ES')} €): confirmar decisión y plazo.`),
    ...rfqs.filter((r) => r.state !== 'draft_created').map((r) => `${r.ref} «${r.subject}» en curso: adelantar el plazo orientativo.`),
    ...leads.filter((l) => !['Ganado', 'Perdido'].includes(l.stage)).map((l) => `Oportunidad «${l.name}» (${l.stage}): proponer siguiente paso.`),
    ...pickings.filter((p) => p.state === 'done').slice(0, 1).map((p) => `Última entrega ${p.name} servida: preguntar por satisfacción.`),
  ];
  return {
    partner, orders, confirmed, open, leads, pickings, acts, rfqs, talking,
    revenue12m: confirmed.reduce((a, o) => a + orderTotal(o), 0),
    pipeline: leads.filter((l) => !['Ganado', 'Perdido'].includes(l.stage)).reduce((a, l) => a + l.expectedRevenue, 0),
  };
}
