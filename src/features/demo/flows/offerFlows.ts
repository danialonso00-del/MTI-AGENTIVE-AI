// Recorridos de Ofertas & Licitaciones (industria, naval, construcción). Datos de ejemplo.
import { eur, num } from '@/lib/format';
import type { Flow } from '../flowTypes';

// ── COPLEGAL · cotización desde PDF ──
const RATE = 48; // €/h de taller
const MARGIN = 0.25; // margen sobre venta
const Q_LINES = [
  { ref: 'R-1/2-90', name: 'Racor codo 90° 1/2" BSP · latón CW617N', qty: 400, mat: 0.86, min: 1.6 },
  { ref: 'S-40-Z', name: 'Soporte en L 40×40×4 · S235 zincado', qty: 250, mat: 1.3, min: 2.4 },
  { ref: 'H-M8', name: 'Bisagra M8 · inox AISI 304', qty: 120, mat: 2.35, min: 3.8 },
].map((l) => {
  const proc = Math.round((l.min / 60) * RATE * 100) / 100;
  const unit = Math.round(((l.mat + proc) / (1 - MARGIN)) * 100) / 100;
  return { ...l, proc, unit, total: Math.round(unit * l.qty * 100) / 100 };
});
const Q_TOTAL = Q_LINES.reduce((a, l) => a + l.total, 0);

