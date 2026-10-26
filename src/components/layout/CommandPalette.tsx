import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Boxes, Building2, Factory, FileText, History, LibraryBig, Search, Target } from 'lucide-react';
import { USE_CASES } from '@/features/demo/useCases';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudio } from '@/store/useStudio';
import { cx } from '@/lib/format';

interface Hit { id: string; group: string; title: string; sub: string; to: string; icon: ReactNode }

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const requests = useStudio((s) => s.requests);
  const erp = useStudio((s) => s.erp);
  const runs = useStudio((s) => s.runs);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const nav = useNavigate();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => input.current?.focus(), 20); } }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const pages: Hit[] = [['Panel', '/'], ['Bandeja unificada', '/bandeja'], ['Ofertas', '/fabricacion'], ['Aprobaciones', '/aprobaciones'], ['Licitaciones', '/licitaciones'], ['Asistente comercial', '/comercial'], ['ERP Odoo', '/odoo'], ['Piezas y planos', '/piezas'], ['Conocimiento', '/conocimiento'], ['Recursos y carga', '/recursos'], ['Casos de uso', '/casos'], ['Agentes', '/agentes'], ['Analítica', '/analitica'], ['Auditoría', '/ejecuciones'], ['Integraciones', '/integraciones'], ['Ajustes', '/ajustes'], ['Demo guiada', '/demo']]
      .map(([t, to]) => ({ id: to, group: 'Módulos', title: t, sub: to, to, icon: <ArrowRight /> }));
    const all: Hit[] = [
      ...pages,
      ...USE_CASES.map((u) => ({ id: `uc-${u.id}`, group: 'Casos de uso', title: u.title, sub: `${u.sector} · ${u.client?.name ?? u.agents.join(' ')} · ${u.processes.join(', ')}`, to: `/casos/${u.id}`, icon: <LibraryBig /> })),
      ...requests.map((r) => ({ id: r.id, group: 'Solicitudes', title: `${r.ref} · ${r.subject}`, sub: `${r.customer.company} · ${r.partNumber}`, to: `/fabricacion/${r.id}`, icon: <Factory /> })),
      ...erp.inbox.map((i) => ({ id: i.id, group: 'Bandeja Odoo', title: i.subject, sub: i.fromName, to: `/odoo/bandeja/${i.id}`, icon: <Boxes /> })),
      ...erp.saleOrders.map((o) => ({ id: o.id, group: 'Presupuestos y pedidos', title: `${o.name}${o.version > 1 ? ` v${o.version}` : ''}`, sub: `${erp.partners.find((p) => p.id === o.partnerId)?.name ?? ''} · ${o.origin ?? ''}`, to: `/odoo/ventas/${o.id}`, icon: <FileText /> })),
      ...erp.leads.map((l) => ({ id: l.id, group: 'Oportunidades', title: l.name, sub: erp.partners.find((p) => p.id === l.partnerId)?.name ?? '', to: `/odoo/crm/${l.id}`, icon: <Target /> })),
      ...erp.partners.filter((p) => p.isCompany).map((p) => ({ id: p.id, group: 'Contactos', title: p.name, sub: `${p.email ?? ''} · ${p.city}`, to: `/odoo/contactos/${p.id}`, icon: <Building2 /> })),
      ...runs.slice(0, 30).map((r) => ({ id: r.id, group: 'Ejecuciones', title: `${r.scenario} · ${r.subjectRef}`, sub: new Date(r.startedAt).toLocaleString('es-ES'), to: `/ejecuciones/${r.id}`, icon: <History /> })),
    ];
    const n = q.trim().toLowerCase();
    if (!n) return all.filter((h) => h.group === 'Solicitudes' || h.group === 'Bandeja Odoo').slice(0, 10);
    return all.filter((h) => `${h.title} ${h.sub}`.toLowerCase().includes(n)).slice(0, 14);
  }, [q, requests, erp, runs]);

  const go = (h: Hit) => { nav(h.to); onClose(); };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[85] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-navy/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={onClose} />
          <motion.div role="dialog" aria-modal="true" aria-label="Buscar" initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="relative w-full max-w-[620px] overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-pop)] ring-1 ring-ink/10">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-4 text-ink-3" />
              <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
                  if (e.key === 'Enter' && hits[sel]) go(hits[sel]);
                  if (e.key === 'Escape') onClose();
                }}
                placeholder="Busca RFQ, cliente, pieza, presupuesto S000…" className="h-13 flex-1 bg-transparent py-4 text-[15px] outline-none placeholder:text-ink-3/70" aria-label="Texto de búsqueda" />
            </div>
            <ul className="max-h-[52vh] overflow-y-auto p-2 scroll-thin" role="listbox">
              {hits.length === 0 && <li className="px-3 py-8 text-center text-[13.5px] text-ink-3">Sin resultados para «{q}»</li>}
              {hits.map((h, i) => (
                <li key={h.group + h.id} role="option" aria-selected={i === sel}>
                  {(i === 0 || hits[i - 1].group !== h.group) && <div className="px-3 pb-1 pt-2.5 text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">{h.group}</div>}
                  <button onMouseEnter={() => setSel(i)} onClick={() => go(h)} className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left', i === sel ? 'bg-gold/10' : 'hover:bg-ink/[0.03]')}>
                    <span className={cx('flex size-8 items-center justify-center rounded-lg [&>svg]:size-4', i === sel ? 'bg-gold text-navy' : 'bg-ink/[0.05] text-ink-3')}>{h.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-ink">{h.title}</span>
                      <span className="block truncate text-[12.5px] text-ink-3">{h.sub}</span>
                    </span>
                    {i === sel && <ArrowRight className="size-4 text-ink-3" />}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
