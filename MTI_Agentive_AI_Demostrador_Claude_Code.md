# MTI Agentive AI — Especificación y prompt de construcción para Claude Code

Fecha de investigación: 5 de octubre de 2026. Idioma de la aplicación: español, con estructura preparada para inglés.

## 0. Instrucción de ejecución

Claude Code: construye una aplicación web funcional siguiendo este documento. El resultado debe poder ejecutarse localmente y utilizarse en una reunión comercial sin cuentas externas. Implementa los dos recorridos principales completos y después amplía los casos secundarios. No te detengas en un plan, una landing, un conjunto de tarjetas ni un diagrama decorativo. Cada paso debe producir un resultado visible y consultable.

Antes de editar, inspecciona el repositorio y sus instrucciones. Aprovecha el stack y componentes existentes cuando sean compatibles. Si partes de cero, utiliza la arquitectura sugerida aquí. Consulta la presentación `MTi_Group_IA_Agentiva_v.02.pdf` si está disponible en el proyecto, incluida una posible carpeta `public`. La presentación fundamenta los casos y agentes; este documento define una nueva experiencia de software, sin reproducir las diapositivas.

Avanza con los supuestos explícitos de este documento. No necesitas credenciales para terminar el modo demo. Documenta cualquier integración pendiente y entrega README, código ejecutable, fixtures, instrucciones y pruebas de los recorridos principales. No publiques ni conectes sistemas de producción como parte de esta construcción.

## 1. Objetivo de producto

Crear **MTI Agentive AI Studio**, un demostrador interactivo de soluciones de IA generativa, IA agentiva y Machine Learning de MTI. Debe permitir ver cómo entran los datos de un cliente, qué agentes intervienen, qué fuentes consultan, cómo calculan y qué documentos o registros entregan.

Prioridades:

1. **Estimación de tiempos de fabricación desde correo, planos y CAD**, inspirada en GALMETEC y PROMEGA. Es el recorrido estrella; dedicar aproximadamente el 60% del esfuerzo visual y funcional.
2. **Operaciones inteligentes sobre Odoo**, inspiradas en TÉCNICAS DEL MAR y, para pricing, GALPI. Dedicar aproximadamente el 30%.
3. Catálogo extensible con otros casos reales de la presentación. El 10% restante introduce recorridos simplificados, utilizables y coherentes con el mismo motor.

La experiencia debe transmitir: plataformas propias, integración con sistemas empresariales, agentes especializados coordinados y componentes productivizados que se adaptan a datos y procesos de cada cliente.

El usuario debe entender en menos de 30 segundos qué problema se resuelve y poder completar una demo guiada en 4–6 minutos. Permitir también explorar libremente, editar inputs y comparar resultados.

## 1.1 Requisito central: software moderno, bonito y utilizable

Esta condición tiene prioridad sobre cualquier interpretación visual del resto del documento: **construir un software, con estética de producto SaaS premium y operaciones funcionales**. La experiencia debe dar la sensación de entrar en una herramienta profesional que podría usar un equipo de ingeniería o administración diariamente.

- Layout persistente de aplicación: sidebar, cabecera contextual, buscador, espacios de trabajo y panel de detalle. URLs/rutas navegables para solicitudes, estimaciones y registros; botón atrás y enlaces directos coherentes.
- Una bandeja con búsqueda, filtros, estados y selección abre expedientes reales del dataset. Cada expediente conserva adjuntos, estimaciones, actividad, versiones y aprobaciones.
- Tablas operativas con edición de cantidad, operaciones y tarifas; validación inmediata y guardar/cancelar. Los formularios modifican el estado persistente de la aplicación.
- El usuario puede crear una solicitud manual, añadir requisitos y parámetros, calcular, guardar una versión y exportar. No limitar el software a reproducir una única historia precargada.
- Si el usuario añade un archivo fuera de los fixtures, mostrar capacidad real de lectura o permitir completar datos manualmente. Subir un archivo no equivale a analizarlo.
- El ERP demo ofrece vistas de lista y detalle, relaciones entre cliente, oportunidad, presupuesto y pedido, y navegación entre ellos. Los registros creados permanecen disponibles al volver al workspace o recargar.
- La animación vive dentro del software: señales de actividad, recorrido del documento, cambios de estado, transiciones de panel y explicación del proceso. La tabla y el expediente siguen utilizables sin lanzar una animación.
- Modo «Trabajar» por defecto; modo «Demo guiada» opcional, sobre el mismo motor y datos. En el primero, ejecutar los pasos por acciones del usuario; en el segundo, reproducir la historia con controles de presentación.
- Diseñar estados hover/focus, microinteracciones, jerarquía tipográfica, vacíos y feedback de guardado con la misma calidad que la portada. Cada botón debe tener una función o un estado deshabilitado explicado.
- Evitar que la navegación dependa de scroll entre secciones. El dashboard abre módulos, los módulos contienen tareas y cada tarea genera resultados.

**Prueba de producto:** si se detiene todo el movimiento, el usuario aún puede buscar una solicitud, editar requisitos, recalcular, revisar fuentes, aprobar y abrir su presupuesto. Si esto falla, la entrega aún no cumple el objetivo.

## 2. Qué está comprobado y qué se propone