export const quoteFromPdfFlow: Flow = {
  id: 'uc-coplegal', title: 'Cotización que se construye sola', subtitle: 'Racores, soportes y herrajes: del PDF del cliente a la oferta justificada', reference: 'COPLEGAL · Ofertas',
  finale: [{ label: 'Ofertas de fabricación', to: '/fabricacion' }, { label: 'Presupuestos en Odoo', to: '/odoo/ventas' }],
  steps: [
    { id: 'rfq', section: 'Bandeja · correo', title: 'Una petición de oferta en PDF', agents: ['C01'],
      narration: 'El cliente envía su lista de piezas en un PDF. Hoy alguien lo lee, busca tarifas y calcula línea a línea en una hoja.',
      where: { label: 'Bandeja unificada', to: '/bandeja' },
      visual: { kind: 'inbound', channel: 'email', from: 'compras@hidraulica-norte.example', subject: 'Petición de oferta · racores y soportes', body: 'Adjuntamos la petición RFQ-HN-311. Necesitamos precio y plazo esta semana.', meta: ['RFQ-HN-311.pdf'] } },
    { id: 'lectura', section: 'Documentos', title: 'Lee el PDF y extrae los parámetros', agents: ['C06'],
      narration: 'Referencia, material, cantidad y requisitos especiales de cada línea. El certificado 3.1 se marca porque cambia el coste.',
      visual: { kind: 'read', window: 'C06 · lectura de RFQ-HN-311.pdf', docTitle: 'RFQ-HN-311 · Hidráulica Norte (ficticio)',
        text: 'R-1/2-90   Racor codo 90° 1/2" BSP · Latón CW617N · 400 uds\nS-40-Z     Soporte en L 40×40×4 · Acero S235 zincado · 250 uds\nH-M8       Bisagra M8 · Inox AISI 304 · 120 uds\n\nEntrega: 3 semanas. Certificado 3.1 para el latón.',
        marks: [{ needle: 'Latón CW617N · 400 uds', label: 'Línea 1', value: 'Latón CW617N × 400' }, { needle: 'Acero S235 zincado · 250 uds', label: 'Línea 2', value: 'S235 + zincado × 250' }, { needle: 'Inox AISI 304 · 120 uds', label: 'Línea 3', value: 'AISI 304 × 120' }, { needle: '3 semanas', label: 'Plazo pedido', value: '3 semanas', tone: 'gold' }, { needle: 'Certificado 3.1', label: 'Requisito', value: 'Certificado EN 10204 3.1', tone: 'warn' }] } },
    { id: 'tarifas', section: 'Conocimiento', title: 'Tarifas e histórico', agents: ['C07'],
      narration: 'Busca la tarifa vigente de cada material, el tiempo estándar de cada pieza y las ofertas anteriores parecidas. Lo caducado o distinto se descarta, con motivo.',
      visual: { kind: 'cloud', center: 'Tarifas & histórico', centerSub: 'ERP · tarifas · ofertas', query: 'racor 1/2" latón · soporte L 40 · bisagra M8',
        docs: [
          { id: 't-lat', label: 'Tarifa latón 2026-T3', sub: 'CW617N · €/kg', kind: 'arpa' },
          { id: 'of-912', label: 'OF-2025-0912', sub: 'Racor 1/2" · 300 uds', kind: 'job' },
          { id: 'std', label: 'Tiempos estándar', sub: 'Codo BSP · soporte L · bisagra', kind: 'dataset' },
          { id: 'zinc', label: 'Tarifa zincado', sub: 'Proveedor homologado', kind: 'arpa' },
          { id: 'cli', label: 'Hidráulica Norte', sub: 'Condiciones de pago 60 d', kind: 'partner' },
          { id: 'old-t', label: 'Tarifa latón 2025-T4', sub: 'Caducada', kind: 'arpa' },
          { id: 'of-34', label: 'OF-2022-0311', sub: 'Racor 3/4"', kind: 'job' },
        ], selected: ['t-lat', 'of-912', 'std', 'zinc', 'cli'], rejected: [{ id: 'old-t', reason: 'tarifa caducada' }, { id: 'of-34', reason: 'diámetro distinto' }], selectedTitle: 'Fuentes del cálculo' } },
    { id: 'calculo', section: 'Cálculo', title: 'Cada línea, calculada y explicada', agents: ['C02'],
      narration: `Material más proceso (tiempo estándar a ${RATE} €/h) y margen del ${MARGIN * 100} % sobre venta. Cada cifra se puede abrir y ver de dónde sale.`,
      visual: { kind: 'table', window: 'C02 · composición de la oferta', columns: ['Referencia', 'Material €/ud', 'Tiempo std.', 'Proceso €/ud', 'Precio €/ud', 'Total'],
        rows: Q_LINES.map((l) => [l.ref, eur(l.mat), `${num(l.min, 1)} min`, eur(l.proc), eur(l.unit), eur(l.total)]),
        totals: [{ label: 'Total oferta', value: eur(Q_TOTAL) }, { label: 'Margen sobre venta', value: `${MARGIN * 100} %` }],
        note: 'Certificado 3.1: se añade como línea aparte pendiente de confirmar el coste con el proveedor del latón.' } },
    { id: 'oferta', section: 'Odoo · ventas', title: 'De vuelta al ERP, con justificación', agents: ['C02', 'C06'],
      narration: 'La oferta vuelve a Odoo como presupuesto borrador y con un documento de justificación por línea. Nadie la envía sin revisarla.',
      where: { label: 'Odoo · ventas', to: '/odoo/ventas' },
      visual: { kind: 'output', window: 'Odoo · presupuesto borrador', logo: '/brands/odoo.svg', recordTitle: 'Presupuesto S-RFQ-HN-311', badge: 'Borrador',
        fields: [['Cliente', 'Hidráulica Norte (ficticio)'], ['Total', eur(Q_TOTAL)], ['Plazo', '3 semanas'], ['Pendiente', 'Coste certificado 3.1']],
        lines: { columns: ['Ref.', 'Uds', '€/ud', 'Total'], rows: Q_LINES.map((l) => [l.ref, String(l.qty), eur(l.unit), eur(l.total)]) },
        side: { title: 'Justificación (extracto)', text: `R-1/2-90: latón según tarifa 2026-T3, ${num(Q_LINES[0].min, 1)} min de tiempo estándar (codo BSP), referencia OF-2025-0912. S-40-Z: incluye zincado del proveedor homologado. Supuesto abierto: coste del certificado 3.1.` },
        final: 'Presupuesto en borrador: ni se confirma ni se envía sin la revisión del técnico comercial.' } },
  ],
};

