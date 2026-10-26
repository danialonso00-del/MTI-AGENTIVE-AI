// Recorridos de Atención al cliente, Calidad y Conocimiento. Datos de ejemplo; números y personas ficticios.
import type { Flow } from '../flowTypes';

// ── C03 · llamada de avería AX-2204 ──
export const breakdownCallFlow: Flow = {
  id: 'uc-averia-voz', title: 'Llamada de avería atendida y traspasada', subtitle: 'El Agente de Voz atiende 24/7, estructura la avería y pasa al técnico con contexto', reference: 'C03 · Atención al cliente',
  finale: [{ label: 'Bandeja unificada', to: '/bandeja' }],
  steps: [
    { id: 'llamada', section: 'Centralita · SIP', title: 'Suena el teléfono a las 22:40', agents: ['C03'],
      narration: 'Fuera de horario. El Agente de Voz es una extensión más de la centralita actual: contesta en español o inglés.',
      visual: { kind: 'inbound', channel: 'call', from: '+34 600 000 214', subject: 'Línea de soporte técnico', body: '' } },
    { id: 'conversacion', section: 'Voz · en vivo', title: 'Conversación natural, datos estructurados', agents: ['C03', 'C07'],
      narration: 'Mientras habla, el agente transcribe, pregunta lo que falta y rellena la ficha de la avería. Consulta el contrato de la unidad en tiempo real.',
      visual: { kind: 'call', window: 'Llamada en curso · transcripción', caller: '+34 600 000 214',
        lines: [
          { who: 'cliente', text: 'Es la unidad AX-2204, lleva fallando desde ayer: la pantalla marca 28 °C.' },
          { who: 'agente', text: 'Entendido. ¿Está en la cámara de fresco o en la de congelado?' },
          { who: 'cliente', text: 'En la de fresco, la del muelle norte. Tenemos producto dentro.' },
          { who: 'agente', text: 'Su unidad tiene contrato con respuesta en 4 horas. Le paso ahora con el técnico de guardia, que ya tiene todos los datos.' },
        ],
        fields: [{ label: 'Unidad', value: 'AX-2204' }, { label: 'Síntoma', value: '28 °C (consigna 2 °C)' }, { label: 'Desde', value: 'Ayer' }, { label: 'Ubicación', value: 'Cámara fresco · muelle norte' }, { label: 'Prioridad', value: 'Alta · producto dentro' }],
        handoff: 'Traspaso al técnico de guardia con la transcripción y la ficha de la unidad: no tiene que volver a preguntar nada.' } },
    { id: 'ficha', section: 'Conocimiento', title: 'Lo que el técnico necesita saber', agents: ['C07'],
      narration: 'Reúne la ficha de la unidad, el contrato, las alarmas del manual y los avisos anteriores.',
      visual: { kind: 'cloud', center: 'Base de conocimiento', centerSub: 'equipos · contratos · manuales', query: 'AX-2204 · temperatura alta · cámara fresco',
        docs: [
          { id: 'eq', label: 'Ficha AX-2204', sub: 'Compresor semihermético · 2019', kind: 'product' },
          { id: 'ct', label: 'Contrato de mantenimiento', sub: 'Respuesta 4 h · 24/7', kind: 'order' },
          { id: 'man', label: 'Manual §7 · alarmas', sub: 'Alta temperatura: presostato', kind: 'norma' },
          { id: 'hist', label: 'Avisos anteriores', sub: '2 en 2026 · ventilador', kind: 'dataset' },
          { id: 'cli', label: 'Cliente', sub: 'Contacto de guardia', kind: 'partner' },
          { id: 'ax40', label: 'AX-2240', sub: 'Otra unidad', kind: 'product' },
        ], selected: ['eq', 'ct', 'man', 'hist', 'cli'], rejected: [{ id: 'ax40', reason: 'otra unidad' }], selectedTitle: 'Contexto del traspaso' } },
    { id: 'ticket', section: 'Registro', title: 'Ticket abierto y métricas', agents: ['C03', 'C04'],
      narration: 'Queda el ticket con la transcripción, el resumen y el reloj del contrato en marcha. En el panel se ven llamadas, tiempos y traspasos.',
      visual: { kind: 'output', window: 'Soporte · ticket de avería', recordTitle: 'AV-2026-0912 · AX-2204', badge: 'Técnico asignado',
        fields: [['Abierto', '22:43'], ['SLA', 'Respuesta antes de las 02:43'], ['Prioridad', 'Alta'], ['Canal', 'Teléfono · agente'], ['Traspaso', '22:44 · técnico de guardia'], ['Grabación', 'Según política del cliente']],
        side: { title: 'Resumen para el técnico', text: 'AX-2204 en cámara de fresco (muelle norte) a 28 °C desde ayer, con producto dentro. Dos avisos en 2026 por el ventilador del condensador. Manual §7: revisar presostato de alta y ventilador antes de cambiar de componente.' },
        final: 'Hasta cinco llamadas simultáneas en el caso base. Si algo no está claro, siempre pasa a una persona.' } },
  ],
};

