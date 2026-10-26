// Biblioteca de casos de uso: taxonomía (departamento, sector, proceso, agente, tecnología)
// sobre los recorridos guiados. Fuente: presentación «MTi Group · IA Agentiva v.02».
// Las cifras de impacto son referencia comercial del documento, no métricas medidas en esta demo.

export type DeptId = 'ventas' | 'ofertas' | 'operaciones' | 'atencion' | 'calidad' | 'finanzas';
export type Sector = 'Industria y fabricación' | 'Naval' | 'Logística y transporte' | 'Cadena de frío y alimentación' | 'Construcción' | 'Medios' | 'Salud' | 'Transversal';
export type Tech = 'IA generativa' | 'IA agentiva' | 'Machine Learning' | 'OCR y visión' | 'Voz' | 'Optimización' | 'RAG y grafo';
export type Channel = 'email' | 'whatsapp' | 'voz' | 'portal' | 'erp' | 'llamada' | 'chat' | 'sistema';

export interface Department {
  id: DeptId; name: string; area: string; tagline: string; slide: number;
  problems: { title: string; sub: string }[];
  agents: string[];
  outputs: { title: string; sub: string }[];
}

export const DEPARTMENTS: Department[] = [
  { id: 'ventas', name: 'Ventas & Comercial', area: 'Departamento comercial', slide: 15, tagline: 'El CRM se actualiza solo; el comercial se dedica a vender.',
    problems: [{ title: 'Bandejas saturadas', sub: 'Solicitudes sin respuesta a tiempo' }, { title: 'CRM rellenado a mano', sub: 'El comercial transcribe cada correo' }, { title: 'Oportunidades que se enfrían', sub: 'Nadie detecta la inactividad' }],
    agents: ['C01', 'C04', 'C02'],
    outputs: [{ title: 'CRM siempre al día', sub: 'Actividades, etapas y tareas' }, { title: 'Alertas accionables', sub: 'Al comercial, con contexto' }, { title: 'Respuestas en borrador', sub: 'Validación con un clic' }, { title: 'Ofertas preparadas', sub: 'Trazables hasta la fuente' }] },
  { id: 'ofertas', name: 'Ofertas & Licitaciones', area: 'Preventa · ingeniería de ofertas', slide: 16, tagline: 'Del pliego a la oferta defendible, con precios reales de su histórico.',
    problems: [{ title: 'Pliegos interminables', sub: 'PCAP, PPT y anexos por leer' }, { title: 'Precios dispersos', sub: 'Histórico en Excel y PDFs antiguos' }, { title: 'Dependencia del experto', sub: 'Cálculos que solo sabe una persona' }],
    agents: ['C02', 'C07', 'C06', 'C08'],
    outputs: [{ title: 'Fichero BC3', sub: 'Presupuesto estándar' }, { title: 'Hoja de pre-cierre', sub: 'Incertidumbre por partida' }, { title: 'Oferta en PDF', sub: 'Defendible y trazable' }, { title: 'Go / no-go', sub: 'Concurrir o no' }] },
  { id: 'operaciones', name: 'Operaciones & Logística', area: 'Operaciones · logística', slide: 17, tagline: 'Pedidos, albaranes y rutas sin grabado manual.',
    problems: [{ title: 'Grabado nocturno de pedidos', sub: 'Emails y WhatsApps a mano' }, { title: 'Stock comprometido a ciegas', sub: 'Inconsistencias detectadas tarde' }, { title: 'Errores en papel', sub: 'Albaranes y CMR manuales' }],
    agents: ['C05', 'C06', 'C07'],
    outputs: [{ title: 'Pedido en el ERP', sub: 'Alta vía Odoo API' }, { title: 'Incidencias de stock', sub: 'Antes de comprometer' }, { title: 'Albaranes y CMR', sub: 'Generados y pre-validados' }, { title: 'Rutas optimizadas', sub: 'Ruteo VRP · carga 3D' }] },
  { id: 'atencion', name: 'Atención al Cliente', area: 'Atención al cliente · soporte', slide: 18, tagline: 'Teléfono y correo atendidos 24/7, con traspaso inteligente al humano.',
    problems: [{ title: 'Llamadas perdidas', sub: 'Fuera de horario o en picos' }, { title: 'Buzón saturado', sub: 'Respuestas lentas e inconsistentes' }, { title: 'Información dispersa', sub: 'Cada operador responde distinto' }],
    agents: ['C03', 'C01', 'C07'],
    outputs: [{ title: 'Respuesta hablada', sub: 'Español e inglés, 24/7' }, { title: 'Traspaso al humano', sub: 'Con todo el contexto' }, { title: 'Respuestas con fuentes', sub: 'Documento y sección' }, { title: 'Dashboard', sub: 'Transcripción y métricas' }] },
  { id: 'calidad', name: 'Calidad & Producción', area: 'Calidad · producción', slide: 19, tagline: 'Del reporte del operario al cierre con causa raíz documentada.',
    problems: [{ title: 'No conformidades en papel', sub: 'Reportes incompletos o tardíos' }, { title: 'Normativa dispersa', sub: 'Nadie sabe qué norma aplica' }, { title: 'Informes manuales', sub: 'Horas cada mes en Excel' }],
    agents: ['C08', 'C07', 'C03'],
    outputs: [{ title: 'NC clasificada', sub: 'Gravedad y responsable' }, { title: 'Normativa citada', sub: 'Cita aplicable' }, { title: 'Acción correctiva', sub: 'Workflow con SLA' }, { title: 'Informe de calidad', sub: 'Generado automáticamente' }] },
  { id: 'finanzas', name: 'Administración & Finanzas', area: 'Administración · finanzas', slide: 20, tagline: 'Documentos, tarifas y conciliaciones que cuadran solos.',
    problems: [{ title: 'Conciliación en Excel', sub: 'Expedido vs facturado a mano' }, { title: 'Discrepancias tardías', sub: 'Se detectan a fin de mes' }, { title: 'Tarifas desincronizadas', sub: 'Ofertas con precios antiguos' }],
    agents: ['C06', 'C05', 'C02'],
    outputs: [{ title: 'Conciliación diaria', sub: 'Expedido vs facturado' }, { title: 'Discrepancias al momento', sub: 'Elevadas al responsable' }, { title: 'Facturas y albaranes', sub: 'PDF · Excel · EDI' }, { title: 'Tarifas sincronizadas', sub: 'Coherentes en Odoo' }] },
];