| Elemento | Base | Consecuencia |
|---|---|---|
| Identidad MTI | HTML y CSS públicos de mingothings.com revisados el 05/10/2026 | Utilizar Inter, navy y dorado de la web |
| Ocho agentes C01–C08 y casos | Presentación v.02, especialmente páginas 11–19, 22–35 y 38–53 | Mantener códigos y especialidades |
| Estimación GALMETEC | Página 26: PDF/DXF, STEP/IGES, heurísticas y ML correctivo con producción real | Mostrar reglas, evidencia e histórico; no atribuir todo al LLM |
| Estimación PROMEGA | Página 28: STEP y predicciones por operación | Visor, rasgos, histórico y desglose operacional |
| ERP TÉCNICAS DEL MAR | Página 35: Odoo ERP/CRM, correo, histórico y agentes operativos | Odoo será el núcleo de registros del segundo recorrido |
| Pricing GALPI | Página 30: Odoo + ARPA | ARPA será un adaptador pendiente/simulado hasta recibir especificación |
| APIs y hosting de Odoo | Documentación oficial indicada al final | Elegir transporte y alojamiento según versión y despliegue |
| Pantallas, cifras de fixtures, fórmulas y arquitectura | Propuesta de este documento | Son decisiones de diseño, no resultados reales de clientes |

No hay acceso al código productivo de MTI, históricos de fabricación, API de ARPA ni instancia Odoo del cliente. No declarar esas conexiones realizadas. Los indicadores de ahorro de la presentación no son métricas del demostrador. No copiar errores de texto del PDF ni completar frases truncadas inventando capacidades.

## 3. Diseño visual derivado de MTI

### 3.1 Tokens verificados

La home utiliza Inter y su CSS expone estas variables. Los valores siguientes son de la web, no una paleta inventada:

```css
:root {
  --gold: #e6a817;
  --gold-light: #f0bc3d;
  --gold-dark: #c8921a;
  --gold-muted: #e6a8171f;
  --navy: #0a0f1e;
  --navy-light: #111827;
  --navy-mid: #1a2438;
  --navy-border: #1e293b;
  --text-muted: #94a3b8;
  --text-secondary: #cbd5e1;
}
```

Fuente observada: `Inter, system-ui, sans-serif`, con pesos 300–900. Blanco y superficies claras también aparecen en la web y predominan en la presentación. Usar el dorado como señal de foco, acción y actividad del orquestador.

### 3.2 Adaptación propuesta para el producto

- Marco de navegación navy; escenario de flujo oscuro; paneles de documentos y tablas claros para legibilidad. Una estética empresarial tecnológica, con contraste y espacio.
- Tipografía Inter. Títulos 32–48 px en escritorio; texto 14–16 px; etiquetas 12–13 px. Monoespaciada exclusivamente para referencias y medidas.
- Retícula de 8 px; radios propuestos 12–18 px, bordes discretos, sombras contenidas. Evitar superficies de cristal que resten contraste al documento.
- Botón principal dorado con texto navy. No usar texto blanco pequeño sobre dorado ni dorado pequeño sobre blanco cuando no tenga contraste suficiente.
- Títulos breves: «De un plano a una oferta», «Tu ERP, trabajando contigo», «Cada operación, con su explicación».
- Fondos con retícula técnica tenue, líneas de conexión y luz dorada ambiental. Máximo una escena de partículas discreta; nunca detrás de texto pequeño.
- El área central debe ser grande y legible: el flujo ocupa aproximadamente el 55–65% de la anchura disponible; el inspector el resto. Evitar grafos minúsculos o encajados al fondo.
- Una cabecera compacta incluye logo MTI, nombre del escenario, modo, reinicio y controles de reproducción.
- Dashboard principal con dos protagonistas visuales: pieza industrial con su ruta de operaciones; bandeja + ERP con registros conectados. Los demás casos se muestran debajo.

Referencia de logo MTI observada: `https://www.mingothings.com/logo-mti.png`. Descargar una copia local si responde y verificarla visualmente. No reconstruir el logo mediante texto. Registrar origen en `asset-manifest.json`.

### 3.3 Movimiento con significado

- Animación de entrada de módulos: 200–350 ms. Cambio de foco: 250–400 ms. Tránsito de paquete: 600–1.200 ms. Valores propuestos, ajustables.
- Un paquete visual viaja desde correo hasta extracción, conocimiento, cálculo, revisión y Odoo. Lleva referencia de la solicitud; al llegar aparece el resultado real del paso.
- El nodo activo presenta un pulso dorado; el completado una marca verde y acceso a su resultado; un bloqueo cambia a ámbar y detiene el avance.
- Al seleccionar una operación, resaltar su zona en la pieza y la fila correspondiente. Si no hay asociación geométrica real, presentar la asociación como anotación de ejemplo.
- Una tabla puede incorporar filas progresivamente; sus valores deben venir del estado de ejecución. No mostrar porcentajes, logs o «IA pensando» independientes del trabajo.
- Modo guiado: play, pausa, siguiente, velocidad 0,5×/1×/2×, reinicio y replay. El replay reproduce el historial; no vuelve a ejecutar escrituras.
- `prefers-reduced-motion`: reemplazar movimiento por cambios de estado instantáneos y mantener toda la información.
- Modo reunión: ampliar escena y panel de resultado, ocultar controles técnicos, conservar estado demo y fuentes. Responsive: en móvil convertir el grafo en pasos verticales seleccionables.

## 4. Navegación y pantallas

Navegación principal: **Soluciones**, **Fabricación**, **Odoo**, **Ejecuciones**, **Integraciones**. Agentes accesibles desde el inspector y una vista de arquitectura, sin competir con los dos recorridos prioritarios.

| Pantalla | Elementos imprescindibles | Acción útil |
|---|---|---|
| Soluciones | Dos demos protagonistas, casos secundarios, CTA «Iniciar demo» | Abrir un escenario precargado |
| Workspace de fabricación | Bandeja, adjuntos, visor, flujo, inspector y resultados | Calcular, cambiar parámetros, comparar y aprobar |
| Workspace Odoo | Bandeja de solicitudes y vistas CRM/Ventas/Inventario/Fabricación | Preparar una acción y comprobar el registro resultante |
| Ejecuciones | Histórico por escenario, estado, fecha, evidencias | Reabrir y reproducir una ejecución |
| Integraciones | Logos, modo por conector, configuración y última prueba | Distinguir ejemplo, pendiente y conexión comprobada |

