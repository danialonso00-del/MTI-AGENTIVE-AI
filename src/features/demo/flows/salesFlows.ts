// Recorridos de Ventas & Comercial y Administración. Datos de ejemplo (empresas ficticias, dominios .example).
import { eur, num } from '@/lib/format';
import type { Flow } from '../flowTypes';

// ── C04 · Oportunidades que se enfrían ──
const OPPS = [
  { ref: 'OPP-2025-118', client: 'Astilleros Ría Baixa (ficticio)', stage: 'Propuesta', days: 23, usual: 9, value: 86400 },
  { ref: 'OPP-2025-131', client: 'Conservas Marina S.L.', stage: 'Cualificado', days: 17, usual: 12, value: 24800 },
  { ref: 'OPP-2025-102', client: 'Talleres Lameiro', stage: 'Negociación', days: 4, usual: 7, value: 41200 },
  { ref: 'OPP-2025-127', client: 'Frigoríficos do Morrazo (ficticio)', stage: 'Propuesta', days: 15, usual: 9, value: 33600 },
  { ref: 'OPP-2025-109', client: 'Conservas Océano S.A.', stage: 'Negociación', days: 3, usual: 7, value: 58900 },
];
const cold = OPPS.filter((o) => o.days > o.usual * 1.4);

export const crmInactiveFlow: Flow = {
  id: 'uc-crm-inactivas', title: 'Oportunidades que se enfrían', subtitle: 'El Agente CRM revisa el pipeline cada noche y avisa con contexto', reference: 'C04 · Ventas & Comercial',
  finale: [{ label: 'Abrir el CRM de Odoo', to: '/odoo/crm' }, { label: 'Asistente comercial', to: '/comercial' }],
  steps: [
    { id: 'barrido', section: 'CRM · revisión nocturna', title: 'El CRM se revisa solo cada noche', agents: ['C04', 'C01'],
      narration: 'A las 02:00 el Agente CRM lee los correos comerciales del día (IMAP) y las actividades de Odoo. Nadie tiene que transcribir nada.',
      where: { label: 'Odoo · CRM', to: '/odoo/crm' },
      visual: { kind: 'inbound', channel: 'erp', from: 'Agente CRM · C04', subject: 'Barrido del pipeline: 147 actividades leídas', body: 'Correos comerciales de las últimas 24 h y actividades abiertas en Odoo CRM.\nResultado: 38 tareas, 12 alertas, 9 oportunidades sin actividad.', meta: ['147 actividades', '38 tareas', '12 alertas', '9 inactivas'], logo: '/brands/odoo.svg' } },
    { id: 'senales', section: 'CRM · señales', title: 'Cada correo deja su señal', agents: ['C04'],
      narration: 'De cada hilo se extrae la señal de venta: interés, objeción, fecha comprometida. Cada una se convierte en una actividad, una etapa o una tarea propuesta.',
      visual: { kind: 'table', window: 'Odoo CRM · señales extraídas de los correos', columns: ['Correo', 'Oportunidad', 'Señal', 'Acción propuesta'],
        rows: [
          ['RE: plazos bloque B', 'OPP-2025-102', 'Pide plazo por escrito', 'Tarea: enviar plazo'],
          ['Visita a planta', 'OPP-2025-109', 'Acepta condiciones', 'Mover a Negociación'],
          ['Duda sobre material', 'OPP-2025-131', 'Objeción técnica', 'Actividad: llamada técnica'],
          ['Fuera de la oficina', 'OPP-2025-118', 'Contacto ausente 2 semanas', 'Buscar contacto alternativo'],
          ['Nueva tarifa 2026', 'OPP-2025-127', 'Sin respuesta tras oferta', 'Alerta de inactividad'],
        ], tones: [null, 'ok', null, 'warn', 'warn'], note: 'Modo supervisado: el comercial valida cada cambio con un clic. En modo automático se aplican y quedan en el log.' } },
    { id: 'inactivas', section: 'CRM · inactividad', title: 'Las que se están enfriando', agents: ['C04', 'C08'],
      narration: 'Compara los días sin actividad de cada oportunidad con lo habitual en su etapa. Las que se pasan de largo generan una alerta.',
      visual: { kind: 'bars', title: 'Días sin actividad por oportunidad', format: 'num', compareLabel: 'Habitual en su etapa', valueLabel: 'Días sin actividad',
        bars: OPPS.map((o) => ({ label: `${o.ref} · ${o.client}`, value: o.days, compare: o.usual })),
        headline: { label: 'Importe en oportunidades frías', value: cold.reduce((a, o) => a + o.value, 0), format: 'eur', sub: `${cold.length} oportunidades superan en más de un 40 % lo habitual` },
        note: 'Umbral configurable por etapa. Datos de ejemplo.' } },
    { id: 'contexto', section: 'Conocimiento', title: 'Antes de avisar, el contexto', agents: ['C07', 'C04'],
      narration: 'Para la más valiosa, el agente reúne lo necesario: última oferta, correos, pedidos anteriores y quién más hay en la cuenta.',
      visual: { kind: 'cloud', center: 'Cerebro comercial', centerSub: 'CRM · correo · ERP', query: 'OPP-2025-118 · Astilleros Ría Baixa',
        docs: [
          { id: 'of', label: 'Oferta OF-2025-118', sub: '86.400 € · enviada hace 23 días', kind: 'order' },
          { id: 'mail', label: 'Hilo con compras', sub: 'Último: respuesta automática', kind: 'dataset' },
          { id: 'ped', label: 'Pedidos 2024', sub: '3 pedidos · 112.000 €', kind: 'order' },
          { id: 'cont', label: 'Contactos de la cuenta', sub: 'Jefa de compras · director técnico', kind: 'partner' },
          { id: 'comp', label: 'Nota de competencia', sub: 'Proveedor alternativo citado', kind: 'job' },
          { id: 'other', label: 'OPP-2025-127', sub: 'Otra cuenta', kind: 'order' },
          { id: 'tar', label: 'Tarifa 2026', sub: 'Vigente desde enero', kind: 'arpa' },
        ],
        selected: ['of', 'mail', 'ped', 'cont', 'comp'], rejected: [{ id: 'other', reason: 'otra cuenta' }, { id: 'tar', reason: 'la oferta ya usa esta tarifa' }],
        selectedTitle: 'Contexto para la alerta', footer: 'La compradora está ausente; el director técnico participó en los dos últimos pedidos.' } },
    { id: 'alerta', section: 'CRM · alerta', title: 'Una alerta que se puede accionar', agents: ['C04', 'C01'],
      narration: 'La alerta llega al comercial con la siguiente mejor acción y un borrador de correo listo. No es un aviso genérico: dice qué hacer y por qué.',
      where: { label: 'Odoo · CRM', to: '/odoo/crm' },
      visual: { kind: 'output', window: 'Odoo CRM · OPP-2025-118', logo: '/brands/odoo.svg', recordTitle: 'Alerta: 23 días sin actividad', badge: 'Propuesta',
        fields: [['Importe', eur(86400)], ['Etapa', 'Propuesta'], ['Habitual en la etapa', '9 días'], ['Siguiente acción', 'Escribir al director técnico'], ['Tarea creada', 'Mañana 10:00'], ['Modo', 'Supervisado']],
        side: { title: 'Borrador para el director técnico', text: 'Buenos días: le escribo porque su compañera de compras está fuera estas semanas. La oferta OF-2025-118 sigue vigente hasta fin de mes; si le encaja, podemos revisar juntos el alcance técnico del bloque B esta semana.' },
        final: 'El comercial decide si lo envía. El correo queda en borrador y la acción, en el log del CRM.' } },
  ],
};

