import { BarChart3, Info, Table2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader } from '@/components/ui';
import { BarList, ColumnChart, SERIES } from '@/components/ui/charts';
import { RUN_STATE } from '@/components/ui';
import { orderTotal } from '@/domain/erp';
import type { RunState } from '@/domain/types';
import { AGENTS, TOOLS } from '@/fixtures/agents';
import { estimate } from '@/services/estimation/engine';
import { useStudio } from '@/store/useStudio';
import { agentActivity, correctorEvaluation } from '@/store/selectors';
import { eur, num, numSmart } from '@/lib/format';

export default function AnalyticsPage() {
  const requests = useStudio((s) => s.requests);
  const erp = useStudio((s) => s.erp);
  const runs = useStudio((s) => s.runs);
  const nav = useNavigate();
  const [table, setTable] = useState(false);

  const funnel = useMemo(() => {
    const order: RunState[] = ['received', 'extracting', 'retrieving', 'estimating', 'reviewing', 'needs_input', 'approved', 'draft_created'];
    return order.map((s) => ({ key: s, label: RUN_STATE[s].label, value: requests.filter((r) => r.state === s).length })).filter((x) => x.value > 0);
  }, [requests]);
  const byCustomer = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of erp.saleOrders) { const n = erp.partners.find((p) => p.id === o.partnerId)?.name ?? '—'; m.set(n, (m.get(n) ?? 0) + orderTotal(o)); }
    return [...m.entries()].map(([k, v]) => ({ key: k, label: k, value: v })).sort((a, b) => b.value - a.value);
  }, [erp]);
  const estimated = requests.filter((r) => r.steps.estimate?.status === 'completed').map((r) => ({ r, e: estimate(r.draft) })).filter((x) => !x.e.blocked.length);
  const acts = useMemo(() => agentActivity(runs), [runs]);
  const actRows = [...AGENTS, ...TOOLS].map((a) => ({ key: a.code, label: `${a.code} · ${a.name}`, value: acts[a.code]?.steps ?? 0 })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  const evalRows = useMemo(() => correctorEvaluation().filter((e) => e.peers >= 2), []);
  const mae = (k: 'ruleErrPct' | 'corrErrPct') => evalRows.reduce((a, e) => a + e[k], 0) / Math.max(1, evalRows.length);

  return (
    <div className="mx-auto max-w-[1680px] space-y-5 px-4 py-5 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-[#8a6100]">Inteligencia</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight md:text-[32px]">Analítica</h1>
          <p className="mt-1 max-w-3xl text-[14.5px] text-ink-3">Indicadores calculados en vivo con los datos de esta demo. Ninguno es una métrica real de cliente.</p>
        </div>
        <button onClick={() => setTable((v) => !v)} className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-medium text-ink-2 ring-1 ring-line-strong hover:bg-ink/[0.03]">{table ? <BarChart3 className="size-4" /> : <Table2 className="size-4" />}{table ? 'Ver gráficos' : 'Ver como tablas'}</button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Ofertas por fase" subtitle={`${requests.length} expedientes`} />
          <div className="p-4">{table ? <SimpleTable rows={funnel.map((f) => [f.label, String(f.value)])} /> : <BarList rows={funnel} format={(v) => String(v)} />}</div>
        </Card>
        <Card>
          <CardHeader title="Importe en presupuestos y pedidos por cliente" subtitle="Base imponible en el ERP demo (sale.order)" />
          <div className="p-4">{table ? <SimpleTable rows={byCustomer.map((c) => [c.label, eur(c.value)])} /> : <BarList rows={byCustomer} format={eur} color={SERIES[1]} />}</div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Tiempo estimado por oferta" subtitle="Minutos de proceso del lote · solo ofertas con estimación completada" />
        <div className="p-4">
          {estimated.length === 0 ? <p className="py-6 text-center text-[13px] text-ink-3">Ejecuta alguna oferta hasta la estimación para ver datos.</p> : table ? (
            <SimpleTable rows={estimated.map(({ r, e }) => [`${r.ref} · ${r.draft.quantity} uds`, `${numSmart(e.estimatedLotMin, 1)} min`, eur(e.cost.commercialTotalEur)])} />
          ) : (
            <ColumnChart categories={estimated.map(({ r }) => r.ref.replace('RFQ-2026-', 'RFQ-'))} series={[{ name: 'Tiempo estimado', values: estimated.map(({ e }) => Math.round(e.estimatedLotMin)) }]} format={(v) => `${numSmart(v, 0)}`} />
          )}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Error del ciclo: reglas vs. reglas + corrector" subtitle={`Validación leave-one-out sobre el histórico sintético · ${evalRows.length} trabajos con ≥ 2 comparables`} />
          <div className="p-4">
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-canvas px-3 py-2.5 ring-1 ring-line"><div className="text-[12px] text-ink-3">Error medio solo reglas</div><div className="text-[22px] font-semibold tabular">{num(mae('ruleErrPct'), 1)} %</div></div>
              <div className="rounded-xl bg-canvas px-3 py-2.5 ring-1 ring-line"><div className="text-[12px] text-ink-3">Error medio con corrector</div><div className="text-[22px] font-semibold tabular text-[#8a6100]">{num(mae('corrErrPct'), 1)} %</div></div>
            </div>
            {table ? <SimpleTable rows={evalRows.map((e) => [`${e.ref} · ${e.partName}`, `${num(e.ruleErrPct, 1)} %`, `${num(e.corrErrPct, 1)} %`])} /> : (
              <ColumnChart categories={evalRows.map((e) => e.partName.replace(/^(Soporte|Placa|Brida|Escuadra) /, ''))} series={[{ name: 'Solo reglas', values: evalRows.map((e) => +e.ruleErrPct.toFixed(1)) }, { name: 'Reglas + corrector', values: evalRows.map((e) => +e.corrErrPct.toFixed(1)) }]} format={(v) => num(v, 1)} />
            )}
            <p className="mt-3 flex gap-1.5 text-[12px] text-ink-3"><Info className="mt-0.5 size-3.5 shrink-0" />Cada trabajo se predice con la mediana real/regla de los demás de su familia, material y ruta. Datos sintéticos: sirve para mostrar el método de evaluación, no para afirmar precisión.</p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Pasos ejecutados por agente" subtitle={`${runs.length} ejecuciones registradas`} />
          <div className="p-4">{table ? <SimpleTable rows={actRows.map((a) => [a.label, String(a.value)])} /> : <BarList rows={actRows} format={(v) => String(v)} onRow={() => nav('/ejecuciones')} empty="Sin ejecuciones todavía" />}</div>
        </Card>
      </div>
    </div>
  );
}

function SimpleTable({ rows }: { rows: string[][] }) {
  return (
    <table className="w-full text-[13.5px]"><tbody>{rows.map((r, i) => <tr key={i} className="border-t border-line first:border-0">{r.map((c, j) => <td key={j} className={j ? 'py-1.5 text-right tabular' : 'py-1.5'}>{c}</td>)}</tr>)}</tbody></table>
  );
}
