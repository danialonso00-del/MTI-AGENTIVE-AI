import { ArrowRight, ExternalLink, Lock, PenLine } from 'lucide-react';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { useMemo } from 'react';
import { useStudio } from '@/store/useStudio';
import { agentActivity } from '@/store/selectors';
import { relativeEs } from '@/lib/format';
import type { ReactNode } from 'react';
import { Card, CardHeader } from '@/components/ui';
import { BrandLogo } from '@/components/layout/Brand';
import { AGENTS, TOOLS } from '@/fixtures/agents';
import { cx } from '@/lib/format';

const LAYERS: [string, string, string][] = [
  ['IA generativa', 'Interpretar peticiones, estructurar campos y redactar explicación/respuesta', 'No mide geometría ni inventa tiempos fiables'],
  ['CAD/OCR', 'Leer geometría o texto/cotas cuando el formato lo permite', 'La geometría no determina por sí sola proceso, material o estrategia'],
  ['Reglas de proceso', 'Cálculos explícitos y unidades consistentes', 'Necesitan parámetros validados por fabricación'],
  ['ML tradicional', 'Corregir o predecir tiempos desde históricos etiquetados', 'Necesita dataset y evaluación antes de afirmar precisión'],
  ['IA agentiva', 'Coordinar lectura, búsqueda, cálculo y acciones', 'Ejecuta únicamente herramientas permitidas'],
  ['Persona', 'Resolver ambigüedad y validar oferta', 'La decisión queda vinculada a una versión'],
];

const PATH = [
  'Discovery: versión/edición, hosting, módulos, compañías, buzones, responsables, histórico, tarifas y aprobación.',
  'Instancia de pruebas con datos anonimizados; usuario técnico de privilegios mínimos; lectura y resolución de identidades.',
  'Validar equivalencias de campos, unidades y tiempos; acordar qué calcula MTI y qué calcula Odoo.',
  'Conectar correo en lectura y preparar propuestas, sin escrituras externas.',
  'Habilitar únicamente la creación de presupuesto borrador con revisión y reconciliación.',
  'Piloto industrial contra estimaciones de expertos y tiempos observados; corregir reglas antes de automatizar.',
  'Producción progresiva con métricas, alertas y proceso de recuperación. Sin prometer precisión ni plazo antes del discovery.',
];

const ODOO_OPTIONS: [string, string, string][] = [
  ['Demo local sin Odoo', 'Primera entrega y reuniones', 'Adapter con datos sintéticos persistentes y mismas interfaces (esta aplicación)'],
  ['Odoo Online + middleware', 'El cliente ya usa SaaS y basta API externa', 'Confirmar acceso API en plan Custom; sin módulos Python propios en Online'],
  ['Odoo.sh + middleware', 'Se necesitan módulos u operaciones de negocio propios', 'Suscripción, hosting y dependencias a validar'],
  ['Odoo autogestionado', 'Control de infraestructura y código', 'Backups, actualizaciones y seguridad; comprobar edición y módulos'],
];

const SOURCES: [string, string, string][] = [
  ['S0', 'MTI · mingothings.com (tokens de marca, logo)', 'https://www.mingothings.com/'],
  ['S1', 'Odoo 19 · API externa JSON-2', 'https://www.odoo.com/documentation/19.0/developer/reference/external_api.html'],
  ['S2', 'Odoo · RPC y acceso comercial', 'https://www.odoo.com/documentation/19.0/developer/reference/external_rpc_api.html'],
  ['S3', 'Odoo Online · limitaciones', 'https://www.odoo.com/documentation/19.0/administration/odoo_online.html'],
  ['S4', 'Odoo Manufacturing · centros de trabajo', 'https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/advanced_configuration/using_work_centers.html'],
  ['S5', 'Odoo · correo entrante', 'https://www.odoo.com/documentation/19.0/applications/general/email_communication/email_servers_inbound.html'],
  ['S6', 'Gmail API', 'https://developers.google.com/workspace/gmail/api/reference/rest'],
  ['S7', 'Microsoft Graph · message delta', 'https://learn.microsoft.com/en-us/graph/api/message-delta?view=graph-rest-1.0'],
  ['S8', 'Open CASCADE · STEP', 'https://github.com/Open-Cascade-SAS/OCCT/blob/master/dox/user_guides/step/step.md'],
  ['S9', 'Open CASCADE · propiedades geométricas', 'https://occt3d.com/dev/doc/refman/html/class_b_rep_g_prop.html'],
];

