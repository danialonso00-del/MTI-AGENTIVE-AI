import { motion } from 'motion/react';
import { AlertTriangle, ArrowRight, CheckSquare, Clock3, Euro, Inbox, Play, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Card, CardHeader, StatePill } from '@/components/ui';
import { BarList, StackBar } from '@/components/ui/charts';
import { BrandLogo } from '@/components/layout/Brand';
import { agentByCode } from '@/fixtures/agents';
import { orderTotal } from '@/domain/erp';
import { estimate } from '@/services/estimation/engine';
import { useStudio } from '@/store/useStudio';
import { pendingApprovals, unifiedInbox, workshopLoad } from '@/store/selectors';
import { cx, dateTimeEs, eur, num, relativeEs } from '@/lib/format';

export default function PanelPage() {
  const requests = useStudio((s) => s.requests);
  const erp = useStudio((s) => s.erp);
  const user = useStudio((s) => s.ui.user);
  const nav = useNavigate();
  const inbox = useMemo(() => unifiedInbox(requests, erp.inbox), [requests, erp.inbox]);
  const approvals = useMemo(() => pendingApprovals(requests, erp.inbox), [requests, erp.inbox]);
  const load = useMemo(() => workshopLoad(requests), [requests]);
  const offered = erp.saleOrders.filter((o) => o.createdBy.startsWith('MTI'));
  const openMin = requests.filter((r) => r.state !== 'draft_created' && r.steps.estimate?.status === 'completed').reduce((a, r) => a + estimate(r.draft).estimatedLotMin, 0);
  const attention = inbox.filter((i) => i.status === 'Requiere acción' || i.status === 'Nuevo').slice(0, 6);
  const activity = useMemo(() => requests.flatMap((r) => r.activity.map((a) => ({ ...a, ref: r.ref, to: `/fabricacion/${r.id}/actividad` }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 7), [requests]);
  const byStatus = ['Nuevo', 'En curso', 'Requiere acción', 'Resuelto'].map((s) => ({ label: s, value: inbox.filter((i) => i.status === s).length }));
  const hour = new Date().getHours();

  const kpis = [
    { label: 'Entradas sin procesar', value: String(inbox.filter((i) => i.status === 'Nuevo').length), icon: <Inbox />, to: '/bandeja', sub: `${inbox.length} en la bandeja` },
    { label: 'Pendientes de aprobación', value: String(approvals.count), icon: <CheckSquare />, to: '/aprobaciones', sub: `${approvals.reqs.length} ofertas · ${approvals.actions.length} acciones ERP`, warn: approvals.count > 0 },
    { label: 'Valor en presupuestos MTI', value: eur(offered.reduce((a, o) => a + orderTotal(o), 0)), icon: <Euro />, to: '/odoo/ventas', sub: `${offered.length} borradores creados por agentes` },
    { label: 'Horas de proceso en cartera', value: `${num(openMin / 60, 1)} h`, icon: <Clock3 />, to: '/recursos', sub: 'Ofertas estimadas aún abiertas' },
  ];

  return (
    <div className="mx-auto max-w-[1680px] space-y-5 px-4 py-5 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-[#8a6100]">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight md:text-[32px]">{hour < 14 ? 'Buenos días' : 'Buenas tardes'}, {user.split(' (')[0].replace('Usuario demo', 'equipo')}</h1>
          <p className="mt-1 text-[14.5px] text-ink-3">Esto es lo que los agentes han preparado y lo que necesita una decisión.</p>
        </div>
        <Link to="/demo" data-testid="start-demo" className="group flex items-center gap-3 rounded-2xl bg-navy px-4 py-3 text-white ring-1 ring-navy-border transition-shadow hover:ring-gold/50">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gold text-navy"><Play className="size-4" /></span>
          <span className="leading-tight"><span className="block text-[14px] font-semibold">Iniciar demo guiada</span><span className="text-[12px] text-muted">Ofertas de fabricación y ejemplos de Odoo</span></span>
          <ArrowRight className="size-4 text-gold transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={k.to} className="group block rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-card)] transition-[border-color] hover:border-gold/50">
              <div className="flex items-center justify-between text-[12.5px] text-ink-3"><span>{k.label}</span><span className={cx('[&>svg]:size-4', k.warn ? 'text-warn' : 'text-ink-3')}>{k.icon}</span></div>
              <div className="mt-1.5 text-[26px] font-semibold tracking-tight tabular">{k.value}</div>
              <div className="text-[12px] text-ink-3">{k.sub}</div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Requiere tu atención" icon={<AlertTriangle />} subtitle="Entradas nuevas y decisiones pendientes de todos los canales" actions={<Link to="/bandeja" className="text-[13px] font-medium text-[#8a6100] hover:underline">Bandeja completa</Link>} />
          {attention.length === 0 ? <p className="px-4 py-8 text-center text-[13.5px] text-ink-3">Todo al día.</p> : (
            <ul className="divide-y divide-line">
              {attention.map((i) => (
                <li key={i.id}>
                  <button onClick={() => nav(i.to)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gold/[0.04]">
                    <BrandLogo src={i.channel === 'whatsapp' ? '/brands/whatsapp.svg' : i.channel === 'manual' ? undefined : '/brands/gmail.svg'} name={i.channel === 'manual' ? 'Manual' : i.channel} size={28} />
                    <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-medium">{i.subject}</div><div className="truncate text-[12.5px] text-ink-3">{i.kind} · {i.from}</div></div>
                    <Badge tone={i.status === 'Nuevo' ? 'info' : 'warn'} dot>{i.status}</Badge>
                    <span className="hidden w-20 text-right text-[12px] text-ink-3 sm:block">{relativeEs(i.receivedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Actividad de los agentes" icon={<Sparkles />} subtitle="Pasos de herramientas y decisiones, más recientes primero" />
          <ol className="space-y-3 px-4 py-3">
            {activity.map((a) => {
              const ag = agentByCode(a.actor);
              return (
                <li key={a.id} className="flex gap-3">
                  <span className={cx('mt-0.5 h-fit shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px]', ag ? 'bg-navy text-white' : 'bg-gold/15 text-[#7a5600]')}>{ag ? a.actor : 'HUM'}</span>
                  <Link to={a.to} className="min-w-0 hover:underline"><div className="line-clamp-2 text-[13px] text-ink-2">{a.text}</div><div className="text-[11.5px] text-ink-3">{a.ref} · {dateTimeEs(a.at)}</div></Link>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Flujo de trabajo" subtitle="Todas las entradas por estado" />
          <div className="p-4"><StackBar format={(v) => String(v)} parts={byStatus.map((b, i) => ({ ...b, color: ['#2a78d6', '#c8921a', '#b45309', '#1baf7a'][i] }))} /></div>
          <div className="border-t border-line px-4 py-3">
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Ofertas por fase</div>
            <div className="flex flex-wrap gap-1.5">{requests.map((r) => <Link key={r.id} to={`/fabricacion/${r.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2 py-1 ring-1 ring-line hover:ring-gold/50"><span className="font-mono text-[11.5px] text-ink-3">{r.ref.replace('RFQ-2026-', '')}</span><StatePill state={r.state} /></Link>)}</div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Carga de taller" subtitle="Ofertas estimadas vs. capacidad semanal" actions={<Link to="/recursos" className="text-[13px] font-medium text-[#8a6100] hover:underline">Detalle</Link>} />
          <div className="p-4"><BarList rows={load.map((l) => ({ key: l.workcenter, label: l.workcenter, value: Math.round(l.utilization * 100), hint: `${num(l.minutes / 60, 1)} h de ${num(l.capacity / 60, 0)} h` }))} max={100} format={(v) => `${v} %`} /></div>
        </Card>
        <Card>
          <CardHeader title="Presupuestos de los agentes" subtitle="Borradores creados en Odoo tras aprobación" actions={<Link to="/odoo/ventas" className="text-[13px] font-medium text-[#8a6100] hover:underline">Ventas</Link>} />
          <div className="p-4">
            <BarList color="#c8921a" rows={offered.slice(-5).reverse().map((o) => ({ key: o.id, label: `${o.name} · ${erp.partners.find((p) => p.id === o.partnerId)?.name ?? ''}`, value: orderTotal(o) }))} format={eur} onRow={(k) => nav(`/odoo/ventas/${k}`)} empty="Aún no hay presupuestos creados por agentes" />
          </div>
        </Card>
      </div>
      <p className="text-[12px] text-ink-3">Datos locales de la demo. No son métricas de cliente.</p>
    </div>
  );
}
