import { ArrowLeft, Calculator, Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { MaterialId, PartFeatures } from '@/domain/types';
import { Button, Card, CardHeader, Field, Input, Segmented, Select, Stat, Textarea } from '@/components/ui';
import { DATASET_VERSION, MATERIALS } from '@/fixtures/manufacturing';
import { estimate } from '@/services/estimation/engine';
import { useStudio } from '@/store/useStudio';
import { eur, num, numSmart } from '@/lib/format';

const n = (v: string) => Number(v.replace(',', '.'));

export default function NewRequestPage() {
  const allPartners = useStudio((s) => s.erp.partners);
  const partners = useMemo(() => allPartners.filter((p) => p.isCompany), [allPartners]);
  const create = useStudio((s) => s.createManualRequest);
  const nav = useNavigate();
  const [f, setF] = useState({
    partnerId: '', company: '', contact: '', email: '', partNumber: '', partName: '', revision: 'A',
    family: 'prismatico-fresado' as PartFeatures['family'], L: '100', W: '60', H: '20', pocket: true, pL: '40', pW: '25', pD: '8',
    holes: '4', holeD: '8', fit: '', crit: '4', qty: '50', material: '' as MaterialId | '', finish: '', tolerance: 'ISO 2768-m', due: '', notes: '',
  });
  const up = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  const features: PartFeatures | null = useMemo(() => {
    const L = n(f.L), W = n(f.W), H = n(f.H);
    if (!(L > 0 && W > 0 && H > 0)) return null;
    const turned = f.family === 'torneado';
    return {
      family: f.family, lengthMm: turned ? W : L, widthMm: W, heightMm: H,
      pocket: !turned && f.pocket && n(f.pL) > 0 ? { lengthMm: n(f.pL), widthMm: n(f.pW), depthMm: n(f.pD) } : undefined,
      holes: { count: Math.max(0, Math.round(n(f.holes))), diameterMm: n(f.holeD) || 0, fit: f.fit || undefined },
      criticalDims: Math.max(1, Math.round(n(f.crit))),
      blankMm: { length: (turned ? W : L) + 10, width: W + (turned ? 5 : 10), height: H + 5 },
    };
  }, [f]);

  const errors: Record<string, string | null> = {
    company: f.company.trim() ? null : 'Obligatorio',
    email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email) ? null : 'Email no válido',
    partNumber: f.partNumber.trim() ? null : 'Obligatorio',
    dims: features ? null : 'Dimensiones > 0',
    pocket: features?.pocket && (features.pocket.lengthMm >= features.lengthMm || features.pocket.widthMm >= features.widthMm || features.pocket.depthMm >= features.heightMm) ? 'El bolsillo debe caber en la pieza' : null,
    qty: Number.isInteger(n(f.qty)) && n(f.qty) > 0 ? null : 'Entero > 0',
  };
  const invalid = Object.values(errors).some(Boolean);
  const [touched, setTouched] = useState(false);
  const preview = useMemo(() => (features && n(f.qty) > 0 ? estimate({
    revision: f.revision, quantity: n(f.qty), material: (f.material || null) as MaterialId | null, features, finish: f.finish || null,
    disabledMachineIds: [], rateOverrides: {}, overrides: [], pricing: { kind: 'margin', marginPct: 22 }, indirectPct: 12, datasetVersion: DATASET_VERSION,
  }) : null), [features, f.qty, f.material, f.finish, f.revision]);

  const submit = () => {
    setTouched(true);
    if (invalid || !features) return;
    const id = create({
      company: f.company.trim(), contact: f.contact.trim() || 'Contacto', email: f.email.trim(), partNumber: f.partNumber.trim().toUpperCase(), partName: f.partName.trim() || 'Pieza', revision: f.revision.trim() || 'A',
      quantity: n(f.qty), material: (f.material || null) as MaterialId | null, finish: f.finish.trim(), dueDate: f.due, tolerance: f.tolerance.trim(), features, notes: f.notes.trim(),
    });
    if (useStudio.getState().settings?.autoProcessInbox) void useStudio.getState().runUntil(id, 'review');
    nav(`/fabricacion/${id}/flujo`);
  };
  const err = (k: string) => (touched ? errors[k] : null);

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-5 md:px-6">
      <Link to="/fabricacion" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink"><ArrowLeft className="size-3.5" /> Bandeja de ofertas</Link>
      <h1 className="mt-2 text-[26px] font-semibold tracking-tight">Nueva solicitud manual</h1>
      <p className="mt-1 text-[14px] text-ink-3">Introduce requisitos y rasgos. El motor calcula con las mismas reglas que los expedientes de correo; los datos quedan marcados como introducidos manualmente.</p>
      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Cliente" />
            <div className="grid gap-3 p-4 md:grid-cols-2">
              <Field label="Cliente existente en el ERP" className="md:col-span-2" hint="Opcional: rellena empresa y email desde res.partner">
                <Select value={f.partnerId} onChange={(e) => { const p = partners.find((x) => x.id === e.target.value); up({ partnerId: e.target.value, company: p?.name ?? '', email: p?.email ?? '' }); }}>
                  <option value="">Nuevo cliente</option>
                  {partners.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.email}</option>)}
                </Select>
              </Field>
              <Field label="Empresa" error={err('company')} htmlFor="n-co"><Input id="n-co" value={f.company} onChange={(e) => up({ company: e.target.value })} aria-invalid={Boolean(err('company'))} /></Field>
              <Field label="Contacto" htmlFor="n-ct"><Input id="n-ct" value={f.contact} onChange={(e) => up({ contact: e.target.value })} /></Field>
              <Field label="Email" error={err('email')} htmlFor="n-em" className="md:col-span-2"><Input id="n-em" type="email" value={f.email} onChange={(e) => up({ email: e.target.value })} placeholder="compras@cliente.example" aria-invalid={Boolean(err('email'))} /></Field>
            </div>
          </Card>
          <Card>
            <CardHeader title="Pieza y rasgos" subtitle="Los rasgos alimentan las reglas de proceso; el bruto se calcula con +10 mm de sobremedida (+5 mm en altura)" />
            <div className="grid gap-3 p-4 md:grid-cols-4">
              <Field label="Referencia" error={err('partNumber')} htmlFor="n-pn"><Input id="n-pn" value={f.partNumber} onChange={(e) => up({ partNumber: e.target.value })} placeholder="SP-200" aria-invalid={Boolean(err('partNumber'))} /></Field>
              <Field label="Denominación" htmlFor="n-nm" className="md:col-span-2"><Input id="n-nm" value={f.partName} onChange={(e) => up({ partName: e.target.value })} placeholder="Soporte" /></Field>
              <Field label="Revisión" htmlFor="n-rv"><Input id="n-rv" value={f.revision} onChange={(e) => up({ revision: e.target.value })} /></Field>
              <div className="md:col-span-4"><Segmented label="Familia" value={f.family} onChange={(family) => up({ family })} options={[{ value: 'prismatico-fresado', label: 'Prismático fresado' }, { value: 'torneado', label: 'Torneado' }]} /></div>
              {f.family === 'prismatico-fresado' && <Field label="Largo (mm)" error={err('dims')}><Input type="number" value={f.L} onChange={(e) => up({ L: e.target.value })} /></Field>}
              <Field label={f.family === 'torneado' ? 'Diámetro (mm)' : 'Ancho (mm)'}><Input type="number" value={f.W} onChange={(e) => up({ W: e.target.value })} /></Field>
              <Field label={f.family === 'torneado' ? 'Espesor (mm)' : 'Alto (mm)'}><Input type="number" value={f.H} onChange={(e) => up({ H: e.target.value })} /></Field>
              <Field label="Cotas críticas"><Input type="number" value={f.crit} onChange={(e) => up({ crit: e.target.value })} /></Field>
              <Field label="Nº taladros"><Input type="number" value={f.holes} onChange={(e) => up({ holes: e.target.value })} /></Field>
              <Field label="Ø taladro (mm)"><Input type="number" value={f.holeD} onChange={(e) => up({ holeD: e.target.value })} /></Field>
              <Field label="Ajuste"><Input value={f.fit} onChange={(e) => up({ fit: e.target.value })} placeholder="H7" /></Field>
              {f.family === 'prismatico-fresado' && (
                <>
                  <label className="flex items-center gap-2 self-end pb-2 text-[13.5px] md:col-span-4"><input type="checkbox" className="size-4 accent-[#e6a817]" checked={f.pocket} onChange={(e) => up({ pocket: e.target.checked })} /> Bolsillo</label>
                  {f.pocket && (
                    <>
                      <Field label="Bolsillo largo" error={err('pocket')}><Input type="number" value={f.pL} onChange={(e) => up({ pL: e.target.value })} /></Field>
                      <Field label="Bolsillo ancho"><Input type="number" value={f.pW} onChange={(e) => up({ pW: e.target.value })} /></Field>
                      <Field label="Profundidad"><Input type="number" value={f.pD} onChange={(e) => up({ pD: e.target.value })} /></Field>
                    </>
                  )}
                </>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Requisitos" />
            <div className="grid gap-3 p-4 md:grid-cols-3">
              <Field label="Cantidad (uds)" error={err('qty')}><Input type="number" value={f.qty} onChange={(e) => up({ qty: e.target.value })} aria-invalid={Boolean(err('qty'))} /></Field>
              <Field label="Material" hint={!f.material ? 'Sin material la solicitud quedará en «Requiere dato»' : undefined}>
                <Select value={f.material} onChange={(e) => up({ material: e.target.value as MaterialId | '' })}>
                  <option value="">Sin especificar</option>
                  {Object.values(MATERIALS).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              </Field>
              <Field label="Acabado"><Input value={f.finish} onChange={(e) => up({ finish: e.target.value })} placeholder="Anodizado natural" /></Field>
              <Field label="Tolerancias"><Input value={f.tolerance} onChange={(e) => up({ tolerance: e.target.value })} /></Field>
              <Field label="Fecha solicitada"><Input type="date" value={f.due} onChange={(e) => up({ due: e.target.value })} /></Field>
              <Field label="Notas / texto de la petición" className="md:col-span-3"><Textarea value={f.notes} onChange={(e) => up({ notes: e.target.value })} placeholder="Texto que acompañará al expediente como mensaje de entrada" /></Field>
            </div>
          </Card>
        </div>
        <div>
          <Card className="sticky top-[72px]">
            <CardHeader title="Vista previa del cálculo" icon={<Calculator />} subtitle="Con las reglas y datasets actuales" />
            <div className="space-y-3 p-4">
              {!preview ? <p className="text-[13.5px] text-ink-3">Introduce dimensiones y cantidad.</p> : preview.blocked.length ? (
                <p className="rounded-xl bg-warn-bg px-3 py-2.5 text-[13.5px] text-warn">{preview.blocked.join(' · ')}</p>
              ) : (
                <>
                  <Stat label="Tiempo estimado del lote" value={`${numSmart(preview.estimatedLotMin, 1)} min`} sub={`${num(preview.perPieceMin, 2)} min/pieza · ${preview.operations.length} operaciones`} tone="gold" />
                  <Stat label="Precio orientativo" value={eur(preview.cost.commercialTotalEur)} sub={`${eur(preview.cost.commercialUnitEur)}/ud · margen 22 %`} />
                  <p className="text-[12.5px] text-ink-3">Comparables usados: {preview.comparablesUsed.join(', ') || 'ninguno (sin corrección)'}</p>
                </>
              )}
              <Button variant="primary" className="w-full" icon={<Check />} onClick={submit} disabled={touched && invalid} disabledReason="Revisa los campos marcados">Crear solicitud</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
