// Historias guiadas del workspace Odoo. Mismo guion para cuatro ejemplos inspirados en la
// presentación (TÉCNICAS DEL MAR, GALPI). Cada escena ejecuta los pasos reales del escenario.
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Bell, CheckCircle2, Factory, FileText, Hand, Inbox, Package, Send, Truck } from 'lucide-react';
import type { ErpScenario } from '@/domain/erp';
import { orderTotal } from '@/domain/erp';
import { BrandLogo } from '@/components/layout/Brand';
import { ARPA_FIXTURE, ERP_STEPS } from '@/fixtures/erp';
import { useStudio } from '@/store/useStudio';
import { cx, dateEs, eur, num } from '@/lib/format';
import { AgentPulse, AppWindow, CountUp, MultiHighlight, Reveal, ScanLine, Typewriter } from './kit';
import { BrainCloud, type CloudDoc } from './BrainCloud';
import type { DemoScenario } from './types';

const S = () => useStudio.getState();
type O = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

interface Cfg {
  itemId: string; title: string; subtitle: string; reference: string;
  needles: string[]; selected: string[]; rejected: { id: string; reason: string }[];
  query: string; center: string; brainTitle: string; brainNarration: string; proposalTitle: string; proposalNarration: string; odooNarration: string;
}

const CFG: Record<ErpScenario, Cfg> = {
  rfq: {
    itemId: 'in-rfq', title: 'Odoo · Solicitud de oferta', subtitle: 'Correo de cliente → contacto resuelto → oportunidad y presupuesto borrador', reference: 'TÉCNICAS DEL MAR',
    needles: ['200 casquillos de bronce CB-30', '50 ejes inox EJ-12', 'precio y plazo'],
    selected: ['p-oceano', 'pr-cb30', 'pr-ej12', 'so-22', 'so-29'], rejected: [{ id: 'p-oceanovigo', reason: 'solo coincide el nombre: no se asocia' }],
    query: 'compras@conservasoceano.example · CB-30 · EJ-12', center: 'C04 · CRM + C07',
    brainTitle: 'Se consulta Odoo: cliente, productos e histórico', brainNarration: 'CRM resuelve el contacto por email exacto (no por un nombre parecido) y Conocimiento recupera productos, tarifas y los pedidos anteriores del cliente.',
    proposalTitle: 'Se prepara el presupuesto', proposalNarration: 'Ofertas compone las líneas con la tarifa de la instancia, revisa disponibilidad y redacta la respuesta.',
    odooNarration: 'Con tu aprobación, se crea la oportunidad en el CRM y el presupuesto borrador en Ventas, enlazados entre sí. La respuesta queda en borrador.',
  },
  order: {
    itemId: 'in-order', title: 'Odoo · Pedido por WhatsApp', subtitle: 'Mensaje informal → líneas normalizadas → stock → propuesta de pedido', reference: 'TÉCNICAS DEL MAR · multicanal',
    needles: ['40 ánodos AZ-12', '10 juntas de 50', '6 filtros FG-8', 'para mañana'],
    selected: ['p-bueu', 'pr-az12', 'pr-jt50', 'pr-fg8'], rejected: [{ id: 'pr-jt50r', reason: 'alternativa descartada por la persona' }],
    query: '+34 600 000 112 · AZ-12 · «juntas de 50» · FG-8', center: 'C05 · Pedidos + C08',
    brainTitle: 'Se normalizan las referencias contra el catálogo', brainNarration: 'Pedidos traduce el lenguaje informal a productos de Odoo. «Juntas de 50» es ambiguo: el sistema no adivina, pregunta, y una persona elige.',
    proposalTitle: 'Se comprueba el stock', proposalNarration: 'Calidad compara lo pedido con el stock disponible: falta material de una línea y se propone entrega parcial en lugar de prometer lo que no hay.',
    odooNarration: 'Se crea la propuesta de pedido como presupuesto borrador; no se confirma ningún pedido automáticamente. La respuesta por WhatsApp queda lista para revisar.',
  },
  status: {
    itemId: 'in-status', title: 'Odoo · ¿Ha salido mi pedido?', subtitle: 'Consulta de estado → pedido y entrega vinculada → respuesta en borrador', reference: 'TÉCNICAS DEL MAR · postventa',
    needles: ['S00031', 'el jueves'],
    selected: ['so-31', 'pk-27', 'p-marina'], rejected: [{ id: 'so-29', reason: 'otro cliente' }],
    query: 'S00031 · entregas · transportista', center: 'C07 · Conocimiento + C06',
    brainTitle: 'Se localizan el pedido y su entrega', brainNarration: 'Conocimiento encuentra el pedido; Documentos y logística sigue el albarán vinculado, el transportista y el número de seguimiento.',
    proposalTitle: 'Se reconstruye la trazabilidad', proposalNarration: 'Del pedido a la fabricación y a la salida del almacén, con fechas reales del ERP. La respuesta se redacta con esos datos, sin inventar.',
    odooNarration: 'Esta consulta no escribe nada en Odoo: solo lee. La respuesta queda en borrador para que alguien la envíe.',
  },
  pricing: {
    itemId: 'in-pricing', title: 'Odoo · Revisión de precio con ARPA', subtitle: 'Petición de descuento → coste → margen → nueva versión del presupuesto', reference: 'GALPI · Odoo + ARPA',
    needles: ['S00035', '250 válvulas VB-2', '12 %'],
    selected: ['so-35', 'pr-vb2', 'arpa-vb2', 'p-lameiro'], rejected: [],
    query: 'S00035 · VB-2 · 250 uds · coste ARPA', center: 'C02 · Ofertas + C05',
    brainTitle: 'Se recupera el presupuesto y el coste', brainNarration: 'Ofertas recupera el presupuesto en Odoo y consulta el coste por tramo en ARPA (simulado hasta tener su especificación).',
    proposalTitle: 'Se recalcula el margen', proposalNarration: 'El 12 % pedido deja el margen por debajo de la política. El agente propone el máximo descuento que la respeta y lo explica.',
    odooNarration: 'Con tu aprobación, el presupuesto se actualiza como nueva versión en Odoo y se prepara la respuesta al cliente.',
  },
};