// ── C01 · ¿Ha salido mi pedido? ──
export const emailOrderStatusFlow: Flow = {
  id: 'uc-correo-albaran', title: '¿Ha salido el pedido 2024-0871?', subtitle: 'El Agente de Correo responde con el albarán adjunto en segundos', reference: 'C01 · Correo',
  finale: [{ label: 'Bandeja unificada', to: '/bandeja' }, { label: 'Entregas en Odoo', to: '/odoo/inventario' }],
  steps: [
    { id: 'correo', section: 'Bandeja · correo', title: 'Un cliente pregunta por su pedido', agents: ['C01'],
      narration: 'El buzón corporativo se vigila 24/7. Llega una consulta típica de postventa que hoy alguien contesta a mano buscando en tres sitios.',
      where: { label: 'Bandeja unificada', to: '/bandeja' },
      visual: { kind: 'inbound', channel: 'email', from: 'compras@cliente-norte.example', subject: 'Pedido 2024-0871', body: 'Hola, ¿confirmáis que el pedido 2024-0871 ha salido? Necesito el albarán para recepcionarlo.\nGracias.', logo: '/brands/outlook.svg' } },
    { id: 'intencion', section: 'Lectura', title: 'Intención y datos', agents: ['C01'],
      narration: 'El agente extrae la intención (estado de expedición), el pedido y lo que pide el cliente (el albarán).',
      visual: { kind: 'read', window: 'C01 · lectura del correo', docTitle: 'De: compras@cliente-norte.example', text: 'Hola, ¿confirmáis que el pedido 2024-0871 ha salido? Necesito el albarán para recepcionarlo.\nGracias.',
        marks: [{ needle: 'pedido 2024-0871', label: 'Pedido', value: '2024-0871' }, { needle: 'ha salido', label: 'Intención', value: 'Estado de expedición', tone: 'gold' }, { needle: 'albarán', label: 'Adjunto solicitado', value: 'Albarán de entrega' }] } },
    { id: 'erp', section: 'Odoo · consulta', title: 'Lo busca en el ERP', agents: ['C07', 'C06'],
      narration: 'Consulta de solo lectura: pedido, entrega, transportista y el PDF del albarán. Descarta lo que no corresponde.',
      visual: { kind: 'cloud', center: 'Odoo', centerSub: 'solo lectura', query: 'pedido 2024-0871 · entregas',
        docs: [
          { id: 'so', label: 'Pedido 2024-0871', sub: 'Confirmado · 4 líneas', kind: 'order' },
          { id: 'pick', label: 'Albarán A-9981', sub: 'Hecho · ayer 14:20', kind: 'picking' },
          { id: 'carrier', label: 'Transportista', sub: 'Seguimiento disponible', kind: 'picking' },
          { id: 'partner', label: 'Cliente Norte (ficticio)', sub: 'Contacto de compras', kind: 'partner' },
          { id: 'old', label: 'Albarán A-9975', sub: 'Pedido 2024-0866', kind: 'picking' },
          { id: 'inv', label: 'Factura FV-2024-1530', sub: 'Pendiente de emitir', kind: 'arpa' },
        ], selected: ['so', 'pick', 'carrier', 'partner'], rejected: [{ id: 'old', reason: 'es de otro pedido' }, { id: 'inv', reason: 'no la ha pedido' }], selectedTitle: 'Fuentes de la respuesta' } },
    { id: 'borrador', section: 'Bandeja · validación', title: 'El borrador, con su tono', agents: ['C01'],
      narration: 'El operario no redacta: revisa. El borrador usa la plantilla y el tono de la empresa y adjunta el albarán.',
      visual: { kind: 'output', window: 'Bandeja de validación', logo: '/brands/outlook.svg', recordTitle: 'RE: Pedido 2024-0871', badge: 'Borrador',
        fields: [['Para', 'compras@cliente-norte.example'], ['Adjunto', 'Albarán A-9981.pdf'], ['Fuente', 'Entrega A-9981 · ayer 14:20'], ['Plantilla', 'Postventa · formal']],
        side: { title: 'Texto propuesto', text: 'Buenos días: sí, el pedido 2024-0871 salió ayer a las 14:20. Le adjuntamos el albarán A-9981. Quedamos a su disposición para cualquier cosa.' },
        final: 'Aprobar con un clic o editar. En esta demo nada se envía: queda en borrador.' } },
  ],
};

