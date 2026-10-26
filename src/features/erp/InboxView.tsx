import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ArrowUpRight, Check, CheckCircle2, FastForward, Inbox, Play, RotateCcw, SkipForward, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import type { ErpInboxItem, ProposedAction } from '@/domain/erp';
import { orderTotal } from '@/domain/erp';
import type { ErpRecordRef } from '@/domain/types';
import { FlowGraph, type FlowNode } from '@/components/flow/FlowGraph';
import { Badge, Button, Card, CardHeader, Input, Textarea } from '@/components/ui';
import { BrandLogo } from '@/components/layout/Brand';
import { ERP_STEPS, ARPA_FIXTURE } from '@/fixtures/erp';
import { agentByCode } from '@/fixtures/agents';
import { marginPct } from '@/services/runs/erpFlow';
import { useStudio } from '@/store/useStudio';
import { cx, dateTimeEs, eur, num } from '@/lib/format';
import { useMotionOff } from '@/lib/useMotion';
import { ModelTag } from './ErpViews';

const SCENARIO = {
  rfq: { label: 'Solicitud de oferta', agents: 'C01 · C04 · C07 · C02' },
  order: { label: 'Pedido multicanal', agents: 'C01 · C05 · C08' },
  status: { label: 'Consulta de estado', agents: 'C01 · C07 · C06' },
  pricing: { label: 'Pricing · ARPA simulado', agents: 'C02 · C05' },
} as const;

const STATE_BADGE: Record<ErpInboxItem['state'], { label: string; tone: 'info' | 'gold' | 'warn' | 'ok' }> = {
  new: { label: 'Nueva', tone: 'info' }, in_progress: { label: 'En curso', tone: 'gold' }, needs_input: { label: 'Requiere decisión', tone: 'warn' }, actions_ready: { label: 'Acciones listas', tone: 'gold' }, done: { label: 'Resuelta', tone: 'ok' },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function InboxView() {
  const { itemId } = useParams();
  const inbox = useStudio((s) => s.erp.inbox);
  if (!itemId) return <Navigate to={`/odoo/bandeja/${inbox[0].id}`} replace />;
  const item = inbox.find((i) => i.id === itemId);
  if (!item) return <Navigate to="/odoo/bandeja" replace />;
  return (
    <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_320px] 2xl:grid-cols-[280px_minmax(0,1fr)_370px]">
      <InboxList items={inbox} activeId={item.id} />
      <ItemWork key={item.id} item={item} />
      <div className="lg:col-span-2 xl:col-span-1"><ErpPanel item={item} /></div>
    </div>
  );
}

