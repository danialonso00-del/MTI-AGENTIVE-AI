// Recorridos de Operaciones & Logística y producción. Datos de ejemplo, cálculos deterministas.
import { eur, num } from '@/lib/format';
import type { Flow, PlanTask } from '../flowTypes';

// ── ASPOL · carga 3D, rutas VRP y documentos ──
const KM_PER_UNIT = 2.6;
const DEPOT = { x: 10, y: 35, label: 'Almacén' };
const STOPS = [
  { x: 70, y: 52, label: 'Ourense', kg: 1800 },
  { x: 28, y: 30, label: 'Pontevedra', kg: 1200 },
  { x: 72, y: 14, label: 'Lugo', kg: 1500 },
  { x: 20, y: 22, label: 'Vilagarcía', kg: 900 },
  { x: 80, y: 36, label: 'Monforte', kg: 1300 },
  { x: 35, y: 10, label: 'Santiago', kg: 2100 },
  { x: 88, y: 62, label: 'Verín', kg: 1100 },
  { x: 24, y: 44, label: 'Redondela', kg: 2000 },
];
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const routeKm = (order: number[]) => {
  const pts = [DEPOT, ...order.map((i) => STOPS[i]), DEPOT];
  return Math.round(pts.slice(1).reduce((a, p, i) => a + dist(pts[i], p), 0) * KM_PER_UNIT);
};
const routeKg = (order: number[]) => order.reduce((a, i) => a + STOPS[i].kg, 0);
const CAP = 6500;
const ROUTES = [[7, 1, 5, 3], [2, 4], [0, 6]].map((order, i) => ({ vehicle: `Camión ${i + 1}`, order, km: routeKm(order), kg: routeKg(order), capacity: CAP }));
// Reparto manual de referencia: por número de pedido, de tres en tres.
const BASELINE = [[0, 1, 2], [3, 4, 5], [6, 7]].reduce((a, o) => a + routeKm(o), 0);
const OPT_KM = ROUTES.reduce((a, r) => a + r.km, 0);
const PALLETS = [...Array.from({ length: 14 }, (_, i) => ({ label: `EUR ${i + 1}`, w: 120, h: 80 })), ...Array.from({ length: 3 }, (_, i) => ({ label: `Industrial ${i + 1}`, w: 100, h: 120 }))];