En desktop, usar navegación lateral compacta y pestañas dentro del workspace. No obligar a volver a la portada para pasar de email a resultado. El chat, si existe, acompaña el contexto; no será el producto completo.

## 5. Agentes: nomenclatura estable

El PDF usa variaciones de nombre por contexto. Normalizar así, manteniendo códigos:

| Código | Nombre en la aplicación | Responsabilidad |
|---|---|---|
| MTI | Orquestador | Clasificar intención, planificar, coordinar herramientas y solicitar revisión |
| C01 | Correo | Leer solicitudes y adjuntos, clasificar y preparar respuestas |
| C02 | Ofertas y licitaciones | Componer presupuestos y ofertas con cálculos y fuentes |
| C03 | Voz | Transcribir y estructurar conversaciones o reportes |
| C04 | CRM | Resolver contactos, oportunidades, actividades y seguimiento |
| C05 | Pedidos | Estructurar solicitudes y preparar operaciones de pedidos |
| C06 | Documentos y logística | Albaranes, validación documental y salidas logísticas |
| C07 | Conocimiento | Recuperar históricos y documentación con referencias |
| C08 | Calidad | Comprobar consistencia, incertidumbre e incidencias |

En fabricación añadir herramientas especialistas «Lectura CAD», «Extracción técnica», «Motor de tiempos» y «ML correctivo». Son herramientas coordinadas por agentes, no nuevos códigos productivizados. Mostrar los ocho agentes en la vista global; en una ejecución enfocar los que participan y atenuar los demás.

## 6. Recorrido estrella: estimación industrial

### 6.1 Historia y fixtures

Empresa ficticia: Talleres Delta. Cliente ficticio: Marina Norte. Emails con dominio `.example`; ninguna persona real.

Solicitud RFQ-2026-0042: 50 soportes mecanizados en aluminio 6082-T6; plano revisión B, modelo STEP y hoja de requisitos. Añadir otra solicitud incompleta y una revisión C para mostrar adaptación y bloqueos.

Fixtures locales coherentes:

- Email y cadena de seguimiento.
- PDF técnico de ejemplo con cotas, material, revisión y notas identificables.
- Modelo 3D local de soporte con cuatro taladros y un bolsillo. Preferir GLB para visualización inmediata; etiquetar «modelo de ejemplo» si representa un STEP mediante conversión precalculada.
- Archivos STEP/DXF solo si se generan o se obtienen válidamente. No crear archivos falsos cambiando extensiones.
- Diez o más trabajos históricos sintéticos con geometría, material, máquina, cantidades, operaciones y tiempos reales sintéticos. Al menos tres comparables y dos descartados con motivo.
- Catálogo de máquinas y tarifas de ejemplo; versión y fecha de cada dataset.

### 6.2 Secuencia de ejecución

1. **Entrada — C01**: seleccionar email; abrir adjuntos; extraer cantidad, material, tolerancias, acabado, revisión y fecha solicitada. Cada campo tiene fuente y estado: extraído, confirmado, supuesto o ausente.
2. **Clasificación — Orquestador**: intención «solicitud de oferta de fabricación», plan visible y especialistas seleccionados.
3. **Lectura técnica — herramienta CAD/OCR**: mostrar pieza, dimensiones, volumen si disponible, taladros, bolsillo y complejidad. Identificar contradicciones entre plano, modelo y email. Material y tolerancias no deben deducirse únicamente de la forma geométrica.
4. **Histórico — C07**: recuperar tres trabajos similares; mostrar tabla comparativa y motivo de similitud. Excluir trabajos de otra familia de proceso cuando no sean transferibles.
5. **Estimación — motor + C08**: construir operaciones, tiempos base y correcciones. Presentar origen y supuestos por fila.
6. **Oferta — C02**: traducir tiempos aprobados y tarifas a coste/precio; generar borrador, nunca asumir que minutos equivalen a precio por sí solos.
7. **Revisión humana**: revisar incertidumbres, editar operación, dejar comentario y aprobar una versión exacta.
8. **Salida**: descargar informe y CSV, preparar respuesta y crear presupuesto en Odoo demo. Abrir el registro recién creado.

Mostrar el paso actual y su entregable simultáneamente. Al clicar un nodo, abrir input, output, fuente, duración y herramientas utilizadas.

### 6.3 Estimación comprobable

Para el fixture, usar este cálculo determinista. Todas las cifras son ficticias y sirven para demostrar relaciones:

| Operación | Preparación por lote (min) | Ciclo base por pieza (min) | Corrección fixture | Ciclo corregido (min) |
|---|---:|---:|---:|---:|
| Corte del bruto | 10 | 0,8 | 1,00 | 0,80 |
| Fresado exterior | 20 | 3,2 | 1,10 | 3,52 |
| Bolsillo | 15 | 4,5 | 1,08 | 4,86 |
| Taladrado | 10 | 1,8 | 1,05 | 1,89 |
| Desbarbado | 5 | 1,2 | 1,00 | 1,20 |
| Inspección | 10 | 1,0 | 1,00 | 1,00 |
| **Total** | **70** | **12,5** | — | **13,27** |

```text
T_base_lote = preparación_total + cantidad × ciclo_base_total
T_estimado_lote = preparación_total + cantidad × ciclo_corregido_total
Para 50 piezas: T_base = 695 min; T_estimado = 733,5 min = 12,225 h
Tiempo imputado por pieza = 733,5 / 50 = 14,67 min
```

Los factores son una simulación del corrector; no un modelo entrenado. Una banda ilustrativa ±15% daría 623,475–843,525 min. Etiquetarla «banda de escenario de ejemplo», no intervalo estadístico calibrado. Mantener precisión interna y redondear solo al presentar.

