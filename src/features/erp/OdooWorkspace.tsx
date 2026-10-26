import { Info } from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RouteTabs } from '@/components/ui';
import { BrandLogo } from '@/components/layout/Brand';
import { useStudio } from '@/store/useStudio';
import { InboxView } from './InboxView';
import { ContactDetail, ContactsList, CrmDetail, CrmList, DeliveryDetail, InventoryView, ManufacturingDetail, ManufacturingList, SaleDetail, SalesList } from './ErpViews';

export default function OdooWorkspace() {
  const pending = useStudio((s) => s.erp.inbox.filter((i) => i.state !== 'done').length);
  const drafts = useStudio((s) => s.erp.saleOrders.filter((o) => o.state === 'draft').length);
  return (
    <div>
      <div className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1680px] px-4 pt-5 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-[#8a6100]">Operaciones inteligentes · TÉCNICAS DEL MAR · GALPI</p>
              <h1 className="mt-1 text-[28px] font-semibold tracking-tight md:text-[34px]">Tu ERP, trabajando contigo</h1>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-2 ring-1 ring-line">
              <BrandLogo src="/brands/odoo.svg" name="Odoo" size={30} />
              <div className="text-[12.5px] leading-tight">
                <div className="font-semibold text-ink">Representación MTI de datos Odoo</div>
                <div className="text-ink-3">Adapter demo local · no es una pantalla nativa de Odoo</div>
              </div>
            </div>
          </div>
          <RouteTabs className="mt-4 -mb-px pb-2" tabs={[
            { to: '/odoo/bandeja', label: 'Bandeja MTI', badge: pending ? <span className="rounded-full bg-gold/20 px-1.5 text-[11px] font-semibold text-[#7a5600]">{pending}</span> : undefined },
            { to: '/odoo/crm', label: 'CRM' },
            { to: '/odoo/ventas', label: 'Ventas', badge: drafts ? <span className="rounded-full bg-ink/[0.06] px-1.5 text-[11px] tabular">{drafts}</span> : undefined },
            { to: '/odoo/contactos', label: 'Contactos' },
            { to: '/odoo/inventario', label: 'Inventario' },
            { to: '/odoo/fabricacion', label: 'Fabricación' },
          ]} />
        </div>
      </div>
      <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6">
        <Routes>
          <Route index element={<Navigate to="bandeja" replace />} />
          <Route path="bandeja/:itemId?" element={<InboxView />} />
          <Route path="crm" element={<CrmList />} />
          <Route path="crm/:id" element={<CrmDetail />} />
          <Route path="ventas" element={<SalesList />} />
          <Route path="ventas/:id" element={<SaleDetail />} />
          <Route path="contactos" element={<ContactsList />} />
          <Route path="contactos/:id" element={<ContactDetail />} />
          <Route path="inventario" element={<InventoryView />} />
          <Route path="entregas/:id" element={<DeliveryDetail />} />
          <Route path="fabricacion" element={<ManufacturingList />} />
          <Route path="fabricacion/:id" element={<ManufacturingDetail />} />
          <Route path="*" element={<Navigate to="bandeja" replace />} />
        </Routes>
        <p className="mt-6 flex items-start gap-2 text-[12.5px] text-ink-3"><Info className="mt-0.5 size-4 shrink-0" />Modelos candidatos estándar (res.partner, crm.lead, sale.order, stock.quant, stock.picking, mrp.production…): deben verificarse en la instancia del cliente. «Abrir en Odoo» solo aparecerá con URL e ID reales de un sandbox conectado.</p>
      </div>
    </div>
  );
}