export const loadRouteFlow: Flow = {
  id: 'uc-aspol', title: 'Menos camiones en ruta, cero errores en papel', subtitle: 'Carga 3D, rutas VRP y CMR pre-validados desde los pedidos de Odoo', reference: 'ASPOL · Operaciones & transporte',
  finale: [{ label: 'Inventario en Odoo', to: '/odoo/inventario' }, { label: 'Recursos y carga', to: '/recursos' }],
  steps: [
    { id: 'pedidos', section: 'Odoo · pedidos', title: 'Los pedidos de mañana', agents: ['C05'],
      narration: 'A las 17:00 se cierran los pedidos del día siguiente. El agente los toma de Odoo: destinos, pesos y bultos.',
      where: { label: 'Odoo · ventas', to: '/odoo/ventas' },
      visual: { kind: 'inbound', channel: 'erp', from: 'Odoo · sale.order', subject: `${STOPS.length} pedidos confirmados para mañana`, body: `${num(STOPS.reduce((a, s) => a + s.kg, 0), 0)} kg en total · 3 camiones disponibles de ${num(CAP, 0)} kg`, meta: STOPS.map((s) => s.label), logo: '/brands/odoo.svg' } },
    { id: 'rutas', section: 'Rutas · VRP', title: 'Rutas que recortan kilómetros', agents: ['C05', 'C07'],
      narration: 'Agrupa los destinos por zona respetando la capacidad de cada camión y ordena las paradas. Además, coloca los palés en el camión para aprovechar el espacio.',
      visual: { kind: 'route', title: 'Plan de rutas de mañana', depot: DEPOT, stops: STOPS, routes: ROUTES, baselineKm: BASELINE,
        packing: { truck: 'Camión 1', boxes: PALLETS, widthCm: 245, lengthCm: 1360 } } },
    { id: 'docs', section: 'Documentos', title: 'Albaranes y CMR, revisados antes de emitir', agents: ['C06'],
      narration: 'Genera albaranes y CMR de cada parada y los contrasta con el pedido. Encuentra un peso que no cuadra antes de que el camión salga.',
      visual: { kind: 'table', window: 'Pre-validación de documentos', columns: ['Documento', 'Destino', 'Comprobación', 'Estado'],
        rows: [
          ['CMR-0418', 'Pontevedra', 'Peso, bultos, NIF', 'Correcto'],
          ['CMR-0419', 'Vilagarcía', 'Peso, bultos, NIF', 'Correcto'],
          ['CMR-0420', 'Santiago', 'Peso, bultos, NIF', 'Correcto'],
          ['CMR-0421', 'Redondela', 'Peso declarado 2.150 kg', 'No cuadra con el pedido (2.000 kg)'],
          ['ALB-7730', 'Lugo', 'Líneas y lotes', 'Correcto'],
          ['ALB-7731', 'Ourense', 'Líneas y lotes', 'Correcto'],
        ], tones: [null, null, null, 'err', null, null], note: 'Ningún documento se emite con errores: el CMR-0421 se retiene.' } },
    { id: 'correccion', section: 'Revisión', title: 'Se corrige antes de salir', agents: ['C06', 'C08'],
      narration: 'El responsable de tráfico ve la diferencia, confirma el peso del pedido y el CMR se regenera. El resto sale emitido.',
      visual: { kind: 'decision', title: 'CMR-0421 · Redondela', by: 'responsable de tráfico',
        checks: [{ level: 'error', text: 'Peso declarado 2.150 kg; pedido y báscula: 2.000 kg' }, { level: 'ok', text: 'CMR regenerado con 2.000 kg' }, { level: 'ok', text: `Ahorro de la planificación: ${num(BASELINE - OPT_KM, 0)} km frente al reparto manual` }],
        stamp: 'Emitido', stampSub: '8 CMR · 8 albaranes' } },
  ],
};

// ── UCALSA · plan de producción y pedido urgente ──
const BEFORE: PlanTask[] = [
  { lane: 'Línea 1', label: 'OF-112 · Conserva 120 g', start: 0, end: 1.6 },
  { lane: 'Línea 1', label: 'OF-115 · Conserva 250 g', start: 1.6, end: 3.4 },
  { lane: 'Línea 1', label: 'OF-118 · Paté 90 g', start: 3.4, end: 4.6 },
  { lane: 'Línea 2', label: 'OF-113 · Salsa 400 g', start: 0, end: 2.1 },
  { lane: 'Línea 2', label: 'OF-116 · Salsa 200 g', start: 2.1, end: 3.6 },
  { lane: 'Envasado', label: 'OF-112', start: 1.6, end: 2.2 },
  { lane: 'Envasado', label: 'OF-113', start: 2.2, end: 2.9 },
  { lane: 'Envasado', label: 'OF-115', start: 3.4, end: 4.0 },
];
const AFTER: PlanTask[] = [
  { lane: 'Línea 1', label: 'OF-112 · Conserva 120 g', start: 0, end: 1.6 },
  { lane: 'Línea 1', label: 'URG-07 urgente', start: 1.6, end: 2.4, urgent: true },
  { lane: 'Línea 1', label: 'OF-115 · Conserva 250 g', start: 2.4, end: 4.2 },
  { lane: 'Línea 2', label: 'OF-113 · Salsa 400 g', start: 0, end: 2.1 },
  { lane: 'Línea 2', label: 'OF-116 · Salsa 200 g', start: 2.1, end: 3.6 },
  { lane: 'Línea 2', label: 'OF-118 · Paté 90 g', start: 3.6, end: 4.9 },
  { lane: 'Envasado', label: 'OF-112', start: 1.6, end: 2.2 },
  { lane: 'Envasado', label: 'URG-07', start: 2.4, end: 2.8, urgent: true },
  { lane: 'Envasado', label: 'OF-113', start: 2.8, end: 3.5 },
  { lane: 'Envasado', label: 'OF-115', start: 4.2, end: 4.8 },
];
const SCEN = [
  { label: 'A · Insertar sin mover nada', delay: 14, cost: 0 },
  { label: 'B · Mover OF-118 a la línea 2', delay: 3, cost: 180 },
  { label: 'C · Turno extra el sábado', delay: 0, cost: 1150 },
];