// ── SIGI · CAU hospitalario en tiempo real ──
export const clinicalHelpdeskFlow: Flow = {
  id: 'uc-sigi-cau', title: 'CAU hospitalario: de la llamada a la incidencia', subtitle: 'Análisis de voz en tiempo real, sin guardar audio, con alta directa en el gestor de incidencias', reference: 'SIGI · Salud',
  steps: [
    { id: 'llamada', section: 'CAU · llamada', title: 'Llama una planta de hospitalización', agents: ['C03'],
      narration: 'El personal clínico llama al CAU. El agente escucha la conversación entre usuario y operador y ayuda en tiempo real.',
      visual: { kind: 'inbound', channel: 'call', from: 'Ext. 4312', subject: 'Planta 5 · Hospitalización (ejemplo)', body: '' } },
    { id: 'analisis', section: 'Voz · tiempo real', title: 'La incidencia se rellena mientras hablan', agents: ['C03', 'C08'],
      narration: 'Cada dato relevante pasa a la ficha al momento: servicio, equipo, síntoma e impacto clínico. El audio no se guarda.',
      visual: { kind: 'call', window: 'Asistente CAU · conversación en curso', caller: 'Ext. 4312 · Planta 5', labels: { cliente: 'Usuario clínico', agente: 'Operador del CAU' },
        privacy: 'Procesamiento efímero: el audio no se almacena. Solo se guarda el texto estructurado de la incidencia (RGPD).',
        lines: [
          { who: 'cliente', text: 'En el control de enfermería no imprime la impresora de pulseras de identificación.' },
          { who: 'agente', text: '¿Desde cuándo? ¿Les sale algún mensaje?' },
          { who: 'cliente', text: 'Desde el cambio de turno. Pone que hay trabajos en cola y no sale nada.' },
          { who: 'agente', text: 'Vale, abro la incidencia como prioritaria y la reviso ahora.' },
        ],
        fields: [{ label: 'Servicio', value: 'Hospitalización · planta 5' }, { label: 'Equipo', value: 'Impresora de pulseras' }, { label: 'Síntoma', value: 'Cola bloqueada, no imprime' }, { label: 'Impacto', value: 'Identificación de pacientes' }, { label: 'Categoría', value: 'Hardware · impresión' }, { label: 'Prioridad', value: 'Alta (asistencial)' }] } },
    { id: 'incidencia', section: 'Gestor de incidencias', title: 'Alta directa por API', agents: ['C08', 'C04'],
      narration: 'La incidencia se crea clasificada en el gestor del CAU. En la demo la integración es simulada; no hay conexión con ningún sistema real.',
      visual: { kind: 'output', window: 'Gestor de incidencias · integración simulada', recordTitle: 'INC-2026-048213', badge: 'Prioridad alta',
        fields: [['Servicio', 'Hospitalización · planta 5'], ['Categoría', 'Hardware · impresión'], ['Grupo', 'Soporte puesto clínico'], ['Duración llamada', '1 min 52 s'], ['Audio guardado', 'No'], ['Datos de pacientes', 'Ninguno']],
        side: { title: 'Sugerencia al operador', text: 'Procedimiento P-IMP-04: vaciar la cola de impresión del puesto y reiniciar el servicio de la impresora de pulseras. Si persiste, desplazar técnico: hay una impresora de reserva en la planta 4.' },
        final: 'Del habla al dato en tiempo real, sin persistir audio.' } },
  ],
};