export const SECTORS: Sector[] = ['Industria y fabricación', 'Naval', 'Construcción', 'Logística y transporte', 'Cadena de frío y alimentación', 'Medios', 'Salud', 'Transversal'];
export const TECHS: Tech[] = ['IA agentiva', 'IA generativa', 'RAG y grafo', 'OCR y visión', 'Voz', 'Machine Learning', 'Optimización'];

export interface UseCase {
  /** Igual al id del recorrido en /demo/:id. */
  id: string;
  title: string;
  summary: string;
  sector: Sector;
  departments: DeptId[];
  processes: string[];
  agents: string[];
  tech: Tech[];
  channel: Channel;
  client?: { name: string; logo?: string; photo?: string };
  slide?: number;
  input: string[];
  output: string[];
  /** Cifras del documento comercial: referencia, no medidas en esta demo. */
  impact?: string[];
  openIn?: { label: string; to: string };
}

export const USE_CASES: UseCase[] = [
  // ── Recorridos existentes ──
  { id: 'ofertas', title: 'De un plano a una oferta de mecanizado', summary: 'Email con plano y CAD: medidas extraídas, histórico consultado, tiempo estimado con reglas + ML y presupuesto en Odoo.', sector: 'Industria y fabricación', departments: ['ofertas', 'ventas'], processes: ['Estimación de tiempos', 'Cotización'], agents: ['C01', 'C06', 'C07', 'C02', 'C08'], tech: ['IA agentiva', 'OCR y visión', 'Machine Learning', 'RAG y grafo'], channel: 'email',
    client: { name: 'GALMETEC', logo: '/brands/clients/galmetec.png', photo: '/cases/precision.jpg' }, slide: 27, input: ['Correo con plano PDF/DXF', 'Modelo STEP'], output: ['Estimación por operación', 'Oferta trazable', 'Presupuesto borrador en Odoo'], impact: ['Reducción de tiempos de estimación: alta', 'Dependencia del experto: baja'], openIn: { label: 'Ofertas de fabricación', to: '/fabricacion' } },
  { id: 'tender-lic-urb', title: 'Licitación de obra civil: del portal a la oferta', summary: 'Lee el portal, filtra por perfil, analiza pliegos, valora mediciones con la base de precios y calcula baja y plazo.', sector: 'Construcción', departments: ['ofertas'], processes: ['Licitación pública', 'Estimación de costes'], agents: ['C02', 'C06', 'C07', 'C08'], tech: ['IA agentiva', 'OCR y visión', 'RAG y grafo'], channel: 'portal',
    input: ['Anuncios de PLACSP/TED', 'PCAP, PPT y mediciones'], output: ['Cribado por perfil', 'Coste y baja', 'Plan de obra', 'Go / no-go'], openIn: { label: 'Licitaciones', to: '/licitaciones' } },
  { id: 'tender-lic-reh', title: 'Rehabilitación energética con plazo ajustado', summary: 'El estudio detecta que el plazo no cabe y propone reforzar el camino crítico con una segunda cuadrilla.', sector: 'Construcción', departments: ['ofertas'], processes: ['Licitación pública', 'Planificación'], agents: ['C02', 'C07', 'C08'], tech: ['IA agentiva', 'Optimización'], channel: 'portal',
    input: ['Anuncio en TED', 'Pliegos'], output: ['Diagrama de obra', 'Coste con equipo adicional', 'Decisión del comité'], openIn: { label: 'Licitaciones', to: '/licitaciones/lic-reh' } },
  { id: 'uc-precierre', title: 'Hoja de pre-cierre con go/no-go', summary: 'Del expediente al presupuesto por capítulos con precios del histórico, rango de incertidumbre y recomendación.', sector: 'Construcción', departments: ['ofertas'], processes: ['Licitación pública', 'Estimación de costes'], agents: ['C02', 'C06', 'C07', 'C08'], tech: ['IA agentiva', 'OCR y visión', 'RAG y grafo'], channel: 'portal',
    slide: 41, input: ['PCAP, PPT y anexos', 'Histórico de precios'], output: ['Fichero BC3', 'Hoja de pre-cierre', 'Go / no-go'], impact: ['Del expediente al BC3 firmado en dos horas'], openIn: { label: 'Licitaciones', to: '/licitaciones' } },
  { id: 'crm-v-oceano', title: 'CRM actualizado por voz tras una visita', summary: 'El comercial dicta al salir del cliente; se actualizan cantidad, etapa e importe y se agendan las siguientes acciones.', sector: 'Transversal', departments: ['ventas'], processes: ['CRM y seguimiento'], agents: ['C03', 'C04'], tech: ['Voz', 'IA agentiva'], channel: 'voz',
    input: ['Nota de voz del comercial'], output: ['Oportunidad actualizada', 'Actividades con fecha'], openIn: { label: 'Asistente comercial', to: '/comercial' } },
  { id: 'crm-v-cies', title: 'Oportunidad dictada en una feria', summary: 'Un contacto en la feria se convierte en oportunidad con importe y visita programada, sin teclear.', sector: 'Transversal', departments: ['ventas'], processes: ['Captación', 'CRM y seguimiento'], agents: ['C03', 'C04'], tech: ['Voz', 'IA agentiva'], channel: 'voz',
    input: ['Nota de voz'], output: ['Contacto y oportunidad', 'Visita agendada'], openIn: { label: 'Asistente comercial', to: '/comercial' } },
  { id: 'crm-brief', title: 'Preparar una reunión con ficha 360', summary: 'Antes de la reunión, ficha del cliente con pedidos, oportunidades e incidencias; al salir, actualización por voz.', sector: 'Transversal', departments: ['ventas'], processes: ['CRM y seguimiento'], agents: ['C04', 'C07', 'C03'], tech: ['RAG y grafo', 'Voz'], channel: 'voz',
    input: ['Agenda del comercial', 'ERP y CRM'], output: ['Ficha 360', 'Siguientes pasos'], openIn: { label: 'Asistente comercial', to: '/comercial' } },
  { id: 'uc-crm-inactivas', title: 'Oportunidades que se enfrían', summary: 'Barrido nocturno del pipeline: señales de los correos, inactividad frente a lo habitual y alerta con la siguiente mejor acción.', sector: 'Transversal', departments: ['ventas'], processes: ['CRM y seguimiento'], agents: ['C04', 'C01', 'C07'], tech: ['IA agentiva', 'IA generativa', 'RAG y grafo'], channel: 'erp',
    slide: 45, input: ['Correo comercial (IMAP)', 'Odoo CRM'], output: ['Actividades y etapas', 'Alertas accionables', 'Borrador de correo'], impact: ['147 actividades · 38 tareas · 12 alertas (ejemplo del documento)'], openIn: { label: 'CRM en Odoo', to: '/odoo/crm' } },
  { id: 'odoo-rfq', title: 'Solicitud de oferta de repuestos', summary: 'Contacto resuelto, histórico consultado, oportunidad y presupuesto borrador en Odoo.', sector: 'Naval', departments: ['ventas', 'ofertas'], processes: ['Cotización'], agents: ['C01', 'C04', 'C05', 'C07'], tech: ['IA agentiva', 'RAG y grafo'], channel: 'email',
    client: { name: 'TÉCNICAS DEL MAR', photo: '/cases/puerto.jpg' }, slide: 36, input: ['Correo del cliente'], output: ['Oportunidad', 'Presupuesto borrador'], openIn: { label: 'ERP Odoo', to: '/odoo/bandeja' } },
  { id: 'odoo-order', title: 'Pedido por WhatsApp con referencia ambigua', summary: 'Mensaje informal: decisión humana sobre la referencia, stock insuficiente y entrega parcial.', sector: 'Transversal', departments: ['operaciones'], processes: ['Pedidos'], agents: ['C05', 'C07'], tech: ['IA agentiva'], channel: 'whatsapp',
    input: ['Mensaje de WhatsApp'], output: ['Pedido borrador', 'Entrega parcial'], openIn: { label: 'ERP Odoo', to: '/odoo/bandeja' } },
  { id: 'odoo-status', title: 'Consulta de estado de pedido', summary: 'Pedido, fabricación, albarán y transportista, con respuesta en borrador. Solo lectura.', sector: 'Transversal', departments: ['atencion'], processes: ['Postventa'], agents: ['C01', 'C06'], tech: ['IA agentiva', 'IA generativa'], channel: 'email',
    input: ['Correo del cliente'], output: ['Respuesta en borrador'], openIn: { label: 'ERP Odoo', to: '/odoo/bandeja' } },
  { id: 'odoo-pricing', title: 'Revisión de precio con motor de tarifas', summary: 'El cliente pide más descuento: coste por tramo, margen mínimo y nueva versión del presupuesto.', sector: 'Industria y fabricación', departments: ['finanzas', 'ventas'], processes: ['Tarifas y pricing'], agents: ['C02', 'C05', 'C06'], tech: ['IA agentiva'], channel: 'email',
    client: { name: 'GALPI', logo: '/brands/clients/galpi.png' }, slide: 31, input: ['Correo de negociación', 'Odoo + motor de tarifas'], output: ['Nueva versión del presupuesto'], impact: ['−65 % tiempo de preparación de ofertas', '+9 % margen medio'], openIn: { label: 'ERP Odoo', to: '/odoo/bandeja' } },
  // ── Recorridos nuevos ──
  { id: 'uc-correo-albaran', title: '¿Ha salido mi pedido? Respuesta con albarán', summary: 'El Agente de Correo entiende la intención, consulta el ERP y prepara la respuesta con el albarán adjunto.', sector: 'Transversal', departments: ['atencion', 'ventas'], processes: ['Postventa'], agents: ['C01', 'C06', 'C07'], tech: ['IA generativa', 'RAG y grafo'], channel: 'email',
    slide: 39, input: ['Correo del cliente (IMAP / Graph)'], output: ['Borrador con adjunto', 'Traza por conversación'], openIn: { label: 'Bandeja unificada', to: '/bandeja' } },
  { id: 'uc-rcfil-freight', title: 'Consulta de transporte convertida en reserva', summary: 'Clasifica la consulta, consulta tarifas de transportistas, elige la que cumple plazo y prepara reserva y respuesta.', sector: 'Logística y transporte', departments: ['ventas', 'operaciones'], processes: ['Cotización', 'Rutas y transporte'], agents: ['C01', 'C05', 'C04', 'C02'], tech: ['IA agentiva', 'IA generativa'], channel: 'email',
    client: { name: 'RCFIL', logo: '/brands/clients/rcfil.png', photo: '/cases/camiones.jpg' }, slide: 24, input: ['Solicitud de transporte', 'APIs de tarifas'], output: ['Reserva provisional', 'Respuesta', 'Registro en CRM y ERP'], impact: ['−65 % gestión de consultas', 'Captura 24/7'], openIn: { label: 'CRM en Odoo', to: '/odoo/crm' } },
  { id: 'uc-coplegal', title: 'Cotización desde el PDF del cliente', summary: 'Lee la petición, extrae material y cantidades, calcula cada línea con tarifas y tiempo estándar y la devuelve al ERP justificada.', sector: 'Industria y fabricación', departments: ['ofertas', 'ventas'], processes: ['Cotización'], agents: ['C02', 'C07', 'C06', 'C01'], tech: ['IA agentiva', 'OCR y visión', 'RAG y grafo'], channel: 'email',
    client: { name: 'COPLEGAL', logo: '/brands/clients/coplegal.png', photo: '/cases/mecanizado.jpg' }, slide: 23, input: ['PDF de petición', 'Tarifas e histórico'], output: ['Presupuesto en el ERP', 'Justificación por línea'], impact: ['−80 % ciclo de cotización', '−40 % errores manuales'], openIn: { label: 'Ofertas', to: '/fabricacion' } },
  { id: 'uc-ferri', title: 'Oferta técnica por analogía (6 especialistas)', summary: 'Reader → Parameters → Historical → Project → Estimating → Departures: de la especificación a la oferta lista para revisión.', sector: 'Industria y fabricación', departments: ['ofertas'], processes: ['Cotización', 'Estimación de costes'], agents: ['C02', 'C07', 'C06', 'C08'], tech: ['IA agentiva', 'RAG y grafo', 'Machine Learning'], channel: 'email',
    client: { name: 'FERRI', logo: '/brands/clients/ferri.png', photo: '/cases/naval.jpg' }, slide: 25, input: ['Especificación técnica', 'Proyectos históricos del ERP'], output: ['Horas y coste por partida', 'Desviaciones y riesgos'], impact: ['−70 % tiempo de preparación', '−40 % variabilidad'], openIn: { label: 'Conocimiento', to: '/conocimiento' } },
  { id: 'uc-regenasa', title: 'Revisión de plano: cambios y memorando', summary: 'Detecta la versión, compara revisiones, completa el plano incompleto con histórico naval y redacta el memorando técnico.', sector: 'Naval', departments: ['ofertas', 'calidad'], processes: ['Cotización', 'Control de versiones'], agents: ['C02', 'C07', 'C01', 'C08'], tech: ['IA agentiva', 'IA generativa', 'RAG y grafo'], channel: 'email',
    client: { name: 'REGENASA', logo: '/brands/clients/regenasa.png', photo: '/cases/naval.jpg' }, slide: 26, input: ['Planos DWG/PDF', 'Correos y especificaciones'], output: ['Diferencias de versión', 'Memorando técnico'], impact: ['−55 % ciclo de oferta', 'Cero desajustes de versión'], openIn: { label: 'Piezas y planos', to: '/piezas' } },
  { id: 'uc-pedido-email', title: 'Pedido por correo con incidencia de stock', summary: 'Interpreta el pedido escrito a mano, aplica el patrón del cliente, cruza stock y deja el pedido en borrador con entrega parcial.', sector: 'Industria y fabricación', departments: ['operaciones'], processes: ['Pedidos'], agents: ['C05', 'C07', 'C08', 'C01'], tech: ['IA agentiva', 'IA generativa'], channel: 'email',
    client: { name: 'PROMEGA', logo: '/brands/clients/promega.png' }, slide: 47, input: ['Correo de pedido'], output: ['Pedido en Odoo (borrador)', 'Incidencia de stock', 'Aviso al cliente'], openIn: { label: 'Ventas en Odoo', to: '/odoo/ventas' } },
  { id: 'uc-aspol', title: 'Carga 3D, rutas y CMR pre-validados', summary: 'De los pedidos de Odoo a rutas por zona, palés colocados en el camión y documentos revisados antes de emitir.', sector: 'Logística y transporte', departments: ['operaciones', 'finanzas'], processes: ['Rutas y transporte', 'Expedición y documentos'], agents: ['C05', 'C06', 'C07'], tech: ['Optimización', 'IA agentiva'], channel: 'erp',
    client: { name: 'ASPOL', logo: '/brands/clients/aspol.png', photo: '/cases/camiones.jpg' }, slide: 34, input: ['Pedidos de Odoo', 'Flota y capacidades'], output: ['Rutas VRP', 'Plan de carga', 'Albaranes y CMR'], impact: ['Menos viajes y costes', 'Cero errores administrativos'], openIn: { label: 'Inventario en Odoo', to: '/odoo/inventario' } },
  { id: 'uc-ucalsa', title: 'Plan de producción y pedido urgente', summary: 'Tiempos aprendidos del ERP, plan viable automático y simulación de escenarios ante una urgencia.', sector: 'Cadena de frío y alimentación', departments: ['operaciones', 'calidad'], processes: ['Planificación', 'Estimación de tiempos'], agents: ['C05', 'C07', 'C06'], tech: ['Machine Learning', 'Optimización'], channel: 'email',
    client: { name: 'UCALSA', logo: '/brands/clients/ucalsa.png' }, slide: 30, input: ['Histórico del ERP', 'Pedidos y capacidades'], output: ['Plan semanal', 'Escenarios comparados'], impact: ['Mayor adherencia al plan', 'Menos Excel'], openIn: { label: 'Recursos y carga', to: '/recursos' } },
  { id: 'uc-frioteis', title: 'Recepción manos libres en cámara', summary: 'Recepción dictada por voz, etiquetas leídas con visión + OCR, entradas en WMS y previsión energética por cámara.', sector: 'Cadena de frío y alimentación', departments: ['operaciones', 'calidad'], processes: ['Recepción de almacén', 'Energía'], agents: ['C03', 'C05', 'C06', 'C07', 'C08'], tech: ['Voz', 'OCR y visión', 'Machine Learning'], channel: 'voz',
    client: { name: 'FRIOTEIS', logo: '/brands/clients/frioteis.png', photo: '/cases/almacen-frio.jpg' }, slide: 33, input: ['Voz del operario', 'Etiquetas', 'Sondas e IoT'], output: ['Entradas en WMS', 'Alertas de temperatura', 'Previsión de consumo'], impact: ['3× recepción más rápida', '10–20 % ahorro energético'], openIn: { label: 'Inventario en Odoo', to: '/odoo/inventario' } },
  { id: 'uc-averia-voz', title: 'Llamada de avería con traspaso al técnico', summary: 'El Agente de Voz atiende fuera de horario, estructura la avería, consulta el contrato y pasa al técnico con contexto.', sector: 'Cadena de frío y alimentación', departments: ['atencion'], processes: ['Atención telefónica', 'Postventa'], agents: ['C03', 'C07', 'C04'], tech: ['Voz', 'RAG y grafo'], channel: 'llamada',
    slide: 43, input: ['Llamada por extensión SIP'], output: ['Ticket estructurado', 'Traspaso con contexto', 'Métricas'], openIn: { label: 'Bandeja unificada', to: '/bandeja' } },
  { id: 'uc-sigi-cau', title: 'CAU hospitalario en tiempo real', summary: 'Analiza la llamada entre usuario clínico y operador, estructura la incidencia y la da de alta por API, sin guardar audio.', sector: 'Salud', departments: ['atencion'], processes: ['Atención telefónica', 'Incidencias'], agents: ['C03', 'C08', 'C04'], tech: ['Voz', 'IA agentiva'], channel: 'llamada',
    client: { name: 'SIGI · SERGAS', logo: '/brands/clients/sergas.png', photo: '/cases/hospital.jpg' }, slide: 32, input: ['Llamada al CAU'], output: ['Incidencia clasificada', 'Sugerencia al operador'], impact: ['Tiempo real', 'Sin almacenamiento de audio'] },
  { id: 'uc-nc-voz', title: 'No conformidad dictada en el muelle', summary: 'El operario reporta por voz, se bloquea el lote, se cita la norma aplicable y se abre la NC con SLA.', sector: 'Cadena de frío y alimentación', departments: ['calidad'], processes: ['Incidencias', 'Normativa'], agents: ['C03', 'C08', 'C07'], tech: ['Voz', 'RAG y grafo', 'IA agentiva'], channel: 'voz',
    slide: 19, input: ['Reporte de voz', 'Sonda de temperatura'], output: ['NC clasificada', 'Normativa citada', 'Informe de calidad'], openIn: { label: 'Aprobaciones', to: '/aprobaciones' } },
  { id: 'uc-emision', title: 'Control de calidad de emisión', summary: 'Escucha la emisión, detecta silencios, cortes y saturación y solo deja al operador los incidentes.', sector: 'Medios', departments: ['calidad'], processes: ['Incidencias', 'Control de calidad'], agents: ['C03', 'C08', 'C06', 'C04'], tech: ['Voz', 'Machine Learning'], channel: 'sistema',
    client: { name: 'Radio Vigo · PRISA', logo: '/brands/clients/radiovigo.png', photo: '/cases/radio.jpg' }, slide: 28, input: ['Grabación de emisión'], output: ['Incidentes marcados', 'Excel y Odoo'], impact: ['Revisión solo de incidentes', 'Criterio homogéneo'] },
  { id: 'uc-regulacion', title: 'Impacto de un cambio normativo', summary: 'RAG + grafo: de la norma a los productos y ofertas afectados, con lagunas detectadas y citas auditables.', sector: 'Naval', departments: ['calidad', 'ofertas'], processes: ['Normativa'], agents: ['C07', 'C08', 'C02'], tech: ['RAG y grafo', 'IA generativa'], channel: 'chat',
    client: { name: 'NAUTIA', photo: '/cases/puerto.jpg' }, slide: 35, input: ['Pregunta en lenguaje natural', 'Documentación técnica y legal'], output: ['Análisis de impacto', 'Respuesta con fuentes'], openIn: { label: 'Conocimiento', to: '/conocimiento' } },
  { id: 'uc-conocimiento', title: '¿Qué controles antes de expedir?', summary: 'La documentación interna, consultable en lenguaje natural y con cita de documento y sección.', sector: 'Transversal', departments: ['calidad', 'operaciones', 'atencion'], processes: ['Normativa', 'Expedición y documentos'], agents: ['C07'], tech: ['RAG y grafo', 'IA generativa'], channel: 'chat',
    slide: 51, input: ['Pregunta del usuario'], output: ['Respuesta con citas', 'Lagunas documentales'], openIn: { label: 'Conocimiento', to: '/conocimiento' } },
  { id: 'uc-conciliacion', title: 'Albarán automático y conciliación del día', summary: 'Genera y envía el albarán al cerrar la expedición y concilia expedido contra facturado cada día.', sector: 'Industria y fabricación', departments: ['finanzas', 'operaciones'], processes: ['Expedición y documentos', 'Conciliación'], agents: ['C06', 'C05', 'C08'], tech: ['IA agentiva'], channel: 'erp',
    client: { name: 'GALPI', logo: '/brands/clients/galpi.png' }, slide: 49, input: ['Expedición cerrada en Odoo'], output: ['Albarán PDF / Excel / EDI', 'Conciliación diaria', 'Discrepancias escaladas'], openIn: { label: 'Inventario en Odoo', to: '/odoo/inventario' } },
];

export const PROCESSES = [...new Set(USE_CASES.flatMap((u) => u.processes))].sort((a, b) => a.localeCompare(b, 'es'));
export const deptById = (id: DeptId) => DEPARTMENTS.find((d) => d.id === id)!;