export const productionPlanFlow: Flow = {
  id: 'uc-ucalsa', title: 'Un plan que aguanta un pedido urgente', subtitle: 'Tiempos desde el histórico, plan automático y simulación de escenarios', reference: 'UCALSA · Producción data-driven',
  finale: [{ label: 'Recursos y carga', to: '/recursos' }, { label: 'Fabricación en Odoo', to: '/odoo/fabricacion' }],
  steps: [
    { id: 'tiempos', section: 'Estimación de tiempos', title: 'Tiempos aprendidos del ERP', agents: ['C07', 'C05'],
      narration: 'Cada orden se estima con lo que tardaron de verdad las órdenes parecidas en el ERP, no con el estándar teórico.',
      where: { label: 'Recursos y carga', to: '/recursos' },
      visual: { kind: 'table', window: 'Estimación desde el histórico', columns: ['Orden', 'Producto', 'Cantidad', 'Teórico', 'Histórico real'],
        rows: [['OF-112', 'Conserva 120 g', '24.000 latas', '1,4 días', '1,6 días'], ['OF-113', 'Salsa 400 g', '9.000 tarros', '2,0 días', '2,1 días'], ['OF-115', 'Conserva 250 g', '15.000 latas', '1,5 días', '1,8 días'], ['OF-116', 'Salsa 200 g', '11.000 tarros', '1,5 días', '1,5 días'], ['OF-118', 'Paté 90 g', '18.000 latas', '1,0 días', '1,2 días']],
        note: 'Mediana de las últimas órdenes del mismo producto y línea (datos de ejemplo).' } },
    { id: 'urgente', section: 'Bandeja · correo', title: 'Llega un pedido urgente', agents: ['C05'],
      narration: 'Un cliente necesita 12.000 latas para el jueves. Con el plan en Excel, esto es una tarde de llamadas.',
      visual: { kind: 'inbound', channel: 'email', from: 'compras@cash-marina.example', subject: 'URGENTE · 12.000 latas de 120 g para el jueves', body: 'Se nos ha caído un proveedor. ¿Podéis servirnos 12.000 latas de conserva 120 g el jueves?' } },
    { id: 'replan', section: 'Planificación', title: 'El plan se rehace solo', agents: ['C05', 'C07'],
      narration: 'Inserta la orden urgente respetando capacidades y cambios de formato. La OF-118 pasa a la línea 2 para no retrasar el resto.',
      visual: { kind: 'plan', title: 'Plan de la semana', horizon: 5, unit: 'Día', ticks: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], lanes: ['Línea 1', 'Línea 2', 'Envasado'], before: BEFORE, after: AFTER, switchAt: 3000,
        note: 'Plan viable: capacidades de línea, cambios de formato y envasado tras producción.', afterNote: 'URG-07 entra el martes en la línea 1. OF-118 se mueve a la línea 2.' } },
    { id: 'escenarios', section: 'Simulación', title: 'Tres escenarios comparados', agents: ['C05'],
      narration: 'Antes de decidir, simula alternativas: cuánto retraso acumulan las demás órdenes y qué cuesta cada opción.',
      visual: { kind: 'bars', title: 'Retraso acumulado de las otras órdenes (horas)', format: 'h', bars: SCEN.map((s) => ({ label: `${s.label} · ${eur(s.cost)}`, value: s.delay })),
        headline: { label: 'Escenario recomendado: B', value: SCEN[1].delay, format: 'h', sub: `de retraso por ${eur(SCEN[1].cost)} en cambio de formato` }, note: 'Simulación con datos de ejemplo.' } },
    { id: 'decidir', section: 'Decisión', title: 'Decide el jefe de planta', agents: ['C05', 'C08'],
      narration: 'El agente propone; el jefe de planta elige. El plan aprobado pasa a las órdenes de fabricación del ERP.',
      visual: { kind: 'decision', title: 'Pedido urgente URG-07', by: 'jefe de planta',
        checks: [{ level: 'ok', text: 'Entrega el jueves: viable' }, { level: 'ok', text: 'Escenario B: 3 h de retraso acumulado, ninguna entrega comprometida' }, { level: 'warning', text: 'Cambio de formato extra en la línea 2' }],
        stamp: 'Escenario B', stampSub: 'Plan publicado' } },
  ],
};