// ── C08 · no conformidad por voz con normativa citada ──
export const qualityNcFlow: Flow = {
  id: 'uc-nc-voz', title: 'No conformidad dictada en el muelle', subtitle: 'Del reporte del operario a la NC clasificada, con normativa citada y SLA', reference: 'C08 · Calidad & Producción',
  finale: [{ label: 'Conocimiento', to: '/conocimiento' }, { label: 'Aprobaciones', to: '/aprobaciones' }],
  steps: [
    { id: 'reporte', section: 'Voz · reporte', title: 'El operario lo dice, no lo escribe', agents: ['C03', 'C08'],
      narration: 'En recepción, la sonda marca 6 °C en un lote de salmón fresco. El operario lo reporta hablando; el agente pregunta lo que falta.',
      visual: { kind: 'call', window: 'Reporte de calidad · muelle 1', caller: 'Auricular del operario', labels: { cliente: 'Operario de recepción', agente: 'Agente de Calidad · C08' },
        lines: [
          { who: 'cliente', text: 'Lote de salmón fresco del proveedor tres a seis grados en la sonda.' },
          { who: 'agente', text: 'Registro no conformidad. ¿Número de lote y cajas?' },
          { who: 'cliente', text: 'Lote S-8812, cuarenta cajas.' },
          { who: 'agente', text: 'Bloqueo el lote y aviso a Calidad. No lo ubiques todavía.' },
        ],
        fields: [{ label: 'Producto', value: 'Salmón fresco' }, { label: 'Lote', value: 'S-8812 · 40 cajas' }, { label: 'Medida', value: '6 °C en sonda' }, { label: 'Proveedor', value: 'Proveedor 3 (ficticio)' }] } },
    { id: 'norma', section: 'Conocimiento', title: 'Qué dice la norma', agents: ['C07'],
      narration: 'Busca qué requisito se incumple y dónde está escrito. La respuesta cita documento y sección.',
      visual: { kind: 'cloud', center: 'Normativa y procedimientos', centerSub: 'RAG + grafo', query: 'temperatura recepción pescado fresco · límite',
        docs: [
          { id: 'mc', label: 'Manual de calidad §6.3', sub: 'Pescado fresco: máx. 4 °C en recepción', kind: 'norma' },
          { id: 'ce', label: 'Reglamento (CE) 853/2004', sub: 'Anexo III, sección VIII', kind: 'norma' },
          { id: 'iso', label: 'ISO 22000 §8.9', sub: 'Control de no conformidades', kind: 'norma' },
          { id: 'prov', label: 'Proveedor 3', sub: '2 NC previas en 2026', kind: 'partner' },
          { id: 'pr', label: 'PR-REC-02', sub: 'Procedimiento de recepción', kind: 'dataset' },
          { id: 'cong', label: 'Manual §6.4', sub: 'Congelado', kind: 'norma' },
        ], selected: ['mc', 'ce', 'iso', 'prov', 'pr'], rejected: [{ id: 'cong', reason: 'aplica a congelado' }], selectedTitle: 'Requisitos aplicables',
        footer: 'Manual §6.3 es el documento interno de ejemplo; las referencias normativas indican dónde mirar, no sustituyen la revisión de Calidad.' } },
    { id: 'clasificar', section: 'Calidad · clasificación', title: 'Gravedad, responsable y plazo', agents: ['C08'],
      narration: 'Clasifica la NC por gravedad, asigna responsable y abre el flujo con SLA. Lo valida el responsable de Calidad.',
      where: { label: 'Aprobaciones', to: '/aprobaciones' },
      visual: { kind: 'decision', title: 'NC-2025-0418 · salmón fresco lote S-8812', by: 'responsable de Calidad',
        checks: [{ level: 'error', text: '6 °C medidos > 4 °C máximo (Manual §6.3)' }, { level: 'ok', text: 'Lote bloqueado en el WMS' }, { level: 'warning', text: 'Gravedad: mayor · 3.ª NC del proveedor en 2026' }, { level: 'ok', text: 'Responsable: Calidad · SLA 24 h' }],
        stamp: 'NC abierta', stampSub: 'SLA 24 h' } },
    { id: 'informe', section: 'Informe de calidad', title: 'El informe mensual se escribe solo', agents: ['C08', 'C06'],
      narration: 'Cada NC alimenta el informe de calidad. Se acabaron las horas de Excel a final de mes.',
      visual: { kind: 'bars', title: 'No conformidades del mes por causa', format: 'num', bars: [{ label: 'Temperatura en recepción', value: 7 }, { label: 'Etiquetado', value: 4 }, { label: 'Embalaje dañado', value: 3 }, { label: 'Documentación', value: 2 }],
        headline: { label: 'NC del mes', value: 16, format: 'num', sub: 'Proveedor 3 concentra 3 de temperatura' }, note: 'Datos de ejemplo.' } },
  ],
};

