// Vistas de lista y detalle del ERP demo, con relaciones navegables cliente ↔ oportunidad ↔ presupuesto ↔ pedido ↔ entrega.
import { ArrowLeft, Building2, CheckCircle2, ExternalLink, Factory, FileText, Package, Search, Target, Truck, User } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { SaleOrder } from '@/domain/erp';
import { lineSubtotal, ODOO_MODELS, orderTotal } from '@/domain/erp';
import { Badge, Button, Card, CardHeader, EmptyState, Input, Modal } from '@/components/ui';
import { useStudio } from '@/store/useStudio';
import { cx, dateEs, dateTimeEs, eur, num, numSmart } from '@/lib/format';

const SO_STATE: Record<SaleOrder['state'], { label: string; tone: 'neutral' | 'info' | 'ok' | 'err' }> = {
  draft: { label: 'Presupuesto', tone: 'neutral' }, sent: { label: 'Presupuesto enviado', tone: 'info' }, sale: { label: 'Pedido de venta', tone: 'ok' }, cancel: { label: 'Cancelado', tone: 'err' },
};

export const ModelTag = ({ m }: { m: string }) => <span className="rounded-md bg-ink/[0.05] px-1.5 py-0.5 font-mono text-[11px] text-ink-3">{m}</span>;

function ListShell({ title, model, icon, children, search, setSearch, extra }: { title: string; model: string; icon: ReactNode; children: ReactNode; search?: string; setSearch?: (v: string) => void; extra?: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <span className="text-ink-3 [&>svg]:size-4">{icon}</span>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <ModelTag m={model} />
        <div className="ml-auto flex items-center gap-2">
          {extra}
          {setSearch && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar" className="h-8 w-[220px] py-1 pl-8 text-[13px]" aria-label={`Buscar en ${title}`} />
            </div>
          )}
        </div>
      </div>
      {children}
    </Card>
  );
}

const th = 'px-4 py-2 text-left text-[12px] font-medium text-ink-3';
const td = 'px-4 py-2.5';

function Row({ to, children }: { to: string; children: ReactNode }) {
  const nav = useNavigate();
  return <tr tabIndex={0} onClick={() => nav(to)} onKeyDown={(e) => e.key === 'Enter' && nav(to)} className="cursor-pointer border-t border-line transition-colors hover:bg-gold/[0.04] focus-visible:bg-gold/[0.06]">{children}</tr>;
}

function DetailHeader({ back, title, model, badges, actions }: { back: string; title: ReactNode; model: string; badges?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <Link to={back} className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink"><ArrowLeft className="size-3.5" /> Volver</Link>
        <div className="mt-1 flex flex-wrap items-center gap-2"><h2 className="text-[24px] font-semibold tracking-tight">{title}</h2><ModelTag m={model} />{badges}</div>
      </div>
      <div className="flex gap-2">{actions}</div>
    </div>
  );
}

const Info = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex justify-between gap-4 border-t border-line px-4 py-2.5 text-[13.5px] first:border-t-0"><span className="text-ink-3">{label}</span><span className="text-right font-medium">{children}</span></div>
);

// ── Ventas ──

