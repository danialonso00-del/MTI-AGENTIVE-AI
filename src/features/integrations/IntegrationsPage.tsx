import { ExternalLink, KeyRound, PlugZap, Settings2, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import type { IntegrationConfig } from '@/domain/types';
import { Badge, Button, Card, Field, Input, Modal, Select } from '@/components/ui';
import { BrandLogo } from '@/components/layout/Brand';
import { CONNECTORS, type ConnectorDef } from '@/fixtures/integrations';
import { useStudio } from '@/store/useStudio';
import { dateTimeEs } from '@/lib/format';

export const CONNECTOR_STATUS: Record<IntegrationConfig['status'], { label: string; tone: 'gold' | 'neutral' | 'ok' | 'err'; help: string }> = {
  demo: { label: 'Demo', tone: 'gold', help: 'Fixture local funcional; sin conexión externa' },
  pending: { label: 'Pendiente de configurar', tone: 'neutral', help: 'Sin credenciales ni adapter activo' },
  sandbox: { label: 'Conectado a sandbox', tone: 'ok', help: 'Requiere una prueba exitosa desde servidor' },
  error: { label: 'Error', tone: 'err', help: 'La última prueba falló' },
};

const CATS: ConnectorDef['category'][] = ['Correo', 'ERP', 'Documentos', 'Formatos', 'CRM', 'Mensajería', 'Pricing'];

export default function IntegrationsPage() {
  const configs = useStudio((s) => s.integrations);
  const test = useStudio((s) => s.testIntegration);
  const [configId, setConfigId] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6">
      <p className="text-[13px] font-medium text-[#8a6100]">Integraciones</p>
      <h1 className="mt-1 text-[28px] font-semibold tracking-tight md:text-[34px]">Conectores y su estado real</h1>
      <p className="mt-1 max-w-3xl text-[14.5px] text-ink-3">Los logos indican el ecosistema del catálogo; su presencia no implica partnership ni integración activa. Ningún conector se marca «Conectado» sin una prueba exitosa.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(CONNECTOR_STATUS).map(([k, s]) => <span key={k} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-[12.5px] ring-1 ring-line"><Badge tone={s.tone}>{s.label}</Badge><span className="text-ink-3">{s.help}</span></span>)}
      </div>
      <div className="mt-6 space-y-6">
        {CATS.map((cat) => {
          const defs = CONNECTORS.filter((c) => c.category === cat);
          return (
            <section key={cat}>
              <h2 className="mb-2.5 text-[13px] font-semibold uppercase tracking-wider text-ink-3">{cat}</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {defs.map((d) => {
                  const cfg = configs.find((c) => c.id === d.id)!;
                  const st = CONNECTOR_STATUS[cfg.status];
                  return (
                    <Card key={d.id} className="flex flex-col p-4" data-connector={d.id}>
                      <div className="flex items-start gap-3">
                        <BrandLogo src={d.logo} name={d.name} size={40} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2"><span className="text-[15px] font-semibold">{d.name}</span><Badge tone={st.tone} dot>{st.label}</Badge></div>
                          <div className="text-[12.5px] text-ink-3">{d.place}</div>
                        </div>
                      </div>
                      <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{d.implementation}</p>
                      {cfg.lastTest && <p className={`mt-2 rounded-lg px-2.5 py-1.5 text-[12.5px] ${cfg.lastTest.ok ? 'bg-ok-bg text-ok' : 'bg-warn-bg text-warn'}`}>Última prueba {dateTimeEs(cfg.lastTest.at)}: {cfg.lastTest.message}</p>}
                      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                        <Button size="sm" icon={<PlugZap />} onClick={() => test(d.id)}>Probar</Button>
                        {d.envKeys && <Button size="sm" variant="ghost" icon={<Settings2 />} onClick={() => setConfigId(d.id)}>Configurar</Button>}
                        {d.docs && <a href={d.docs} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[12.5px] text-info hover:underline">Documentación <ExternalLink className="size-3" /></a>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      {configId && <ConfigModal id={configId} onClose={() => setConfigId(null)} />}
    </div>
  );
}

function ConfigModal({ id, onClose }: { id: string; onClose: () => void }) {
  const def = CONNECTORS.find((c) => c.id === id)!;
  const cfg = useStudio((s) => s.integrations.find((c) => c.id === id)!);
  const update = useStudio((s) => s.updateIntegration);
  const [f, setF] = useState({ transport: cfg.settings.transport ?? 'json2', baseUrl: cfg.settings.baseUrl ?? '', database: cfg.settings.database ?? '' });
  return (
    <Modal open onClose={onClose} title={`Configurar ${def.name}`} subtitle="Parámetros no secretos. Las credenciales viven en el servidor."
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={() => { update(id, id === 'odoo' ? f : {}); onClose(); }}>Guardar</Button></>}>
      <div className="space-y-4">
        {id === 'odoo' ? (
          <>
            <Field label="Transporte" hint="JSON-2 para Odoo 19 (POST /json/2/<model>/<method>, API key Bearer). RPC para Odoo 18 o anterior (adapter pendiente).">
              <Select value={f.transport} onChange={(e) => setF({ ...f, transport: e.target.value })}><option value="json2">JSON-2 (Odoo 19)</option><option value="rpc">RPC (Odoo ≤ 18) · pendiente</option></Select>
            </Field>
            <Field label="URL base del sandbox" hint="Instancia de pruebas con datos anonimizados"><Input value={f.baseUrl} onChange={(e) => setF({ ...f, baseUrl: e.target.value })} placeholder="https://cliente-sandbox.odoo.com" /></Field>
            <Field label="Base de datos" hint="Cabecera X-Odoo-Database; depende del despliegue"><Input value={f.database} onChange={(e) => setF({ ...f, database: e.target.value })} /></Field>
          </>
        ) : <p className="text-[13.5px] text-ink-2">Este conector se activará en servidor con: <span className="font-mono">{def.envKeys?.join(', ')}</span>.</p>}
        <div className="flex gap-2.5 rounded-xl bg-warn-bg px-3 py-2.5 text-[13px] text-[#7c3d06] ring-1 ring-warn/20">
          <KeyRound className="mt-0.5 size-4 shrink-0" />
          <div>La API key no se introduce aquí: se define en <span className="font-mono">.env</span> del middleware (<span className="font-mono">{def.envKeys?.filter((k) => /KEY|URL|DATABASE|TRANSPORT|PROVIDER/.test(k)).join(', ')}</span>) y nunca con prefijo público <span className="font-mono">VITE_</span>.</div>
        </div>
        <p className="flex gap-2 text-[12.5px] text-ink-3"><ShieldAlert className="mt-0.5 size-4 shrink-0" />Sin middleware desplegado, «Probar» devolverá un error explícito en lugar de un falso estado conectado.</p>
      </div>
    </Modal>
  );
}