// ── PRISA · control de calidad de emisión ──
const LEVELS = Array.from({ length: 120 }, (_, i) => {
  if (i === 23) return -60;
  if (i === 61 || i === 62) return -58;
  if (i === 94) return -1;
  return -24 + Math.round(Math.sin(i * 1.7) * 7 + Math.cos(i * 0.43) * 5);
});

export const broadcastQaFlow: Flow = {
  id: 'uc-emision', title: 'Revisar solo los incidentes de la emisión', subtitle: 'Escucha la emisión, marca silencios, cortes y errores, y exporta', reference: 'Radio Vigo · Grupo PRISA',
  finale: [{ label: 'Analítica', to: '/analitica' }],
  steps: [
    { id: 'grabacion', section: 'Sistema de grabación', title: 'Una hora de emisión lista', agents: ['C03'],
      narration: 'El sistema de grabación entrega cada hora de emisión. Antes alguien tenía que escucharla entera.',
      visual: { kind: 'inbound', channel: 'system', from: 'Sistema de grabación', subject: 'Emisión 08:00–09:00 disponible', body: 'Programa matinal · 60 min · estéreo 48 kHz', meta: ['08:00–09:00', 'Programa matinal'] } },
    { id: 'escucha', section: 'Audio · análisis', title: 'El agente escucha y marca', agents: ['C03', 'C08'],
      narration: 'Segmenta el audio y detecta silencios, cortes de señal y saturación. Mismo criterio para todos los operadores.',
      visual: { kind: 'audio', window: 'Análisis de emisión · 08:00–09:00', levels: LEVELS, segmentS: 30,
        incidents: [{ at: 23, len: 1, label: 'Silencio de 9 s', tone: 'warn' }, { at: 61, len: 2, label: 'Corte de señal de 41 s', tone: 'err' }, { at: 94, len: 1, label: 'Saturación en locución', tone: 'warn' }] } },
    { id: 'revision', section: 'Revisión web', title: 'El operador revisa tres fragmentos', agents: ['C08'],
      narration: 'En la interfaz web el operador escucha solo los incidentes marcados, confirma o descarta y añade la causa.',
      visual: { kind: 'table', window: 'Revisión de incidentes · criterio homogéneo', columns: ['Hora', 'Tipo', 'Duración', 'Criterio', 'Revisión'],
        rows: [['08:11:30', 'Silencio', '9 s', '> 5 s sin señal', 'Confirmado · cambio de fuente'], ['08:30:30', 'Corte', '41 s', 'Pérdida de portadora', 'Confirmado · enlace'], ['08:47:00', 'Saturación', '3 s', '> −1 dBFS', 'Descartado · efecto sonoro']],
        tones: ['warn', 'err', null], note: 'Todo queda registrado: qué se marcó, quién lo revisó y qué decidió.' } },
    { id: 'export', section: 'Exportación', title: 'Excel y Odoo, sin copiar nada', agents: ['C06', 'C04'],
      narration: 'Los incidentes confirmados se exportan a Excel para el informe y a Odoo para su seguimiento.',
      visual: { kind: 'output', window: 'Exportación de incidentes', logo: '/brands/excel.svg', recordTitle: 'Informe de emisión · 08:00–09:00', badge: '2 confirmados',
        fields: [['Incidentes marcados', '3'], ['Confirmados', '2'], ['Descartados', '1'], ['Excel', 'Informe diario actualizado'], ['Odoo', 'Tarea para Técnica (enlace)'], ['Escucha manual', 'Solo 53 s de 60 min']],
        final: 'Cada corte marcado y registrado, sin escuchar la grabación completa.' } },
  ],
};