// ── FERRI · seis especialistas y motor de analogía ──
const HOURS = [
  { label: 'Ingeniería', est: 180, ref: 165 },
  { label: 'Calderería', est: 420, ref: 390 },
  { label: 'Mecanizado', est: 260, ref: 250 },
  { label: 'Montaje hidráulico', est: 310, ref: 280 },
  { label: 'Pruebas FAT', est: 64, ref: 60 },
];
const H_TOTAL = HOURS.reduce((a, h) => a + h.est, 0);
const H_RATE = 52;
const MATERIALS = 61800;
const F_COST = H_TOTAL * H_RATE + MATERIALS;

export const analogyOfferFlow: Flow = {
  id: 'uc-ferri', title: 'Oferta técnica por analogía', subtitle: 'Seis especialistas, de la especificación a la oferta lista para revisión', reference: 'FERRI · Maquinaria industrial',
  finale: [{ label: 'Conocimiento', to: '/conocimiento' }, { label: 'Ofertas de fabricación', to: '/fabricacion' }],
  steps: [
    { id: 'espec', section: 'Bandeja · correo', title: 'Una especificación de 38 páginas', agents: ['C01', 'C06'],
      narration: 'Un astillero pide oferta de un grupo hidráulico para un chigre. Especificación larga, dos planos y normativa de clasificación.',
      visual: { kind: 'inbound', channel: 'email', from: 'ingenieria@astillero-ficticio.example', subject: 'Especificación: grupo hidráulico para chigre de 12 t', body: 'Adjuntamos especificación técnica y plano general. Rogamos oferta con plazo.', meta: ['ESP-CH12.pdf · 38 págs.', 'GA-CH12 rev. 2.pdf'] } },
    { id: 'especialistas', section: 'Orquestador', title: 'Seis especialistas en un flujo', agents: ['C02', 'C07', 'C06', 'C08'],
      narration: 'El orquestador encadena seis especialistas. Cada uno deja su resultado y el siguiente parte de él. Todo queda trazado.',
      visual: { kind: 'pipeline', stages: [
        { name: 'Reader', agent: 'C06', output: 'Lee 38 páginas y 2 planos' },
        { name: 'Parameters', agent: 'C02', output: '12 t · 22 m/min · 400 V · IP56 · clase DNV' },
        { name: 'Historical', agent: 'C07', output: '14 proyectos con chigre en el ERP' },
        { name: 'Project', agent: 'C07', output: '3 análogos con similitud ≥ 0,8' },
        { name: 'Estimating', agent: 'C02', output: `${num(H_TOTAL, 0)} h y ${eur(F_COST)} con banda ±6 %` },
        { name: 'Departures', agent: 'C08', output: 'Desviaciones frente al análogo y riesgos' },
      ] } },
    { id: 'analogos', section: 'Conocimiento', title: 'Proyectos que se parecen', agents: ['C07'],
      narration: 'Busca en el histórico del ERP los proyectos más parecidos por parámetros, no por nombre. Descarta los que solo se parecen en el título.',
      visual: { kind: 'cloud', center: 'Histórico de proyectos', centerSub: 'ERP · costes y horas reales', query: 'chigre hidráulico 10–15 t · IP56 · DNV',
        docs: [
          { id: 'p112', label: 'P-2021-112', sub: 'Chigre 12 t · similitud 0,91', kind: 'job' },
          { id: 'p044', label: 'P-2019-044', sub: 'Chigre 10 t · similitud 0,84', kind: 'job' },
          { id: 'p027', label: 'P-2023-027', sub: 'Chigre 15 t · similitud 0,81', kind: 'job' },
          { id: 'hrs', label: 'Horas reales por partida', sub: '14 proyectos', kind: 'dataset' },
          { id: 'dnv', label: 'Reglas DNV', sub: 'Equipos de cubierta', kind: 'norma' },
          { id: 'p090', label: 'P-2018-090', sub: 'Molinete · similitud 0,52', kind: 'job' },
          { id: 'elec', label: 'P-2022-015', sub: 'Chigre eléctrico', kind: 'job' },
        ], selected: ['p112', 'p044', 'p027', 'hrs', 'dnv'], rejected: [{ id: 'p090', reason: 'otro equipo' }, { id: 'elec', reason: 'accionamiento distinto' }], selectedTitle: 'Análogos y fuentes' } },
    { id: 'horas', section: 'Estimación', title: 'Horas por partida frente al análogo', agents: ['C02'],
      narration: 'Escala las horas reales del proyecto más parecido según los parámetros nuevos. Cada partida se compara con lo que costó de verdad.',
      visual: { kind: 'bars', title: 'Horas por partida', format: 'num', compareLabel: 'P-2021-112 (real)', valueLabel: 'Estimación',
        bars: HOURS.map((h) => ({ label: h.label, value: h.est, compare: h.ref })),
        headline: { label: 'Coste estimado', value: F_COST, format: 'eur', sub: `${num(H_TOTAL, 0)} h × ${H_RATE} €/h + ${eur(MATERIALS)} de materiales` },
        note: 'Estimación con datos de ejemplo. El ingeniero puede ajustar cualquier partida y queda registrado.' } },
    { id: 'desviaciones', section: 'Calidad', title: 'Lo que cambia respecto al análogo', agents: ['C08'],
      narration: 'Departures explica dónde y por qué la oferta se separa del proyecto base. Es lo que el revisor necesita leer.',
      visual: { kind: 'table', window: 'Departures · desviaciones y riesgos', columns: ['Partida', 'Diferencia', 'Motivo', 'Riesgo'],
        rows: HOURS.map((h) => [h.label, `+${num(((h.est - h.ref) / h.ref) * 100, 1)} %`,
          ({ Ingeniería: 'Clase DNV con planos nuevos', Calderería: 'Bastidor reforzado para 12 t', Mecanizado: 'Tambor de mayor diámetro', 'Montaje hidráulico': 'Doble circuito de freno', 'Pruebas FAT': 'Prueba con inspector de clase' } as Record<string, string>)[h.label],
          (h.est - h.ref) / h.ref > 0.09 ? 'Medio' : 'Bajo']),
        tones: HOURS.map((h) => ((h.est - h.ref) / h.ref > 0.09 ? 'warn' : null)) } },
  ],
};