El coste de transformación usa tiempos y tarifa por operación/centro. Añadir material, subcontratación e indirectos de forma explícita. Si se usa margen sobre venta `m`, `precio = coste / (1 - m)`; si se usa recargo, `precio = coste × (1 + r)`. Mostrar qué regla está seleccionada y excluir IVA del margen.

Separar tres conceptos: tiempo de máquina, horas de trabajo humano y plazo calendario. No sumar preparación, mano de obra y ocupación de máquina sin aclarar solapes. La demo anterior usa una ruta serial simplificada de minutos de proceso; no pretende reproducir la planificación avanzada de Odoo. El plazo depende también de carga, disponibilidad de material, turnos y precedencias.

### 6.4 Interacciones obligatorias

- Cambiar lote de 50 a 100: nueva estimación 1.397 min, sin duplicar preparación; nueva comparación y precio.
- Cambiar aluminio a acero: aplicar una tabla de parámetros fixture documentada, invalidar aprobación y recalcular. No inventar un factor universal para todos los procesos.
- Desactivar una máquina: proponer alternativa o bloquear si no existe capacidad válida.
- Correo sin material: estado «Requiere dato», pregunta en borrador; no completar con una suposición silenciosa.
- Rev. C recibida: conservar rev. B, comparar cambios y abrir nueva versión de estimación.
- Ajustar una operación manualmente: conservar resultado previo y motivo; recalcular dependencias.
- Ver histórico, origen de campos y evidencia al seleccionar un valor.
- Aprobar: fijar hash/version de inputs y cálculo. Cualquier edición posterior invalida la aprobación.

### 6.5 Qué hace cada tecnología

| Capa | Función | Límite |
|---|---|---|
| IA generativa | Interpretar peticiones, estructurar campos y redactar explicación/respuesta | No mide geometría ni inventa tiempos fiables |
| CAD/OCR | Leer geometría o texto/cotas cuando el formato lo permite | Geometría no determina por sí sola proceso, material o estrategia |
| Reglas de proceso | Cálculos explícitos y unidades consistentes | Necesitan parámetros validados por fabricación |
| ML tradicional | Corregir o predecir tiempos desde históricos etiquetados | Necesita dataset y evaluación antes de afirmar precisión |
| IA agentiva | Coordinar lectura, búsqueda, cálculo y acciones | Ejecuta únicamente herramientas permitidas |
| Persona | Resolver ambigüedad y validar oferta | La decisión queda vinculada a una versión |

Integración CAD futura: worker Python con Open CASCADE u otra librería mantenida; convertir STEP a malla visual y extraer propiedades verificables. La documentación de Open CASCADE describe importación STEP y cálculo de propiedades geométricas [S8–S9]. Reconocer operaciones de mecanizado es trabajo adicional; no prometer que un importador STEP lo resuelve automáticamente.

Para ML futuro: separar entrenamiento y evaluación por pieza/familia y tiempo, evitar fuga de revisiones casi idénticas; comparar reglas e histórico con el modelo, medir MAE en minutos y error por familia/lote. Versionar parámetros y dataset. La confianza de extracción y el error de predicción son métricas diferentes.

## 7. Segundo recorrido: bandeja operativa + Odoo

### 7.1 Experiencia visible

Construir una bandeja MTI de solicitudes conectada conceptualmente a Odoo. «Bandeja MTI» no significa que Odoo disponga de un cliente de correo universal idéntico a Gmail. El correo puede llegar por Graph/Gmail al middleware o por alias de Odoo; se elige una sola ruta de ingestión por buzón para evitar duplicados.

Mostrar dos vistas sincronizadas:

- **Solicitud y agentes**: email, adjuntos, intención, campos, validaciones y acciones propuestas.
- **ERP**: contactos, oportunidades, presupuestos, pedidos, stock y fabricación con navegación coherente y registros que se puedan abrir.

La interfaz ERP será una representación MTI de datos Odoo. No afirmar que es una pantalla nativa. Añadir «Abrir en Odoo» únicamente cuando exista URL e ID reales. No depender de iframe: una instancia puede impedir incrustación o requerir otra sesión.

### 7.2 Escenarios principales

| Escenario | Input | Agentes | Resultado visible |
|---|---|---|---|
| Solicitud de oferta | Email RFQ con pieza y cantidad | C01, C04, C07, C02 | Contacto resuelto, oportunidad y presupuesto borrador |
| Pedido multicanal | Email con referencias y cantidades | C01, C05, C08 | Líneas normalizadas, stock y propuesta de pedido |
| Consulta de estado | «¿Ha salido mi pedido?» | C01, C07, C06 | Estado, entrega vinculada y respuesta en borrador |
| Pricing | Revisión de cantidad/descuento | C02, C05 | Recalcular precio y mostrar margen; ARPA simulado |

No confirmar pedidos ni emitir facturas automáticamente. En la demo, la confirmación explícita puede modificar únicamente los datos locales. En integración real, la primera escritura permitida es un presupuesto borrador aprobado.

### 7.3 Mapeo propuesto a modelos Odoo

Estos nombres son candidatos estándar. Comprobar campos, módulos, métodos y permisos en la instancia; no garantizarlos sin inspección.