// ── RCFIL · consulta de transporte → reserva ──
const QUOTES = [
  { carrier: 'Transportes Ártabro (ficticio)', mode: 'Grupaje', price: 2860, days: 4 },
  { carrier: 'Eurolínea Cargo (ficticio)', mode: 'Camión completo', price: 3420, days: 3 },
  { carrier: 'Short Sea Atlántico (ficticio)', mode: 'Marítimo + camión', price: 2410, days: 6 },
  { carrier: 'Rutas del Norte (ficticio)', mode: 'Grupaje', price: 2995, days: 4 },
];
const MAX_DAYS = 4;
const MARGIN = 0.12;
const best = QUOTES.filter((q) => q.days <= MAX_DAYS).sort((a, b) => a.price - b.price)[0];
const salePrice = Math.round(best.price * (1 + MARGIN) * 100) / 100;

export const freightFlow: Flow = {
  id: 'uc-rcfil-freight', title: 'Consulta de transporte convertida en reserva', subtitle: 'Lee la solicitud, consulta tarifas, responde y deja la reserva preparada', reference: 'RCFIL · Logística & freight',
  finale: [{ label: 'Bandeja unificada', to: '/bandeja' }, { label: 'CRM de Odoo', to: '/odoo/crm' }],
  steps: [
    { id: 'solicitud', section: 'Bandeja · correo', title: 'Llega una solicitud de transporte', agents: ['C01'],
      narration: 'Las consultas de transporte llegan a cualquier hora. El agente las clasifica: esta es una cotización de grupaje internacional.',
      visual: { kind: 'inbound', channel: 'email', from: 'operaciones@importadora-sur.example', subject: 'Cotización: 12 palets Vigo → Rotterdam', body: 'Necesitamos precio para 12 palets (europalet, 7.400 kg) con recogida el jueves en Vigo y entrega en Rotterdam como tarde el miércoles siguiente. Mercancía no peligrosa.' } },
    { id: 'datos', section: 'Lectura', title: 'Los datos de la carga', agents: ['C01', 'C05'],
      narration: 'Bultos, peso, origen, destino, ventana de entrega y tipo de mercancía. Con eso ya se puede pedir precio.',
      visual: { kind: 'read', window: 'C01 · lectura de la solicitud', docTitle: 'De: operaciones@importadora-sur.example',
        text: 'Necesitamos precio para 12 palets (europalet, 7.400 kg) con recogida el jueves en Vigo y entrega en Rotterdam como tarde el miércoles siguiente. Mercancía no peligrosa.',
        marks: [{ needle: '12 palets', label: 'Bultos', value: '12 europalets' }, { needle: '7.400 kg', label: 'Peso', value: '7.400 kg' }, { needle: 'recogida el jueves en Vigo', label: 'Recogida', value: 'Jueves · Vigo' }, { needle: 'como tarde el miércoles siguiente', label: 'Plazo máximo', value: `${MAX_DAYS} días laborables`, tone: 'gold' }, { needle: 'no peligrosa', label: 'Mercancía', value: 'No ADR' }] } },
    { id: 'tarifas', section: 'Tarifas · APIs', title: 'Cuatro transportistas, una decisión', agents: ['C05', 'C02'],
      narration: `Consulta las tarifas de los transportistas (simuladas en la demo) y descarta lo que no llega a tiempo. La opción más barata tarda ${QUOTES[2].days} días: no cumple.`,
      visual: { kind: 'table', window: 'Tarifas consultadas por API (simuladas)', columns: ['Transportista', 'Modo', 'Tránsito', 'Coste'],
        rows: QUOTES.map((q) => [q.carrier, q.mode, `${q.days} días`, eur(q.price)]),
        tones: QUOTES.map((q) => (q === best ? 'ok' : q.days > MAX_DAYS ? 'err' : null)),
        totals: [{ label: 'Coste elegido', value: eur(best.price) }, { label: `Precio al cliente (+${MARGIN * 100} %)`, value: eur(salePrice) }],
        note: 'Regla: el más barato que cumple el plazo. El margen sale de la configuración comercial del cliente.' } },
    { id: 'reserva', section: 'CRM y ERP', title: 'Respuesta y reserva preparadas', agents: ['C04', 'C01'],
      narration: 'Redacta la respuesta, deja la reserva provisional y registra la oportunidad en el CRM. Todo trazable hasta la tarifa consultada.',
      where: { label: 'Odoo · CRM', to: '/odoo/crm' },
      visual: { kind: 'output', window: 'Odoo · presupuesto de transporte', logo: '/brands/odoo.svg', recordTitle: 'Reserva provisional · Vigo → Rotterdam', badge: 'Pendiente de aprobar',
        fields: [['Transportista', best.carrier], ['Tránsito', `${best.days} días`], ['Coste', eur(best.price)], ['Precio', eur(salePrice)], ['Oportunidad', 'Creada en CRM'], ['Validez', '48 h']],
        side: { title: 'Respuesta al cliente (borrador)', text: `Buenos días: para 12 europalets (7.400 kg) Vigo → Rotterdam con recogida el jueves, le ofrecemos grupaje con entrega en ${best.days} días laborables por ${eur(salePrice)} (IVA no incluido). Tenemos la reserva preparada: si nos confirma hoy, la cerramos.` },
        final: 'La reserva solo se confirma cuando el cliente acepta y un operador lo aprueba.' } },
  ],
};