export function SalesList() {
  const erp = useStudio((s) => s.erp);
  const [q, setQ] = useState('');
  const [f, setF] = useState<'all' | 'quotes' | 'orders'>('all');
  const rows = useMemo(() => [...erp.saleOrders].reverse().filter((o) => (f === 'all' || (f === 'quotes' ? o.state !== 'sale' : o.state === 'sale')) && `${o.name} ${o.origin} ${erp.partners.find((p) => p.id === o.partnerId)?.name}`.toLowerCase().includes(q.toLowerCase())), [erp, q, f]);
  return (
    <ListShell title="Presupuestos y pedidos" model={ODOO_MODELS.saleOrder} icon={<FileText />} search={q} setSearch={setQ}
      extra={<div className="flex gap-1">{([['all', 'Todos'], ['quotes', 'Presupuestos'], ['orders', 'Pedidos']] as const).map(([k, l]) => <button key={k} onClick={() => setF(k)} className={cx('rounded-lg px-2.5 py-1 text-[12.5px] font-medium', f === k ? 'bg-navy text-white' : 'text-ink-3 hover:bg-ink/5')}>{l}</button>)}</div>}>
      {rows.length === 0 ? <EmptyState icon={<FileText />} title="Sin resultados" /> : (
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[820px] text-[13.5px]">
            <thead className="bg-canvas"><tr><th className={th}>Número</th><th className={th}>Cliente</th><th className={th}>Fecha</th><th className={th}>Origen</th><th className={cx(th, 'text-right')}>Base imponible</th><th className={th}>Estado</th><th className={th}>Creado por</th></tr></thead>
            <tbody>
              {rows.map((o) => (
                <Row key={o.id} to={`/odoo/ventas/${o.id}`}>
                  <td className={cx(td, 'font-semibold')}>{o.name}{o.version > 1 && <span className="ml-1 text-[12px] font-normal text-ink-3">v{o.version}</span>}</td>
                  <td className={td}>{erp.partners.find((p) => p.id === o.partnerId)?.name}</td>
                  <td className={cx(td, 'text-ink-3')}>{dateEs(o.dateOrder)}</td>
                  <td className={cx(td, 'max-w-[220px] truncate text-ink-3')}>{o.origin ?? '—'}</td>
                  <td className={cx(td, 'text-right tabular')}>{eur(orderTotal(o))}</td>
                  <td className={td}><Badge tone={SO_STATE[o.state].tone}>{SO_STATE[o.state].label}</Badge></td>
                  <td className={td}>{o.createdBy.startsWith('MTI') ? <Badge tone="gold">MTI · agente</Badge> : <span className="text-ink-3">{o.createdBy}</span>}</td>
                </Row>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ListShell>
  );
}

export function SaleDetail() {
  const { id } = useParams();
  const erp = useStudio((s) => s.erp);
  const requests = useStudio((s) => s.requests);
  const confirm = useStudio((s) => s.confirmSaleOrder);
  const [open, setOpen] = useState(false);
  const o = erp.saleOrders.find((x) => x.id === id);
  if (!o) return <EmptyState title="Registro no encontrado" action={<Link to="/odoo/ventas" className="text-info underline">Volver a ventas</Link>} />;
  const partner = erp.partners.find((p) => p.id === o.partnerId);
  const lead = erp.leads.find((l) => l.id === o.leadId);
  const req = requests.find((r) => r.id === o.requestId);
  const pickings = erp.pickings.filter((p) => p.saleOrderId === o.id);
  const mos = erp.productions.filter((m) => m.origin === o.name);
  const steps: SaleOrder['state'][] = ['draft', 'sent', 'sale'];
  const idx = steps.indexOf(o.state);
  return (
    <div>
      <DetailHeader back="/odoo/ventas" title={<>{o.name}{o.version > 1 && <span className="ml-2 text-[16px] font-normal text-ink-3">v{o.version}</span>}</>} model={ODOO_MODELS.saleOrder}
        badges={<><Badge tone={SO_STATE[o.state].tone}>{SO_STATE[o.state].label}</Badge><Badge tone="gold">Modo demo</Badge></>}
        actions={<Button variant="secondary" icon={<CheckCircle2 />} disabled={o.state === 'sale' || o.state === 'cancel'} disabledReason="Ya está confirmado" onClick={() => setOpen(true)}>Confirmar pedido</Button>} />
      <div className="mb-4 flex items-center gap-1" aria-label="Estado del documento">
        {steps.map((s, i) => <div key={s} className={cx('flex h-8 flex-1 items-center justify-center text-[12.5px] font-medium first:rounded-l-lg last:rounded-r-lg', i <= idx ? 'bg-navy text-white' : 'bg-white text-ink-3 ring-1 ring-line')}>{SO_STATE[s].label}</div>)}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader title="Líneas" subtitle={`${ODOO_MODELS.saleLine} · ${o.pricelist}`} />
            <div className="overflow-x-auto scroll-thin">
              <table className="w-full min-w-[640px] text-[13.5px]">
                <thead className="bg-canvas"><tr><th className={th}>Producto / descripción</th><th className={cx(th, 'text-right')}>Cantidad</th><th className={cx(th, 'text-right')}>Precio unit.</th><th className={cx(th, 'text-right')}>Desc. %</th><th className={cx(th, 'text-right')}>Subtotal</th></tr></thead>
                <tbody>{o.lines.map((l) => <tr key={l.id} className="border-t border-line"><td className={td}>{l.name}</td><td className={cx(td, 'text-right tabular')}>{numSmart(l.qty)} {l.uom === 'Unidades' ? 'uds' : l.uom}</td><td className={cx(td, 'text-right tabular')}>{eur(l.priceUnit)}</td><td className={cx(td, 'text-right tabular')}>{num(l.discountPct, 1)}</td><td className={cx(td, 'text-right font-medium tabular')}>{eur(lineSubtotal(l))}</td></tr>)}</tbody>
                <tfoot><tr className="border-t-2 border-line-strong bg-canvas/70"><td className={cx(td, 'font-semibold')} colSpan={4}>Base imponible</td><td className={cx(td, 'text-right font-semibold tabular')}>{eur(orderTotal(o))}</td></tr></tfoot>
              </table>
            </div>
            <p className="border-t border-line px-4 py-2.5 text-[12.5px] text-ink-3">Impuestos según la configuración fiscal de la instancia; no se calculan en la demo.</p>
          </Card>
          {o.note && <Card className="px-4 py-3 text-[13.5px] text-ink-2"><div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Notas</div>{o.note}</Card>}
          <Card>
            <CardHeader title="Historial" subtitle={ODOO_MODELS.message} />
            <ol className="space-y-2 px-4 py-3">{[...o.history].reverse().map((h, i) => <li key={i} className="text-[13.5px]"><span className="text-ink-3">{dateTimeEs(h.at)} · {h.by}</span><div>{h.summary}</div></li>)}</ol>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <Info label="Cliente">{partner ? <Link className="text-info hover:underline" to={`/odoo/contactos/${partner.id}`}>{partner.name}</Link> : '—'}</Info>
            <Info label="Oportunidad">{lead ? <Link className="text-info hover:underline" to={`/odoo/crm/${lead.id}`}>{lead.name}</Link> : '—'}</Info>
            <Info label="Fecha">{dateTimeEs(o.dateOrder)}</Info>
            {o.validityDate && <Info label="Validez">{dateEs(o.validityDate)}</Info>}
            <Info label="Origen">{o.origin ?? '—'}</Info>
            <Info label="Creado por">{o.createdBy}</Info>
            {req && <Info label="Expediente MTI"><Link className="text-info hover:underline" to={`/fabricacion/${req.id}/versiones`}>{req.ref}</Link></Info>}
          </Card>
          {(o.idempotencyKey || o.inputHash) && (
            <Card className="px-4 py-3 text-[12.5px]">
              <div className="mb-1 font-semibold text-ink-2">Trazabilidad de la escritura</div>
              {o.inputHash && <div className="text-ink-3">Hash aprobado <span className="font-mono text-ink">{o.inputHash}</span></div>}
              {o.idempotencyKey && <div className="break-all text-ink-3">Clave de idempotencia <span className="font-mono text-ink">{o.idempotencyKey}</span></div>}
              {o.attachments.length > 0 && <div className="mt-1 text-ink-3">Adjuntos: {o.attachments.join(', ')}</div>}
              <div className="mt-2 flex items-center gap-1 text-ink-3"><ExternalLink className="size-3.5" />«Abrir en Odoo» no disponible: registro local de la demo</div>
            </Card>
          )}
          {(pickings.length > 0 || mos.length > 0) && (
            <Card>
              <CardHeader title="Documentos vinculados" />
              {pickings.map((p) => <Info key={p.id} label="Entrega"><Link className="text-info hover:underline" to={`/odoo/entregas/${p.id}`}>{p.name}</Link></Info>)}
              {mos.map((m) => <Info key={m.id} label="Fabricación"><Link className="text-info hover:underline" to={`/odoo/fabricacion/${m.id}`}>{m.name}</Link></Info>)}
            </Card>
          )}
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={`Confirmar ${o.name}`} subtitle="Acción manual explícita"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button variant="primary" onClick={() => { confirm(o.id); setOpen(false); }}>Confirmar en datos locales</Button></>}>
        <p className="text-[14px] text-ink-2">Los agentes nunca confirman pedidos ni emiten facturas automáticamente. Esta confirmación modifica solo los datos locales de la demo; en una integración real requeriría permisos y su propio flujo de aprobación.</p>
      </Modal>
    </div>
  );
}

// ── CRM ──

const STAGES = ['Nuevo', 'Cualificado', 'Propuesta', 'Negociación', 'Ganado', 'Perdido'] as const;

export function CrmList() {
  const erp = useStudio((s) => s.erp);
  return (
    <ListShell title="Oportunidades" model={ODOO_MODELS.lead} icon={<Target />}>
      <div className="grid gap-3 p-4 md:grid-cols-3 2xl:grid-cols-6">
        {STAGES.map((st) => {
          const leads = erp.leads.filter((l) => l.stage === st);
          return (
            <div key={st} className="rounded-xl bg-canvas p-2.5 ring-1 ring-line">
              <div className="mb-2 flex items-center justify-between px-1 text-[13px] font-semibold">{st}<span className="text-[12px] font-normal text-ink-3">{eur(leads.reduce((a, l) => a + l.expectedRevenue, 0))}</span></div>
              <div className="space-y-2">
                {leads.length === 0 && <p className="px-1 py-3 text-[12.5px] text-ink-3">Sin oportunidades</p>}
                {leads.map((l) => (
                  <Link key={l.id} to={`/odoo/crm/${l.id}`} className="block rounded-lg bg-white p-3 shadow-sm ring-1 ring-line transition-shadow hover:ring-gold/50">
                    <div className="text-[13.5px] font-medium">{l.name}</div>
                    <div className="mt-0.5 text-[12.5px] text-ink-3">{erp.partners.find((p) => p.id === l.partnerId)?.name}</div>
                    <div className="mt-2 flex items-center justify-between text-[12.5px]"><span className="tabular">{eur(l.expectedRevenue)}</span>{l.createdBy.startsWith('MTI') && <Badge tone="gold">MTI</Badge>}</div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ListShell>
  );
}

export function CrmDetail() {
  const { id } = useParams();
  const erp = useStudio((s) => s.erp);
  const l = erp.leads.find((x) => x.id === id);
  if (!l) return <EmptyState title="Oportunidad no encontrada" />;
  const quotes = erp.saleOrders.filter((o) => o.leadId === l.id);
  const acts = (erp.activities ?? []).filter((a) => a.leadId === l.id);
  return (
    <div>
      <DetailHeader back="/odoo/crm" title={l.name} model={ODOO_MODELS.lead} badges={<><Badge tone={l.stage === 'Ganado' ? 'ok' : l.stage === 'Perdido' ? 'err' : 'info'}>{l.stage}</Badge>{l.risks?.map((r) => <Badge key={r} tone="warn">{r}</Badge>)}</>} />
      <div className="mb-4 flex gap-1">{STAGES.map((s) => <div key={s} className={cx('flex h-8 flex-1 items-center justify-center text-[12.5px] font-medium first:rounded-l-lg last:rounded-r-lg', s === l.stage ? (s === 'Perdido' ? 'bg-err text-white' : 'bg-navy text-white') : 'bg-white text-ink-3 ring-1 ring-line')}>{s}</div>)}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Info label="Cliente"><Link className="text-info hover:underline" to={`/odoo/contactos/${l.partnerId}`}>{erp.partners.find((p) => p.id === l.partnerId)?.name}</Link></Info>
          <Info label="Contacto">{l.contactName ?? '—'}</Info>
          <Info label="Email">{l.email ?? '—'}</Info>
          <Info label="Ingreso esperado">{eur(l.expectedRevenue)}</Info>
          <Info label="Probabilidad">{l.probability} %</Info>
          <Info label="Origen">{l.source}</Info>
          <Info label="Creado">{dateTimeEs(l.createdAt)} · {l.createdBy}</Info>
        </Card>
        <Card>
          <CardHeader title="Presupuestos" />
          {quotes.length === 0 ? <p className="px-4 py-3 text-[13px] text-ink-3">Sin presupuestos vinculados.</p> : quotes.map((o) => <Info key={o.id} label={SO_STATE[o.state].label}><Link className="text-info hover:underline" to={`/odoo/ventas/${o.id}`}>{o.name} · {eur(orderTotal(o))}</Link></Info>)}
          {l.description && <div className="border-t border-line px-4 py-3 text-[13px] whitespace-pre-wrap text-ink-2">{l.description}</div>}
        </Card>
        <Card>
          <CardHeader title="Actividades" subtitle="mail.activity" />
          {acts.length === 0 ? <p className="px-4 py-3 text-[13px] text-ink-3">Sin actividades planificadas.</p> : acts.map((a) => <Info key={a.id} label={`${a.type} · ${dateEs(a.dueDate)}`}><span className={cx(a.done && 'line-through text-ink-3')}>{a.summary}</span>{a.source === 'voz' && <Badge tone="gold" className="ml-2">voz</Badge>}</Info>)}
          {l.lostReason && <div className="border-t border-line px-4 py-3 text-[13px] text-err">Motivo de pérdida: {l.lostReason}</div>}
        </Card>
        <Card>
          <CardHeader title="Historial" subtitle={ODOO_MODELS.message} />
          {(l.log ?? []).length === 0 ? <p className="px-4 py-3 text-[13px] text-ink-3">Sin notas.</p> : <ol className="space-y-3 px-4 py-3">{[...(l.log ?? [])].reverse().map((m, i) => <li key={i} className="text-[13px]"><div className="flex items-center gap-2 text-[12px] text-ink-3">{dateTimeEs(m.at)} · {m.by}{m.source === 'voz' && <Badge tone="gold">nota de voz</Badge>}</div><div className="text-ink-2">{m.text}</div></li>)}</ol>}
        </Card>
      </div>
    </div>
  );
}

// ── Contactos ──

export function ContactsList() {
  const erp = useStudio((s) => s.erp);
  const [q, setQ] = useState('');
  const companies = erp.partners.filter((p) => p.isCompany && `${p.name} ${p.email} ${p.city}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <ListShell title="Contactos" model={ODOO_MODELS.partner} icon={<Building2 />} search={q} setSearch={setQ}>
      <table className="w-full text-[13.5px]">
        <thead className="bg-canvas"><tr><th className={th}>Empresa</th><th className={th}>Email</th><th className={th}>Ciudad</th><th className={th}>Contactos</th><th className={th}>Etiquetas</th></tr></thead>
        <tbody>{companies.map((p) => <Row key={p.id} to={`/odoo/contactos/${p.id}`}><td className={cx(td, 'font-medium')}>{p.name}</td><td className={cx(td, 'text-ink-3')}>{p.email ?? p.phone}</td><td className={td}>{p.city}</td><td className={cx(td, 'tabular')}>{erp.partners.filter((c) => c.parentId === p.id).length}</td><td className={td}><div className="flex flex-wrap gap-1">{p.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div></td></Row>)}</tbody>
      </table>
    </ListShell>
  );
}

export function ContactDetail() {
  const { id } = useParams();
  const erp = useStudio((s) => s.erp);
  const p = erp.partners.find((x) => x.id === id);
  if (!p) return <EmptyState title="Contacto no encontrado" />;
  const companyId = p.isCompany ? p.id : p.parentId;
  const children = erp.partners.filter((c) => c.parentId === companyId);
  const leads = erp.leads.filter((l) => l.partnerId === companyId);
  const orders = erp.saleOrders.filter((o) => o.partnerId === companyId || o.partnerId === p.id);
  return (
    <div>
      <DetailHeader back="/odoo/contactos" title={p.name} model={ODOO_MODELS.partner} badges={<Badge>{p.isCompany ? 'Empresa' : 'Contacto'}</Badge>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <Info label="Email">{p.email ?? '—'}</Info>
          <Info label="Teléfono">{p.phone ?? '—'}</Info>
          <Info label="Ciudad">{p.city}</Info>
          {p.vat && <Info label="NIF">{p.vat}</Info>}
          <Info label="ID ERP (demo)"><span className="font-mono">{p.erpId}</span></Info>
          {!p.isCompany && p.parentId && <Info label="Empresa"><Link className="text-info hover:underline" to={`/odoo/contactos/${p.parentId}`}>{erp.partners.find((c) => c.id === p.parentId)?.name}</Link></Info>}
        </Card>
        <Card>
          <CardHeader title="Personas de contacto" icon={<User />} />
          {children.length === 0 ? <p className="px-4 py-3 text-[13px] text-ink-3">Sin contactos.</p> : children.map((c) => <Info key={c.id} label={c.name}>{c.email}</Info>)}
          <CardHeader title="Oportunidades" icon={<Target />} className="border-t" />
          {leads.length === 0 ? <p className="px-4 py-3 text-[13px] text-ink-3">Sin oportunidades.</p> : leads.map((l) => <Info key={l.id} label={l.stage}><Link className="text-info hover:underline" to={`/odoo/crm/${l.id}`}>{l.name}</Link></Info>)}
        </Card>
        <Card>
          <CardHeader title="Presupuestos y pedidos" icon={<FileText />} />
          {orders.length === 0 ? <p className="px-4 py-3 text-[13px] text-ink-3">Sin documentos.</p> : orders.map((o) => <Info key={o.id} label={SO_STATE[o.state].label}><Link className="text-info hover:underline" to={`/odoo/ventas/${o.id}`}>{o.name} · {eur(orderTotal(o))}</Link></Info>)}
        </Card>
      </div>
    </div>
  );
}

// ── Inventario ──

export function InventoryView() {
  const erp = useStudio((s) => s.erp);
  return (
    <div className="space-y-4">
      <ListShell title="Stock por producto" model={ODOO_MODELS.quant} icon={<Package />}>
        <table className="w-full text-[13.5px]">
          <thead className="bg-canvas"><tr><th className={th}>Producto</th><th className={th}>Ubicación</th><th className={cx(th, 'text-right')}>A mano</th><th className={cx(th, 'text-right')}>Reservado</th><th className={cx(th, 'text-right')}>Disponible</th><th className={cx(th, 'text-right')}>Entrante</th></tr></thead>
          <tbody>{erp.quants.map((q) => { const p = erp.products.find((x) => x.id === q.productId)!; const av = q.quantity - q.reserved; return <tr key={q.productId} className="border-t border-line"><td className={td}><span className="font-mono text-[12px] text-ink-3">{p.defaultCode}</span> {p.name}</td><td className={cx(td, 'text-ink-3')}>{q.location}</td><td className={cx(td, 'text-right tabular')}>{q.quantity}</td><td className={cx(td, 'text-right tabular')}>{q.reserved}</td><td className={cx(td, 'text-right font-semibold tabular', av < 10 && 'text-warn')}>{av}</td><td className={cx(td, 'text-right tabular text-ink-3')}>{q.incoming || '—'}</td></tr>; })}</tbody>
        </table>
        <p className="border-t border-line px-4 py-2.5 text-[12.5px] text-ink-3">stock.quant es contexto: no sustituye la disponibilidad prometible calculada por la planificación.</p>
      </ListShell>
      <ListShell title="Entregas" model={ODOO_MODELS.picking} icon={<Truck />}>
        <table className="w-full text-[13.5px]">
          <thead className="bg-canvas"><tr><th className={th}>Albarán</th><th className={th}>Cliente</th><th className={th}>Pedido</th><th className={th}>Programada</th><th className={th}>Estado</th></tr></thead>
          <tbody>{erp.pickings.map((p) => <Row key={p.id} to={`/odoo/entregas/${p.id}`}><td className={cx(td, 'font-medium')}>{p.name}</td><td className={td}>{erp.partners.find((x) => x.id === p.partnerId)?.name}</td><td className={td}>{erp.saleOrders.find((o) => o.id === p.saleOrderId)?.name ?? '—'}</td><td className={cx(td, 'text-ink-3')}>{dateEs(p.scheduledDate)}</td><td className={td}><Badge tone={p.state === 'done' ? 'ok' : 'info'}>{p.state === 'done' ? 'Hecho' : p.state}</Badge></td></Row>)}</tbody>
        </table>
      </ListShell>
    </div>
  );
}

export function DeliveryDetail() {
  const { id } = useParams();
  const erp = useStudio((s) => s.erp);
  const p = erp.pickings.find((x) => x.id === id);
  if (!p) return <EmptyState title="Entrega no encontrada" />;
  const so = erp.saleOrders.find((o) => o.id === p.saleOrderId);
  return (
    <div>
      <DetailHeader back="/odoo/inventario" title={p.name} model={ODOO_MODELS.picking} badges={<Badge tone={p.state === 'done' ? 'ok' : 'info'}>{p.state === 'done' ? 'Hecho' : p.state}</Badge>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Info label="Cliente"><Link className="text-info hover:underline" to={`/odoo/contactos/${p.partnerId}`}>{erp.partners.find((x) => x.id === p.partnerId)?.name}</Link></Info>
          <Info label="Pedido">{so ? <Link className="text-info hover:underline" to={`/odoo/ventas/${so.id}`}>{so.name}</Link> : '—'}</Info>
          <Info label="Programada">{dateEs(p.scheduledDate)}</Info>
          <Info label="Realizada">{p.dateDone ? dateEs(p.dateDone) : '—'}</Info>
          <Info label="Transportista">{p.carrier ?? '—'}</Info>
          <Info label="Seguimiento"><span className="font-mono">{p.trackingRef ?? '—'}</span></Info>
        </Card>
        <Card>
          <CardHeader title="Movimientos" subtitle="stock.move" />
          {p.moves.map((m, i) => <Info key={i} label={erp.products.find((x) => x.id === m.productId)?.name ?? ''}>{m.done}/{m.qty} uds</Info>)}
        </Card>
      </div>
    </div>
  );
}

// ── Fabricación ──

export function ManufacturingList() {
  const erp = useStudio((s) => s.erp);
  return (
    <div className="space-y-4">
      <ListShell title="Órdenes de fabricación" model={ODOO_MODELS.production} icon={<Factory />}>
        <table className="w-full text-[13.5px]">
          <thead className="bg-canvas"><tr><th className={th}>Orden</th><th className={th}>Producto</th><th className={cx(th, 'text-right')}>Cantidad</th><th className={th}>Origen</th><th className={th}>Inicio</th><th className={th}>Estado</th></tr></thead>
          <tbody>{erp.productions.map((m) => <Row key={m.id} to={`/odoo/fabricacion/${m.id}`}><td className={cx(td, 'font-medium')}>{m.name}</td><td className={td}>{erp.products.find((p) => p.id === m.productId)?.name}</td><td className={cx(td, 'text-right tabular')}>{m.qty}</td><td className={cx(td, 'text-ink-3')}>{m.origin}</td><td className={cx(td, 'text-ink-3')}>{dateEs(m.dateStart)}</td><td className={td}><Badge tone={m.state === 'done' ? 'ok' : 'gold'}>{m.state === 'done' ? 'Hecho' : 'En curso'}</Badge></td></Row>)}</tbody>
        </table>
      </ListShell>
      <ListShell title="Centros de trabajo" model={ODOO_MODELS.workcenter} icon={<Factory />}>
        <table className="w-full text-[13.5px]">
          <thead className="bg-canvas"><tr><th className={th}>Código</th><th className={th}>Centro</th><th className={cx(th, 'text-right')}>Capacidad</th><th className={cx(th, 'text-right')}>Eficiencia</th><th className={cx(th, 'text-right')}>Coste/h</th><th className={th}>Máquinas (MTI)</th></tr></thead>
          <tbody>{erp.workcenters.map((w) => <tr key={w.id} className="border-t border-line"><td className={cx(td, 'font-mono text-[12.5px]')}>{w.code}</td><td className={td}>{w.name}</td><td className={cx(td, 'text-right tabular')}>{w.capacity}</td><td className={cx(td, 'text-right tabular')}>{w.efficiencyPct} %</td><td className={cx(td, 'text-right tabular')}>{eur(w.costHour)}</td><td className={cx(td, 'font-mono text-[12px] text-ink-3')}>{w.machineIds.join(', ')}</td></tr>)}</tbody>
        </table>
        <p className="border-t border-line px-4 py-2.5 text-[12.5px] text-ink-3">Convención: el motor MTI no vuelve a aplicar eficiencias que ya estén incorporadas en las duraciones esperadas del ERP. Debe validarse antes de escribir rutas de fabricación.</p>
      </ListShell>
    </div>
  );
}

export function ManufacturingDetail() {
  const { id } = useParams();
  const erp = useStudio((s) => s.erp);
  const m = erp.productions.find((x) => x.id === id);
  if (!m) return <EmptyState title="Orden no encontrada" />;
  const so = erp.saleOrders.find((o) => o.name === m.origin);
  return (
    <div>
      <DetailHeader back="/odoo/fabricacion" title={m.name} model={ODOO_MODELS.production} badges={<Badge tone={m.state === 'done' ? 'ok' : 'gold'}>{m.state === 'done' ? 'Hecho' : 'En curso'}</Badge>} />
      <Card className="mb-4">
        <Info label="Producto">{erp.products.find((p) => p.id === m.productId)?.name} · {m.qty} uds</Info>
        <Info label="Origen">{so ? <Link className="text-info hover:underline" to={`/odoo/ventas/${so.id}`}>{so.name}</Link> : m.origin}</Info>
      </Card>
      <ListShell title="Órdenes de trabajo" model="mrp.workorder" icon={<Factory />}>
        <table className="w-full text-[13.5px]">
          <thead className="bg-canvas"><tr><th className={th}>Operación</th><th className={th}>Centro</th><th className={cx(th, 'text-right')}>Esperado (min)</th><th className={cx(th, 'text-right')}>Real (min)</th><th className={cx(th, 'text-right')}>Desviación</th><th className={th}>Estado</th></tr></thead>
          <tbody>{m.workorders.map((w) => { const dev = w.durationMin != null ? ((w.durationMin - w.durationExpectedMin) / w.durationExpectedMin) * 100 : null; return <tr key={w.id} className="border-t border-line"><td className={td}>{w.operation}</td><td className={td}>{erp.workcenters.find((c) => c.id === w.workcenterId)?.name}</td><td className={cx(td, 'text-right tabular')}>{w.durationExpectedMin}</td><td className={cx(td, 'text-right tabular')}>{w.durationMin ?? '—'}</td><td className={cx(td, 'text-right tabular', dev != null && Math.abs(dev) > 5 && 'text-warn')}>{dev != null ? `${dev > 0 ? '+' : ''}${num(dev, 1)} %` : '—'}</td><td className={td}><Badge tone={w.state === 'done' ? 'ok' : w.state === 'progress' ? 'gold' : 'neutral'}>{w.state === 'done' ? 'Hecho' : w.state === 'progress' ? 'En curso' : 'Pendiente'}</Badge></td></tr>; })}</tbody>
        </table>
        <p className="border-t border-line px-4 py-2.5 text-[12.5px] text-ink-3">Histórico operativo real/esperado: base futura para calibrar reglas y evaluar el corrector ML.</p>
      </ListShell>
    </div>
  );
}