// ── REGENASA · versiones de plano y memorando ──
const CHANGES = [
  { el: 'Mamparos clase B-15', a: '42 m', b: '47 m', h: 16, tone: 'warn' as const, imp: '+16 h' },
  { el: 'Puertas A-60', a: '6', b: '7', h: 9, tone: 'warn' as const, imp: '+9 h' },
  { el: 'Aislamiento techo', a: 'Lana 50 mm', b: 'Lana 75 mm', h: 13, tone: 'warn' as const, imp: '+13 h' },
  { el: 'Camarotes tipo 2', a: '8', b: '8', h: 0, tone: null, imp: 'Sin cambio' },
  { el: 'Cota de falso techo', a: '2.150 mm', b: 'No indicada', h: 0, tone: 'err' as const, imp: 'Plano incompleto' },
];
const R_HOURS = CHANGES.reduce((a, c) => a + c.h, 0);
const R_EUR = R_HOURS * 42 + 1344;

export const versionMemoFlow: Flow = {
  id: 'uc-regenasa', title: 'Nueva revisión de plano: qué cambia y cuánto cuesta', subtitle: 'Detección de versiones, plano incompleto y memorando técnico', reference: 'REGENASA · Outfitting naval',
  finale: [{ label: 'Piezas y planos', to: '/piezas' }, { label: 'Conocimiento', to: '/conocimiento' }],
  steps: [
    { id: 'rev', section: 'Bandeja · correo', title: 'Llega la revisión C', agents: ['C01'],
      narration: 'La oficina técnica del armador manda otra revisión del plano de habilitación. Las versiones se cruzan entre correos y es fácil ofertar sobre la equivocada.',
      visual: { kind: 'inbound', channel: 'email', from: 'oficina.tecnica@naviera-ficticia.example', subject: 'Rev. C · plano de habilitación cubierta 3', body: 'Os enviamos la revisión C. Sustituye a la B del día 12.', meta: ['HAB-C3_revC.pdf', 'HAB-C3_revC.dwg'] } },
    { id: 'diff', section: 'Detección de cambios', title: 'Rev. B frente a rev. C', agents: ['C08', 'C06'],
      narration: 'Compara las dos revisiones elemento a elemento. Encuentra tres cambios con impacto y una cota que ha desaparecido.',
      visual: { kind: 'table', window: 'Drawing Change Detection · HAB-C3', columns: ['Elemento', 'Rev. B', 'Rev. C', 'Impacto'],
        rows: CHANGES.map((c) => [c.el, c.a, c.b, c.imp]), tones: CHANGES.map((c) => c.tone),
        note: 'La versión vigente queda marcada; la oferta anterior sobre rev. B se señala como desactualizada.' } },
    { id: 'naval', section: 'Conocimiento', title: 'El histórico naval rellena el hueco', agents: ['C07'],
      narration: 'Para la cota que falta, busca en proyectos navales parecidos. Propone un valor, pero lo marca como supuesto para que el experto lo confirme.',
      visual: { kind: 'cloud', center: 'RAG naval', centerSub: 'proyectos · normativa · tarifas', query: 'falso techo habilitación · cubierta 3 · pasaje',
        docs: [
          { id: 'nb311', label: 'NB-311 · cubierta 3', sub: 'Falso techo 2.150 mm', kind: 'job' },
          { id: 'nb298', label: 'NB-298 · habilitación', sub: 'Mismo astillero', kind: 'job' },
          { id: 'solas', label: 'SOLAS cap. II-2', sub: 'Divisiones contra incendios', kind: 'norma' },
          { id: 'b15', label: 'Tarifa paneles B-15', sub: '€/m montado', kind: 'arpa' },
          { id: 'hm2', label: 'Horas de montaje', sub: 'Por m² y por puerta', kind: 'dataset' },
          { id: 'nb150', label: 'NB-150 · ferry', sub: 'Otra clase de buque', kind: 'job' },
        ], selected: ['nb311', 'nb298', 'solas', 'b15', 'hm2'], rejected: [{ id: 'nb150', reason: 'otra clase de buque' }], selectedTitle: 'Fuentes del memorando',
        footer: 'Supuesto propuesto: falso techo a 2.150 mm (rev. B y NB-311). Requiere confirmación.' } },
    { id: 'memo', section: 'Memorando técnico', title: 'Memorando listo para el experto', agents: ['C02'],
      narration: 'Redacta el memorando técnico: cambios, impacto en horas y coste, y los supuestos. El experto lo revisa, no lo escribe.',
      visual: { kind: 'output', window: 'Memorando técnico · borrador', recordTitle: 'MEMO-HAB-C3-revC', badge: 'Para revisión experta',
        fields: [['Cambios con impacto', '3'], ['Supuestos', '1 (cota falso techo)'], ['Horas adicionales', `+${R_HOURS} h`], ['Impacto estimado', `+${eur(R_EUR)}`]],
        side: { title: 'Texto del memorando (extracto)', text: `La revisión C incrementa los mamparos B-15 en 5 m, añade una puerta A-60 y sube el aislamiento de techo a 75 mm. Impacto: +${R_HOURS} h de montaje. La cota de falso techo no figura en rev. C; se asume 2.150 mm según rev. B, pendiente de confirmar con la oficina técnica.` },
        final: 'La oferta sobre rev. B queda bloqueada hasta aprobar este memorando.' } },
  ],
};