// ── C06 · Albarán y conciliación del día ──
const ALB_LINES = [
  { ref: 'GP-140', name: 'Bobina film 500 mm', qty: 120, kg: 1020 },
  { ref: 'GP-212', name: 'Caja reforzada 60×40', qty: 80, kg: 547 },
  { ref: 'GP-305', name: 'Palé retornable', qty: 20, kg: 280 },
];
const RECON = [
  { order: '2025-1036', client: 'Distribuciones Ría', shipped: 64, invoiced: 64 },
  { order: '2025-1038', client: 'Envases Arousa', shipped: 210, invoiced: 210 },
  { order: '2025-1039', client: 'Cash Mariña', shipped: 120, invoiced: 100 },
  { order: '2025-1040', client: 'Conservas Marina', shipped: 48, invoiced: 48 },
  { order: '2025-1041', client: 'Distribuciones Ría', shipped: 95, invoiced: 95 },
  { order: '2025-1042', client: 'Distribuciones Ría', shipped: 220, invoiced: 220 },
];

export const reconciliationFlow: Flow = {
  id: 'uc-conciliacion', title: 'Albarán automático y conciliación del día', subtitle: 'Genera, envía y concilia expedido contra facturado, sin Excel', reference: 'C06 · Administración & Finanzas',
  finale: [{ label: 'Inventario en Odoo', to: '/odoo/inventario' }, { label: 'Aprobaciones', to: '/aprobaciones' }],
  steps: [
    { id: 'cierre', section: 'Odoo · expedición', title: 'Se cierra una expedición', agents: ['C06'],
      narration: 'Cuando el almacén valida la expedición en Odoo, el agente recibe el evento con todo lo necesario para el albarán.',
      where: { label: 'Odoo · inventario', to: '/odoo/inventario' },
      visual: { kind: 'inbound', channel: 'erp', from: 'Odoo · stock.picking', subject: 'Expedición validada · pedido 2025-1042', body: `Cliente: Distribuciones Ría (ficticio)\n${ALB_LINES.length} líneas · ${ALB_LINES.reduce((a, l) => a + l.qty, 0)} uds · ${num(ALB_LINES.reduce((a, l) => a + l.kg, 0), 0)} kg`, meta: ['PDF', 'Excel', 'EDI'], logo: '/brands/odoo.svg' } },
    { id: 'albaran', section: 'Documentos', title: 'Albarán con su plantilla', agents: ['C06'],
      narration: 'Genera el albarán en el formato que pide cada cliente (este quiere PDF y Excel) con el logo y datos de la empresa, y lo envía al contacto de recepción.',
      visual: { kind: 'output', window: 'Albaranes · A-9981', recordTitle: 'Albarán A-9981', badge: 'Enviado · acuse recibido',
        fields: [['Cliente', 'Distribuciones Ría (ficticio)'], ['Pedido', '2025-1042'], ['Formato', 'PDF + XLS'], ['Destinatario', 'recepcion@dist-ria.example']],
        lines: { columns: ['Referencia', 'Descripción', 'Uds', 'Kg'], rows: [...ALB_LINES.map((l) => [l.ref, l.name, String(l.qty), num(l.kg, 0)]), ['', 'Total', String(ALB_LINES.reduce((a, l) => a + l.qty, 0)), num(ALB_LINES.reduce((a, l) => a + l.kg, 0), 0)]] },
        final: 'El envío y el acuse quedan registrados en el expediente del pedido.' } },
    { id: 'conciliacion', section: 'Finanzas · conciliación', title: 'Al cierre del día, todo cuadra (o no)', agents: ['C06', 'C05'],
      narration: 'Cruza cada expedición del día con su factura. De 47 expediciones, una no cuadra: se expidieron 120 unidades y se facturaron 100.',
      visual: { kind: 'table', window: 'Conciliación del día · expedido vs facturado', columns: ['Pedido', 'Cliente', 'Expedido', 'Facturado', 'Estado'],
        rows: RECON.map((r) => [r.order, r.client, r.shipped, r.invoiced, r.shipped === r.invoiced ? 'Cuadra' : `Faltan ${r.shipped - r.invoiced} uds por facturar`]),
        tones: RECON.map((r) => (r.shipped === r.invoiced ? null : 'err')),
        totals: [{ label: 'Expediciones', value: '47' }, { label: 'Discrepancias', value: '1' }],
        note: 'Se muestran 6 de las 47 expediciones del día (datos de ejemplo).' } },
    { id: 'escalado', section: 'Aprobaciones', title: 'La discrepancia sube al responsable', agents: ['C06', 'C08'],
      narration: 'No se corrige nada solo: la discrepancia se eleva al responsable con las dos fuentes enlazadas. Él decide si se emite una factura complementaria.',
      where: { label: 'Aprobaciones', to: '/aprobaciones' },
      visual: { kind: 'decision', title: 'Pedido 2025-1039 · Cash Mariña', by: 'responsable de administración',
        checks: [{ level: 'ok', text: 'Albarán A-9969 firmado: 120 uds entregadas' }, { level: 'error', text: 'Factura FV-2025-0877: 100 uds' }, { level: 'warning', text: 'Propuesta: factura complementaria de 20 uds (borrador, sin emitir)' }],
        stamp: 'Revisado', stampSub: 'Factura en borrador' } },
  ],
};