// ── C05 · pedido por correo con incidencia de stock ──
const ORDER = [
  { ref: 'A-2204', name: 'Brida DN50 PN16', qty: 50, stock: 180, price: 18.4 },
  { ref: 'A-1188', name: 'Junta EPDM DN50', qty: 30, stock: 64, price: 2.15 },
  { ref: 'A-3001', name: 'Válvula de bola 2"', qty: 20, stock: 12, price: 46.9 },
];

export const emailOrderFlow: Flow = {
  id: 'uc-pedido-email', title: 'Pedido por correo con incidencia de stock', subtitle: 'Del correo al pedido en el ERP, sin grabado manual y sin comprometer stock a ciegas', reference: 'C05 · Pedidos multicanal',
  finale: [{ label: 'Ventas en Odoo', to: '/odoo/ventas' }, { label: 'Inventario', to: '/odoo/inventario' }],
  steps: [
    { id: 'correo', section: 'Bandeja · correo', title: 'Un pedido escrito como siempre', agents: ['C05'],
      narration: 'El cliente escribe el pedido a su manera, sin plantilla. Hoy alguien lo graba a mano por la noche.',
      visual: { kind: 'inbound', channel: 'email', from: 'pedidos@industrias-lugo.example', subject: 'Pedido semana 41', body: 'Buenos días, os pasamos pedido: 50 de la A-2204, 30 A-1188 y 20 unidades de la A-3001. Entrega en Lugo como siempre. Gracias.' } },
    { id: 'interpretar', section: 'Lectura', title: 'Lenguaje natural a líneas de pedido', agents: ['C05'],
      narration: 'Interpreta cantidades y referencias, y «como siempre» lo resuelve con el patrón aprendido de este cliente: su dirección de entrega habitual.',
      visual: { kind: 'read', window: 'C05 · interpretación del pedido', docTitle: 'De: pedidos@industrias-lugo.example', text: 'Buenos días, os pasamos pedido: 50 de la A-2204, 30 A-1188 y 20 unidades de la A-3001. Entrega en Lugo como siempre. Gracias.',
        marks: [{ needle: '50 de la A-2204', label: 'Línea 1', value: 'A-2204 × 50' }, { needle: '30 A-1188', label: 'Línea 2', value: 'A-1188 × 30' }, { needle: '20 unidades de la A-3001', label: 'Línea 3', value: 'A-3001 × 20' }, { needle: 'como siempre', label: 'Entrega', value: 'Almacén Lugo (patrón del cliente)', tone: 'gold' }] } },
    { id: 'stock', section: 'Odoo · inventario', title: 'Cruce con catálogo y stock', agents: ['C05', 'C07'],
      narration: 'Antes de comprometer nada, cruza cada línea con el catálogo y el stock disponible. La A-3001 solo tiene 12 de 20.',
      where: { label: 'Odoo · inventario', to: '/odoo/inventario' },
      visual: { kind: 'table', window: 'Cruce con catálogo y stock (Odoo)', columns: ['Ref.', 'Descripción', 'Pedido', 'Disponible', 'Estado'],
        rows: ORDER.map((o) => [o.ref, o.name, o.qty, o.stock, o.stock >= o.qty ? 'OK' : `${o.stock} / ${o.qty} · incidencia`]), tones: ORDER.map((o) => (o.stock >= o.qty ? 'ok' : 'warn')) } },
    { id: 'revisar', section: 'Aprobaciones', title: 'Revisar antes de comprometer', agents: ['C05', 'C08'],
      narration: 'Modo supervisado: el pedido queda en revisión con una propuesta, entrega parcial ahora y el resto cuando entre la compra.',
      where: { label: 'Aprobaciones', to: '/aprobaciones' },
      visual: { kind: 'decision', title: 'Pedido semana 41 · Industrias Lugo (ficticio)', by: 'responsable de pedidos',
        checks: [{ level: 'ok', text: 'A-2204 × 50 y A-1188 × 30 reservables' }, { level: 'warning', text: 'A-3001: 12 disponibles de 20 · entrada prevista en 6 días' }, { level: 'ok', text: 'Propuesta: servir 12 ahora y 8 en entrega posterior' }],
        stamp: 'Entrega parcial', stampSub: 'Aprobado por pedidos' } },
    { id: 'pedido', section: 'Odoo · ventas', title: 'Pedido en el ERP, en borrador', agents: ['C05', 'C01'],
      narration: 'Se crea el pedido por API con las dos entregas y un aviso al cliente en borrador. Si el ERP no admite escritura, queda en el módulo propio de pedidos.',
      visual: { kind: 'output', window: 'Odoo · pedido de venta', logo: '/brands/odoo.svg', recordTitle: 'Pedido borrador · Industrias Lugo', badge: 'Borrador',
        fields: [['Entrega', 'Almacén Lugo'], ['Total', eur(ORDER.reduce((a, o) => a + o.qty * o.price, 0))], ['Entregas', '2 (parcial + pendiente)'], ['Origen', 'Correo · semana 41']],
        lines: { columns: ['Ref.', 'Uds', '€/ud', 'Total'], rows: ORDER.map((o) => [o.ref, String(o.qty), eur(o.price), eur(o.qty * o.price)]) },
        side: { title: 'Aviso al cliente (borrador)', text: 'Buenos días: recibido el pedido de la semana 41. Servimos todo mañana salvo la A-3001, de la que enviamos 12 unidades; las 8 restantes salen en cuanto entre la reposición, en unos 6 días.' },
        final: 'El pedido no se confirma automáticamente: lo confirma una persona en el ERP.' } },
  ],
};