| Objeto MTI | Modelo candidato | Uso |
|---|---|---|
| Cliente/contacto | `res.partner` | Resolver identidad sin duplicar empresas |
| Oportunidad | `crm.lead` | Pipeline y contexto comercial |
| Producto | `product.product`, `product.template` | Referencias, variantes y unidades |
| Presupuesto/pedido | `sale.order`, `sale.order.line` | Borrador, cantidades, precios y estado |
| Tarifa | `product.pricelist` | Política comercial de la instancia |
| Stock | `stock.quant` | Consulta contextual; no sustituye disponibilidad prometible |
| Entrega | `stock.picking`, `stock.move` | Expediciones y líneas vinculadas |
| Lista de materiales | `mrp.bom`, `mrp.bom.line` | Componentes y ruta según configuración |
| Centro/orden de trabajo | `mrp.workcenter`, `mrp.workorder` | Recursos y duraciones |
| Orden de fabricación | `mrp.production` | Producción e histórico operativo |
| Mensajes/adjuntos | `mail.message`, `ir.attachment` | Evidencia vinculada al registro |

Odoo documenta centros de trabajo con capacidad, eficiencia, costes y horarios [S4]. El cálculo del demostrador no debe aplicar de nuevo correcciones que ya estén incorporadas en las duraciones esperadas del ERP. Definir una convención de tiempo y probar el mapeo antes de escribir rutas de fabricación.

### 7.4 Implantación de Odoo: opciones

| Opción | Cuándo conviene | Condición |
|---|---|---|
| Demo local sin Odoo | Primera entrega y reuniones | Adapter con datos sintéticos persistentes y mismas interfaces |
| Odoo Online + middleware | Cliente ya usa SaaS y basta API externa | Confirmar acceso API en plan Custom; sin módulos Python propios en Online |
| Odoo.sh + middleware | Se necesitan módulos/operaciones de negocio propios | Suscripción, hosting y dependencias que validar |
| Odoo autogestionado | Control de infraestructura y código | Operar backups, actualizaciones y seguridad; comprobar edición y módulos |

La documentación comercial de la API sitúa el acceso externo en Custom, no en Standard/One App Free [S2]. No trasladar esa condición automáticamente a una instalación Community autogestionada: validar transporte y funcionalidades de la edición instalada. Odoo Online no permite módulos personalizados [S3]. Para este proyecto, **primero demo local; después sandbox conectado**. Si hacen falta métodos propios transaccionales, recomendar Odoo.sh o autogestión, según entorno del cliente. Es una recomendación de arquitectura, no una necesidad universal.

### 7.5 Contrato del conector

En Odoo 19, JSON-2 se documenta como API externa nueva: `POST /json/2/<model>/<method>`, API key Bearer y permisos habituales de Odoo. La documentación dinámica de la instancia ayuda a verificar métodos. Cada llamada tiene su propia transacción; varias llamadas no forman una transacción única [S1].

Para Odoo 18 o anterior, proporcionar un adaptador separado al transporte disponible, normalmente RPC, y no enviar JSON-2. No fijar una fecha de retirada de RPC; volver a comprobar la documentación al implementar.

Pseudoejemplo orientativo de lectura en Odoo 19; validar argumentos en la instancia:

```http
POST {ODOO_BASE_URL}/json/2/res.partner/search_read
Authorization: bearer {ODOO_API_KEY}
Content-Type: application/json
X-Odoo-Database: {ODOO_DATABASE}

{"domain": [["email", "=", "compras@marinanorte.example"]],
 "fields": ["id", "name", "email"], "limit": 10}
```

Mantener ese código y las credenciales en servidor. El encabezado de base depende del despliegue. Para varios candidatos, mostrar selección; no resolver una empresa solo por nombre o asociar a un contacto distinto por coincidencia parcial.

Interfaz propuesta independiente del transporte:

```ts
interface ErpAdapter {
  capabilities(): Promise<ErpCapabilities>;
  findCustomers(query: CustomerQuery): Promise<Customer[]>;
  getProducts(refs: string[]): Promise<Product[]>;
  getAvailability(query: AvailabilityQuery): Promise<Availability[]>;
  getOrderContext(orderRef: string): Promise<OrderContext>;
  getManufacturingHistory(query: HistoryQuery): Promise<HistoricalJob[]>;
  previewQuotation(input: QuotationInput): Promise<QuotationPreview>;
  createDraftQuotation(input: ApprovedQuotationInput): Promise<ErpRecordRef>;
}
```

Una escritura multietapa usa registro de operación y checkpoints. Si un módulo propio está permitido, implementar un método de negocio acotado que cree el presupuesto y sus líneas de forma transaccional con clave única de idempotencia. Si no lo está, reconciliar antes de reintentar y advertir internamente de operaciones parciales. Un campo de referencia libre por sí solo no garantiza unicidad bajo concurrencia.

Reintento tras timeout: buscar el resultado de la operación antes de crear otro. Aprobación y ejecución deben comprobar que inputs, versión y compañía siguen vigentes. Separar ERPCompanyID de identificadores locales. Respetar unidades, moneda, impuestos, variantes y permisos.

### 7.6 Ruta de implantación en cliente

1. Discovery: versión/edición, hosting, módulos, compañías, buzones, responsables, histórico, tarifas y proceso de aprobación.
2. Instancia de pruebas con datos anonimizados; usuario técnico de privilegios mínimos; probar lectura y resolución de identidades.
3. Validar equivalencias de campos, unidades y tiempos; acuerdos sobre qué calcula MTI y qué calcula Odoo.
4. Conectar correo en lectura y preparar propuestas, sin escrituras externas.
5. Habilitar únicamente creación de presupuesto borrador con revisión y reconciliación.
6. Piloto industrial contra estimaciones de expertos y tiempos observados; corregir reglas antes de automatizar.
7. Producción progresiva con métricas, alertas de fallos y proceso de recuperación. No prometer precisión ni plazo de implantación antes del discovery.

## 8. Catálogo de casos secundarios

La página 21 habla de catorce despliegues; no es necesario inventar un caso adicional para cuadrar el número. Mostrar los casos descritos y sus fuentes. Nombres de clientes sirven para identificar referencias de la presentación; los datos interactivos serán ficticios.

