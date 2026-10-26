import { History, Play, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { useStudio, type Run } from '@/store/useStudio';
import { cx, dateTimeEs } from '@/lib/format';

export const RUN_STATUS: Record<Run['status'], { label: string; tone: 'gold' | 'warn' | 'ok' | 'err' }> = {
  running: { label: 'En curso', tone: 'gold' }, needs_input: { label: 'Requiere acción', tone: 'warn' }, completed: { label: 'Completada', tone: 'ok' }, failed: { label: 'Error', tone: 'err' },
};

export function subjectPath(r: Run) {
  if (r.kind === 'manufacturing') return `/fabricacion/${r.subjectId}/flujo`;
  if (r.kind === 'erp') return `/odoo/bandeja/${r.subjectId}`;
  if (r.kind === 'crm') return '/comercial';
  if (r.kind === 'tender') return `/licitaciones/${r.subjectId}`;
  return `/catalogo/${r.subjectId}`;
}

export default function RunsPage() {
  const runs = useStudio((s) => s.runs);
  const [kind, setKind] = useState<'all' | Run['kind']>('all');
  const nav = useNavigate();
  const list = useMemo(() => [...runs].filter((r) => kind === 'all' || r.kind === kind).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [runs, kind]);
  return (
    <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6">
      <p className="text-[13px] font-medium text-[#8a6100]">Trazabilidad</p>
      <h1 className="mt-1 text-[28px] font-semibold tracking-tight md:text-[34px]">Cada operación, con su explicación</h1>
      <p className="mt-1 max-w-2xl text-[14.5px] text-ink-3">Histórico de ejecuciones por escenario con sus eventos y salidas. Reabre el expediente o reproduce la ejecución: el replay no repite escrituras.</p>
      <div className="mb-4 mt-5 flex flex-wrap gap-1.5">
        {([['all', 'Todas'], ['manufacturing', 'Fabricación'], ['erp', 'Odoo'], ['crm', 'CRM'], ['tender', 'Licitaciones'], ['catalog', 'Catálogo']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setKind(k)} className={cx('rounded-full px-3 py-1.5 text-[13px] font-medium ring-1', kind === k ? 'bg-navy text-white ring-navy' : 'bg-white text-ink-2 ring-line hover:ring-line-strong')}>
            {l} <span className={kind === k ? 'text-gold-light' : 'text-ink-3'}>{k === 'all' ? runs.length : runs.filter((r) => r.kind === k).length}</span>
          </button>
        ))}
      </div>
      <Card className="overflow-hidden">
        {list.length === 0 ? <EmptyState icon={<History />} title="Sin ejecuciones" action={<Link to="/fabricacion" className="text-info underline">Ir a Fabricación</Link>}>Ejecuta un paso en cualquier escenario para registrar su primera ejecución.</EmptyState> : (
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full min-w-[820px] text-[13.5px]">
              <thead className="bg-canvas text-[12px] text-ink-3"><tr><th className="px-4 py-2 text-left font-medium">Escenario</th><th className="px-3 py-2 text-left font-medium">Sujeto</th><th className="px-3 py-2 text-left font-medium">Modo</th><th className="px-3 py-2 text-left font-medium">Última actividad</th><th className="px-3 py-2 text-right font-medium">Pasos</th><th className="px-3 py-2 text-left font-medium">Estado</th><th className="px-4 py-2" /></tr></thead>
              <tbody>
                {list.map((r) => {
                  const done = r.events.filter((e) => e.status === 'completed').length;
                  return (
                    <tr key={r.id} className="border-t border-line">
                      <td className="px-4 py-2.5"><div className="font-medium">{r.scenario}</div><div className="font-mono text-[11.5px] text-ink-3">{r.id.slice(0, 16)}</div></td>
                      <td className="px-3 py-2.5"><div className="font-mono text-[12.5px]">{r.subjectRef}</div><div className="max-w-[260px] truncate text-[12.5px] text-ink-3">{r.title}</div></td>
                      <td className="px-3 py-2.5"><Badge tone={r.mode === 'guided' ? 'gold' : 'neutral'}>{r.mode === 'guided' ? 'Demo guiada' : 'Trabajar'}</Badge></td>
                      <td className="px-3 py-2.5 text-ink-3">{dateTimeEs(r.updatedAt)}</td>
                      <td className="px-3 py-2.5 text-right tabular">{done} · {Object.keys(r.outputs).length} salidas</td>
                      <td className="px-3 py-2.5"><Badge tone={RUN_STATUS[r.status].tone} dot>{RUN_STATUS[r.status].label}</Badge></td>
                      <td className="px-4 py-2.5"><div className="flex justify-end gap-1.5"><Button size="sm" icon={<RotateCcw />} onClick={() => nav(subjectPath(r))}>Reabrir</Button><Button size="sm" variant="primary" icon={<Play />} onClick={() => nav(`/ejecuciones/${r.id}`)}>Replay</Button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
