// Datos sintéticos del ERP demo (representación MTI de datos Odoo). Empresas y personas ficticias.
import type { ErpInboxItem, ErpState, Lead, Partner, Product, SaleOrder } from '@/domain/erp';
import { MACHINES } from './manufacturing';

export const ERP_STEPS: Record<string, { id: string; title: string; agent: string }[]> = {
  rfq: [
    { id: 'read', title: 'Leer y clasificar', agent: 'C01' },
    { id: 'partner', title: 'Resolver contacto', agent: 'C04' },
    { id: 'context', title: 'Histórico y productos', agent: 'C07' },
    { id: 'proposal', title: 'Preparar presupuesto', agent: 'C02' },
  ],
  order: [
    { id: 'read', title: 'Leer y clasificar', agent: 'C01' },
    { id: 'normalize', title: 'Normalizar líneas', agent: 'C05' },
    { id: 'stock', title: 'Comprobar stock', agent: 'C08' },
    { id: 'proposal', title: 'Propuesta de pedido', agent: 'C05' },
  ],
  status: [
    { id: 'read', title: 'Leer y clasificar', agent: 'C01' },
    { id: 'lookup', title: 'Localizar pedido', agent: 'C07' },
    { id: 'delivery', title: 'Entrega vinculada', agent: 'C06' },
    { id: 'reply', title: 'Respuesta en borrador', agent: 'C01' },
  ],
  pricing: [
    { id: 'read', title: 'Leer y clasificar', agent: 'C01' },
    { id: 'quote', title: 'Recuperar presupuesto', agent: 'C02' },
    { id: 'arpa', title: 'Coste ARPA (simulado)', agent: 'C02' },
    { id: 'margin', title: 'Recalcular margen', agent: 'C05' },
  ],
};

/** Fixture del adaptador ARPA (pendiente de especificación). Coste por tramo de cantidad. */
export const ARPA_FIXTURE = {
  version: '2026.09-fixture',
  note: 'ARPA no está conectado: tramos de coste de ejemplo hasta recibir la especificación del sistema.',
  costs: { 'VB-2': [{ minQty: 1, cost: 29.4 }, { minQty: 200, cost: 27.9 }] } as Record<string, { minQty: number; cost: number }[]>,
  minMarginPct: 18,
};

const partners: Partner[] = [
  { id: 'p-marina', erpId: 14, name: 'Marina Norte', email: 'compras@marinanorte.example', city: 'Vigo', isCompany: true, vat: 'ESB00000014', tags: ['Naval', 'Cliente'] },
  { id: 'p-marina-irene', erpId: 15, name: 'Irene Castro', email: 'compras@marinanorte.example', city: 'Vigo', isCompany: false, parentId: 'p-marina', tags: ['Compras'] },
  { id: 'p-marina-log', erpId: 16, name: 'Logística Marina Norte', email: 'logistica@marinanorte.example', city: 'Vigo', isCompany: false, parentId: 'p-marina', tags: ['Logística'] },
  { id: 'p-cies', erpId: 21, name: 'Náutica Cíes', email: 'aprovisionamiento@nauticacies.example', city: 'Cangas', isCompany: true, tags: ['Náutica'] },
  { id: 'p-lerez', erpId: 22, name: 'Astilleros Lérez', email: 'compras@astilleroslerez.example', city: 'Pontevedra', isCompany: true, tags: ['Naval'] },
  { id: 'p-oceano', erpId: 30, name: 'Conservas Océano S.A.', email: 'info@conservasoceano.example', city: 'Vilagarcía', isCompany: true, tags: ['Alimentación', 'Cliente'] },
  { id: 'p-oceano-uxia', erpId: 31, name: 'Uxía Méndez', email: 'compras@conservasoceano.example', city: 'Vilagarcía', isCompany: false, parentId: 'p-oceano', tags: ['Compras'] },
  { id: 'p-oceanovigo', erpId: 33, name: 'Conservas Océano Vigo', email: 'pedidos@oceanovigo.example', city: 'Vigo', isCompany: true, tags: ['Alimentación'] },
  { id: 'p-bueu', erpId: 40, name: 'Taller Naval Bueu', phone: '+34 600 000 112', email: 'taller@navalbueu.example', city: 'Bueu', isCompany: true, tags: ['Naval', 'WhatsApp'] },
  { id: 'p-lameiro', erpId: 45, name: 'Distribuciones Lameiro', email: 'compras@lameirodistribucion.example', city: 'Lugo', isCompany: true, tags: ['Distribución'] },
];