| Referencia / páginas | Caso | Mini recorrido implementable |
|---|---|---|
| COPLEGAL/COPEGAL, 22 | Configuración y cálculo de cotizaciones | Configuración → reglas → desglose → oferta |
| RCFIL, 23 | Logística y freight | Solicitud → tarifa fixture → pedido → respuesta |
| FERRI, 24 | Ofertas técnicas industriales | Requisitos → conocimiento → opciones → propuesta |
| REGENASA, 25 | Workspace de ofertas naval | Plano rev. A/B → diferencias → memo → oferta |
| UCALSA, 29 | Planificación de producción | Pedidos → capacidades → calendario → urgencia simulada |
| GALPI, 30 | Pricing Odoo + ARPA | Oferta → consulta fixture → margen → nueva versión |
| PRISA/Radio Vigo, 27 | Calidad de emisión | Timeline audio de ejemplo → incidencia → revisión |
| SIGI, 31 | Asistencia CAU en llamada | Transcripción ficticia → consulta documental → sugerencia |
| FRIOTEIS, 32 | Operaciones de almacén frío | Recepción → lote/temperatura → incidencia → documento |
| ASPOL, 33 | Carga, rutas y documentos | Cargas fixture → distribución ilustrativa → ruta → documentos |
| NAUTIA, 34 | Conocimiento y regulación | Pregunta → fragmentos fuente → respuesta citada |

Cada mini demo tiene input seleccionable, 3–5 pasos, output inspeccionable, reset y estado de simulación visible. SIGI no incorpora datos clínicos reales; PRISA no requiere capturar emisiones reales. ASPOL no anuncia una solución óptima VRP/3D si usa fixtures. Mantener cualquier afirmación de impacto como referencia del material, nunca como rendimiento medido por la aplicación.

## 9. Integraciones y logos reales

### 9.1 Prioridad de conectores

| Sistema | Lugar visual | Implementación inicial |
|---|---|---|
| Gmail | Nodo de entrada y selector de buzón | Fixture; adapter futuro Gmail API |
| Outlook/Microsoft 365 | Alternativa de correo | Fixture; adapter futuro Microsoft Graph |
| Odoo | Destino y workspace ERP | Adapter demo completo + estructura para sandbox |
| SharePoint/OneDrive/Drive | Repositorio documental | Fixtures; adapter pendiente |
| Excel/CSV/PDF | Inputs/outputs | Import/export real dentro del alcance implementado |
| STEP/DXF/IGES | Documentación técnica | Soporte y estado diferenciados por formato |
| SAP/Dynamics/SAGE | Ecosistema del catálogo | Visuales con estado «Pendiente» |
| HubSpot/Salesforce | Casos CRM secundarios | Visuales, sin declarar conexión |
| WhatsApp | Pedido multicanal | Fixture, no integración real hasta configurar API |
| ARPA | Pricing GALPI | Fixture y contrato pendiente |

Gmail ofrece lectura de mensajes/adjuntos y notificaciones `watch` [S6]; Graph ofrece seguimiento incremental de mensajes por carpeta mediante delta [S7]. La implementación futura debe persistir cursor, gestionar renovación/reintentos y deduplicar por identificador del proveedor. Alias Odoo es otra ruta de entrada [S5], no un servicio de IA por sí mismo.

### 9.2 Política de assets

- Usar logos oficiales obtenidos de las fuentes de marca o assets auténticos del PDF. No dibujar imitaciones ni sustituirlos por emojis.
- Respetar proporciones y colores. Dar un fondo neutro apropiado a logos oscuros. No aplicar tintes o filtros que destruyan la marca.
- Guardar logos en `public/brands/`; no depender de hotlinks ni servicios de favicons durante una reunión.
- `asset-manifest.json`: marca, ruta local, URL/página fuente, fecha, variante y estado de verificación.
- Si no se puede obtener un asset verificable, usar nombre de sistema en una placa neutral. No fingir que esa placa es el logo.
- Reservar logos de clientes para referencias; usar marcas de herramientas en el flujo. Su presencia no implica partnership o integración activa.
- Mostrar estado por conector: «Demo», «Pendiente de configurar», «Conectado a sandbox» o «Error». El estado conectado requiere una prueba exitosa.

## 10. Arquitectura propuesta

Usar el stack existente si permite estas capacidades. Para proyecto nuevo:

- Frontend: React + TypeScript; Next.js si se necesita servidor integrado, o Vite con backend separado si ya existe. Tailwind para tokens, Motion para animación, React Flow para grafo interactivo y Three.js/React Three Fiber para GLB. Fijar versiones compatibles al implementar, no instalar indiscriminadamente `latest`.
- Estado: máquina de estados tipada y eventos de ejecución; Zustand o equivalente. Grafo, inspector y resultados leen el mismo estado.
- Backend: TypeScript para conectores y acciones; worker Python opcional para CAD/ML. No cargar procesamiento STEP pesado en el hilo principal del navegador.
- Persistencia demo: IndexedDB o almacenamiento equivalente versionado; reset explícito. Persistencia sandbox: base transaccional de servidor y registro de operaciones.
- Eventos: replay determinista local; en ejecución backend, SSE o polling sobre estado persistido. Reconectar desde último evento.
- LLM: interfaz `LanguageModelAdapter` con proveedor configurable; credenciales en servidor y outputs validados contra esquema. No exigir LLM para ejecutar los fixtures.
- RAG: fixture con fragmentos y referencias locales en MVP; servicio de recuperación real intercambiable. Una coincidencia fixture no se llama búsqueda real en el repositorio del cliente.
- Informes: CSV descargable y PDF generado con contenido real del resultado. Puede usarse impresión a PDF bien diseñada si no se incorpora otra dependencia.

### 10.1 Contrato mínimo de datos