// ── NAUTIA · conocimiento y regulación ──
export const regulatoryFlow: Flow = {
  id: 'uc-regulacion', title: '¿A qué nos afecta este cambio normativo?', subtitle: 'RAG + grafo de conocimiento: respuesta con fuentes y análisis de impacto', reference: 'NAUTIA · Conocimiento y regulación',
  finale: [{ label: 'Conocimiento', to: '/conocimiento' }],
  steps: [
    { id: 'pregunta', section: 'Asistente', title: 'Una pregunta de negocio', agents: ['C07'],
      narration: 'La responsable de producto pregunta en lenguaje natural. El asistente responde según su rol y sus permisos.',
      where: { label: 'Conocimiento', to: '/conocimiento' },
      visual: { kind: 'inbound', channel: 'form', from: 'Responsable de producto', subject: 'Pregunta al asistente', body: '¿Qué productos y ofertas en curso se ven afectados por la actualización de requisitos de equipos marinos y qué tenemos que cambiar?', meta: ['Rol: producto', 'Colecciones: técnica, regulatoria, ofertas'] } },
    { id: 'grafo', section: 'RAG + grafo', title: 'Documentos y relaciones', agents: ['C07', 'C08'],
      narration: 'Combina búsqueda semántica y grafo: de la norma a los productos que la citan y a las ofertas que incluyen esos productos.',
      visual: { kind: 'cloud', center: 'Grafo de conocimiento', centerSub: 'normas → productos → ofertas', query: 'requisitos equipos marinos · actualización · impacto',
        docs: [
          { id: 'med', label: 'Directiva 2014/90/UE', sub: 'Equipos marinos', kind: 'norma' },
          { id: 'upd', label: 'Actualización de requisitos', sub: 'Documento de ejemplo', kind: 'norma' },
          { id: 'ln20', label: 'Luz de navegación LN-20', sub: 'Certificado módulo B', kind: 'product' },
          { id: 'ch150', label: 'Chaleco CH-150', sub: 'Certificado vigente', kind: 'product' },
          { id: 'of118', label: 'Oferta OF-2025-118', sub: 'Incluye LN-20', kind: 'order' },
          { id: 'pr', label: 'Procedimiento de marcado', sub: 'PR-MAR-03', kind: 'dataset' },
          { id: 'rrhh', label: 'Manual de RRHH', sub: 'Colección restringida', kind: 'dataset' },
        ], selected: ['med', 'upd', 'ln20', 'of118', 'pr'], rejected: [{ id: 'ch150', reason: 'no afectado por el cambio' }, { id: 'rrhh', reason: 'sin permiso para este rol' }], selectedTitle: 'Cadena de impacto' } },
    { id: 'impacto', section: 'Análisis de impacto', title: 'Qué cambia y dónde', agents: ['C08', 'C02'],
      narration: 'Lista productos, procesos y ofertas afectados, con la acción necesaria. También señala lagunas: no hay procedimiento para el nuevo ensayo.',
      visual: { kind: 'table', window: 'Análisis de impacto regulatorio (ejemplo)', columns: ['Elemento', 'Tipo', 'Acción', 'Prioridad'],
        rows: [['Luz LN-20', 'Producto', 'Renovar certificado con el nuevo ensayo', 'Alta'], ['OF-2025-118', 'Oferta en curso', 'Añadir cláusula de plazo de certificación', 'Alta'], ['PR-MAR-03', 'Procedimiento', 'Actualizar el marcado', 'Media'], ['Ensayo nuevo', 'Laguna documental', 'Crear procedimiento: no existe', 'Media'], ['Chaleco CH-150', 'Producto', 'Sin cambios', '—']],
        tones: ['err', 'err', 'warn', 'warn', 'ok'] } },
    { id: 'respuesta', section: 'Respuesta', title: 'Respuesta con citas auditables', agents: ['C07'],
      narration: 'La respuesta enlaza cada afirmación a su documento y sección. Compliance proactivo, no una búsqueda a ciegas.',
      visual: { kind: 'output', window: 'Asistente de conocimiento', recordTitle: 'Respuesta con fuentes', badge: '4 fuentes',
        fields: [['①', 'Directiva 2014/90/UE'], ['②', 'Actualización de requisitos (ejemplo)'], ['③', 'Ficha LN-20 · certificado'], ['④', 'OF-2025-118 · línea 3']],
        side: { title: 'Respuesta', text: 'Afecta a la luz de navegación LN-20 ①② (su certificado debe renovarse con el nuevo ensayo ③) y a la oferta OF-2025-118, que la incluye ④. Recomiendo añadir a esa oferta una cláusula sobre el plazo de certificación. No existe procedimiento interno para el nuevo ensayo: es una laguna documental.' },
        final: 'Ejemplo ilustrativo: el contenido de la actualización es ficticio.' } },
  ],
};