const useItem = (id: string) => useStudio((s) => s.erp.inbox.find((i) => i.id === id)!);

function Arrival({ t, itemId }: { t: number; itemId: string }) {
  const item = useItem(itemId);
  const wa = item.channel === 'whatsapp';
  return (
    <div className="relative grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      {wa ? (
        <div className="flex items-center justify-center">
          <div className="w-[340px] overflow-hidden rounded-[36px] bg-[#0b141a] p-2.5 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] ring-1 ring-white/15">
            <div className="flex items-center gap-2 rounded-t-[28px] bg-[#075e54] px-4 py-3"><BrandLogo src="/brands/whatsapp.svg" name="WhatsApp" size={26} plate={false} /><div><div className="text-[14px] font-semibold">{item.fromName}</div><div className="text-[11.5px] text-white/70">{item.from}</div></div></div>
            <div className="h-[380px] space-y-2 bg-[#efe7dc] p-3">
              {t >= 900 && t < 2200 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-14 rounded-xl bg-white px-3 py-2 text-[18px] leading-none text-ink-3">···</motion.div>}
              <Reveal t={t} at={2200}><div className="max-w-[260px] rounded-xl rounded-tl-sm bg-white px-3 py-2 text-[14px] text-ink shadow-sm">{item.body}<div className="mt-1 text-right text-[10.5px] text-ink-3">07:58</div></div></Reveal>
            </div>
          </div>
        </div>
      ) : (
        <AppWindow section="Bandeja MTI · ventas@talleresdelta.example" className="h-full" right={<BrandLogo src="/brands/gmail.svg" name="Gmail" size={20} plate={false} />}>
          <div className="p-2">
            <div className="flex items-center gap-2 px-3 py-2 text-[12.5px] font-semibold text-ink-3"><Inbox className="size-4" />Entrada</div>
            <Reveal t={t} at={900} y={-24}>
              <div className="flex items-center gap-3 rounded-xl bg-gold/[0.1] px-4 py-3.5 ring-1 ring-gold/40">
                <span className="size-2 rounded-full bg-gold" />
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-[13px] text-ink"><b>{item.fromName}</b><span className="rounded bg-gold px-1.5 text-[10.5px] font-bold text-navy">NUEVO</span></div><div className="truncate text-[14px] font-semibold text-ink">{item.subject}</div></div>
              </div>
            </Reveal>
            {S().erp.inbox.filter((i) => i.id !== itemId).map((i) => <div key={i.id} className="border-b border-line px-4 py-3 text-[13.5px] text-ink-3 opacity-70">{i.fromName} · {i.subject}</div>)}
          </div>
        </AppWindow>
      )}
      <div className="flex flex-col justify-center gap-3">
        <Reveal t={t} at={2800}><AgentPulse code="C01" label="Correo · detecta y clasifica el mensaje" active={t < 4800} done={t >= 4800} /></Reveal>
        <Reveal t={t} at={4800}><div className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10"><div className="text-[12px] text-muted">Intención detectada</div><div className="mt-1 text-[18px] font-semibold text-gold-light">{CFG[item.scenario].title.replace('Odoo · ', '')}</div><div className="mt-1 text-[12.5px] text-secondary">Una sola ruta de ingestión por buzón: sin duplicados.</div></div></Reveal>
      </div>
      <AnimatePresence>
        {t >= 900 && t < 5500 && (
          <motion.div initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }} transition={{ type: 'spring', duration: 0.6, bounce: 0.25 }}
            className="absolute right-2 top-2 z-20 flex w-[320px] items-start gap-3 rounded-2xl bg-white p-3.5 text-ink shadow-2xl ring-1 ring-gold/50">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold text-navy"><Bell className="size-5" /></span>
            <div className="min-w-0"><div className="text-[13px] font-semibold">{wa ? 'Nuevo WhatsApp' : 'Nuevo correo'} · {item.fromName.split(' · ')[0]}</div><div className="truncate text-[12.5px] text-ink-3">{item.subject}</div></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Read({ t, itemId }: { t: number; itemId: string }) {
  const item = useItem(itemId);
  const cfg = CFG[item.scenario];
  const o = item.steps.read?.outputs as O | undefined;
  const at = (i: number) => 2200 + i * 900;
  const rows: [string, string][] = o?.lines?.map((l: O) => [`«${l.text}»`, l.ref ?? 'ambigua']) ?? [
    ...(o?.orderRef ? [['Referencia', o.orderRef] as [string, string]] : []),
    ...(o?.requestedQty ? [['Cantidad pedida', `${o.requestedQty} uds`] as [string, string], ['Descuento pedido', `${o.requestedDiscountPct} %`] as [string, string]] : []),
    ...(o?.deadline ? [['Plazo del cliente', o.deadline] as [string, string]] : []),
  ];
  return (
    <AppWindow section="Odoo › Bandeja MTI › Lectura del mensaje" className="h-full">
      <div className="grid h-full lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="relative overflow-hidden p-6">
          <ScanLine t={t} from={300} dur={1800} />
          <div className="text-[12.5px] text-ink-3">{item.fromName} · {item.from}</div>
          <h2 className="mt-1 text-[19px] font-semibold text-ink">{item.subject}</h2>
          <MultiHighlight className="mt-4 block whitespace-pre-wrap text-[16px] leading-[1.75] text-ink-2" text={item.body} marks={cfg.needles.map((n, i) => ({ needle: n, on: t >= at(i), active: t >= at(i) && t < at(i + 1) }))} />
        </div>
        <div className="border-l border-line bg-[#f8fafc] p-4">
          <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Datos estructurados</div>
          <Reveal t={t} at={1500}><div className="mb-2 rounded-xl bg-navy px-3 py-2 text-[13px] text-white">Intención: <b className="text-gold-light">{o?.intent ?? '…'}</b></div></Reveal>
          {rows.map(([k, v], i) => (
            <Reveal key={k + i} t={t} at={at(i) + 300} x={24} y={0}>
              <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-line"><span className="text-[13px] text-ink-2">{k}</span><span className={cx('font-mono text-[13px] font-semibold', v === 'ambigua' ? 'text-warn' : 'text-ink')}>{v}</span></div>
            </Reveal>
          ))}
        </div>
      </div>
    </AppWindow>
  );
}

function ErpBrain({ t, itemId }: { t: number; itemId: string }) {
  const item = useItem(itemId);
  const erp = useStudio((s) => s.erp);
  const cfg = CFG[item.scenario];
  const all: CloudDoc[] = [
    ...erp.partners.filter((p) => p.isCompany).map((p) => ({ id: p.id, label: p.name, sub: `res.partner · ${p.city}`, kind: 'partner' as const })),
    ...erp.products.filter((p) => p.type !== 'service').map((p) => ({ id: p.id, label: p.defaultCode, sub: `product · ${p.name}`, kind: 'product' as const })),
    ...erp.saleOrders.slice(0, 6).map((o) => ({ id: o.id, label: o.name, sub: `sale.order · ${eur(orderTotal(o))}`, kind: 'order' as const })),
    ...erp.pickings.map((p) => ({ id: p.id, label: p.name, sub: 'stock.picking', kind: 'picking' as const })),
    ...(item.scenario === 'pricing' ? [{ id: 'arpa-vb2', label: 'ARPA · VB-2', sub: 'coste por tramo (simulado)', kind: 'arpa' as const }] : []),
  ];
  // Relevantes + descartados + contexto, hasta 16, en orden estable para que no queden juntos.
  const keep = new Set([...cfg.selected, ...cfg.rejected.map((r) => r.id)]);
  const docs = [...all.filter((d) => keep.has(d.id)), ...all.filter((d) => !keep.has(d.id))].slice(0, 16).sort((a, b) => a.sub.localeCompare(b.sub) || a.id.localeCompare(b.id));
  const ambiguous = item.scenario === 'order';
  const chosen = item.choices['line-1'];
  return (
    <BrainCloud t={t} docs={docs} selected={cfg.selected.filter((id) => docs.some((d) => d.id === id))} rejected={cfg.rejected}
      query={cfg.query} centerLabel={cfg.center} centerSub={`${all.length} registros de Odoo (demo)`}
      scanAt={1500} matchAt={ambiguous ? 6400 : 4600} flyAt={ambiguous ? 7400 : 5800}
      selectedTitle="Registros relevantes" rejectedTitle="Descartados"
      footer={ambiguous && t >= 2800 ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-[#f59e0b]/12 p-3 ring-1 ring-[#f59e0b]/40">
          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#fcd34d]"><AlertTriangle className="size-4" />«10 juntas de 50» es ambiguo</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[['pr-jt50', 'JT-50 · nitrilo'], ['pr-jt50r', 'JT-50R · reforzada']].map(([id, l]) => (
              <span key={id} className={cx('rounded-lg px-2 py-1.5 text-center text-[12px] ring-1 transition-colors duration-500', chosen === id ? 'bg-gold text-navy ring-gold' : 'bg-white/[0.05] text-secondary ring-white/15')}>{l}</span>
            ))}
          </div>
          {chosen && <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-[#86efac]"><Hand className="size-3.5" />Decisión humana registrada</div>}
        </motion.div>
      ) : null}
    />
  );
}

