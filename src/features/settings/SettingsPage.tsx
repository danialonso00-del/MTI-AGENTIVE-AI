import { Database, Download, Lock, RotateCcw, Save, ShieldCheck, SlidersHorizontal, User, Zap } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Segmented, Select } from '@/components/ui';
import { DATASET } from '@/fixtures/manufacturing';
import { ARPA_FIXTURE } from '@/fixtures/erp';
import { SCHEMA_VERSION } from '@/domain/types';
import { useStudio } from '@/store/useStudio';
import { cx, dateEs } from '@/lib/format';

function Section({ icon, title, subtitle, children, actions }: { icon: ReactNode; title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  return <Card><CardHeader icon={icon} title={title} subtitle={subtitle} actions={actions} /><div className="p-4">{children}</div></Card>;
}

function Toggle({ on, onChange, label, disabled, reason }: { on: boolean; onChange?: (v: boolean) => void; label: string; disabled?: boolean; reason?: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} disabled={disabled} title={disabled ? reason : undefined} onClick={() => onChange?.(!on)}
      className={cx('relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60', on ? 'bg-ok' : 'bg-ink/20')}>
      <span className={cx('absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform duration-200', on ? 'translate-x-[18px]' : 'translate-x-0.5')} />
    </button>
  );
}