function Box({ title, children, tone = 'light' }: { title: string; children: ReactNode; tone?: 'light' | 'gold' }) {
  return (
    <div className={cx('flex-1 rounded-xl p-3 ring-1', tone === 'gold' ? 'bg-gold/10 ring-gold/40' : 'bg-white/[0.06] ring-white/10')}>
      <div className={cx('mb-2 text-[12px] font-semibold uppercase tracking-wider', tone === 'gold' ? 'text-gold-light' : 'text-muted')}>{title}</div>
      <div className="space-y-1.5 text-[13px] text-secondary">{children}</div>
    </div>
  );
}

export default function ArchitecturePage() {
  return (
    <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6">
      <p className="text-[13px] font-medium text-[#8a6100]">Inteligencia · Agentes y arquitectura</p>
      <h1 className="mt-1 text-[28px] font-semibold tracking-tight md:text-[34px]">Agentes especializados, coordinados</h1>
      <p className="mt-1 max-w-3xl text-[14.5px] text-ink-3">Ocho agentes productivizados (códigos de la presentación v.02) y herramientas especialistas que ellos coordinan. Separación estricta entre presentación, cálculo y conectores.</p>

      <AgentFleet />

      <section className="tech-grid mt-4 rounded-2xl p-4 ring-1 ring-navy-border md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
          <Box title="Entradas">
            <div className="flex items-center gap-2"><BrandLogo src="/brands/gmail.svg" name="Gmail" size={22} /> Gmail · fixture</div>
            <div className="flex items-center gap-2"><BrandLogo src="/brands/outlook.svg" name="Outlook" size={22} /> Outlook · fixture</div>
            <div className="flex items-center gap-2"><BrandLogo src="/brands/whatsapp.svg" name="WhatsApp" size={22} /> WhatsApp · fixture</div>
            <div>PDF · STEP · DXF · CSV</div>
          </Box>
          <ArrowRight className="mx-auto size-5 shrink-0 rotate-90 self-center text-gold lg:rotate-0" />
          <Box title="Orquestación" tone="gold">
            <div className="font-semibold text-white">MTI · Orquestador</div>
            <div>Clasifica intención, planifica, coordina y solicita revisión</div>
            <div className="flex flex-wrap gap-1 pt-1">{AGENTS.filter((a) => a.code !== 'MTI').map((a) => <span key={a.code} title={a.name} className="inline-flex items-center gap-1 rounded-md bg-white/10 py-0.5 pl-0.5 pr-1.5 font-mono text-[11px] text-white"><AgentIcon code={a.code} size={16} />{a.code}</span>)}</div>
          </Box>
          <ArrowRight className="mx-auto size-5 shrink-0 rotate-90 self-center text-gold lg:rotate-0" />
          <Box title="Herramientas">
            <div>Lectura CAD · Extracción técnica</div><div>Motor de tiempos (reglas)</div><div>ML correctivo (simulado)</div><div>Recuperación (fixture)</div><div>LanguageModelAdapter (plantillas)</div>
          </Box>
          <ArrowRight className="mx-auto size-5 shrink-0 rotate-90 self-center text-gold lg:rotate-0" />
          <Box title="Adapters → sistemas">
            <div className="flex items-center gap-2"><BrandLogo src="/brands/odoo.svg" name="Odoo" size={22} /> ErpAdapter</div>
            <div>· Demo local (activo)</div><div>· Odoo JSON-2 (probado con fetch simulado)</div><div>· Odoo RPC (pendiente)</div>
            <div className="pt-1 text-[12px] text-muted">Escrituras por lista explícita + aprobación vinculada a versión + idempotencia</div>
          </Box>
        </div>
      </section>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Agentes productivizados" subtitle="Nomenclatura estable" />
          <ul className="divide-y divide-line">
            {AGENTS.map((a) => <li key={a.code} className="flex gap-3 px-4 py-2.5"><AgentIcon code={a.code} size={30} /><span className={cx('h-fit rounded-md px-1.5 py-0.5 font-mono text-[12px] font-semibold', a.code === 'MTI' ? 'bg-gold text-navy' : 'bg-navy text-white')}>{a.code}</span><div><div className="text-[14px] font-medium">{a.name}</div><div className="text-[12.5px] text-ink-3">{a.responsibility}</div></div></li>)}
          </ul>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Herramientas especialistas" subtitle="Coordinadas por agentes; no son nuevos códigos" />
            <ul className="divide-y divide-line">
              {TOOLS.map((t) => <li key={t.code} className="flex gap-3 px-4 py-2.5"><AgentIcon code={t.code} size={30} /><span className="h-fit rounded-md bg-canvas px-1.5 py-0.5 font-mono text-[12px] font-semibold text-ink-2 ring-1 ring-line">{t.code}</span><div><div className="text-[14px] font-medium">{t.name}</div><div className="text-[12.5px] text-ink-3">{t.responsibility}</div></div></li>)}
            </ul>
          </Card>
        </div>
      </div>

      <Card className="mt-4 overflow-hidden">
        <CardHeader title="Qué hace cada tecnología" subtitle="Y su límite" />
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[720px] text-[13.5px]">
            <thead className="bg-canvas text-[12px] text-ink-3"><tr><th className="px-4 py-2 text-left font-medium">Capa</th><th className="px-4 py-2 text-left font-medium">Función</th><th className="px-4 py-2 text-left font-medium">Límite</th></tr></thead>
            <tbody>{LAYERS.map(([a, b, c]) => <tr key={a} className="border-t border-line"><td className="px-4 py-2.5 font-medium">{a}</td><td className="px-4 py-2.5 text-ink-2">{b}</td><td className="px-4 py-2.5 text-ink-3">{c}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Ruta de implantación en cliente" />
          <ol className="space-y-2.5 p-4">{PATH.map((p, i) => <li key={p} className="flex gap-3 text-[13.5px]"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-navy font-mono text-[11.5px] text-gold-light">{i + 1}</span><span className="text-ink-2">{p}</span></li>)}</ol>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Implantación de Odoo: opciones" subtitle="Recomendación: primero demo local; después sandbox conectado" />
          <table className="w-full text-[13px]"><tbody>{ODOO_OPTIONS.map(([a, b, c]) => <tr key={a} className="border-t border-line first:border-0"><td className="px-4 py-2.5 font-medium">{a}</td><td className="px-4 py-2.5 text-ink-2">{b}</td><td className="px-4 py-2.5 text-ink-3">{c}</td></tr>)}</tbody></table>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Fuentes" subtitle="Consultadas el 05/10/2026; volver a verificar al implementar" />
        <ul className="grid gap-x-6 gap-y-1.5 p-4 md:grid-cols-2">{SOURCES.map(([k, l, u]) => <li key={k} className="text-[13px]"><span className="mr-2 font-mono text-ink-3">[{k}]</span><a href={u} target="_blank" rel="noreferrer" className="text-info hover:underline">{l} <ExternalLink className="inline size-3" /></a></li>)}</ul>
      </Card>
    </div>
  );
}

const WRITES: Record<string, string> = {
  C02: 'Presupuesto borrador y nueva versión (tras aprobación)',
  C04: 'Oportunidad en CRM (tras aprobación)',
  C05: 'Propuesta de pedido como borrador (tras aprobación)',
  C01: 'Respuestas en borrador; nunca envía',
};
const SCOPE: Record<string, string> = {
  MTI: 'Fabricación · Odoo', C01: 'Bandeja · todos los canales', C02: 'Ofertas · Pricing', C03: 'Catálogo (SIGI, PRISA)', C04: 'Odoo · CRM', C05: 'Odoo · Pedidos', C06: 'Odoo · Entregas', C07: 'Conocimiento · histórico', C08: 'Calidad · estimación',
};

function AgentFleet() {
  const runs = useStudio((s) => s.runs);
  const acts = useMemo(() => agentActivity(runs), [runs]);
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {AGENTS.map((a) => {
        const st = acts[a.code];
        return (
          <div key={a.code} className="rounded-2xl bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-line">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="relative"><AgentIcon code={a.code} size={40} glow /><span className="absolute -bottom-1.5 -right-2 rounded bg-navy px-1 font-mono text-[10px] font-bold text-gold-light ring-1 ring-white/20">{a.code}</span></span>
                <div><div className="text-[15px] font-semibold">{a.name}</div><div className="text-[12px] text-ink-3">{SCOPE[a.code]}</div></div>
              </div>
              <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium', st ? 'bg-ok-bg text-ok' : 'bg-ink/[0.05] text-ink-3')}><span className={cx('size-1.5 rounded-full', st ? 'bg-ok' : 'bg-ink-3/50')} />{st ? 'Activo' : 'En espera'}</span>
            </div>
            <p className="mt-2 text-[13px] text-ink-2">{a.responsibility}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12.5px]">
              <div className="rounded-lg bg-canvas px-2.5 py-1.5"><div className="text-ink-3">Pasos ejecutados</div><div className="font-semibold tabular">{st?.steps ?? 0}</div></div>
              <div className="rounded-lg bg-canvas px-2.5 py-1.5"><div className="text-ink-3">Última actividad</div><div className="font-semibold">{st?.last ? relativeEs(st.last) : '—'}</div></div>
            </div>
            <div className="mt-2 flex items-start gap-1.5 text-[12px] text-ink-3">{WRITES[a.code] ? <PenLine className="mt-0.5 size-3.5 shrink-0 text-[#8a6100]" /> : <Lock className="mt-0.5 size-3.5 shrink-0" />}{WRITES[a.code] ?? 'Solo lectura y herramientas internas'}</div>
          </div>
        );
      })}
    </div>
  );
}