function Proposal({ t, itemId }: { t: number; itemId: string }) {
  const item = useItem(itemId);
  const erp = useStudio((s) => s.erp);
  const steps = ERP_STEPS[item.scenario];
  const out = (id: string) => item.steps[id]?.outputs as O | undefined;
  const last = out(steps[steps.length - 1].id);
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10">
        {!last && <div className="text-[13px] text-muted">Calculando…</div>}
        {last && item.scenario === 'rfq' && (
          <>
            <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-wider text-gold-light">Presupuesto propuesto</div>
            {last.preview.lines.map((l: O, i: number) => (
              <Reveal key={l.name} t={t} at={500 + i * 700} x={-20} y={0}>
                <div className="mb-2 flex items-center justify-between rounded-xl bg-white/[0.05] px-4 py-3 ring-1 ring-white/10"><div><div className="text-[14.5px] font-semibold">{l.name}</div><div className="text-[12px] text-muted">{l.qty} uds × {eur(l.priceUnit)}</div></div><div className="text-[16px] font-semibold tabular">{eur(l.subtotal)}</div></div>
              </Reveal>
            ))}
            <Reveal t={t} at={2200}>
              <div className="mt-3 flex items-end justify-between rounded-2xl bg-gold/12 p-4 ring-1 ring-gold/40"><span className="text-[13px] text-gold-light">Base imponible</span><span className="text-[32px] font-semibold"><CountUp t={t} from={2200} value={last.preview.amountUntaxed} format={eur} /></span></div>
            </Reveal>
            <Reveal t={t} at={3200}><div className="mt-3 text-[12.5px] text-secondary">{last.availability.map((a: O) => `${erp.products.find((p) => p.id === a.productId)?.defaultCode}: ${a.available} disp.${a.incoming ? ` (+${a.incoming} entrante)` : ''}`).join(' · ')}</div></Reveal>
          </>
        )}
        {last && item.scenario === 'order' && (
          <>
            <div className="mb-3 text-[11.5px] font-semibold uppercase tracking-wider text-gold-light">Pedido vs stock</div>
            {(last.rows as O[]).map((r, i) => (
              <Reveal key={r.index} t={t} at={500 + i * 800}>
                <div className="mb-3">
                  <div className="mb-1 flex justify-between text-[13.5px]"><span className="font-medium">{r.productName}</span><span className={cx('tabular', r.backorder ? 'text-[#fcd34d]' : 'text-secondary')}>{r.now}/{r.qty} para mañana{r.backorder ? ` · faltan ${r.backorder}` : ''}</span></div>
                  <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
                    <motion.div className="h-full rounded-full bg-[#22c55e]" initial={{ width: 0 }} animate={{ width: `${(r.now / r.qty) * 100}%` }} transition={{ duration: 0.8 }} />
                    {r.backorder > 0 && <motion.div className="absolute top-0 h-full bg-[#f59e0b]" style={{ left: `${(r.now / r.qty) * 100}%` }} initial={{ width: 0 }} animate={{ width: `${(r.backorder / r.qty) * 100}%` }} transition={{ duration: 0.8, delay: 0.5 }} />}
                  </div>
                </div>
              </Reveal>
            ))}
            <Reveal t={t} at={3400}><div className="mt-2 flex items-end justify-between rounded-2xl bg-gold/12 p-4 ring-1 ring-gold/40"><span className="text-[13px] text-gold-light">Total propuesto · entrega parcial</span><span className="text-[28px] font-semibold"><CountUp t={t} from={3400} value={last.preview.amountUntaxed} format={eur} /></span></div></Reveal>
          </>
        )}
        {last && item.scenario === 'status' && (() => {
          const ctx = out('lookup')?.order; const d = (out('delivery')?.deliveries ?? [])[0];
          const mo = erp.productions.find((m) => m.origin === ctx?.name);
          const tl: [React.ReactNode, string, string][] = [
            [<FileText key="a" />, `Pedido ${ctx?.name} confirmado`, ctx ? dateEs(ctx.dateOrder) : ''],
            [<Factory key="b" />, `Fabricación ${mo?.name ?? ''} terminada`, mo ? `inicio ${dateEs(mo.dateStart)}` : ''],
            [<Package key="c" />, `Albarán ${d?.name} validado`, d?.dateDone ? dateEs(d.dateDone) : ''],
            [<Truck key="d" />, `${d?.carrier}`, `seguimiento ${d?.trackingRef}`],
          ];
          return (
            <>
              <div className="mb-4 text-[11.5px] font-semibold uppercase tracking-wider text-gold-light">Trazabilidad del pedido</div>
              <ol className="relative space-y-4 pl-2">
                <span className="absolute bottom-3 left-[23px] top-3 w-px bg-white/15" />
                {tl.map(([icon, a, b], i) => (
                  <Reveal key={a} t={t} at={500 + i * 900} x={-16} y={0}>
                    <li className="relative flex items-center gap-3"><span className="relative z-10 flex size-8 items-center justify-center rounded-full bg-[#16a34a] text-white [&>svg]:size-4">{icon}</span><div><div className="text-[14.5px] font-semibold">{a}</div><div className="text-[12px] text-muted">{b}</div></div></li>
                  </Reveal>
                ))}
              </ol>
            </>
          );
        })()}
        {last && item.scenario === 'pricing' && (
          <>
            <div className="mb-4 text-[11.5px] font-semibold uppercase tracking-wider text-gold-light">Margen por escenario · mínimo {ARPA_FIXTURE.minMarginPct} %</div>
            <div className="relative flex h-[230px] items-end gap-8 border-b border-white/15 px-6">
              <div className="absolute inset-x-0 border-t border-dashed border-[#f87171]" style={{ bottom: `${(ARPA_FIXTURE.minMarginPct / 25) * 100}%` }}><span className="absolute -top-5 right-0 text-[11px] text-[#fca5a5]">mínimo {ARPA_FIXTURE.minMarginPct} %</span></div>
              {(last.scenarios as O[]).map((s, i) => (
                <div key={s.label} className="flex flex-1 flex-col items-center justify-end" style={{ height: '100%' }}>
                  <span className="mb-1 text-[13px] font-semibold tabular">{t >= 500 + i * 700 ? `${num(s.margin, 1)} %` : ''}</span>
                  <motion.div className={cx('w-full max-w-[90px] rounded-t-lg', s.margin < last.minMarginPct ? 'bg-[#f87171]' : s.label === 'Propuesto' ? 'bg-gold' : 'bg-[#60a5fa]')} initial={{ height: 0 }} animate={{ height: t >= 500 + i * 700 ? `${(s.margin / 25) * 100}%` : 0 }} transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-8 px-6">{(last.scenarios as O[]).map((s) => <div key={s.label} className="flex-1 text-center text-[12px] text-secondary"><b className="text-white">{s.label}</b><br />{s.qty} uds · {num(s.discountPct, 1)} %</div>)}</div>
          </>
        )}
      </div>
      <Reveal t={t} at={3600} className="h-full">
        <div className="h-full rounded-2xl bg-white p-4 text-ink shadow-xl">
          <div className="mb-2 flex items-center gap-2 text-[12.5px] text-ink-3"><Send className="size-4" />Respuesta · <b className="text-ink-2">borrador, no enviada</b></div>
          {t >= 4000 && <Typewriter t={t} from={4000} text={item.replyDraft ?? ''} cps={120} className="block font-sans text-[13.5px] leading-relaxed text-ink-2" />}
        </div>
      </Reveal>
    </div>
  );
}

function OdooWrite({ t, itemId }: { t: number; itemId: string }) {
  const item = useItem(itemId);
  const erp = useStudio((s) => s.erp);
  const writes = item.actions.filter((a) => a.kind !== 'reply_draft');
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <AppWindow section="Odoo › Registros creados por los agentes" className="h-full" right={<BrandLogo src="/brands/odoo.svg" name="Odoo" size={22} />}>
        <div className="space-y-3 p-5">
          {writes.length === 0 && (
            <div className="rounded-xl bg-info-bg px-4 py-6 text-center text-[14px] text-info">Solo lectura: esta consulta no modifica ningún registro de Odoo.</div>
          )}
          {writes.map((a) => {
            const so = a.result?.model === 'sale.order' ? erp.saleOrders.find((o) => o.id === a.result!.localId) : undefined;
            return (
              <div key={a.id} className={cx('rounded-2xl p-4 ring-1 transition-colors duration-500', a.status === 'applied' ? 'bg-ok-bg ring-ok/30' : 'bg-canvas ring-line')}>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[11.5px] text-ink-3">{a.kind === 'create_lead' ? 'crm.lead' : 'sale.order'}</span>
                  {a.status === 'applied' ? <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-1 text-[12.5px] font-semibold text-ok"><CheckCircle2 className="size-4" />{a.kind === 'update_quotation' ? 'Nueva versión' : 'Creado'}</motion.span> : <span className="animate-pulse text-[12.5px] text-ink-3">Esperando aprobación…</span>}
                </div>
                <div className="mt-2 text-[16px] font-semibold text-ink">{a.result?.name ?? a.title}</div>
                <div className="text-[12.5px] text-ink-3">{a.description}</div>
                {so && a.status === 'applied' && <div className="mt-2 text-[13px] text-ink-2">{so.lines.map((l) => `${l.qty} × ${l.name}${l.discountPct ? ` (−${num(l.discountPct, 1)} %)` : ''}`).join(' · ')} · <b>{eur(orderTotal(so))}</b></div>}
              </div>
            );
          })}
        </div>
      </AppWindow>
      <div className="flex flex-col justify-center gap-3">
        <Reveal t={t} at={600}><AgentPulse code="HUM" label="Una persona aprueba cada escritura" active={writes.some((a) => a.status === 'proposed')} done={writes.every((a) => a.status !== 'proposed')} /></Reveal>
        <Reveal t={t} at={1000}><div className="rounded-2xl bg-white/[0.04] p-4 text-[13.5px] text-secondary ring-1 ring-white/10">Escrituras permitidas por lista explícita, con clave de idempotencia: reintentar no duplica registros. Nada se confirma ni se factura automáticamente.</div></Reveal>
        <Reveal t={t} at={6000}><div className="rounded-2xl bg-[#16a34a]/12 p-4 text-[14px] text-[#86efac] ring-1 ring-[#16a34a]/40"><CheckCircle2 className="mb-1 size-5" />Mensaje resuelto con datos reales del ERP y trazabilidad completa.</div></Reveal>
      </div>
    </div>
  );
}

export function buildErpScenario(scenario: ErpScenario): DemoScenario {
  const cfg = CFG[scenario];
  const id = cfg.itemId;
  const steps = ERP_STEPS[scenario];
  const middle = steps.slice(1, -1).map((s) => s.id);
  const lastStep = steps[steps.length - 1].id;
  const where = (label: string, to: string) => ({ label, to });
  const applyAt = [1500, 3000, 4500].map((t, k) => ({
    t, run: async () => {
      const a = S().erp.inbox.find((i) => i.id === id)!.actions.filter((x) => x.status === 'proposed')[0];
      if (a && k < 3) await S().applyErpAction(id, a.id);
    },
  }));
  const at = scenario === 'order'
    ? [{ t: 4600, run: async () => { await S().chooseErp(id, 'line-1', 'pr-jt50'); await S().runErpStep(id, 'stock'); } }]
    : undefined;
  return {
    id: `odoo-${scenario}`, title: cfg.title, subtitle: cfg.subtitle, reference: cfg.reference,
    prepare: () => { S().setSimulateTimeout(false); S().resetErpItem(id); },
    finale: [
      { label: 'Abrir el caso en la Bandeja MTI', to: () => `/odoo/bandeja/${id}` },
      { label: scenario === 'status' ? 'Ver el pedido S00031' : 'Ver presupuestos en Ventas', to: () => (scenario === 'status' ? '/odoo/ventas/so-31' : '/odoo/ventas') },
    ],
    scenes: [
      { id: 'arrival', section: 'Bandeja', where: where('Bandeja unificada', '/bandeja'), title: item(scenario) === 'whatsapp' ? 'Llega un pedido por WhatsApp' : 'Llega un nuevo mensaje', narration: 'Los mensajes de clientes entran en la Bandeja MTI. El agente de Correo los detecta, los clasifica y los asocia al proceso adecuado sin que nadie tenga que reenviarlos.', agents: ['C01'], duration: 7000, Component: ({ t }) => <Arrival t={t} itemId={id} /> },
      { id: 'read', section: 'Lectura', where: where('Odoo › Bandeja MTI', `/odoo/bandeja/${id}`), title: 'Se entiende lo que pide', narration: 'Del texto libre a datos estructurados: referencias, cantidades, pedidos y plazos, cada uno señalado en el mensaje original.', agents: ['C01'], duration: 6500, enter: () => S().runErpStep(id, 'read'), Component: ({ t }) => <Read t={t} itemId={id} /> },
      { id: 'brain', section: 'Cerebro ERP', where: where('Conocimiento › registros ERP', '/odoo/contactos'), title: cfg.brainTitle, narration: cfg.brainNarration, agents: [...new Set(middle.map((m) => steps.find((s) => s.id === m)!.agent))], duration: scenario === 'order' ? 11000 : 9500, enter: async () => { for (const m of middle) { await S().runErpStep(id, m); if (S().erp.inbox.find((i) => i.id === id)!.steps[m]?.status !== 'completed') break; } }, at, Component: ({ t }) => <ErpBrain t={t} itemId={id} /> },
      { id: 'proposal', section: 'Propuesta', where: where('Odoo › Bandeja MTI', `/odoo/bandeja/${id}`), title: cfg.proposalTitle, narration: cfg.proposalNarration, agents: [steps[steps.length - 1].agent], duration: 9500, enter: () => S().runErpStep(id, lastStep), Component: ({ t }) => <Proposal t={t} itemId={id} /> },
      { id: 'odoo', section: 'Odoo', where: where('Aprobaciones', '/aprobaciones'), title: scenario === 'status' ? 'Respuesta lista, sin tocar el ERP' : 'Se registra en Odoo', narration: cfg.odooNarration, agents: ['HUM', 'ERP'], duration: 8000, at: applyAt, Component: ({ t }) => <OdooWrite t={t} itemId={id} /> },
    ],
  };
}

const item = (s: ErpScenario) => (s === 'order' ? 'whatsapp' : 'email');