const products: Product[] = [
  { id: 'pr-cb30', erpId: 501, defaultCode: 'CB-30', name: 'Casquillo de bronce CB-30', uom: 'Unidades', listPrice: 6.8, standardPrice: 3.9, type: 'consu', categ: 'Repuestos' },
  { id: 'pr-ej12', erpId: 502, defaultCode: 'EJ-12', name: 'Eje inox EJ-12', uom: 'Unidades', listPrice: 24.5, standardPrice: 14.2, type: 'consu', categ: 'Repuestos' },
  { id: 'pr-az12', erpId: 510, defaultCode: 'AZ-12', name: 'Ánodo de zinc AZ-12', uom: 'Unidades', listPrice: 9.9, standardPrice: 5.1, type: 'consu', categ: 'Naval' },
  { id: 'pr-jt50', erpId: 511, defaultCode: 'JT-50', name: 'Junta nitrilo JT-50', uom: 'Unidades', listPrice: 1.2, standardPrice: 0.45, type: 'consu', categ: 'Naval' },
  { id: 'pr-jt50r', erpId: 512, defaultCode: 'JT-50R', name: 'Junta reforzada JT-50R', uom: 'Unidades', listPrice: 2.1, standardPrice: 0.9, type: 'consu', categ: 'Naval' },
  { id: 'pr-fg8', erpId: 513, defaultCode: 'FG-8', name: 'Filtro de gasoil FG-8', uom: 'Unidades', listPrice: 14.3, standardPrice: 8.2, type: 'consu', categ: 'Naval' },
  { id: 'pr-vb2', erpId: 520, defaultCode: 'VB-2', name: 'Válvula de bola VB-2', uom: 'Unidades', listPrice: 38.5, standardPrice: 29.4, type: 'consu', categ: 'Valvulería' },
  { id: 'pr-mec', erpId: 600, defaultCode: 'MEC-PLANO', name: 'Mecanizado bajo plano', uom: 'Unidades', listPrice: 0, standardPrice: 0, type: 'service', categ: 'Fabricación' },
  { id: 'pr-pl036', erpId: 601, defaultCode: 'PL-036', name: 'Placa PL-036', uom: 'Unidades', listPrice: 21.4, standardPrice: 0, type: 'consu', categ: 'Fabricación' },
  { id: 'pr-sp112', erpId: 602, defaultCode: 'SP-112', name: 'Soporte SP-112', uom: 'Unidades', listPrice: 0, standardPrice: 0, type: 'consu', categ: 'Fabricación' },
];

