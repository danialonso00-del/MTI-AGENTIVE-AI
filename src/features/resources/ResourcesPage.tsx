import { AlertTriangle, Cog, Gauge } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, CardHeader } from '@/components/ui';
import { DATASET, MACHINES, OPERATION_LABEL } from '@/fixtures/manufacturing';
import { useStudio } from '@/store/useStudio';
import { WEEK_MIN_PER_MACHINE, workshopLoad } from '@/store/selectors';
import { cx, dateEs, eur, num } from '@/lib/format';

export default function ResourcesPage() {
  const requests = useStudio((s) => s.requests);
  const load = useMemo(() => workshopLoad(requests), [requests]);
  const over = load.filter((l) => l.utilization > 0.85);
  return (
    <div className="mx-auto max-w-[1680px] space-y-5 px-4 py-5 md:px-6">
      <div>
        <p className="text-[13px] font-medium text-[#8a6100]">Ingeniería · Motor de tiempos</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight md:text-[32px]">Recursos y carga de taller</h1>
        <p className="mt-1 max-w-3xl text-[14.5px] text-ink-3">Máquinas, centros y tarifas que usa el motor de tiempos, y la carga que supondrían las ofertas estimadas si se aceptan. Es una vista orientativa: la planificación real la hace el ERP.</p>
      </div>

      <Card>
        <CardHeader title="Carga semanal por centro" icon={<Gauge />} subtitle={`Capacidad = máquinas × 5 días × 7,5 h × 60 % de disponibilidad (${num(WEEK_MIN_PER_MACHINE / 60, 1)} h por máquina) · fixture`} />
        <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
          {load.map((l) => {
            const pct = l.utilization * 100;
            return (
              <div key={l.workcenter} className="rounded-xl bg-canvas p-3.5 ring-1 ring-line">
                <div className="flex items-center justify-between"><span className="text-[14px] font-semibold">{l.workcenter}</span><span className={cx('text-[14px] font-semibold tabular', pct > 85 ? 'text-warn' : 'text-ink')}>{num(pct, 0)} %</span></div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ink/[0.07]"><div className={cx('h-full rounded-r-[4px] transition-[width] duration-700', pct > 85 ? 'bg-[#b45309]' : 'bg-[#2a78d6]')} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                <div className="mt-1.5 text-[12px] text-ink-3">{num(l.minutes / 60, 1)} h de {num(l.capacity / 60, 0)} h · {l.machines} máquina{l.machines > 1 ? 's' : ''}</div>
                {l.contributions.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{l.contributions.map((c) => <Link key={c.id} to={`/fabricacion/${c.id}/estimacion`} className="rounded-md bg-white px-1.5 py-0.5 text-[11.5px] ring-1 ring-line hover:ring-gold/50"><span className="font-mono">{c.ref.replace('RFQ-2026-', '')}</span> · {num(c.minutes / 60, 1)} h</Link>)}</div>}
              </div>
            );
          })}
        </div>
        {over.length > 0 && <p className="flex items-center gap-2 border-t border-line px-4 py-2.5 text-[12.5px] text-warn"><AlertTriangle className="size-4" />{over.map((o) => o.workcenter).join(', ')} por encima del 85 %: revisar plazos antes de comprometer fechas.</p>}
        {load.every((l) => l.minutes === 0) && <p className="border-t border-line px-4 py-2.5 text-[12.5px] text-ink-3">Aún no hay ofertas estimadas: ejecuta una oferta hasta la estimación para ver su carga.</p>}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Máquinas y tarifas" icon={<Cog />} subtitle={`${DATASET.machines.label} · v${DATASET.machines.version} (${dateEs(DATASET.machines.date)})`} />
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[860px] text-[13.5px]">
            <thead className="bg-canvas text-[12px] text-ink-3"><tr><th className="px-4 py-2 text-left font-medium">Máquina</th><th className="px-3 py-2 text-left font-medium">Centro</th><th className="px-3 py-2 text-left font-medium">Operaciones</th><th className="px-3 py-2 text-right font-medium">Tarifa</th><th className="px-3 py-2 text-left font-medium">Velocidad relativa</th><th className="px-3 py-2 text-right font-medium">Presencia humana</th><th className="px-3 py-2 text-left font-medium">Uso en ofertas</th></tr></thead>
            <tbody>{MACHINES.map((m) => {
              const used = requests.filter((r) => r.draft.disabledMachineIds.includes(m.id)).length;
              return (
                <tr key={m.id} className="border-t border-line">
                  <td className="px-4 py-2.5"><div className="font-mono font-semibold">{m.id}</div><div className="text-[12px] text-ink-3">{m.name.replace(m.id, '').trim()}</div></td>
                  <td className="px-3 py-2.5">{m.workcenter}</td>
                  <td className="px-3 py-2.5"><div className="flex flex-wrap gap-1">{m.capabilities.map((c) => <Badge key={c} tone="neutral">{OPERATION_LABEL[c]}</Badge>)}</div></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right tabular">{eur(m.rateEurH)}/h</td>
                  <td className="px-3 py-2.5 text-[12.5px] text-ink-2">{Object.keys(m.speedFactor).length ? Object.entries(m.speedFactor).map(([k, v]) => `${OPERATION_LABEL[k as keyof typeof OPERATION_LABEL]} ×${num(v!, 2)}`).join(' · ') : 'Referencia'}</td>
                  <td className="px-3 py-2.5 text-right tabular">{num(m.attendance * 100, 0)} %</td>
                  <td className="px-3 py-2.5">{used ? <Badge tone="warn">Desactivada en {used} oferta{used > 1 ? 's' : ''}</Badge> : <Badge tone="ok">Disponible</Badge>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-2.5 text-[12.5px] text-ink-3">Las tarifas y disponibilidad por oferta se ajustan en cada expediente (Estimación › Máquinas y tarifas); el ajuste queda versionado con la oferta.</p>
      </Card>
    </div>
  );
}
