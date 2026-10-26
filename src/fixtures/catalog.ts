// Catálogo de casos secundarios (sección 8). Los nombres de cliente identifican referencias de la
// presentación v.02; TODOS los datos interactivos son ficticios y las salidas se calculan aquí mismo.
// Ninguna cifra de impacto se presenta como rendimiento medido por la aplicación.

export type CatalogOutput =
  | { kind: 'table'; columns: string[]; rows: (string | number)[][]; note?: string }
  | { kind: 'kv'; items: [string, string][]; note?: string }
  | { kind: 'text'; text: string; note?: string }
  | { kind: 'list'; items: string[]; note?: string };

export interface CatalogStep { id: string; title: string; agent: string; run: (input: any, prev: Record<string, any>) => { summary: string; output: CatalogOutput; data?: any } } // eslint-disable-line @typescript-eslint/no-explicit-any
export interface CatalogCase {
  id: string; ref: string; pages: string; title: string; sector: string; summary: string;
  inputs: { id: string; label: string; data: any }[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  steps: CatalogStep[];
}

const eur = (n: number) => `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const n1 = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });

export const CATALOG: CatalogCase[] = [
  {
    id: 'coplegal', ref: 'COPLEGAL', pages: 'pág. 22', title: 'Configuración y cálculo de cotizaciones', sector: 'Industria',
    summary: 'Configura un producto modular, aplica reglas de cálculo y genera un desglose ofertable.',
    inputs: [
      { id: 'a', label: 'Cerramiento 3 × 4 × 2,5 m · panel 80 mm', data: { l: 3, w: 4, h: 2.5, panel: 80, doors: 1 } },
      { id: 'b', label: 'Cerramiento 5 × 6 × 3 m · panel 120 mm · 2 puertas', data: { l: 5, w: 6, h: 3, panel: 120, doors: 2 } },
    ],
    steps: [
      { id: 'config', title: 'Configuración', agent: 'C02', run: (i) => ({ summary: `${i.l}×${i.w}×${i.h} m · panel ${i.panel} mm`, output: { kind: 'kv', items: [['Dimensiones', `${i.l} × ${i.w} × ${i.h} m`], ['Panel', `${i.panel} mm`], ['Puertas', String(i.doors)]] } }) },
      { id: 'rules', title: 'Reglas', agent: 'C02', run: (i) => { const walls = 2 * (i.l + i.w) * i.h; const roof = i.l * i.w; const m2 = walls + roof; return { summary: `${n1(m2)} m² de panel`, data: { m2 }, output: { kind: 'list', items: [`Paredes = 2 × (${i.l} + ${i.w}) × ${i.h} = ${n1(walls)} m²`, `Techo = ${i.l} × ${i.w} = ${n1(roof)} m²`, `Precio panel ${i.panel} mm: ${i.panel >= 120 ? '48,00' : '39,50'} €/m² (tabla fixture)`] } }; } },
      { id: 'breakdown', title: 'Desglose', agent: 'C02', run: (i, p) => { const pm = i.panel >= 120 ? 48 : 39.5; const rows: [string, number][] = [['Panel', p.rules.m2 * pm], ['Puertas', i.doors * 640], ['Perfilería y remates', p.rules.m2 * 6.2], ['Montaje', p.rules.m2 * 11]]; const total = rows.reduce((a, r) => a + r[1], 0); return { summary: `Coste ${eur(total)}`, data: { total }, output: { kind: 'table', columns: ['Concepto', 'Importe'], rows: [...rows.map(([k, v]) => [k, eur(v)]), ['Total coste', eur(total)]] } }; } },
      { id: 'offer', title: 'Oferta', agent: 'C02', run: (_i, p) => { const price = p.breakdown.total / (1 - 0.25); return { summary: `Precio ${eur(price)} (margen 25 %)`, output: { kind: 'text', text: `Oferta de cerramiento modular: ${eur(price)} sin IVA. Margen sobre venta 25 % (regla fixture). Plazo a confirmar con planificación.` } }; } },
    ],
  },
  {
    id: 'rcfil', ref: 'RCFIL', pages: 'pág. 23', title: 'Logística y freight', sector: 'Logística',
    summary: 'Interpreta una solicitud de transporte, aplica tarifa por zona y prepara pedido y respuesta.',
    inputs: [
      { id: 'a', label: 'Vigo → Valencia · 6 palés · 3.200 kg', data: { from: 'Vigo', to: 'Valencia', pallets: 6, kg: 3200, zone: 3 } },
      { id: 'b', label: 'Vigo → Oporto · 2 palés · 900 kg · urgente', data: { from: 'Vigo', to: 'Oporto', pallets: 2, kg: 900, zone: 1, urgent: true } },
    ],
    steps: [
      { id: 'request', title: 'Solicitud', agent: 'C01', run: (i) => ({ summary: `${i.from} → ${i.to}`, output: { kind: 'kv', items: [['Origen', i.from], ['Destino', i.to], ['Palés', String(i.pallets)], ['Peso', `${i.kg} kg`], ['Urgente', i.urgent ? 'Sí' : 'No']] } }) },
      { id: 'tariff', title: 'Tarifa fixture', agent: 'C07', run: (i) => { const base = [0, 58, 74, 92][i.zone] * i.pallets; const fuel = base * 0.12; const urg = i.urgent ? base * 0.3 : 0; const total = base + fuel + urg; return { summary: eur(total), data: { total }, output: { kind: 'table', columns: ['Concepto', 'Importe'], rows: [[`Zona ${i.zone} × ${i.pallets} palés`, eur(base)], ['Recargo combustible 12 %', eur(fuel)], ['Urgencia 30 %', eur(urg)], ['Total', eur(total)]], note: 'Matriz de tarifas de ejemplo v2026.09' } }; } },
      { id: 'order', title: 'Pedido', agent: 'C05', run: (i, p) => ({ summary: 'Pedido de transporte estructurado', output: { kind: 'kv', items: [['Servicio', i.urgent ? 'Urgente 24 h' : 'Estándar 48–72 h'], ['Mercancía', `${i.pallets} palés / ${i.kg} kg`], ['Importe', eur(p.tariff.total)], ['Estado', 'Borrador (no se reserva transporte)']] } }) },
      { id: 'reply', title: 'Respuesta', agent: 'C01', run: (i, p) => ({ summary: 'Respuesta en borrador', output: { kind: 'text', text: `Hola: para ${i.pallets} palés ${i.from} → ${i.to} el precio es ${eur(p.tariff.total)} sin IVA (${i.urgent ? 'servicio urgente' : 'servicio estándar'}). ¿Confirmamos la recogida?` } }) },
    ],
  },
  {
    id: 'ferri', ref: 'FERRI', pages: 'pág. 24', title: 'Ofertas técnicas industriales', sector: 'Industria',
    summary: 'De los requisitos técnicos a opciones justificadas con conocimiento interno.',
    inputs: [
      { id: 'a', label: 'Bombeo agua 40 m³/h · 6 bar · inox', data: { flow: 40, bar: 6, mat: 'inox' } },
      { id: 'b', label: 'Bombeo agua 15 m³/h · 3 bar · fundición', data: { flow: 15, bar: 3, mat: 'fundición' } },
    ],
    steps: [
      { id: 'req', title: 'Requisitos', agent: 'C01', run: (i) => ({ summary: `${i.flow} m³/h a ${i.bar} bar`, output: { kind: 'kv', items: [['Caudal', `${i.flow} m³/h`], ['Presión', `${i.bar} bar`], ['Material', i.mat]] } }) },
      { id: 'kb', title: 'Conocimiento', agent: 'C07', run: (i) => { const cands = [{ m: 'BC-20', f: 20, b: 4, mat: 'fundición', p: 1890 }, { m: 'BC-45', f: 45, b: 7, mat: 'fundición', p: 2950 }, { m: 'BX-45', f: 45, b: 8, mat: 'inox', p: 4380 }, { m: 'BX-60', f: 60, b: 10, mat: 'inox', p: 5620 }]; const ok = cands.filter((c) => c.f >= i.flow && c.b >= i.bar && c.mat === i.mat); return { summary: `${ok.length} modelos compatibles`, data: { ok }, output: { kind: 'table', columns: ['Modelo', 'Caudal máx.', 'Presión máx.', 'Material', 'Ficha'], rows: cands.map((c) => [c.m, `${c.f} m³/h`, `${c.b} bar`, c.mat, ok.includes(c) ? 'Compatible' : 'Descartado']), note: 'Fichas técnicas de ejemplo' } }; } },
      { id: 'options', title: 'Opciones', agent: 'C02', run: (i, p) => ({ summary: p.kb.ok.map((c: { m: string }) => c.m).join(', ') || 'Sin opción estándar', output: { kind: 'list', items: p.kb.ok.length ? p.kb.ok.map((c: { m: string; f: number; p: number }) => `${c.m}: holgura de caudal ${Math.round(((c.f - i.flow) / i.flow) * 100)} % · ${eur(c.p)}`) : ['Ninguna opción estándar: requiere estudio a medida'] } }) },
      { id: 'proposal', title: 'Propuesta', agent: 'C02', run: (_i, p) => { const best = p.kb.ok[0]; return { summary: best ? `Propuesta ${best.m}` : 'Estudio a medida', output: { kind: 'text', text: best ? `Proponemos el modelo ${best.m} por ser el de menor holgura que cumple caudal, presión y material. Importe ${eur(best.p)} sin IVA.` : 'No hay modelo estándar compatible; se propone visita técnica.' } }; } },
    ],
  },
  {
    id: 'regenasa', ref: 'REGENASA', pages: 'pág. 25', title: 'Workspace de ofertas naval', sector: 'Naval',
    summary: 'Compara revisiones de plano, redacta un memo de cambios y ajusta la oferta.',
    inputs: [
      { id: 'a', label: 'Mamparo M-12 · rev. A → rev. B', data: { a: { plate: 8, stiff: 6, len: 4200 }, b: { plate: 10, stiff: 8, len: 4200 } } },
      { id: 'b', label: 'Polín P-03 · rev. A → rev. B', data: { a: { plate: 12, stiff: 4, len: 1800 }, b: { plate: 12, stiff: 4, len: 2100 } } },
    ],
    steps: [
      { id: 'drawings', title: 'Planos rev. A/B', agent: 'C07', run: (i) => ({ summary: 'Dos revisiones cargadas', output: { kind: 'table', columns: ['Atributo', 'Rev. A', 'Rev. B'], rows: [['Espesor chapa (mm)', i.a.plate, i.b.plate], ['Refuerzos', i.a.stiff, i.b.stiff], ['Longitud (mm)', i.a.len, i.b.len]] } }) },
      { id: 'diff', title: 'Diferencias', agent: 'C08', run: (i) => { const d = (['plate', 'stiff', 'len'] as const).filter((k) => i.a[k] !== i.b[k]); return { summary: `${d.length} cambios`, data: { d }, output: { kind: 'list', items: d.map((k) => `${{ plate: 'Espesor', stiff: 'Refuerzos', len: 'Longitud' }[k]}: ${i.a[k]} → ${i.b[k]}`) } }; } },
      { id: 'memo', title: 'Memo', agent: 'C02', run: (_i, p) => ({ summary: 'Memo de cambios', output: { kind: 'text', text: `Memo técnico: la rev. B introduce ${p.diff.d.length} cambio(s) que afectan a material y horas de soldadura. Se conserva la oferta de rev. A como referencia.` } }) },
      { id: 'offer', title: 'Oferta', agent: 'C02', run: (i) => { const kg = (x: { plate: number; len: number; stiff: number }) => (x.plate * x.len * 1500 * 7.85) / 1e6 + x.stiff * 9; const ca = kg(i.a) * 3.2; const cb = kg(i.b) * 3.2; return { summary: `Δ ${eur(cb - ca)}`, output: { kind: 'kv', items: [['Coste rev. A', eur(ca)], ['Coste rev. B', eur(cb)], ['Diferencia', eur(cb - ca)]], note: 'Coste fixture: kg × 3,20 €/kg (material + soldadura)' } }; } },
    ],
  },
  {
    id: 'ucalsa', ref: 'UCALSA', pages: 'pág. 29', title: 'Planificación de producción', sector: 'Industria',
    summary: 'Ordena pedidos según capacidades y muestra el efecto de una urgencia simulada.',
    inputs: [
      { id: 'a', label: '5 pedidos · 2 líneas · 7,5 h/día', data: { orders: [['P-101', 6, 1], ['P-102', 9, 2], ['P-103', 4, 1], ['P-104', 7, 2], ['P-105', 5, 3]], lines: 2, urgent: ['U-900', 6, 1] } },
      { id: 'b', label: '4 pedidos · 1 línea · 7,5 h/día', data: { orders: [['P-201', 5, 1], ['P-202', 8, 2], ['P-203', 3, 3], ['P-204', 6, 4]], lines: 1, urgent: ['U-901', 4, 1] } },
    ],
    steps: [
      { id: 'orders', title: 'Pedidos', agent: 'C05', run: (i) => ({ summary: `${i.orders.length} pedidos`, output: { kind: 'table', columns: ['Pedido', 'Horas', 'Entrega (día)'], rows: i.orders } }) },
      { id: 'capacity', title: 'Capacidades', agent: 'C07', run: (i) => ({ summary: `${i.lines} línea(s) × 7,5 h`, output: { kind: 'kv', items: [['Líneas', String(i.lines)], ['Horas/día por línea', '7,5'], ['Capacidad diaria', `${n1(i.lines * 7.5)} h`]] } }) },
      { id: 'calendar', title: 'Calendario', agent: 'C05', run: (i) => { const sched = schedule(i.orders, i.lines); return { summary: `${sched.filter((s) => s.late).length} retrasos`, data: { sched }, output: { kind: 'table', columns: ['Pedido', 'Línea', 'Fin (día)', 'Entrega', 'Estado'], rows: sched.map((s) => [s.id, s.line, n1(s.end), s.due, s.late ? 'Retraso' : 'OK']), note: 'Secuencia por fecha de entrega (EDD). Ilustrativo, no optimizado.' } }; } },
      { id: 'urgent', title: 'Urgencia simulada', agent: 'C08', run: (i, p) => { const s2 = schedule([...i.orders, i.urgent], i.lines); const moved = s2.filter((s) => { const prev = p.calendar.sched.find((x: { id: string }) => x.id === s.id); return prev && s.end > prev.end; }); return { summary: `${moved.length} pedidos desplazados`, output: { kind: 'table', columns: ['Pedido', 'Fin (día)', 'Estado'], rows: s2.map((s) => [s.id, n1(s.end), s.late ? 'Retraso' : 'OK']), note: `Entra ${i.urgent[0]} (${i.urgent[1]} h, día ${i.urgent[2]}): impacto visible antes de aceptarlo.` } }; } },
    ],
  },
  {
    id: 'galpi', ref: 'GALPI', pages: 'pág. 30', title: 'Pricing Odoo + ARPA', sector: 'Distribución',
    summary: 'Revisa una oferta, consulta coste (ARPA simulado) y crea nueva versión con margen controlado. Versión completa en el workspace Odoo.',
    inputs: [
      { id: 'a', label: '250 uds · piden 12 %', data: { qty: 250, disc: 12, list: 38.5 } },
      { id: 'b', label: '120 uds · piden 8 %', data: { qty: 120, disc: 8, list: 38.5 } },
    ],
    steps: [
      { id: 'offer', title: 'Oferta', agent: 'C02', run: (i) => ({ summary: `${i.qty} uds · ${i.disc} %`, output: { kind: 'kv', items: [['Cantidad', String(i.qty)], ['Descuento pedido', `${i.disc} %`], ['Tarifa', eur(i.list)]] } }) },
      { id: 'arpa', title: 'Consulta ARPA (fixture)', agent: 'C02', run: (i) => { const cost = i.qty >= 200 ? 27.9 : 29.4; return { summary: `Coste ${eur(cost)}`, data: { cost }, output: { kind: 'kv', items: [['Coste', eur(cost)], ['Tramo', i.qty >= 200 ? '≥ 200 uds' : '< 200 uds']], note: 'ARPA no conectado: fixture hasta recibir especificación' } }; } },
      { id: 'margin', title: 'Margen', agent: 'C05', run: (i, p) => { const price = i.list * (1 - i.disc / 100); const m = ((price - p.arpa.cost) / price) * 100; const max = Math.floor((1 - p.arpa.cost / (i.list * 0.82)) * 200) / 2; return { summary: `Margen ${n1(m)} %`, data: { m, max }, output: { kind: 'kv', items: [['Precio con descuento', eur(price)], ['Margen', `${n1(m)} %`], ['Mínimo política', '18 %'], ['Descuento máximo', `${n1(max)} %`]] } }; } },
      { id: 'version', title: 'Nueva versión', agent: 'C02', run: (i, p) => { const d = p.margin.m >= 18 ? i.disc : p.margin.max; return { summary: `v2 al ${n1(d)} %`, output: { kind: 'text', text: `Nueva versión propuesta: ${i.qty} uds con ${n1(d)} % de descuento (${eur(i.list * (1 - d / 100))}/ud). Pendiente de aprobación; ver escenario completo en Odoo › Bandeja.` } }; } },
    ],
  },
  {
    id: 'prisa', ref: 'PRISA / Radio Vigo', pages: 'pág. 27', title: 'Calidad de emisión', sector: 'Medios',
    summary: 'Analiza una línea temporal de audio de ejemplo y abre incidencias revisables.',
    inputs: [
      { id: 'a', label: 'Franja 08:00–08:10 · ejemplo con silencio', data: { levels: [-18, -17, -19, -60, -61, -60, -59, -60, -60, -18, -16, -17, -2, -1, -18] } },
      { id: 'b', label: 'Franja 12:00–12:10 · ejemplo limpio', data: { levels: [-18, -17, -19, -18, -16, -17, -18, -19, -17, -18, -16, -17, -18, -17, -18] } },
    ],
    steps: [
      { id: 'timeline', title: 'Timeline de audio', agent: 'C03', run: (i) => ({ summary: `${i.levels.length} segmentos de 40 s`, output: { kind: 'table', columns: ['Segmento', 'Nivel (dBFS)'], rows: i.levels.map((l: number, k: number) => [`#${k + 1}`, l]), note: 'Niveles de ejemplo; no se capturan emisiones reales' } }) },
      { id: 'incident', title: 'Incidencias', agent: 'C08', run: (i) => { const inc: string[] = []; let run = 0; i.levels.forEach((l: number, k: number) => { if (l <= -50) run++; else { if (run >= 3) inc.push(`Silencio de ${run * 40} s (segmentos ${k - run + 1}–${k})`); run = 0; } if (l > -3) inc.push(`Posible saturación en segmento ${k + 1} (${l} dBFS)`); }); return { summary: `${inc.length} incidencias`, data: { inc }, output: { kind: 'list', items: inc.length ? inc : ['Sin incidencias en la franja'] } }; } },
      { id: 'review', title: 'Revisión', agent: 'MTI', run: (_i, p) => ({ summary: 'Pendiente de revisión humana', output: { kind: 'text', text: p.incident.inc.length ? `Se abren ${p.incident.inc.length} incidencias para revisión del técnico de continuidad. No se actúa sobre la emisión.` : 'Franja sin incidencias; no requiere revisión.' } }) },
    ],
  },
  {
    id: 'sigi', ref: 'SIGI', pages: 'pág. 31', title: 'Asistencia CAU en llamada', sector: 'Servicios',
    summary: 'Transcripción ficticia, consulta documental y sugerencia para el agente del CAU. Sin datos clínicos.',
    inputs: [
      { id: 'a', label: 'Llamada: no puede acceder a la VPN', data: { text: 'Buenos días, desde esta mañana no puedo acceder a la VPN, me da error de certificado caducado.' } },
      { id: 'b', label: 'Llamada: impresora no imprime', data: { text: 'La impresora de la planta dos no imprime, aparece en cola pero no sale nada.' } },
    ],
    steps: [
      { id: 'transcript', title: 'Transcripción', agent: 'C03', run: (i) => ({ summary: 'Transcripción ficticia', output: { kind: 'text', text: i.text } }) },
      { id: 'docs', title: 'Consulta documental', agent: 'C07', run: (i) => { const kb = [['KB-12', 'VPN: renovar certificado de usuario desde el portal de autoservicio', ['vpn', 'certificado']], ['KB-31', 'Impresoras: reiniciar cola de impresión y comprobar driver', ['impresora', 'cola']], ['KB-07', 'Contraseñas: restablecimiento con doble factor', ['contraseña']]] as const; const t = i.text.toLowerCase(); const hits = kb.filter(([, , k]) => k.some((w) => t.includes(w))); return { summary: `${hits.length} documentos`, data: { hits }, output: { kind: 'table', columns: ['Doc.', 'Fragmento'], rows: hits.map(([id, f]) => [id, f]), note: 'Base documental de ejemplo' } }; } },
      { id: 'suggest', title: 'Sugerencia', agent: 'C07', run: (_i, p) => ({ summary: p.docs.hits.length ? `Basado en ${p.docs.hits[0][0]}` : 'Escalar', output: { kind: 'text', text: p.docs.hits.length ? `Sugerencia al agente: ${p.docs.hits[0][1]} [${p.docs.hits[0][0]}]. Confirmar con el usuario antes de cerrar el ticket.` : 'Sin documento aplicable: escalar a segundo nivel.' } }) },
    ],
  },
  {
    id: 'frioteis', ref: 'FRIOTEIS', pages: 'pág. 32', title: 'Operaciones de almacén frío', sector: 'Logística',
    summary: 'Recepción de lotes, control de temperatura, incidencia y documento.',
    inputs: [
      { id: 'a', label: 'Recepción camión 14 · 4 lotes', data: { lots: [['L-881', -19.5], ['L-882', -18.2], ['L-883', -15.1], ['L-884', -19.0]] } },
      { id: 'b', label: 'Recepción camión 15 · 3 lotes', data: { lots: [['L-901', -20.1], ['L-902', -19.4], ['L-903', -18.6]] } },
    ],
    steps: [
      { id: 'reception', title: 'Recepción', agent: 'C06', run: (i) => ({ summary: `${i.lots.length} lotes`, output: { kind: 'table', columns: ['Lote', 'Temperatura (°C)'], rows: i.lots } }) },
      { id: 'check', title: 'Lote / temperatura', agent: 'C08', run: (i) => { const bad = i.lots.filter((l: [string, number]) => l[1] > -18); return { summary: bad.length ? `${bad.length} fuera de rango` : 'Todos en rango', data: { bad }, output: { kind: 'list', items: i.lots.map((l: [string, number]) => `${l[0]}: ${l[1]} °C ${l[1] > -18 ? '→ fuera de rango (> −18 °C)' : '✓'}`) } }; } },
      { id: 'incident', title: 'Incidencia', agent: 'C08', run: (_i, p) => ({ summary: p.check.bad.length ? 'Incidencia abierta' : 'Sin incidencia', output: { kind: 'text', text: p.check.bad.length ? `Lotes ${p.check.bad.map((b: [string]) => b[0]).join(', ')} bloqueados para revisión de calidad. No se ubican hasta decisión humana.` : 'Recepción conforme.' } }) },
      { id: 'document', title: 'Documento', agent: 'C06', run: (_i, p) => ({ summary: 'Documento preparado', output: { kind: 'kv', items: [['Tipo', p.check.bad.length ? 'Informe de no conformidad (borrador)' : 'Albarán de entrada (borrador)'], ['Estado', 'Pendiente de firma']] } }) },
    ],
  },
  {
    id: 'aspol', ref: 'ASPOL', pages: 'pág. 33', title: 'Carga, rutas y documentos', sector: 'Logística',
    summary: 'Distribución ilustrativa de cargas, orden de ruta y documentación. No es una optimización VRP/3D.',
    inputs: [
      { id: 'a', label: '7 cargas · 2 camiones de 12 t', data: { loads: [['C1', 5.2, 'Lugo'], ['C2', 3.1, 'Ourense'], ['C3', 4.4, 'Santiago'], ['C4', 2.0, 'Lugo'], ['C5', 6.3, 'A Coruña'], ['C6', 1.5, 'Santiago'], ['C7', 2.8, 'Ourense']], cap: 12 } },
      { id: 'b', label: '4 cargas · 1 camión de 12 t', data: { loads: [['C1', 3.2, 'Pontevedra'], ['C2', 2.1, 'Vigo'], ['C3', 4.0, 'Santiago'], ['C4', 1.8, 'Vigo']], cap: 12 } },
    ],
    steps: [
      { id: 'loads', title: 'Cargas', agent: 'C06', run: (i) => ({ summary: `${i.loads.length} cargas`, output: { kind: 'table', columns: ['Carga', 'Peso (t)', 'Destino'], rows: i.loads } }) },
      { id: 'distribution', title: 'Distribución ilustrativa', agent: 'C05', run: (i) => { const trucks: { loads: string[]; t: number }[] = []; for (const l of [...i.loads].sort((a: [string, number], b: [string, number]) => b[1] - a[1])) { const tr = trucks.find((x) => x.t + l[1] <= i.cap) ?? (trucks.push({ loads: [], t: 0 }), trucks.at(-1)!); tr.loads.push(l[0]); tr.t += l[1]; } return { summary: `${trucks.length} camiones`, data: { trucks }, output: { kind: 'table', columns: ['Camión', 'Cargas', 'Peso (t)'], rows: trucks.map((t, k) => [`T${k + 1}`, t.loads.join(', '), n1(t.t)]), note: 'Heurística first-fit decreciente sobre peso. Ilustrativa: no considera volumen, ejes ni ventanas.' } }; } },
      { id: 'route', title: 'Ruta', agent: 'C05', run: (i, p) => ({ summary: 'Orden de paradas', output: { kind: 'list', items: p.distribution.trucks.map((t: { loads: string[] }, k: number) => `T${k + 1}: Vigo → ${[...new Set(t.loads.map((id) => i.loads.find((l: [string]) => l[0] === id)[2]))].join(' → ')}`), note: 'Orden por agrupación de destino; no es una ruta óptima.' } }) },
      { id: 'docs', title: 'Documentos', agent: 'C06', run: (_i, p) => ({ summary: `${p.distribution.trucks.length} CMR en borrador`, output: { kind: 'list', items: p.distribution.trucks.map((_: unknown, k: number) => `CMR-T${k + 1} (borrador) · hoja de carga T${k + 1}`) } }) },
    ],
  },
  {
    id: 'nautia', ref: 'NAUTIA', pages: 'pág. 34', title: 'Conocimiento y regulación', sector: 'Naval',
    summary: 'Pregunta, recuperación de fragmentos fuente y respuesta con citas.',
    inputs: [
      { id: 'a', label: '¿Qué revisión necesita una balsa salvavidas?', data: { q: 'revisión balsa salvavidas periodicidad' } },
      { id: 'b', label: '¿Qué extintores debe llevar una embarcación de recreo?', data: { q: 'extintores embarcación recreo' } },
    ],
    steps: [
      { id: 'question', title: 'Pregunta', agent: 'C01', run: (i) => ({ summary: 'Consulta recibida', output: { kind: 'text', text: i.q } }) },
      { id: 'fragments', title: 'Fragmentos fuente', agent: 'C07', run: (i) => { const docs = [['DOC-A §3.2', 'Las balsas salvavidas se revisarán en estación de servicio autorizada con la periodicidad indicada por el fabricante y la normativa aplicable.', ['balsa', 'revisión', 'periodicidad']], ['DOC-B §5.1', 'El número de extintores depende de la eslora y de la potencia instalada de la embarcación.', ['extintores', 'embarcación']], ['DOC-C §1.4', 'La documentación de a bordo incluirá el certificado de navegabilidad en vigor.', ['documentación', 'certificado']]] as const; const t = i.q.toLowerCase(); const scored = docs.map(([id, f, k]) => ({ id, f, s: k.filter((w) => t.includes(w)).length / k.length })).filter((d) => d.s > 0).sort((a, b) => b.s - a.s); return { summary: `${scored.length} fragmentos`, data: { scored }, output: { kind: 'table', columns: ['Fuente', 'Fragmento', 'Coincidencia'], rows: scored.map((d) => [d.id, d.f, `${Math.round(d.s * 100)} %`]), note: 'Coincidencia sobre fragmentos fixture; no es búsqueda en el repositorio del cliente' } }; } },
      { id: 'answer', title: 'Respuesta citada', agent: 'C07', run: (_i, p) => ({ summary: p.fragments.scored.length ? 'Respuesta con citas' : 'Sin fuente', output: { kind: 'text', text: p.fragments.scored.length ? `${p.fragments.scored[0].f} [${p.fragments.scored[0].id}]. Verificar la versión vigente de la norma antes de responder al cliente.` : 'No hay fragmentos que respalden una respuesta: no se responde sin fuente.' } }) },
    ],
  },
];

function schedule(orders: [string, number, number][], lines: number) {
  const free = Array(lines).fill(0);
  return [...orders].sort((a, b) => a[2] - b[2]).map(([id, h, due]) => {
    const li = free.indexOf(Math.min(...free));
    free[li] += h / 7.5;
    return { id, line: `L${li + 1}`, end: free[li], due, late: free[li] > due };
  });
}
