# Integración Odoo

## Contrato

`src/adapters/ErpAdapter.ts` define la interfaz independiente del transporte (sección 7.5):
`capabilities`, `findCustomers`, `getProducts`, `getAvailability`, `getOrderContext`, `getManufacturingHistory`, `previewQuotation`, `createDraftQuotation` y `findOperation` (reconciliación).

| Implementación | Archivo | Estado |
|---|---|---|
| Demo local | `src/adapters/demo/demoErpAdapter.ts` | Completa. Datos sintéticos persistentes con la estructura de modelos candidatos |
| Odoo 19 · JSON-2 | `src/adapters/odoo/json2Adapter.ts` | Implementada y probada con `fetch` simulado (`src/store/flows.test.ts`). **No verificada contra una instancia** |
| Odoo ≤ 18 · RPC | `OdooRpcAdapterPending` | Pendiente; validar transporte y edición tras el discovery |

## Transporte JSON-2

`POST {ODOO_BASE_URL}/json/2/<model>/<method>` con `Authorization: bearer {ODOO_API_KEY}` y, según despliegue, `X-Odoo-Database`. Cada llamada es su propia transacción [S1].

- Debe ejecutarse en un **middleware de servidor**. El navegador nunca recibe la API key.
- El acceso a la API externa en Odoo Online depende del plan (Custom) [S2]; Odoo Online no admite módulos propios [S3].

## Escritura del presupuesto borrador

1. Solo se escribe una **versión aprobada**: la petición lleva `approval.inputHash` y `versionId`.
2. Clave de idempotencia `requestId:versionId:inputHash`.
3. Antes de crear, `findOperation` busca un `sale.order` con `origin = MTI:<clave>`; si existe, se devuelve y no se crea otro.
4. El presupuesto y sus líneas se crean en **una sola llamada** `create` con comandos one2many `[0, 0, {...}]`.
5. Tras un timeout se reconcilia (paso 3) antes de reintentar. En la demo puede simularse en Odoo › Bandeja («Simular timeout tras la próxima escritura»).

Limitación: un campo de referencia libre (`origin`) no garantiza unicidad bajo concurrencia. Si se permiten módulos propios (Odoo.sh o autogestionado), implementar un método de negocio acotado y transaccional con restricción única de la clave.

## Mapeo propuesto (a verificar en la instancia)

| Objeto MTI | Modelo candidato |
|---|---|
| Cliente/contacto | `res.partner` (resolución por email exacto; nunca por coincidencia parcial de nombre) |
| Oportunidad | `crm.lead` |
| Producto | `product.product` / `product.template` |
| Presupuesto/pedido | `sale.order`, `sale.order.line` |
| Stock | `stock.quant` (contexto, no disponibilidad prometible) |
| Entrega | `stock.picking`, `stock.move` |
| Fabricación | `mrp.production`, `mrp.workorder`, `mrp.workcenter`, `mrp.bom` |
| Evidencias | `mail.message`, `ir.attachment` |

Convención de tiempos: el motor MTI no debe volver a aplicar eficiencias ya incorporadas en las duraciones esperadas de los centros de trabajo [S4]. Validar antes de escribir rutas.

## Políticas

- Herramientas de escritura por lista explícita (oportunidad, presupuesto borrador, nueva versión de presupuesto). No se confirman pedidos ni se emiten facturas automáticamente.
- Las respuestas al cliente quedan en borrador; «Marcar como enviado» es solo una etiqueta local.
- «Abrir en Odoo» solo aparecerá con URL e ID reales de un sandbox conectado.
- Ruta recomendada: demo local → sandbox con datos anonimizados y usuario técnico de privilegios mínimos → lectura → presupuesto borrador con revisión y reconciliación.