// ── FRIOTEIS · recepción manos libres, OCR y energía ──
const PALLET_TEMPS = [-19.2, -18.8, -19.5, -18.4, -15.9, -19.0, -18.6, -18.9];
const CHAMBERS = [
  { label: 'Cámara 1 · congelado', forecast: 1840, real: 2010 },
  { label: 'Cámara 2 · congelado', forecast: 1760, real: 1795 },
  { label: 'Cámara 3 · fresco', forecast: 920, real: 1080 },
  { label: 'Cámara 4 · fresco', forecast: 870, real: 885 },
];

export const coldChainFlow: Flow = {
  id: 'uc-frioteis', title: 'Recepción manos libres en cámara frigorífica', subtitle: 'Voz, lectura de etiquetas con escarcha y previsión energética', reference: 'FRIOTEIS · Cadena de frío',
  finale: [{ label: 'Inventario en Odoo', to: '/odoo/inventario' }, { label: 'Analítica', to: '/analitica' }],
  steps: [
    { id: 'voz', section: 'Recepción · voz', title: 'Con guantes, sin teclado', agents: ['C03'],
      narration: 'A −20 °C nadie quiere quitarse los guantes para teclear. El operario dicta la recepción con el auricular y el agente le guía.',
      visual: { kind: 'call', window: 'Recepción manos libres · muelle 2', caller: 'Auricular del operario', labels: { cliente: 'Operario', agente: 'Agente de Voz · C03' },
        lines: [
          { who: 'cliente', text: 'Recepción camión 4471, proveedor Mariscos del Atlántico.' },
          { who: 'agente', text: 'Recibido. Tengo un pedido de compra de ocho palets. ¿Confirmas?' },
          { who: 'cliente', text: 'Sí, seis de mejillón y dos de pulpo congelado.' },
          { who: 'agente', text: 'Perfecto. Enfoca la etiqueta del primer palet con la cámara.' },
        ],
        fields: [{ label: 'Camión', value: '4471' }, { label: 'Proveedor', value: 'Mariscos del Atlántico (ficticio)' }, { label: 'Pedido de compra', value: 'PC-2026-0388 · 8 palets' }, { label: 'Muelle', value: '2' }] } },
    { id: 'etiqueta', section: 'Visión + OCR', title: 'Etiquetas legibles aunque haya escarcha', agents: ['C06'],
      narration: 'Visión y OCR preparados para baja luz y escarcha: especie, lote, caducidad, peso y marca sanitaria, sin escribir nada.',
      visual: { kind: 'read', window: 'Visión + OCR · etiqueta del palet 1 de 8', docTitle: 'Etiqueta · palet 1 (escarcha, baja luz)',
        text: 'MEJILLÓN COCIDO CONGELADO\nMytilus galloprovincialis\nLote: L26-2741   Cad.: 03/2028\nPeso neto: 960 kg\nConservar a −18 °C o menos\nES 12.04567/PO CE',
        marks: [{ needle: 'Mytilus galloprovincialis', label: 'Especie', value: 'Mejillón (M. galloprovincialis)' }, { needle: 'L26-2741', label: 'Lote', value: 'L26-2741' }, { needle: '03/2028', label: 'Caducidad', value: '03/2028' }, { needle: '960 kg', label: 'Peso neto', value: '960 kg' }, { needle: 'ES 12.04567/PO CE', label: 'Marca sanitaria', value: 'ES 12.04567/PO CE', tone: 'ok' }] } },
    { id: 'wms', section: 'WMS', title: 'Entradas registradas y una alerta', agents: ['C05', 'C08'],
      narration: 'Cada palet entra en el WMS con su sonda de temperatura. El palet 5 llega por encima de −18 °C y se marca para revisión de Calidad.',
      where: { label: 'Odoo · inventario', to: '/odoo/inventario' },
      visual: { kind: 'table', window: 'WMS · entradas del camión 4471', columns: ['Palet', 'Producto', 'Ubicación', 'Sonda', 'Estado'],
        rows: PALLET_TEMPS.map((tc, i) => [`P${i + 1}`, i < 6 ? 'Mejillón congelado' : 'Pulpo congelado', `C1-${String(12 + i).padStart(2, '0')}`, `${num(tc, 1)} °C`, tc > -18 ? 'Retenido · revisar' : 'Ubicado']),
        tones: PALLET_TEMPS.map((tc) => (tc > -18 ? 'warn' : null)), note: 'Ubicaciones seguidas en interior por RTLS. Cero entradas manuales en este camión.' } },
    { id: 'energia', section: 'Energía · ML', title: 'Previsión de consumo por cámara', agents: ['C08', 'C07'],
      narration: 'Un modelo de ML prevé el consumo de cada cámara según ocupación y aperturas. Donde el real se desvía, sugiere revisar puertas o desescarches.',
      where: { label: 'Analítica', to: '/analitica' },
      visual: { kind: 'bars', title: 'Consumo de ayer por cámara (kWh)', format: 'kwh', compareLabel: 'Previsto por el modelo', valueLabel: 'Real',
        bars: CHAMBERS.map((c) => ({ label: c.label, value: c.real, compare: c.forecast })),
        headline: { label: 'Exceso sobre lo previsto', value: CHAMBERS.reduce((a, c) => a + c.real - c.forecast, 0), format: 'kwh', sub: 'Cámara 3: +17 %, puerta abierta 46 min en la recepción' },
        note: 'Previsión ilustrativa con datos de ejemplo; no son consumos medidos.' } },
  ],
};