// ── C07 · controles antes de expedir ──
export const knowledgeQaFlow: Flow = {
  id: 'uc-conocimiento', title: '¿Qué controles hay que hacer antes de expedir?', subtitle: 'Documentación interna consultable en lenguaje natural, con citas', reference: 'C07 · Conocimiento',
  finale: [{ label: 'Conocimiento', to: '/conocimiento' }],
  steps: [
    { id: 'pregunta', section: 'Asistente · chat', title: 'Pregunta desde el almacén', agents: ['C07'],
      narration: 'Un encargado nuevo pregunta desde la extensión del navegador. No sabe en qué manual está.',
      where: { label: 'Conocimiento', to: '/conocimiento' },
      visual: { kind: 'inbound', channel: 'form', from: 'Encargado de expediciones', subject: 'Pregunta', body: '¿Qué controles hay que hacer antes de expedir producto refrigerado y qué normativa los exige?' } },
    { id: 'buscar', section: 'Retrieval híbrido', title: 'Vectorial + grafo', agents: ['C07'],
      narration: 'Busca por significado y sigue las relaciones entre documentos. Solo usa colecciones a las que este usuario tiene acceso.',
      visual: { kind: 'cloud', center: 'Documentación interna', centerSub: 'manuales · normas · procedimientos', query: 'controles previos a la expedición · refrigerado',
        docs: [
          { id: 'mc42', label: 'Manual de calidad §4.2', sub: 'Expedición', kind: 'norma' },
          { id: 'iso', label: 'ISO 22000 §8.5.4', sub: 'Plan de control de peligros', kind: 'norma' },
          { id: 'ce', label: 'Reglamento (CE) 853/2004', sub: 'Anexo III', kind: 'norma' },
          { id: 'hoja', label: 'Hoja de carga F-EXP-01', sub: 'Firma del responsable', kind: 'dataset' },
          { id: 'rec', label: 'Manual §3.1', sub: 'Recepción', kind: 'norma' },
          { id: 'old', label: 'Manual de calidad 2021', sub: 'Versión anulada', kind: 'norma' },
        ], selected: ['mc42', 'iso', 'ce', 'hoja'], rejected: [{ id: 'rec', reason: 'trata la recepción' }, { id: 'old', reason: 'versión anulada' }], selectedTitle: 'Fuentes de la respuesta' } },
    { id: 'respuesta', section: 'Respuesta', title: 'Respuesta corta, con fuentes', agents: ['C07'],
      narration: 'Responde en tres frases y cita documento y sección. Si falta algo en la documentación, lo dice.',
      visual: { kind: 'output', window: 'Asistente de conocimiento', recordTitle: 'Controles antes de expedir', badge: '4 fuentes',
        fields: [['①', 'Manual de calidad §4.2'], ['②', 'ISO 22000 §8.5.4'], ['③', 'Reglamento (CE) 853/2004 · Anexo III'], ['④', 'Hoja de carga F-EXP-01']],
        side: { title: 'Respuesta', text: 'Cámara y vehículo a 4 °C o menos ①③. Verificación visual del producto y del precinto antes del cierre ①②. Firma del responsable en la hoja de carga ④. Laguna detectada: no hay procedimiento para expediciones en festivo.' },
        final: 'Manual §4.2 y F-EXP-01 son documentos internos de ejemplo.' } },
  ],
};