```ts
type ConnectorMode = 'demo' | 'sandbox';
type StepStatus = 'idle' | 'running' | 'completed' | 'needs_input' | 'failed';
type ProvenanceKind = 'source' | 'rule' | 'fixture' | 'model' | 'human';
interface Evidence {
  id: string; sourceId: string; locator: string;
  excerpt?: string; kind: ProvenanceKind;
}
interface RunEvent {
  eventId: string; runId: string; seq: number; stepId: string;
  status: StepStatus; timestamp: string; outputRef?: string;
}
interface OperationEstimate {
  id: string; name: string; setupMin: number; cycleMin: number;
  quantity: number; correctionFactor: number; totalMin: number;
  machineId: string; evidenceIds: string[]; assumptions: string[];
  method: 'rule' | 'fixture_correction' | 'trained_model' | 'manual';
}
interface EstimateVersion {
  id: string; requestId: string; revision: string; inputHash: string;
  quantity: number; operations: OperationEstimate[];
  assumptions: string[]; missingFields: string[];
  approval?: { approvedInputHash: string; approvedBy: string; approvedAt: string };
}
```

Implementar además `Request`, `Attachment`, `ExtractedField`, `HistoricalJob`, `Quotation`, `Approval`, `IntegrationConfig`, `ErpRecordRef`. IDs independientes, cantidades/unidades explícitas y `schemaVersion` para fixtures. Guardar hashes de archivos y revisión documental.

Estado de run: `received → extracting → retrieving → estimating → reviewing → approved → draft_created`. Ramas `needs_input`, `failed`, `cancelled`. «Pausa» del replay no cancela el backend. Aprobar no significa que la escritura haya terminado: debe existir un estado posterior confirmado por adapter.

### 10.2 Organización orientativa

```text
src/
  features/manufacturing/
  features/erp/
  features/catalog/
  components/flow/
  components/evidence/
  domain/
  adapters/demo/
  adapters/odoo/
  adapters/email/
  services/estimation/
  services/runs/
  fixtures/
public/
  brands/
  demo-assets/
docs/
  sources.md
  integration-odoo.md
  asset-manifest.json
```

Separar presentación, cálculo y conectores. Datos de escenarios declarativos; no escribir una nueva animación monolítica para cada caso.

## 11. Modos y funcionamiento sin credenciales

**Demo**: reproduce historias completas, calcula desde parámetros fixture y actualiza ERP local. Badge discreto persistente «Demo · datos de ejemplo». Los controles de presentación siguen funcionando sin red.

**Sandbox**: requiere configuración explícita y una instancia de pruebas. El adapter devuelve datos reales de esa instancia; las acciones aprobadas escriben solo en ella. Marcar qué conectores están activos, porque un run puede combinar correo fixture y ERP sandbox. No declarar toda la ejecución «real» si alguna etapa sigue simulada.

Subir un archivo desconocido en demo no puede producir la estimación del fixture como si se hubiese leído. Ofrecer «Solo vista previa», «Formato no soportado» o pedir los parámetros manuales. Si existe extractor real, indicar qué consiguió extraer y qué sigue sin soporte.

Configuración sugerida:

```dotenv
APP_MODE=demo
ODOO_TRANSPORT=json2
ODOO_BASE_URL=
ODOO_DATABASE=
ODOO_API_KEY=
LLM_PROVIDER=
LLM_API_KEY=
EMAIL_PROVIDER=fixture
```

No exponer secretos con prefijos públicos. `APP_MODE=sandbox` sin credenciales produce un aviso configurable, no un falso estado conectado.

## 12. Trazabilidad y límites de ejecución

- Cada valor relevante abre su fuente, regla o supuesto. Mostrar razones verificables y pasos de herramientas, no razonamiento interno del modelo.
- Documentos y emails son inputs; no pueden introducir nuevas herramientas, credenciales o instrucciones de escritura.
- Herramientas de escritura permitidas por lista explícita, con payload validado y aprobación vinculada a versión. No ejecutar SQL o métodos Odoo arbitrarios sugeridos por un LLM.
- Email saliente permanece en borrador hasta aprobación. La demo puede simular «Enviado» solo con etiqueta local clara.
- Exportaciones incluyen datos, revisión, supuestos y modo. Ningún KPI ficticio se presenta como logro real.
- Integración real: timeouts, límites, deduplicación y registro de fallos. Separar archivos por cliente/compañía y definir retención para el piloto.

## 13. Plan de implementación

### Fase A — Primera entrega comercial completa

Diseño MTI, assets, dashboard, escenario industrial completo, Odoo local funcional, fuentes, edición/recalculado, aprobación, CSV/informe, replay y persistencia. Debe funcionar offline después de cargar los recursos locales.

### Fase B — Ampliación del demostrador

Escenarios Odoo secundarios, catálogo de mini demos, comparación de revisiones, modo reunión y pulido de responsive/animaciones. Si los casos secundarios aún no tienen recorrido, mostrar su estado pendiente y no un botón sin efecto.

### Fase C — Sandbox real

Detección de capacidades, transporte Odoo validado, lectura y creación de borrador idempotente. Correo real opcional, un proveedor primero. No bloquear las fases A/B por credenciales.

### Fase D — Piloto industrial

Parser CAD, histórico real, calibración de reglas y evaluación de ML, según datos y procesos del cliente. Esta fase es trabajo adicional; el MVP no puede declarar su resultado realizado.

## 14. Criterios de aceptación