// ── C02 · hoja de pre-cierre de una licitación de obra ──
const CHAPTERS = [
  ['Fachadas y SATE', 248900, 5], ['Cubierta', 186400, 6], ['Carpintería exterior', 172300, 4], ['Climatización y ventilación', 164700, 6],
  ['Instalaciones eléctricas', 131200, 5], ['Accesibilidad', 72500, 4], ['Acabados interiores', 63800, 4], ['Fontanería y saneamiento', 58400, 3],
  ['Actuaciones previas', 48600, 2], ['Urbanización exterior', 34200, 5], ['Seguridad y salud', 22600, 2], ['Varios y ayudas', 15500, 12],
  ['Gestión de residuos', 14900, 2], ['Control de calidad', 9800, 2],
] as const;
const C_TOTAL = CHAPTERS.reduce((a, c) => a + c[1], 0);
const C_RANGE = CHAPTERS.reduce((a, c) => a + c[1] * c[2], 0) / C_TOTAL;
const TOP = CHAPTERS.slice(0, 7);
const REST = CHAPTERS.slice(7);

export const preCloseFlow: Flow = {
  id: 'uc-precierre', title: 'Hoja de pre-cierre: rehabilitación CEIP-248', subtitle: 'Del pliego al presupuesto con rango de incertidumbre y go/no-go', reference: 'C02 · Licitación & Oferta',
  finale: [{ label: 'Licitaciones', to: '/licitaciones' }],
  steps: [
    { id: 'pliego', section: 'Licitaciones · pliegos', title: 'PCAP, PPT y anexos leídos', agents: ['C02', 'C06'],
      narration: 'Lee el pliego administrativo, el técnico y los anexos, incluidos los escaneados (OCR). Extrae lo que decide si merece la pena concurrir.',
      where: { label: 'Licitaciones', to: '/licitaciones' },
      visual: { kind: 'read', window: 'C02 · lectura del expediente CEIP-248', docTitle: 'PCAP · Rehabilitación energética CEIP-248 (ejemplo)',
        text: 'Objeto: rehabilitación energética del colegio CEIP-248.\nPresupuesto base de licitación: 1.398.600 € (IVA excl.).\nPlazo de ejecución: 9 meses. Clasificación exigida: grupo C, categoría 4.\nCriterios: oferta económica 60 puntos; mejoras técnicas 40 puntos.\nPresentación de ofertas: 4 días naturales.',
        marks: [{ needle: '1.398.600 €', label: 'Presupuesto base', value: eur(1398600) }, { needle: '9 meses', label: 'Plazo', value: '9 meses' }, { needle: 'grupo C, categoría 4', label: 'Clasificación', value: 'C-4 · la cumplimos', tone: 'ok' }, { needle: 'oferta económica 60 puntos', label: 'Peso del precio', value: '60 %' }, { needle: '4 días naturales', label: 'Plazo de presentación', value: '4 días', tone: 'warn' }] } },
    { id: 'capitulos', section: 'Mediciones y precios', title: '14 capítulos con precios de su histórico', agents: ['C02', 'C07'],
      narration: 'Cada partida se valora con precios reales de obras anteriores, por similitud. Cada capítulo lleva su rango de incertidumbre.',
      visual: { kind: 'table', window: 'Presupuesto por capítulos · precios del histórico', columns: ['Capítulo', 'Importe', 'Incertidumbre'],
        rows: [...TOP.map((c) => [c[0], eur(c[1]), `± ${c[2]} %`]), [`Resto (${REST.length} capítulos)`, eur(REST.reduce((a, c) => a + c[1], 0)), '± 2–12 %']],
        tones: [...TOP.map((c) => (c[2] >= 6 ? 'warn' as const : null)), null],
        totals: [{ label: 'Coste propio', value: eur(C_TOTAL) }, { label: 'Rango ponderado', value: `± ${num(C_RANGE, 1)} %` }],
        note: '3 partidas sin histórico comparable (en «Varios y ayudas»): se recomienda verificarlas.' } },
    { id: 'gonogo', section: 'Decisión', title: 'Go / no-go', agents: ['C02', 'C08'],
      narration: 'La hoja de pre-cierre resume coste, baja resultante frente al umbral de temeraria estimado y riesgos. Recomienda, pero decide el comité.',
      visual: { kind: 'decision', title: 'Hoja de pre-cierre · CEIP-248', by: 'comité de ofertas',
        checks: [
          { level: 'ok', text: `Coste propio ${eur(C_TOTAL)} · rango ± ${num(C_RANGE, 1)} %` },
          { level: 'ok', text: `Baja resultante con 6 % de margen: −${num((1 - (C_TOTAL * 1.06) / 1398600) * 100, 1)} % (umbral de temeraria estimado −12,4 %)` },
          { level: 'warning', text: '3 partidas sin histórico · verificación recomendada' },
          { level: 'warning', text: 'Quedan 4 días para presentar' },
        ], stamp: 'Concurrir', stampSub: 'BC3 + Excel + PDF' } },
  ],
};
