import type { IntegrationConfig } from '@/domain/types';

export interface ConnectorDef {
  id: string;
  name: string;
  logo?: string; // ruta local en /public/brands; sin logo → placa neutral con el nombre
  category: 'Correo' | 'ERP' | 'Documentos' | 'Formatos' | 'CRM' | 'Mensajería' | 'Pricing';
  place: string;
  implementation: string;
  docs?: string;
  envKeys?: string[];
  defaultStatus: IntegrationConfig['status'];
}

export const CONNECTORS: ConnectorDef[] = [
  { id: 'gmail', name: 'Gmail', logo: '/brands/gmail.svg', category: 'Correo', place: 'Nodo de entrada y selector de buzón', implementation: 'Fixture local. Adapter futuro Gmail API: mensajes, adjuntos y notificaciones watch [S6].', docs: 'https://developers.google.com/workspace/gmail/api/reference/rest', envKeys: ['EMAIL_PROVIDER=gmail'], defaultStatus: 'demo' },
  { id: 'outlook', name: 'Outlook / Microsoft 365', logo: '/brands/outlook.svg', category: 'Correo', place: 'Alternativa de correo', implementation: 'Fixture local. Adapter futuro Microsoft Graph con delta por carpeta [S7].', docs: 'https://learn.microsoft.com/en-us/graph/api/message-delta?view=graph-rest-1.0', envKeys: ['EMAIL_PROVIDER=graph'], defaultStatus: 'demo' },
  { id: 'odoo', name: 'Odoo', logo: '/brands/odoo.svg', category: 'ERP', place: 'Destino y workspace ERP', implementation: 'Adapter demo completo (datos locales). Adapter JSON-2 (Odoo 19) implementado y probado con fetch simulado; requiere middleware y sandbox. RPC (≤ 18) pendiente.', docs: 'https://www.odoo.com/documentation/19.0/developer/reference/external_api.html', envKeys: ['ODOO_TRANSPORT', 'ODOO_BASE_URL', 'ODOO_DATABASE', 'ODOO_API_KEY'], defaultStatus: 'demo' },
  { id: 'sharepoint', name: 'SharePoint', logo: '/brands/sharepoint.svg', category: 'Documentos', place: 'Repositorio documental', implementation: 'Fixtures locales; adapter pendiente.', defaultStatus: 'pending' },
  { id: 'onedrive', name: 'OneDrive', logo: '/brands/onedrive.svg', category: 'Documentos', place: 'Repositorio documental', implementation: 'Fixtures locales; adapter pendiente.', defaultStatus: 'pending' },
  { id: 'gdrive', name: 'Google Drive', logo: '/brands/google-drive.svg', category: 'Documentos', place: 'Repositorio documental', implementation: 'Fixtures locales; adapter pendiente.', defaultStatus: 'pending' },
  { id: 'excel', name: 'Excel / CSV', logo: '/brands/excel.svg', category: 'Formatos', place: 'Inputs y outputs', implementation: 'Exportación CSV real y lectura real de CSV subidos. XLSX: pendiente.', defaultStatus: 'demo' },
  { id: 'pdf', name: 'PDF', category: 'Formatos', place: 'Planos e informes', implementation: 'Informe PDF real por impresión del navegador. PDFs subidos: solo vista previa (sin extracción).', defaultStatus: 'demo' },
  { id: 'step', name: 'STEP / IGES', category: 'Formatos', place: 'Modelo 3D', implementation: 'STEP: lectura real de cabecera y recuento de entidades. Geometría: modelo de ejemplo; worker Open CASCADE pendiente [S8–S9]. IGES: no soportado.', defaultStatus: 'pending' },
  { id: 'dxf', name: 'DXF', category: 'Formatos', place: 'Contornos 2D', implementation: 'Lectura real de entidades (LINE, CIRCLE, ARC) y extensión del dibujo.', defaultStatus: 'demo' },
  { id: 'sap', name: 'SAP', logo: '/brands/sap.svg', category: 'ERP', place: 'Ecosistema del catálogo', implementation: 'Solo visual. Sin conexión.', defaultStatus: 'pending' },
  { id: 'dynamics', name: 'Dynamics 365', logo: '/brands/dynamics365.svg', category: 'ERP', place: 'Ecosistema del catálogo', implementation: 'Solo visual. Sin conexión.', defaultStatus: 'pending' },
  { id: 'sage', name: 'Sage', logo: '/brands/sage.svg', category: 'ERP', place: 'Ecosistema del catálogo', implementation: 'Solo visual. Sin conexión.', defaultStatus: 'pending' },
  { id: 'hubspot', name: 'HubSpot', logo: '/brands/hubspot.svg', category: 'CRM', place: 'Casos CRM secundarios', implementation: 'Solo visual. Sin conexión declarada.', defaultStatus: 'pending' },
  { id: 'salesforce', name: 'Salesforce', logo: '/brands/salesforce.svg', category: 'CRM', place: 'Casos CRM secundarios', implementation: 'Solo visual. Sin conexión declarada.', defaultStatus: 'pending' },
  { id: 'whatsapp', name: 'WhatsApp', logo: '/brands/whatsapp.svg', category: 'Mensajería', place: 'Pedido multicanal', implementation: 'Fixture de mensaje. Sin integración hasta configurar la API.', defaultStatus: 'demo' },
  { id: 'arpa', name: 'ARPA', category: 'Pricing', place: 'Pricing GALPI', implementation: 'Fixture de tramos de coste. Contrato pendiente de especificación.', defaultStatus: 'pending' },
];

export const seedIntegrations = (): IntegrationConfig[] =>
  CONNECTORS.map((c) => ({ id: c.id, name: c.name, status: c.defaultStatus, settings: {} }));