export default function SettingsPage() {
  const ui = useStudio((s) => s.ui);
  const settings = useStudio((s) => s.settings);
  const setUi = useStudio((s) => s.setUi);
  const update = useStudio((s) => s.updateSettings);
  const resetDemo = useStudio((s) => s.resetDemo);
  const toast = useStudio((s) => s.toast);
  const [profile, setProfile] = useState({ user: ui.user, role: ui.role ?? '' });
  const [commercial, setCommercial] = useState({ company: settings.company, margin: String(settings.defaultMarginPct), indirect: String(settings.defaultIndirectPct) });
  const [confirm, setConfirm] = useState(false);
  const m = Number(commercial.margin), ind = Number(commercial.indirect);
  const errs = { margin: m >= 0 && m < 90 ? null : 'Entre 0 y 89 %', indirect: ind >= 0 && ind <= 100 ? null : 'Entre 0 y 100 %', company: commercial.company.trim() ? null : 'Obligatorio' };
  const commercialDirty = commercial.company !== settings.company || m !== settings.defaultMarginPct || ind !== settings.defaultIndirectPct;
  const profileDirty = profile.user !== ui.user || profile.role !== (ui.role ?? '');

  const exportState = () => {
    const raw = localStorage.getItem('mti-agentive-studio') ?? '{}';
    const blob = new Blob([raw], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mti-agentive-studio-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast('success', 'Estado de la demo exportado en JSON');
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-4 py-5 md:px-6">
      <div>
        <p className="text-[13px] font-medium text-[#8a6100]">Plataforma</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight md:text-[32px]">Ajustes</h1>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={<User />} title="Perfil" subtitle="Nombre que firma aprobaciones y comentarios"
          actions={profileDirty && <><Button size="sm" variant="ghost" onClick={() => setProfile({ user: ui.user, role: ui.role ?? '' })}>Cancelar</Button><Button size="sm" variant="primary" icon={<Save />} disabled={!profile.user.trim()} disabledReason="El nombre es obligatorio" onClick={() => { setUi({ user: profile.user.trim(), role: profile.role.trim() }); toast('success', 'Perfil guardado'); }}>Guardar</Button></>}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre"><Input value={profile.user} onChange={(e) => setProfile({ ...profile, user: e.target.value })} /></Field>
            <Field label="Rol"><Select value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.target.value })}><option>Responsable de ofertas</option><option>Oficina técnica</option><option>Comercial</option><option>Dirección</option></Select></Field>
          </div>
        </Section>
        <Section icon={<SlidersHorizontal />} title="Parámetros comerciales" subtitle="Valores por defecto de las nuevas solicitudes (cada oferta los puede cambiar y quedan versionados)"
          actions={commercialDirty && <><Button size="sm" variant="ghost" onClick={() => setCommercial({ company: settings.company, margin: String(settings.defaultMarginPct), indirect: String(settings.defaultIndirectPct) })}>Cancelar</Button><Button size="sm" variant="primary" icon={<Save />} disabled={Object.values(errs).some(Boolean)} disabledReason="Corrige los valores" onClick={() => { update({ company: commercial.company.trim(), defaultMarginPct: m, defaultIndirectPct: ind }); toast('success', 'Parámetros guardados'); }}>Guardar</Button></>}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Empresa" error={errs.company}><Input value={commercial.company} onChange={(e) => setCommercial({ ...commercial, company: e.target.value })} /></Field>
            <Field label="Margen s/ venta %" error={errs.margin}><Input type="number" value={commercial.margin} onChange={(e) => setCommercial({ ...commercial, margin: e.target.value })} /></Field>
            <Field label="Indirectos %" error={errs.indirect}><Input type="number" value={commercial.indirect} onChange={(e) => setCommercial({ ...commercial, indirect: e.target.value })} /></Field>
          </div>
          <p className="mt-2 text-[12px] text-ink-3">Política de pricing ERP: margen mínimo {ARPA_FIXTURE.minMarginPct} % con coste ARPA (fixture).</p>
        </Section>
        <Section icon={<Zap />} title="Automatización" subtitle="Qué hacen los agentes sin que nadie lo pida">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4"><div><div className="text-[14px] font-medium">Procesar automáticamente las solicitudes nuevas</div><div className="text-[12.5px] text-ink-3">Al dar de alta una solicitud, los agentes la llevan hasta la revisión humana.</div></div><Toggle label="Procesar automáticamente" on={settings.autoProcessInbox} onChange={(v) => update({ autoProcessInbox: v })} /></div>
            <div className="flex items-start justify-between gap-4"><div><div className="text-[14px] font-medium">Detenerse en datos ausentes</div><div className="text-[12.5px] text-ink-3">Si falta un dato obligatorio se prepara una pregunta; nunca se completa con suposiciones.</div></div><Toggle label="Detenerse en datos ausentes" on disabled reason="Siempre activo por diseño" /></div>
          </div>
        </Section>
        <Section icon={<ShieldCheck />} title="Políticas de seguridad" subtitle="Bloqueadas en esta versión">
          <ul className="space-y-2.5 text-[13.5px]">
            {['Toda escritura en el ERP requiere aprobación humana vinculada a versión', 'Escrituras solo por lista explícita: oportunidad, presupuesto borrador, nueva versión', 'Ningún pedido se confirma ni se factura automáticamente', 'Los correos salientes quedan en borrador', 'Los documentos son inputs: no pueden dar instrucciones a los agentes', 'Credenciales solo en servidor, nunca en el navegador'].map((p) => (
              <li key={p} className="flex items-start gap-2"><Lock className="mt-0.5 size-4 shrink-0 text-ok" />{p}</li>
            ))}
          </ul>
        </Section>
        <Section icon={<Database />} title="Datasets" subtitle="Versión de cada fuente que usa el motor">
          <ul className="divide-y divide-line text-[13px]">
            {Object.values(DATASET).map((d) => <li key={d.id} className="flex items-center justify-between gap-2 py-2"><span>{d.label}</span><span className="font-mono text-[12px] text-ink-3">v{d.version} · {dateEs(d.date)}</span></li>)}
            <li className="flex items-center justify-between gap-2 py-2"><span>ARPA (pricing)</span><Badge tone="neutral">{ARPA_FIXTURE.version}</Badge></li>
          </ul>
        </Section>
        <Section icon={<SlidersHorizontal />} title="Preferencias">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3"><span className="text-[14px]">Movimiento</span><Segmented size="sm" label="Movimiento" value={ui.motion} onChange={(motion) => setUi({ motion })} options={[{ value: 'system', label: 'Sistema' }, { value: 'reduced', label: 'Reducido' }, { value: 'full', label: 'Completo' }]} /></div>
            <div className="flex items-center justify-between gap-3"><span className="text-[14px]">Velocidad de la demo</span><Segmented size="sm" label="Velocidad" value={String(ui.speed) as '0.5' | '1' | '2'} onChange={(v) => setUi({ speed: Number(v) as 0.5 | 1 | 2 })} options={[{ value: '0.5', label: '0,5×' }, { value: '1', label: '1×' }, { value: '2', label: '2×' }]} /></div>
            <div className="flex items-center justify-between gap-3"><span className="text-[14px]">Menú lateral plegado</span><Toggle label="Menú plegado" on={Boolean(ui.sidebarCollapsed)} onChange={(v) => setUi({ sidebarCollapsed: v })} /></div>
          </div>
        </Section>
      </div>
      <Section icon={<Database />} title="Datos de la demo" subtitle={`Guardados en este navegador · esquema v${SCHEMA_VERSION}`}>
        <div className="flex flex-wrap gap-2">
          <Button icon={<Download />} onClick={exportState}>Exportar estado (JSON)</Button>
          <Button variant="danger" icon={<RotateCcw />} onClick={() => setConfirm(true)}>Restablecer datos de demostración</Button>
        </div>
      </Section>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="¿Restablecer la demo?" subtitle="Se pierden expedientes, versiones y registros creados en esta sesión"
        footer={<><Button variant="ghost" onClick={() => setConfirm(false)}>Cancelar</Button><Button variant="danger" onClick={() => { resetDemo(); setConfirm(false); }}>Restablecer</Button></>}>
        <p className="text-[14px] text-ink-2">Tu perfil y tus ajustes se conservan.</p>
      </Modal>
    </div>
  );
}