- [ ] `npm install` y comando documentado arrancan la aplicación sin secretos. Ajustar al gestor del repositorio.
- [ ] Logo MTI auténtico, Inter y tokens correctos; assets locales sin imágenes rotas.
- [ ] Escenario principal completo en 4–6 minutos con correo, adjuntos, pieza, fuentes, estimación y borrador ERP.
- [ ] El grafo central se lee a 1366×768 sin zoom manual; inspector y controles no se solapan.
- [ ] Cálculo fixture de 50 piezas = 733,5 min; 100 piezas = 1.397 min; preparación no duplicada.
- [ ] Cambios de inputs recalculan todos los resultados y anulan aprobación previa.
- [ ] Falta material → bloqueo explícito y pregunta; ninguna estimación silenciosa.
- [ ] Rev. C no sobreescribe rev. B; fuentes y resultado quedan asociados a la versión.
- [ ] Crear presupuesto actualiza el ERP local y permite abrirlo; replay no lo duplica.
- [ ] Logs, flujo y documentos reflejan un mismo estado y dataset.
- [ ] PDF/CSV contienen los mismos tiempos, cantidades, moneda y supuestos visibles.
- [ ] Logos y conectores indican modo realista; ARPA/SAP/etc. no se muestran conectados sin prueba.
- [ ] Archivo desconocido no recibe resultados fixture disfrazados de extracción real.
- [ ] Hay estados de carga, vacío, dato ausente, error y recuperación.
- [ ] Teclado, foco visible, contraste y reduced motion funcionan; móvil conserva recorrido completo.
- [ ] En modo Trabajar se puede crear una solicitud manual y completar el recorrido sin depender del tour.
- [ ] Búsqueda, filtros, guardar/cancelar, rutas y persistencia funcionan con los expedientes creados.
- [ ] Con animaciones desactivadas siguen disponibles todas las operaciones del software.
- [ ] El README distingue qué funciona localmente, qué conecta con sandbox y qué sigue pendiente.

Pruebas significativas: cálculo y unidades; invalidación de aprobación; E2E desde RFQ hasta borrador; ejecución incompleta; replay sin efectos externos; error de conector con reconciliación. Para sandbox, verificar timeout después de creación y reintento sin duplicación. Validación visual con capturas en 1440×900, 1366×768 y móvil, incluyendo la escena más densa.

## 15. Entrega esperada de Claude Code

Entregar código, assets y fixtures válidos, README de ejecución, `.env.example` sin secretos, documentación del adapter Odoo, fuentes/manifest de logos, capturas de ambos recorridos y resultados de pruebas. Explicar en pocas líneas qué funciona y qué necesita datos o credenciales del cliente.

La primera entrega debe sentirse como una herramienta MTI utilizable: entra una solicitud, el sistema produce una estimación explicable, la persona la revisa y el ERP recibe un borrador trazable.

## 16. Fuentes y comprobación

Fuentes consultadas el 05/10/2026. Los detalles de APIs, planes y versiones deben volver a verificarse al implementar. La web de Odoo devolvió timeouts al intentar abrir algunas páginas completas; las comprobaciones de esas páginas se apoyan en resultados indexados de la documentación oficial, no en una instancia funcionando. Los modelos y contratos del adapter son propuestas a validar.

- **Presentación**: `MTi_Group_IA_Agentiva_v.02.pdf`, 57 páginas con contenido. Prioridad: 26 GALMETEC, 28 PROMEGA, 30 GALPI y 35 TÉCNICAS DEL MAR; agentes en 11–19 y 38–53. La numeración es la página del PDF, no necesariamente el rótulo impreso.
- **[S0] MTI**: https://www.mingothings.com/ — HTML y CSS inspeccionados. CSS observado: https://www.mingothings.com/_next/static/chunks/0p5dbn9l.j-_..css (asset de build, su URL puede cambiar). Plataforma: https://www.mingothings.com/ai-agentiva . Tokens y fuente extraídos literalmente del CSS; propuesta de layout y tiempos de animación propia.
- **[S1] Odoo JSON-2**: https://www.odoo.com/documentation/19.0/developer/reference/external_api.html — transporte, autenticación y transacciones.
- **[S2] Odoo RPC y acceso comercial**: https://www.odoo.com/documentation/19.0/developer/reference/external_rpc_api.html — alternativa por versión y condición del plan.
- **[S3] Odoo Online**: https://www.odoo.com/documentation/19.0/administration/odoo_online.html — limitaciones de módulos personalizados. Apps FAQ: https://apps.odoo.com/apps/faq — módulos en Odoo.sh.
- **[S4] Odoo Manufacturing**: https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/advanced_configuration/using_work_centers.html — centros de trabajo, capacidad, eficiencia y horarios.
- **[S5] Odoo correo entrante**: https://www.odoo.com/documentation/19.0/applications/general/email_communication/email_servers_inbound.html — mensajes y alias. No define una IA de bandeja completa.
- **[S6] Gmail**: https://developers.google.com/workspace/gmail/api/reference/rest y https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages.attachments/get — mensajes, watch y descarga de adjuntos.
- **[S7] Microsoft Graph**: https://learn.microsoft.com/en-us/graph/api/message-delta?view=graph-rest-1.0 — sincronización incremental de mensajes por carpeta.
- **[S8] Open CASCADE STEP**: https://github.com/Open-Cascade-SAS/OCCT/blob/master/dox/user_guides/step/step.md — importación y representación STEP.
- **[S9] Open CASCADE propiedades**: https://occt3d.com/dev/doc/refman/html/class_b_rep_g_prop.html — propiedades geométricas. No es un estimador de tiempos de fabricación.

### Texto breve para iniciar el trabajo

> Construye MTI Agentive AI Studio siguiendo este archivo. Prioriza el recorrido de estimación de fabricación y el workspace Odoo. Empieza implementando una demo local completa y comprobable, con identidad MTI, animación ligada al estado, fuentes visibles y resultados editables. Conserva un contrato de adapters para conectar posteriormente un sandbox. Inspecciona primero el repositorio y la presentación disponibles, implementa hasta que los dos recorridos funcionen y verifica los criterios de aceptación.
