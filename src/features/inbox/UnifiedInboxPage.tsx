import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, FastForward, Inbox, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, Input, Select } from '@/components/ui';
import { BrandLogo } from '@/components/layout/Brand';
import { useStudio } from '@/store/useStudio';
import { unifiedInbox, type UnifiedItem } from '@/store/selectors';
import { cx, dateTimeEs, relativeEs } from '@/lib/format';

const STATUS_TONE = { Nuevo: 'info', 'En curso': 'gold', 'Requiere acción': 'warn', Resuelto: 'ok' } as const;
const KINDS = ['Oferta de fabricación', 'Solicitud de oferta', 'Pedido', 'Consulta de estado', 'Pricing'];

const channelLogo = (c: UnifiedItem['channel']) => (c === 'whatsapp' ? '/brands/whatsapp.svg' : c === 'email' ? '/brands/gmail.svg' : undefined);

export default function UnifiedInboxPage() {
  const requests = useStudio((s) => s.requests);
  const erpInbox = useStudio((s) => s.erp.inbox);
  const runUntil = useStudio((s) => s.runUntil);
  const runErpAll = useStudio((s) => s.runErpAll);
  const toast = useStudio((s) => s.toast);
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '', kind = params.get('tipo') ?? '', channel = params.get('canal') ?? '', status = params.get('estado') ?? '';
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };
  const [sel, setSel] = useState<string[]>([]);
  const [focus, setFocus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const all = useMemo(() => unifiedInbox(requests, erpInbox), [requests, erpInbox]);
  const list = all.filter((i) => (!kind || i.kind === kind) && (!channel || i.channel === channel) && (!status || i.status === status) && (!q || `${i.subject} ${i.from} ${i.preview}`.toLowerCase().includes(q.toLowerCase())));
  const active = list.find((i) => i.id === focus) ?? list[0];

  const process = async () => {
    setBusy(true);
    for (const id of sel) {
      const it = all.find((x) => x.id === id)!;
      if (it.source.type === 'request') await runUntil(id, 'review'); else await runErpAll(id);
    }
    setBusy(false);
    toast('success', `${sel.length} entradas procesadas por los agentes hasta la decisión humana`);
    setSel([]);
  };

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-[#8a6100]">Operaciones · C01 Correo</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight md:text-[32px]">Bandeja unificada</h1>
          <p className="mt-1 max-w-2xl text-[14.5px] text-ink-3">Todo lo que entra por correo, WhatsApp o alta manual, clasificado por intención y enviado al proceso adecuado. Una ruta de ingestión por buzón: sin duplicados.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[12.5px] text-ink-3 ring-1 ring-line">
          <BrandLogo src="/brands/gmail.svg" name="Gmail" size={20} plate={false} /><BrandLogo src="/brands/outlook.svg" name="Outlook" size={20} plate={false} /><BrandLogo src="/brands/whatsapp.svg" name="WhatsApp" size={20} plate={false} /> 3 canales · fixtures
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1 md:max-w-[340px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input value={q} onChange={(e) => set('q', e.target.value)} placeholder="Buscar remitente, asunto o contenido" className="pl-9" aria-label="Buscar en la bandeja" />
        </div>
        <Select value={kind} onChange={(e) => set('tipo', e.target.value)} className="max-w-[210px]" aria-label="Tipo"><option value="">Todos los tipos</option>{KINDS.map((k) => <option key={k}>{k}</option>)}</Select>
        <Select value={channel} onChange={(e) => set('canal', e.target.value)} className="max-w-[190px]" aria-label="Canal"><option value="">Todos los canales</option><option value="email">Correo</option><option value="whatsapp">WhatsApp</option><option value="manual">Manual</option></Select>
        <Select value={status} onChange={(e) => set('estado', e.target.value)} className="max-w-[190px]" aria-label="Estado"><option value="">Todos los estados</option>{Object.keys(STATUS_TONE).map((s) => <option key={s}>{s}</option>)}</Select>
        {(q || kind || channel || status) && <Button variant="ghost" icon={<X />} onClick={() => setParams({})}>Limpiar</Button>}
      </div>

      <AnimatePresence>
        {sel.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mb-3 flex items-center gap-3 rounded-xl bg-navy px-4 py-2.5 text-white">
            <span className="text-[13.5px]">{sel.length} seleccionadas</span>
            <Button size="sm" variant="primary" icon={<FastForward />} disabled={busy} onClick={process}>{busy ? 'Procesando…' : 'Procesar con agentes'}</Button>
            <span className="text-[12px] text-muted">Se detiene en cada decisión humana</span>
            <button className="ml-auto text-[13px] text-secondary hover:text-white" onClick={() => setSel([])}>Deseleccionar</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="overflow-hidden">
          {list.length === 0 ? <EmptyState icon={<Inbox />} title="Nada con estos filtros" /> : (
            <ul className="divide-y divide-line">
              {list.map((i) => (
                <li key={i.id} onMouseEnter={() => setFocus(i.id)} className={cx('flex items-center gap-3 px-4 py-3 transition-colors', active?.id === i.id ? 'bg-gold/[0.06]' : 'hover:bg-ink/[0.02]')}>
                  <input type="checkbox" className="size-4 accent-[#e6a817]" checked={sel.includes(i.id)} onChange={(e) => setSel(e.target.checked ? [...sel, i.id] : sel.filter((x) => x !== i.id))} aria-label={`Seleccionar ${i.subject}`} disabled={i.status === 'Resuelto'} />
                  <BrandLogo src={channelLogo(i.channel)} name={i.channel === 'manual' ? 'Manual' : i.channel} size={30} />
                  <Link to={i.to} onFocus={() => setFocus(i.id)} className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className={cx('truncate text-[13px]', i.status === 'Nuevo' ? 'font-semibold text-ink' : 'text-ink-2')}>{i.from}</span></div>
                      <div className={cx('truncate text-[14px]', i.status === 'Nuevo' ? 'font-semibold' : 'font-medium')}>{i.subject}</div>
                      <div className="truncate text-[12.5px] text-ink-3">{i.preview}</div>
                    </div>
                    <div className="hidden w-[150px] shrink-0 md:block"><Badge tone="neutral">{i.kind}</Badge></div>
                    <div className="flex w-[130px] shrink-0 flex-col items-end gap-1"><Badge tone={STATUS_TONE[i.status]} dot>{i.status}</Badge><span className="text-[12px] text-ink-3">{relativeEs(i.receivedAt)}</span></div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {active && (
          <Card className="sticky top-[72px] h-fit overflow-hidden">
            <div className="tech-grid px-5 py-4 text-white">
              <div className="flex items-center gap-2"><BrandLogo src={channelLogo(active.channel)} name={active.channel} size={24} /><span className="text-[12.5px] text-secondary">{active.from}</span></div>
              <div className="mt-2 text-[17px] font-semibold">{active.subject}</div>
              <div className="mt-1 text-[12.5px] text-muted">{dateTimeEs(active.receivedAt)}</div>
            </div>
            <div className="max-h-[260px] overflow-y-auto whitespace-pre-wrap px-5 py-4 text-[14px] leading-relaxed text-ink-2 scroll-thin">
              {active.source.type === 'request' ? active.source.req.emails[0]?.body ?? 'Solicitud creada manualmente.' : active.source.item.body}
            </div>
            <dl className="divide-y divide-line border-t border-line text-[13px]">
              <div className="flex justify-between px-5 py-2"><dt className="text-ink-3">Intención</dt><dd className="font-medium">{active.kind}</dd></div>
              <div className="flex justify-between px-5 py-2"><dt className="text-ink-3">Agentes</dt><dd className="font-mono text-[12px]">{active.agent}</dd></div>
              <div className="flex justify-between px-5 py-2"><dt className="text-ink-3">Estado</dt><dd><Badge tone={STATUS_TONE[active.status]} dot>{active.status}</Badge></dd></div>
            </dl>
            <div className="border-t border-line p-4">
              <Link to={active.to} className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-gold text-[14px] font-semibold text-navy hover:bg-gold-light">Abrir en su espacio de trabajo <ArrowRight className="size-4" /></Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