const leads: Lead[] = [
  { id: 'l-90', erpId: 90, name: 'Repuestos línea de cierre', partnerId: 'p-oceano', contactName: 'Uxía Méndez', email: 'compras@conservasoceano.example', expectedRevenue: 1020, probability: 100, stage: 'Ganado', source: 'Correo', createdAt: '2026-06-02T09:00:00+02:00', createdBy: 'Comercial' },
  { id: 'l-104', erpId: 104, name: 'Placas PL-036 — reposición', partnerId: 'p-marina', contactName: 'Irene Castro', expectedRevenue: 2140, probability: 100, stage: 'Ganado', source: 'Correo', createdAt: '2026-08-20T09:00:00+02:00', createdBy: 'Comercial' },
  { id: 'l-112', erpId: 112, name: 'Válvulas VB-2 — tarifa 2027', partnerId: 'p-lameiro', expectedRevenue: 3657.5, probability: 50, stage: 'Propuesta', source: 'Correo', createdAt: '2026-09-25T09:00:00+02:00', createdBy: 'Comercial',
    log: [{ at: '2026-09-26T10:05:00+02:00', by: 'Comercial', text: 'Enviado presupuesto S00035 (100 uds al 5 %).', source: 'manual' }] },
  { id: 'l-115', erpId: 115, name: 'Parada de diciembre — casquillos CB-30', partnerId: 'p-oceano', contactName: 'Uxía Méndez', email: 'compras@conservasoceano.example', expectedRevenue: 1360, probability: 40, stage: 'Propuesta', source: 'Visita', createdAt: '2026-09-29T12:00:00+02:00', createdBy: 'Comercial',
    log: [{ at: '2026-09-29T12:00:00+02:00', by: 'Comercial', text: 'Primera conversación: 200 casquillos CB-30 para la parada de diciembre.', source: 'manual' }] },
  { id: 'l-118', erpId: 118, name: 'Soportes SP-118 — serie 2027', partnerId: 'p-marina', contactName: 'Irene Castro', email: 'compras@marinanorte.example', expectedRevenue: 5200, probability: 50, stage: 'Cualificado', source: 'Correo', createdAt: '2026-10-01T09:00:00+02:00', createdBy: 'Comercial', requestRef: 'RFQ-2026-0042',
    log: [{ at: '2026-10-01T09:00:00+02:00', by: 'Comercial', text: 'Interés en serie anual si la oferta de 50 uds encaja.', source: 'manual' }] },
];

const so = (o: Partial<SaleOrder> & Pick<SaleOrder, 'id' | 'erpId' | 'name' | 'partnerId' | 'state' | 'dateOrder' | 'lines'>): SaleOrder => ({
  createdBy: 'Comercial', pricelist: 'Tarifa general EUR', version: 1, history: [], attachments: [], mode: 'demo', ...o,
});

const saleOrders: SaleOrder[] = [
  so({ id: 'so-22', erpId: 22, name: 'S00022', partnerId: 'p-oceano', state: 'sale', dateOrder: '2026-03-11T10:00:00+02:00', lines: [
    { id: 'sl-22-1', productId: 'pr-cb30', name: 'Casquillo de bronce CB-30', qty: 100, uom: 'Unidades', priceUnit: 6.8, discountPct: 0 },
    { id: 'sl-22-2', productId: 'pr-ej12', name: 'Eje inox EJ-12', qty: 20, uom: 'Unidades', priceUnit: 24, discountPct: 0 },
  ] }),
  so({ id: 'so-29', erpId: 29, name: 'S00029', partnerId: 'p-oceano', leadId: 'l-90', state: 'sale', dateOrder: '2026-06-04T10:00:00+02:00', lines: [
    { id: 'sl-29-1', productId: 'pr-cb30', name: 'Casquillo de bronce CB-30', qty: 150, uom: 'Unidades', priceUnit: 6.8, discountPct: 3 },
  ] }),
  so({ id: 'so-31', erpId: 31, name: 'S00031', partnerId: 'p-marina', leadId: 'l-104', state: 'sale', dateOrder: '2026-09-01T10:00:00+02:00', lines: [
    { id: 'sl-31-1', productId: 'pr-pl036', name: 'Placa PL-036', qty: 100, uom: 'Unidades', priceUnit: 21.4, discountPct: 0 },
  ] }),
  so({ id: 'so-35', erpId: 35, name: 'S00035', partnerId: 'p-lameiro', leadId: 'l-112', state: 'sent', dateOrder: '2026-09-26T10:00:00+02:00', validityDate: '2026-10-26', lines: [
    { id: 'sl-35-1', productId: 'pr-vb2', name: 'Válvula de bola VB-2', qty: 100, uom: 'Unidades', priceUnit: 38.5, discountPct: 5 },
  ], history: [{ at: '2026-09-26T10:05:00+02:00', by: 'Comercial', summary: 'Presupuesto enviado al cliente' }] }),
];