function InboxList({ items, activeId }: { items: ErpInboxItem[]; activeId: string }) {
  return (
    <Card className="h-fit overflow-hidden">
      <CardHeader title="Bandeja MTI" icon={<Inbox />} subtitle="Una ruta de ingestión por buzón · fixture" />
      <ul className="p-1.5">
        {items.map((i) => (
          <li key={i.id}>
            <Link to={`/odoo/bandeja/${i.id}`} className={cx('block rounded-xl px-3 py-2.5 transition-colors', i.id === activeId ? 'bg-gold/10 ring-1 ring-gold/35' : 'hover:bg-ink/[0.03]')}>
              <div className="flex items-center gap-2">
                <BrandLogo src={i.channel === 'whatsapp' ? '/brands/whatsapp.svg' : '/brands/gmail.svg'} name={i.channel} size={18} plate={false} />
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-3">{i.fromName}</span>
                <span className="text-[11.5px] text-ink-3">{dateTimeEs(i.receivedAt).split(' · ')[1]}</span>
              </div>
              <div className="mt-1 line-clamp-1 text-[13.5px] font-medium">{i.subject}</div>
              <div className="mt-1.5 flex items-center justify-between gap-2"><span className="text-[12px] text-ink-3">{SCENARIO[i.scenario].label}</span><Badge tone={STATE_BADGE[i.state].tone}>{STATE_BADGE[i.state].label}</Badge></div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ItemWork({ item }: { item: ErpInboxItem }) {
  const runStep = useStudio((s) => s.runErpStep);
  const resetItem = useStudio((s) => s.resetErpItem);
  const mode = useStudio((s) => s.ui.mode);
  const speed = useStudio((s) => s.ui.speed);
  const motionOff = useMotionOff();
  const steps = ERP_STEPS[item.scenario];
  const [running, setRunning] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>(() => [...steps].reverse().find((s) => item.steps[s.id])?.id ?? steps[0].id);
  const next = steps.find((s) => item.steps[s.id]?.status !== 'completed');
  const prevOk = (id: string) => steps.slice(0, steps.findIndex((s) => s.id === id)).every((s) => item.steps[s.id]?.status === 'completed');
  const canNext = Boolean(next && prevOk(next.id) && item.steps[next.id]?.status !== 'needs_input');

  const runOne = async (id: string) => {
    setRunning(id);
    setSelected(id);
    if (!motionOff) await sleep(550 / speed);
    await runStep(item.id, id);
    setRunning(null);
  };
  const runAll = async () => {
    for (const s of steps) {
      const cur = useStudio.getState().erp.inbox.find((i) => i.id === item.id)!;
      if (cur.steps[s.id]?.status === 'completed') continue;
      if (cur.steps[s.id]?.status === 'needs_input') return;
      await runOne(s.id);
      const after = useStudio.getState().erp.inbox.find((i) => i.id === item.id)!;
      if (after.steps[s.id]?.status !== 'completed') return;
      if (!motionOff) await sleep((mode === 'guided' ? 1400 : 500) / speed);
    }
  };

  const nodes: FlowNode[] = steps.map((s) => ({
    id: s.id, title: s.title, short: agentByCode(s.agent)?.name ?? '', agents: [s.agent],
    status: running === s.id ? 'running' : item.steps[s.id]?.status ?? 'idle',
    summary: running === s.id ? 'Ejecutando…' : item.steps[s.id]?.summary,
  }));
  const sel = item.steps[selected];

  return (
    <div className="min-w-0 space-y-4">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <BrandLogo src={item.channel === 'whatsapp' ? '/brands/whatsapp.svg' : '/brands/gmail.svg'} name={item.channel === 'whatsapp' ? 'WhatsApp' : 'Gmail'} size={26} />
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] text-ink-3">{item.fromName} · {item.from} · {dateTimeEs(item.receivedAt)}</div>
            <div className="text-[15px] font-semibold">{item.subject}</div>
          </div>
          <Badge tone="neutral">{item.channel === 'whatsapp' ? 'Mensaje fixture · sin API conectada' : 'Correo fixture'}</Badge>
        </div>
        <div className="px-4 py-4">
          {item.channel === 'whatsapp' ? (
            <div className="max-w-[520px] rounded-2xl rounded-tl-sm bg-[#e7f8ee] px-4 py-3 text-[14.5px] text-ink shadow-sm">{item.body}</div>
          ) : (
            <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink-2">{item.body}</p>
          )}
        </div>
      </Card>

      <section className="tech-grid overflow-hidden rounded-2xl ring-1 ring-navy-border" aria-label="Agentes del escenario">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] px-4 py-3">
          <div className="mr-auto">
            <div className="text-[14px] font-semibold text-white">{SCENARIO[item.scenario].label}</div>
            <div className="font-mono text-[11.5px] text-muted">{SCENARIO[item.scenario].agents}</div>
          </div>
          <Button size="sm" variant="outline-dark" icon={<SkipForward />} disabled={!canNext || running !== null} disabledReason={item.state === 'needs_input' ? 'Requiere una decisión humana' : 'Sin pasos pendientes'} onClick={() => next && runOne(next.id)}>Paso siguiente</Button>
          <Button size="sm" variant="primary" icon={mode === 'guided' ? <Play /> : <FastForward />} disabled={!canNext || running !== null} disabledReason="Sin pasos ejecutables" onClick={runAll}>{mode === 'guided' ? 'Reproducir' : 'Ejecutar todo'}</Button>
          <Button size="sm" variant="outline-dark" icon={<RotateCcw />} onClick={() => resetItem(item.id)} disabled={running !== null} aria-label="Reiniciar escenario">Reiniciar</Button>
        </div>
        <div className="px-2 py-1">
          <FlowGraph nodes={nodes} compact cols={4} selectedId={selected} onSelect={setSelected} packetLabel={item.scenario === 'order' ? 'WhatsApp' : 'Correo'} />
        </div>
      </section>

      <Card>
        <CardHeader title={steps.find((s) => s.id === selected)?.title ?? ''} subtitle={sel?.summary ?? 'Paso pendiente de ejecutar'}
          actions={<span className="rounded-md bg-gold/12 px-1.5 py-0.5 font-mono text-[11.5px] text-[#7a5600]">{steps.find((s) => s.id === selected)?.agent}</span>} />
        <div className="p-4">
          <AnimatePresence mode="wait">
            <motion.div key={`${selected}-${sel?.finishedAt}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
              {running === selected ? <div className="space-y-2"><div className="skeleton h-9 rounded-xl" /><div className="skeleton h-20 rounded-xl" /></div> : <ErpStepOutput item={item} stepId={selected} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </Card>

      {item.actions.length > 0 && <ActionsCard item={item} />}
    </div>
  );
}

type O = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function ErpStepOutput({ item, stepId }: { item: ErpInboxItem; stepId: string }) {
  const choose = useStudio((s) => s.chooseErp);
  const o = item.steps[stepId]?.outputs as O | undefined;
  if (!o) return <p className="text-[13.5px] text-ink-3">Sin salida todavía.</p>;
  const tbl = 'w-full text-[13.5px]';
  const th = 'py-1.5 text-left text-[12px] font-medium text-ink-3';
  if (stepId === 'read') {
    return (
      <div className="space-y-2 text-[13.5px]">
        <div><span className="text-ink-3">Intención: </span><b>{o.intent}</b></div>
        {o.lines && <table className={tbl}><thead><tr><th className={th}>Texto detectado</th><th className={th}>Cant.</th><th className={th}>Referencia</th></tr></thead><tbody>{o.lines.map((l: O) => <tr key={l.text} className="border-t border-line"><td className="py-1.5">«{l.text}»</td><td className="py-1.5 tabular">{l.qty}</td><td className="py-1.5 font-mono">{l.ref ?? <span className="text-warn">ambigua</span>}</td></tr>)}</tbody></table>}
        {o.orderRef && <div><span className="text-ink-3">Referencia: </span><span className="font-mono">{o.orderRef}</span>{o.deadline && <span className="text-ink-3"> · plazo del cliente: {o.deadline}</span>}</div>}
        {o.requestedQty != null && <div><span className="text-ink-3">Solicitado: </span>{o.requestedQty} uds al {o.requestedDiscountPct} %</div>}
      </div>
    );
  }
  if (stepId === 'partner') {
    return (
      <div className="space-y-2 text-[13.5px]">
        {o.resolved && <div className="flex items-center gap-2 rounded-xl bg-ok-bg px-3 py-2 text-ok ring-1 ring-ok/20"><CheckCircle2 className="size-4" /><span><b>{o.resolved.name}</b> → {o.resolved.companyName} <span className="opacity-75">(email exacto)</span></span></div>}
        <div className="text-[12.5px] text-ink-3">{o.rule}</div>
        <ul className="space-y-1">{o.candidates.map((c: O) => <li key={c.id} className="flex justify-between gap-2 border-t border-line pt-1"><span>{c.name}</span><span className="text-[12.5px] text-ink-3">{c.decision}</span></li>)}</ul>
      </div>
    );
  }
  if (stepId === 'context') {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <table className={tbl}><thead><tr><th className={th}>Producto</th><th className={th}>Tarifa</th><th className={th}>Disponible</th></tr></thead><tbody>{o.products.map((p: O) => { const a = o.availability.find((x: O) => x.productId === p.id); return <tr key={p.id} className="border-t border-line"><td className="py-1.5"><span className="font-mono text-[12px]">{p.ref}</span> {p.name}</td><td className="py-1.5 tabular">{eur(p.listPrice)}</td><td className="py-1.5 tabular">{a.available}{a.incoming ? ` (+${a.incoming})` : ''}</td></tr>; })}</tbody></table>
        <table className={tbl}><thead><tr><th className={th}>Histórico del cliente</th><th className={th}>Cant.</th><th className={th}>Precio</th></tr></thead><tbody>{o.history.map((h: O, i: number) => <tr key={i} className="border-t border-line"><td className="py-1.5">{h.orderName} · {h.name}</td><td className="py-1.5 tabular">{h.qty}</td><td className="py-1.5 tabular">{eur(h.priceUnit)}{h.discountPct ? ` −${h.discountPct} %` : ''}</td></tr>)}</tbody></table>
      </div>
    );
  }
  if (stepId === 'normalize') {
    return (
      <div className="space-y-2 text-[13.5px]">
        {o.partner && <div className="text-ink-3">Cliente por teléfono: <b className="text-ink">{o.partner.name}</b></div>}
        <table className={tbl}><thead><tr><th className={th}>Mensaje</th><th className={th}>Producto</th></tr></thead>
          <tbody>{o.lines.map((l: O) => (
            <tr key={l.index} className="border-t border-line align-top">
              <td className="py-2">«{l.text}»</td>
              <td className="py-2">{l.productName ? <span className="inline-flex items-center gap-1"><Check className="size-3.5 text-ok" />{l.productName}</span> : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1 text-warn"><AlertTriangle className="size-3.5" /> Referencia ambigua: elige</div>
                  <div className="flex flex-wrap gap-1.5">{l.candidates.map((c: O) => <Button key={c.id} size="sm" onClick={() => choose(item.id, `line-${l.index}`, c.id)}>{c.ref} · {c.name}</Button>)}</div>
                </div>
              )}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    );
  }
  if (stepId === 'stock' || (stepId === 'proposal' && item.scenario === 'order')) {
    const rows = o.rows as O[];
    return (
      <div className="space-y-2">
        <table className={tbl}><thead><tr><th className={th}>Producto</th><th className={th}>Pedido</th><th className={th}>Disponible</th><th className={th}>Mañana</th><th className={th}>Pendiente</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.index} className="border-t border-line"><td className="py-1.5">{r.productName}</td><td className="py-1.5 tabular">{r.qty}</td><td className="py-1.5 tabular">{r.available}</td><td className="py-1.5 tabular">{r.now}</td><td className={cx('py-1.5 tabular', r.backorder && 'font-semibold text-warn')}>{r.backorder || '—'}{r.backorder ? ` (entrante ${r.incoming})` : ''}</td></tr>)}</tbody>
        </table>
        {o.note && <p className="text-[12.5px] text-ink-3">{o.note}</p>}
        {o.preview && <div className="text-[13.5px]">Total propuesto: <b className="tabular">{eur(o.preview.amountUntaxed)}</b> sin IVA · no se confirma el pedido</div>}
      </div>
    );
  }
  if (stepId === 'proposal') {
    return (
      <div className="space-y-2">
        <table className={tbl}><thead><tr><th className={th}>Línea</th><th className={th}>Cant.</th><th className={th}>Precio</th><th className={th}>Subtotal</th></tr></thead><tbody>{o.preview.lines.map((l: O) => <tr key={l.name} className="border-t border-line"><td className="py-1.5">{l.name}</td><td className="py-1.5 tabular">{l.qty}</td><td className="py-1.5 tabular">{eur(l.priceUnit)}</td><td className="py-1.5 tabular">{eur(l.subtotal)}</td></tr>)}</tbody></table>
        <div className="text-[13.5px]">Base imponible: <b className="tabular">{eur(o.preview.amountUntaxed)}</b> · tarifa general (la instancia aplicaría su pricelist)</div>
      </div>
    );
  }
  if (stepId === 'lookup') return <div className="text-[13.5px]"><Link to={`/odoo/ventas/${o.order.id}`} className="font-semibold text-info hover:underline">{o.order.name}</Link> · {o.order.partnerName} · {eur(o.order.amountUntaxed)} · {o.order.state === 'sale' ? 'pedido confirmado' : o.order.state}<div className="mt-1 text-ink-3">{o.order.lines.map((l: O) => `${l.qty} × ${l.name}`).join(' · ')}</div></div>;
  if (stepId === 'delivery') return <div className="space-y-1 text-[13.5px]">{o.deliveries.map((d: O) => <div key={d.id}><Link to={`/odoo/entregas/${d.id}`} className="font-semibold text-info hover:underline">{d.name}</Link> · {d.state === 'done' ? `salió el ${new Date(d.dateDone).toLocaleDateString('es-ES')}` : d.state} · {d.carrier} · seguimiento <span className="font-mono">{d.trackingRef}</span></div>)}</div>;
  if (stepId === 'reply') return <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-ink-2">{o.reply}</pre>;
  if (stepId === 'quote') return <div className="text-[13.5px]"><Link to={`/odoo/ventas/${o.order.id}`} className="font-semibold text-info hover:underline">{o.order.name} v{o.order.version}</Link> · {o.line.qty} × {o.product.ref} a {eur(o.product.listPrice)} con {o.line.discountPct} % de descuento</div>;
  if (stepId === 'arpa') return <div className="space-y-1 text-[13.5px]"><div>Coste de referencia: <b className="tabular">{eur(o.cost)}</b> (tramo {o.tier}) · versión {o.version}</div><div className="flex items-center gap-1.5 rounded-lg bg-warn-bg px-2.5 py-1.5 text-[12.5px] text-warn"><AlertTriangle className="size-3.5" />{o.note}</div></div>;
  if (stepId === 'margin') {
    return (
      <div className="space-y-2">
        <table className={tbl}><thead><tr><th className={th}>Escenario</th><th className={th}>Cant.</th><th className={th}>Desc.</th><th className={th}>Precio ud</th><th className={th}>Coste</th><th className={th}>Margen</th><th className={th}>Total</th></tr></thead>
          <tbody>{o.scenarios.map((s: O) => <tr key={s.label} className={cx('border-t border-line', s.label === 'Propuesto' && 'bg-gold/[0.07] font-medium')}><td className="py-1.5">{s.label}</td><td className="py-1.5 tabular">{s.qty}</td><td className="py-1.5 tabular">{num(s.discountPct, 1)} %</td><td className="py-1.5 tabular">{eur(s.price)}</td><td className="py-1.5 tabular">{eur(s.cost)}</td><td className={cx('py-1.5 tabular', s.margin < o.minMarginPct ? 'text-err' : 'text-ok')}>{num(s.margin, 1)} %</td><td className="py-1.5 tabular">{eur(s.total)}</td></tr>)}</tbody>
        </table>
        <p className="text-[12.5px] text-ink-3">Política: margen mínimo {o.minMarginPct} % (fixture) · descuento máximo con el coste ARPA simulado: {num(o.maxDiscountPct, 1)} %</p>
      </div>
    );
  }
  return <pre className="text-[12px]">{JSON.stringify(o, null, 2)}</pre>;
}

function ActionsCard({ item }: { item: ErpInboxItem }) {
  const apply = useStudio((s) => s.applyErpAction);
  const reject = useStudio((s) => s.rejectErpAction);
  const update = useStudio((s) => s.updateActionPayload);
  const markSent = useStudio((s) => s.markReplySent);
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <Card>
      <CardHeader title="Acciones propuestas" subtitle="Herramientas de escritura permitidas por lista explícita. Ninguna se aplica sin tu aprobación." />
      <ul className="divide-y divide-line">
        {item.actions.map((a) => (
          <li key={a.id} className="px-4 py-3.5" data-action={a.kind}>
            <div className="flex flex-wrap items-start gap-3">
              <span className="mt-0.5 rounded-md bg-gold/12 px-1.5 py-0.5 font-mono text-[11.5px] text-[#7a5600]">{a.agent}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium">{a.title}</div>
                <div className="text-[12.5px] text-ink-3">{a.description}</div>
                {a.error && <div className="mt-1 text-[12.5px] text-err">{a.error}</div>}
              </div>
              <ActionStatus a={a} />
            </div>
            {a.kind === 'update_quotation' && a.status === 'proposed' && <PricingEditor a={a} onChange={(p) => update(item.id, a.id, p)} />}
            {a.kind === 'reply_draft' && a.status === 'proposed' && <Textarea className="mt-2 text-[13.5px]" rows={5} value={String(a.payload.text)} onChange={(e) => update(item.id, a.id, { text: e.target.value })} aria-label="Texto de la respuesta" />}
            {a.status === 'proposed' && (
              <div className="mt-2.5 flex gap-2">
                <Button size="sm" variant="primary" icon={<Check />} disabled={busy !== null} onClick={async () => { setBusy(a.id); await apply(item.id, a.id); setBusy(null); }}>{a.kind === 'reply_draft' ? 'Aprobar borrador' : 'Aprobar y aplicar'}</Button>
                <Button size="sm" variant="ghost" icon={<X />} onClick={() => reject(item.id, a.id)}>Descartar</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {item.replyDraft && item.actions.some((a) => a.kind === 'reply_draft' && a.status === 'applied') && (
        <div className="border-t border-line px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[13px] font-medium">Respuesta</span>
            {item.replyStatus === 'sent_local' ? <Badge tone="ok">Enviado (etiqueta local)</Badge> : <Button size="sm" onClick={() => markSent(item.id)}>Marcar como enviado (local)</Button>}
          </div>
          <pre className="whitespace-pre-wrap rounded-xl bg-canvas p-3 font-sans text-[13px] leading-relaxed text-ink-2 ring-1 ring-line">{item.replyDraft}</pre>
        </div>
      )}
    </Card>
  );
}

function ActionStatus({ a }: { a: ProposedAction }) {
  if (a.status === 'applied') return a.result ? <RecordLink r={a.result} badge /> : <Badge tone="ok">Aprobado</Badge>;
  if (a.status === 'rejected') return <Badge tone="neutral">Descartada</Badge>;
  if (a.status === 'failed') return <Badge tone="err">Error</Badge>;
  return <Badge tone="gold">Propuesta</Badge>;
}

export function recordPath(r: ErpRecordRef) {
  if (r.model === 'crm.lead') return `/odoo/crm/${r.localId}`;
  if (r.model === 'sale.order') return `/odoo/ventas/${r.localId}`;
  return '/odoo';
}

function RecordLink({ r, badge }: { r: ErpRecordRef; badge?: boolean }) {
  return (
    <Link to={recordPath(r)} className={cx('inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-medium', badge ? 'bg-ok-bg text-ok ring-1 ring-ok/20 hover:ring-ok/50' : 'text-info hover:underline')}>
      <CheckCircle2 className="size-3.5" />{r.name}<ArrowUpRight className="size-3.5" />
    </Link>
  );
}

function PricingEditor({ a, onChange }: { a: ProposedAction; onChange: (p: Record<string, unknown>) => void }) {
  const p = a.payload as { qty: number; discountPct: number; listPrice: number; cost: number };
  const [qty, setQty] = useState(String(p.qty));
  const [disc, setDisc] = useState(String(p.discountPct));
  useEffect(() => { setQty(String(p.qty)); setDisc(String(p.discountPct)); }, [p.qty, p.discountPct]);
  const price = p.listPrice * (1 - Number(disc) / 100);
  const m = marginPct(price, p.cost);
  const below = m < ARPA_FIXTURE.minMarginPct;
  return (
    <div className="mt-2.5 flex flex-wrap items-end gap-3 rounded-xl bg-canvas p-3 ring-1 ring-line">
      <label className="text-[12.5px] text-ink-3">Cantidad<Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} onBlur={() => Number(qty) > 0 && onChange({ qty: Number(qty) })} className="mt-1 h-8 w-24 py-1" /></label>
      <label className="text-[12.5px] text-ink-3">Descuento %<Input type="number" step="0.5" value={disc} onChange={(e) => setDisc(e.target.value)} onBlur={() => Number(disc) >= 0 && onChange({ discountPct: Number(disc) })} className="mt-1 h-8 w-24 py-1" /></label>
      <div className="text-[13px]">
        <div className="text-ink-3">Precio ud / total</div>
        <div className="font-medium tabular">{eur(price)} · {eur(price * Number(qty || 0))}</div>
      </div>
      <div className="text-[13px]">
        <div className="text-ink-3">Margen (coste ARPA simulado)</div>
        <div className={cx('font-semibold tabular', below ? 'text-err' : 'text-ok')}>{num(m, 1)} %</div>
      </div>
      {below && <div className="flex items-center gap-1.5 text-[12.5px] text-err"><AlertTriangle className="size-3.5" />Por debajo del {ARPA_FIXTURE.minMarginPct} % mínimo</div>}
    </div>
  );
}

function ErpPanel({ item }: { item: ErpInboxItem }) {
  const erp = useStudio((s) => s.erp);
  const setTimeoutSim = useStudio((s) => s.setSimulateTimeout);
  const meeting = useStudio((s) => s.ui.meeting);
  const nav = useNavigate();
  const records = useMemo(() => {
    const out: { key: string; model: string; title: string; sub: string; to: string; fresh?: boolean }[] = [];
    const o = (id: string) => item.steps[id]?.outputs as O | undefined;
    const partnerId = o('partner')?.resolved?.companyId ?? o('normalize')?.partner?.id;
    const partner = erp.partners.find((p) => p.id === partnerId);
    if (partner) out.push({ key: partner.id, model: 'res.partner', title: partner.name, sub: partner.email ?? partner.phone ?? '', to: `/odoo/contactos/${partner.id}` });
    for (const a of item.actions) {
      if (a.status !== 'applied' || !a.result) continue;
      if (a.result.model === 'crm.lead') { const l = erp.leads.find((x) => x.id === a.result!.localId); if (l) out.push({ key: l.id, model: 'crm.lead', title: l.name, sub: `${l.stage} · ${eur(l.expectedRevenue)}`, to: `/odoo/crm/${l.id}`, fresh: true }); }
      if (a.result.model === 'sale.order') { const so = erp.saleOrders.find((x) => x.id === a.result!.localId); if (so) out.push({ key: so.id + a.id, model: 'sale.order', title: `${so.name}${so.version > 1 ? ` v${so.version}` : ''}`, sub: `${so.state === 'draft' ? 'Borrador' : so.state} · ${eur(orderTotal(so))}`, to: `/odoo/ventas/${so.id}`, fresh: true }); }
    }
    const ref = o('lookup')?.order ?? o('quote')?.order;
    if (ref && !out.some((r) => r.key.startsWith(ref.id))) { const so = erp.saleOrders.find((x) => x.id === ref.id)!; out.push({ key: so.id, model: 'sale.order', title: `${so.name}${so.version > 1 ? ` v${so.version}` : ''}`, sub: `${so.state === 'sale' ? 'Pedido de venta' : 'Presupuesto'} · ${eur(orderTotal(so))}`, to: `/odoo/ventas/${so.id}` }); }
    for (const d of (o('delivery')?.deliveries ?? []) as O[]) out.push({ key: d.id, model: 'stock.picking', title: d.name, sub: `${d.state === 'done' ? 'Hecho' : d.state} · ${d.trackingRef ?? ''}`, to: `/odoo/entregas/${d.id}` });
    for (const r of ((o('stock')?.rows ?? []) as O[])) out.push({ key: `q-${r.productId}`, model: 'stock.quant', title: r.productName, sub: `Disponible ${r.available}${r.backorder ? ` · faltan ${r.backorder}` : ''}`, to: '/odoo/inventario' });
    return out;
  }, [item, erp]);
  return (
    <Card className="h-fit overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-line bg-[#714b67]/[0.06] px-4 py-3">
        <BrandLogo src="/brands/odoo.svg" name="Odoo" size={26} />
        <div><div className="text-[14px] font-semibold">Registros ERP vinculados</div><div className="text-[12px] text-ink-3">Representación MTI · adapter demo</div></div>
      </div>
      {records.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-ink-3">Ejecuta los pasos para ver qué registros consulta o propone cada agente.</p>
      ) : (
        <ul className="divide-y divide-line">
          <AnimatePresence initial={false}>
            {records.map((r) => (
              <motion.li key={r.key} layout initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}>
                <button onClick={() => nav(r.to)} className={cx('flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gold/[0.04]', r.fresh && 'bg-ok-bg/50')}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><ModelTag m={r.model} />{r.fresh && <Badge tone="ok">Creado</Badge>}</div>
                    <div className="mt-1 truncate text-[13.5px] font-medium">{r.title}</div>
                    <div className="truncate text-[12px] text-ink-3">{r.sub}</div>
                  </div>
                  <ArrowUpRight className="size-4 text-ink-3" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      {!meeting && (
        <label className="flex items-start gap-2.5 border-t border-line bg-canvas/60 px-4 py-3 text-[12.5px] text-ink-3">
          <input type="checkbox" className="mt-0.5 size-4 accent-[#e6a817]" checked={erp.simulateTimeoutOnce} onChange={(e) => setTimeoutSim(e.target.checked)} />
          <span><b className="text-ink-2">Simular timeout tras la próxima escritura.</b> El adapter escribe pero no confirma; la acción reconcilia por clave de idempotencia antes de reintentar.</span>
        </label>
      )}
    </Card>
  );
}
