# MTI Agentive AI Studio

Demostrador interactivo de IA generativa, IA agentiva y Machine Learning de MTI. Muestra cómo entran los datos de un cliente, qué agentes intervienen, qué fuentes consultan, cómo calculan y qué registros entregan.

- **Recorrido estrella:** estimación de tiempos de fabricación desde correo, plano y CAD (inspirado en GALMETEC y PROMEGA).
- **Segundo recorrido:** bandeja operativa + workspace Odoo (inspirado en TÉCNICAS DEL MAR y, para pricing, GALPI).
- **Catálogo:** 11 mini recorridos de casos de la presentación v.02, con el mismo motor.

Todo funciona **en local, sin credenciales ni red**, con datos de ejemplo ficticios.

## Arranque

```bash
npm install
npm run dev          # http://localhost:5173
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm run preview` | Build de producción y previsualización (http://localhost:4173) |
| `npm test` | Pruebas unitarias y de dominio (Vitest): cálculo, unidades, aprobación, replay, idempotencia, adapters |
| `npm run test:e2e` | Pruebas E2E (Playwright) de los recorridos y capturas en `docs/screenshots/` |
| `npm run assets` | Regenera los PDF y DXF de ejemplo de `public/demo-assets/` |

Requisitos: Node 20+ (probado con Node 24). Para E2E: `npx playwright install chromium` si no hay navegadores instalados.

## Módulos de la solución

La barra lateral (plegable) agrupa los módulos en el mismo orden que cuenta la demo: entrada → documentos → conocimiento → oferta → revisión → ERP.

| Grupo | Módulo | Qué hace |
|---|---|---|
| Operaciones | **Panel** (`/`) | Indicadores en vivo, lo que requiere atención, actividad de agentes, flujo y carga |
| | **Bandeja** (`/bandeja`) | Entradas de correo, WhatsApp y alta manual unificadas; filtros, vista previa y procesado en lote |
| | **Ofertas** (`/fabricacion`) | Expedientes de fabricación: flujo, correo, pieza, histórico, estimación, oferta, versiones |
| | **Licitaciones** (`/licitaciones`) | Vigilancia de PLACSP y TED, filtrado por perfil (CPV, zona, importe, clasificación RD 773/2015, plazo), pliegos, mediciones contra la base de precios, coste, baja, Gantt y decisión GO/NO GO |
| | **Asistente comercial** (`/comercial`) | CRM por voz: dictado (Web Speech API) o notas de ejemplo → cliente, oportunidad, etapa, importe, riesgos y actividades con fecha para aprobar; agenda, embudo y ficha 360 |
| | **Aprobaciones** (`/aprobaciones`) | Cola de decisiones humanas (versiones de oferta y escrituras ERP) e historial |
| | **ERP Odoo** (`/odoo`) | Bandeja operativa y vistas CRM, Ventas, Contactos, Inventario y Fabricación |
| Ingeniería | **Piezas y planos** (`/piezas`) | Biblioteca técnica: revisiones, plano, modelo 3D, rasgos, descargas PDF/DXF |
| | **Conocimiento** (`/conocimiento`) | «Cerebro» consultable en vivo + histórico, reglas, materiales y documentos |
| | **Recursos y carga** (`/recursos`) | Máquinas y tarifas; carga semanal por centro a partir de las ofertas estimadas |
| Inteligencia | **Casos de uso** (`/casos`) | Biblioteca de 28 casos de la presentación v.02 con recorrido guiado: filtros por departamento, sector, proceso, agente y tecnología; vista por departamento (problema → orquestador + agentes → outputs) y ficha de cada caso |
| | **Agentes** (`/agentes`) | Estado, actividad y permisos de escritura de cada agente; arquitectura |
| | **Analítica** (`/analitica`) | Embudo, importes por cliente, tiempos y evaluación leave-one-out del corrector |
| | **Auditoría** (`/ejecuciones`) | Ejecuciones con eventos y replay sin escrituras |
| Plataforma | **Integraciones** · **Ajustes** | Conectores con estado real; perfil, parámetros comerciales por defecto, automatización, políticas, datasets, exportación |

La portada comercial anterior está en **Presentación** (`/presentacion`).

## Demo guiada (pantalla completa)

**Soluciones → «Iniciar demo»** abre el selector de escenarios (`/demo`):

| Escenario | Recorrido |
|---|---|
| De un plano a una oferta | Llega el email (notificación) → se analiza y se extraen campos → se abren los adjuntos y el plano → se extraen las medidas → **cerebro**: nube de documentos e histórico, comparables y descartados → cálculo de tiempos → oferta → aprobación → presupuesto en Odoo |
| Odoo · Solicitud de oferta | Correo → lectura → nube de registros Odoo (cliente, productos, histórico) → presupuesto → oportunidad y presupuesto creados |
| Odoo · Pedido por WhatsApp | Mensaje → referencia ambigua y decisión humana → stock insuficiente y entrega parcial → propuesta de pedido |
| Odoo · ¿Ha salido mi pedido? | Pedido → fabricación → albarán → transportista → respuesta en borrador (solo lectura) |
| Odoo · Revisión de precio con ARPA | Descuento pedido → coste ARPA simulado → margen mínimo → nueva versión del presupuesto |
| Licitación · Reurbanización de calle | Portal (PLACSP/TED) → filtro por perfil con motivos → pliegos → mediciones vs. base de precios → coste y baja → plazo → GO y documentación |
| Licitación · Rehabilitación energética | Igual, con un plan que no cabe en plazo: el agente detecta el camino crítico (SATE) y añade una segunda cuadrilla |
| CRM · Actualización por voz tras una visita | Dictado en el móvil → datos y riesgos → contexto CRM → cambios propuestos → Odoo actualizado → agenda |
| CRM · Nueva oportunidad dictada en una feria | Dictado → se crea la oportunidad con importe y la visita de la semana siguiente |
| CRM · Preparar una reunión | Recordatorio → nube de datos del cliente → ficha 360 → nota de voz al salir |

Además, **18 recorridos de los casos de la presentación** (en `/demo`, agrupados por departamento, y en la biblioteca `/casos`):

| Departamento | Recorridos |
|---|---|
| Ventas & Comercial | Oportunidades que se enfrían (C04) · Consulta de transporte → reserva (RCFIL) |
| Ofertas & Licitaciones | Cotización desde PDF (COPLEGAL) · Oferta por analogía con 6 especialistas (FERRI) · Revisión de plano y memorando (REGENASA) · Hoja de pre-cierre con go/no-go (C02) |
| Operaciones & Logística | Pedido por correo con incidencia de stock (C05) · Carga 3D, rutas VRP y CMR (ASPOL) · Plan de producción y pedido urgente (UCALSA) · Recepción manos libres, OCR y energía (FRIOTEIS) |
| Atención al Cliente | ¿Ha salido mi pedido? con albarán (C01) · Llamada de avería con traspaso (C03) · CAU hospitalario sin guardar audio (SIGI) |
| Calidad & Producción | No conformidad por voz con normativa citada (C08) · Control de calidad de emisión (Radio Vigo/PRISA) · Impacto de un cambio normativo (NAUTIA) · Controles antes de expedir (C07) |
| Administración & Finanzas | Albarán automático y conciliación del día (C06) |

Estos recorridos son declarativos (`src/features/demo/flows/`): cada escena es un visual tipado (entrada por canal, lectura, llamada, nube de conocimiento, cadena de especialistas, tabla, barras, planificación, rutas y carga, audio, decisión, registro) que anima un motor común (`flowScenes.tsx`). Los cálculos (rutas, tarifas, horas, totales) se hacen en el propio fichero de datos. No ejecutan escrituras: son ilustrativos y lo dicen.

En los escenarios principales, cada escena ejecuta el paso real del motor (no es un vídeo); al terminar se pueden abrir el expediente y los registros creados. Controles: Reproducir/Pausa (espacio), escena anterior/siguiente (← →), velocidad 0,5×/1×/2×, salir (Esc). Al iniciar, el ejemplo se restablece. Con «Movimiento reducido» cada escena aparece completa sin animación.

## Uso en modo Trabajar

En modo **Trabajar** todo se ejecuta con acciones del usuario: buscar y filtrar la bandeja, crear solicitudes manuales, confirmar campos, editar operaciones con motivo obligatorio, guardar versiones, aprobar, exportar CSV/PDF y crear el presupuesto. En **Estimación**: lote 100 (1.397 min, preparación no duplicada; la aprobación se anula), comparación de escenarios, máquinas desactivables. Menú «⋯» → **Simular llegada de Rev. C**. **Modo reunión** amplía la escena; **Ejecuciones** permite el replay sin repetir escrituras.

## Qué funciona, qué conecta y qué falta

| Ámbito | Estado |
|---|---|
| Motor de tiempos (reglas explícitas + corrector simulado con mediana real/regla de comparables) | **Funciona localmente.** Fixture: 50 uds = 733,5 min; 100 uds = 1.397 min |
| Costes y precio (transformación, material, subcontratación, indirectos; margen *o* recargo; IVA excluido) | Funciona localmente |
| Tiempo de máquina, horas humanas y plazo calendario orientativo, por separado | Funciona localmente (plazo indicativo, no planificación) |
| Versiones, aprobación por hash, invalidación automática, Rev. B → Rev. C, comparación | Funciona localmente |
| Evidencias por campo y operación (correo, plano, hoja de requisitos, datasets), contradicciones | Funciona localmente |
| Modelo 3D | Modelo **de ejemplo** paramétrico generado desde rasgos; no lee el STEP del cliente |
| Lectura de archivos subidos | **Real**: cabecera y entidades STEP, entidades/extensión DXF, CSV/texto. PDF/imagen: solo vista previa. IGES y otros: «Formato no soportado» |
| Exportaciones | CSV real; informe PDF real por impresión del navegador |
| ERP | **Adapter demo completo** con modelos candidatos Odoo, relaciones navegables, idempotencia y reconciliación tras timeout (simulable) |
| Odoo JSON-2 (Odoo 19) | Implementado y **probado contra fetch simulado**; **no** verificado con una instancia. Requiere middleware en servidor |
| Odoo RPC (≤ 18) | Pendiente |
| Gmail / Outlook / WhatsApp / SharePoint / Drive | Fixtures. Adapters pendientes |
| ARPA | Fixture de tramos de coste; contrato pendiente de especificación |
| SAP, Dynamics, Sage, HubSpot, Salesforce | Solo visuales, «Pendiente de configurar» |
| Voz | Dictado real con la Web Speech API del navegador (Chrome/Edge, es-ES; el audio lo procesa el servicio del navegador). Sin soporte: notas de ejemplo o texto. Interpretación determinista y explicable |
| Licitaciones | Feed y pliegos de ejemplo con la estructura de PLACSP/TED (no hay conexión a los portales). Base de precios y bajas históricas ficticias. La presentación nunca se automatiza |
| LLM | Interfaz `LanguageModelAdapter` con redactor por **plantillas deterministas**; no se requiere LLM |
| ML real, parser CAD (Open CASCADE), histórico real | Fase D: requiere datos y procesos del cliente |

Ningún conector se muestra «Conectado a sandbox» sin una prueba exitosa; sin middleware, «Probar» devuelve un error explícito.

## Arquitectura

```
src/
  domain/            tipos (EstimateVersion, RunEvent, Evidence…) y modelos ERP
  fixtures/          datasets sintéticos versionados (máquinas, materiales, histórico, solicitudes, ERP, catálogo)
  services/estimation/  reglas, comparables, corrector, motor de tiempos y costes, evidencias
  services/runs/     definición declarativa de flujos y ejecutores de pasos (fabricación, Odoo)
  adapters/          ErpAdapter (contrato), demo, odoo/json2Adapter, llm/languageModel
  store/             Zustand persistido y versionado (localStorage, esquema v3) + operaciones puras
  components/        shell, grafo de flujo, evidencias, plano SVG, visor 3D, UI
  features/          soluciones, fabricación, erp, ejecuciones, integraciones, catálogo, arquitectura
public/brands        logos oficiales en copia local (ver docs/asset-manifest.json)
public/demo-assets   PDF y DXF de ejemplo generados (DXF auditados con ezdxf: 0 errores)
docs/                sources.md, integration-odoo.md, asset-manifest.json, screenshots/
```

Stack: React 19 + TypeScript, Vite 7, Tailwind 4, Motion 12, Zustand 5, React Three Fiber 9, React Router 7. Versiones fijadas en `package.json`.

Decisiones respecto a la especificación:
- **Grafo propio** (SVG + nodos HTML) en lugar de React Flow: control total del paquete animado, que solo se mueve cuando un paso pasa realmente a «completado».
- **Modelo 3D paramétrico** en lugar de GLB precalculado: la Rev. C cambia la geometría de verdad. Se etiqueta como modelo de ejemplo.
- **Sin STEP de ejemplo**: no se generó un STEP válido; el adjunto STEP del correo se muestra como sustituido por el modelo de ejemplo (no hay archivos falsos con extensión cambiada).
- Persistencia en `localStorage` versionada (reset explícito en Ajustes); un cambio de esquema carga datos demo frescos.

## Configuración

`.env.example` documenta las variables (`APP_MODE`, `ODOO_*`, `LLM_*`, `EMAIL_PROVIDER`). En modo demo no se usa ninguna. Los secretos solo pueden vivir en el servidor: no uses el prefijo `VITE_`.

## Pruebas

- `npm test`: 41 pruebas, incluida la integridad de la biblioteca de casos (taxonomía, recorrido por caso, dominios `.example`, cálculos de rutas y tarifas), además del motor (733,5 / 1.397 min, comparables y descartes, tabla de acero, alternativa y bloqueo de máquinas, falta de material, ajuste manual con resultado previo, Rev. C, margen vs. recargo, hash estable; E2E de dominio RFQ → borrador ERP, invalidación, timeout con reconciliación sin duplicar, solicitud manual, escenarios Odoo, adapter JSON-2 con fetch simulado).
- `npm run test:e2e`: 24 pruebas en navegador (demo guiada, módulos y biblioteca de casos con filtros) + capturas a 1440×900, 1366×768 y 390×844.

## Datos

Empresa ficticia Talleres Delta; clientes ficticios con dominio `.example`. Los nombres y logos de clientes de la biblioteca (COPLEGAL, RCFIL, FERRI…) solo identifican casos de referencia de la presentación; los datos de sus recorridos son de ejemplo y las cifras de impacto de las fichas se muestran como referencia comercial del documento, no como métricas medidas. Ninguna cifra es un resultado real ni un KPI medido.