const inbox: ErpInboxItem[] = [
  {
    id: 'in-rfq', scenario: 'rfq', channel: 'email', from: 'compras@conservasoceano.example', fromName: 'Uxía Méndez · Conservas Océano',
    subject: 'Oferta casquillos CB-30 y ejes EJ-12', receivedAt: '2026-10-05T08:41:00+02:00', state: 'new', steps: {}, actions: [], choices: {},
    body: `Buenos días:

Para la parada de la línea de cierre necesitaríamos oferta de 200 casquillos de bronce CB-30 y 50 ejes inox EJ-12.

¿Nos indicáis precio y plazo? Gracias.

Uxía Méndez
Compras · Conservas Océano`,
  },
  {
    id: 'in-order', scenario: 'order', channel: 'whatsapp', from: '+34 600 000 112', fromName: 'Taller Naval Bueu',
    subject: 'Pedido por WhatsApp', receivedAt: '2026-10-05T07:58:00+02:00', state: 'new', steps: {}, actions: [], choices: {},
    body: 'Hola! Para mañana si puede ser: 40 ánodos AZ-12, 10 juntas de 50 y 6 filtros FG-8. Gracias',
  },
  {
    id: 'in-status', scenario: 'status', channel: 'email', from: 'logistica@marinanorte.example', fromName: 'Logística · Marina Norte',
    subject: '¿Ha salido nuestro pedido S00031?', receivedAt: '2026-10-05T09:55:00+02:00', state: 'new', steps: {}, actions: [], choices: {},
    body: `Buenos días:

¿Ha salido ya nuestro pedido S00031? Lo necesitamos en obra el jueves.

Un saludo,
Logística · Marina Norte`,
  },
  {
    id: 'in-pricing', scenario: 'pricing', channel: 'email', from: 'compras@lameirodistribucion.example', fromName: 'Distribuciones Lameiro',
    subject: 'Re: Presupuesto S00035 — válvulas VB-2', receivedAt: '2026-10-05T10:20:00+02:00', state: 'new', steps: {}, actions: [], choices: {},
    body: `Hola:

Sobre vuestro presupuesto S00035: si subimos a 250 válvulas VB-2, ¿podríais llegar a un 12 % de descuento?

Saludos,
Compras · Distribuciones Lameiro`,
  },
];

/** Fecha ISO (AAAA-MM-DD) relativa a hoy, para que la agenda de ejemplo siempre esté al día. */
export function addDaysIso(days: number, from = new Date()) {
  const d = new Date(from); d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function seedErp(): ErpState {
  const workcenters = Object.values(
    MACHINES.reduce<Record<string, { name: string; ids: string[]; rate: number }>>((acc, m) => {
      acc[m.workcenter] ??= { name: m.workcenter, ids: [], rate: m.rateEurH };
      acc[m.workcenter].ids.push(m.id);
      return acc;
    }, {}),
  ).map((w, i) => ({ id: `wc-${i + 1}`, erpId: 70 + i, name: w.name, code: `WC${String(i + 1).padStart(2, '0')}`, costHour: w.rate, capacity: w.ids.length, efficiencyPct: 100, machineIds: w.ids }));
  const wc = (name: string) => workcenters.find((w) => w.name === name)!.id;
  return {
    partners, leads, products, saleOrders,
    activities: [
      { id: 'act-201', erpId: 201, type: 'Reunión', summary: 'Revisión de la oferta SP-118 con Irene', dueDate: addDaysIso(1), leadId: 'l-118', partnerId: 'p-marina', done: false, createdBy: 'Comercial', source: 'manual' },
      { id: 'act-202', erpId: 202, type: 'Llamada', summary: 'Seguimiento tarifa VB-2', dueDate: addDaysIso(0), leadId: 'l-112', partnerId: 'p-lameiro', done: false, createdBy: 'Comercial', source: 'manual' },
      { id: 'act-203', erpId: 203, type: 'Email', summary: 'Enviar catálogo de juntas', dueDate: addDaysIso(-1), partnerId: 'p-bueu', done: false, createdBy: 'Comercial', source: 'manual' },
    ],
    quants: [
      { productId: 'pr-cb30', location: 'WH/Stock', quantity: 500, reserved: 40, incoming: 0 },
      { productId: 'pr-ej12', location: 'WH/Stock', quantity: 30, reserved: 0, incoming: 40 },
      { productId: 'pr-az12', location: 'WH/Stock', quantity: 120, reserved: 10, incoming: 0 },
      { productId: 'pr-jt50', location: 'WH/Stock', quantity: 300, reserved: 0, incoming: 0 },
      { productId: 'pr-jt50r', location: 'WH/Stock', quantity: 80, reserved: 0, incoming: 0 },
      { productId: 'pr-fg8', location: 'WH/Stock', quantity: 4, reserved: 0, incoming: 12 },
      { productId: 'pr-vb2', location: 'WH/Stock', quantity: 180, reserved: 0, incoming: 100 },
    ],
    pickings: [
      { id: 'pk-25', erpId: 25, name: 'WH/OUT/00025', saleOrderId: 'so-29', partnerId: 'p-oceano', state: 'done', scheduledDate: '2026-06-09', dateDone: '2026-06-09', carrier: 'Transportes Ría (ficticio)', trackingRef: 'TR-771042', moves: [{ productId: 'pr-cb30', qty: 150, done: 150 }] },
      { id: 'pk-27', erpId: 27, name: 'WH/OUT/00027', saleOrderId: 'so-31', partnerId: 'p-marina', state: 'done', scheduledDate: '2026-10-03', dateDone: '2026-10-03', carrier: 'Transportes Ría (ficticio)', trackingRef: 'TR-889120', moves: [{ productId: 'pr-pl036', qty: 100, done: 100 }] },
    ],
    productions: [
      { id: 'mo-12', erpId: 12, name: 'WH/MO/00012', productId: 'pr-pl036', qty: 100, state: 'done', dateStart: '2026-09-15', origin: 'S00031', workorders: [
        { id: 'wo-12-1', workcenterId: wc('Corte'), operation: 'Corte del bruto', durationExpectedMin: 62, durationMin: 64, state: 'done' },
        { id: 'wo-12-2', workcenterId: wc('Mecanizado CNC'), operation: 'Fresado + taladrado', durationExpectedMin: 505, durationMin: 541, state: 'done' },
        { id: 'wo-12-3', workcenterId: wc('Acabado manual'), operation: 'Desbarbado', durationExpectedMin: 155, durationMin: 158, state: 'done' },
        { id: 'wo-12-4', workcenterId: wc('Calidad'), operation: 'Inspección', durationExpectedMin: 100, durationMin: 96, state: 'done' },
      ] },
      { id: 'mo-15', erpId: 15, name: 'WH/MO/00015', productId: 'pr-sp112', qty: 50, state: 'progress', dateStart: '2026-10-01', origin: 'OF-2026-019', workorders: [
        { id: 'wo-15-1', workcenterId: wc('Corte'), operation: 'Corte del bruto', durationExpectedMin: 80, durationMin: 79, state: 'done' },
        { id: 'wo-15-2', workcenterId: wc('Mecanizado CNC'), operation: 'Fresado + bolsillo + taladrado', durationExpectedMin: 1080, state: 'progress' },
        { id: 'wo-15-3', workcenterId: wc('Calidad'), operation: 'Inspección', durationExpectedMin: 60, state: 'pending' },
      ] },
    ],
    workcenters,
    opLog: [],
    seq: { sale: 40, lead: 120, erp: 1000 },
    inbox,
    simulateTimeoutOnce: false,
  };
}
