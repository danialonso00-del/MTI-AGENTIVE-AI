import { AlertTriangle, Box, Check, Copy, ExternalLink, FileSpreadsheet, FileText, GitCompare, Mail, Paperclip, PenLine, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Attachment, ExtractedField, FieldKey, ManufacturingRequest } from '@/domain/types';
import { Badge, Button, Card, CardHeader, EmptyState, Input, Select } from '@/components/ui';
import { Highlighted, RequirementsSheetView } from '@/components/evidence/Evidence';
import { PartDrawing } from '@/components/part/PartDrawing';
import { DRAWINGS, REQUIREMENTS } from '@/fixtures/drawings';
import { MATERIALS } from '@/fixtures/manufacturing';
import { findEvidence } from '@/services/estimation/evidence';
import { useStudio } from '@/store/useStudio';
import { cx, dateTimeEs } from '@/lib/format';
import { FIELD_STATUS_LABEL } from '../StepOutput';
import { parseDxf, readUploadedFile, summarizeDxf } from '../fileReader';

const previewUrls = new Map<string, string>(); // solo sesión: los binarios subidos no se persisten
const FIELD_TONE = { extracted: 'info', confirmed: 'ok', assumed: 'gold', missing: 'warn' } as const;

type Focus = { kind: 'email' | 'att'; id: string; anchor?: string };

export function MailTab({ req }: { req: ManufacturingRequest }) {
  const [focus, setFocus] = useState<Focus>({ kind: 'email', id: req.emails[0]?.id ?? '' });
  const addAttachment = useStudio((s) => s.addAttachment);
  const applyRev = useStudio((s) => s.applyPendingRevision);
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setReading(true);
    for (const f of Array.from(files)) {
      const att = await readUploadedFile(f);
      if (att.previewUrl) previewUrls.set(att.id, att.previewUrl);
      const { previewUrl: _p, ...clean } = att;
      void _p;
      addAttachment(req.id, clean);
      setFocus({ kind: 'att', id: att.id });
    }
    setReading(false);
  };

  const openEvidence = (evId: string) => {
    const ev = findEvidence(req, evId);
    if (!ev) return;
    if (req.emails.some((m) => m.id === ev.sourceId)) setFocus({ kind: 'email', id: ev.sourceId, anchor: ev.anchor ?? ev.excerpt });
    else if (req.attachments.some((a) => a.id === ev.sourceId)) setFocus({ kind: 'att', id: ev.sourceId, anchor: ev.anchor });
  };

  return (
    <div className="space-y-4">
      {req.pendingRevision && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-warn-bg px-4 py-3 ring-1 ring-warn/25">
          <GitCompare className="size-5 text-warn" />
          <div className="min-w-0 flex-1 text-[13.5px] text-[#7c3d06]">
            <b>Revisión {req.pendingRevision.revision} recibida.</b> {req.pendingRevision.changes?.join(' · ')}. La rev. {req.currentRevision} y sus versiones se conservan.
          </div>
          <Button variant="primary" onClick={() => applyRev(req.id)}>Incorporar rev. {req.pendingRevision.revision}</Button>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_360px] 2xl:grid-cols-[290px_minmax(0,1fr)_400px]">
        {/* Hilo y adjuntos */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Hilo" icon={<Mail />} subtitle={`${req.emails.length} mensajes`} />
            <ul className="p-1.5">
              {req.emails.length === 0 && <li className="px-3 py-4 text-[13px] text-ink-3">Solicitud manual sin correo.</li>}
              {req.emails.map((m) => (
                <li key={m.id}>
                  <button onClick={() => setFocus({ kind: 'email', id: m.id })} className={cx('w-full rounded-xl px-3 py-2.5 text-left transition-colors', focus.kind === 'email' && focus.id === m.id ? 'bg-gold/10 ring-1 ring-gold/30' : 'hover:bg-ink/[0.03]')}>
                    <div className="flex items-center justify-between gap-2 text-[12px] text-ink-3"><span className="truncate">{m.fromName}</span><span className="shrink-0">{dateTimeEs(m.date)}</span></div>
                    <div className="mt-0.5 line-clamp-2 text-[13.5px] font-medium text-ink">{m.subject}</div>
                    {m.attachmentIds.length > 0 && <div className="mt-1 flex items-center gap-1 text-[12px] text-ink-3"><Paperclip className="size-3" />{m.attachmentIds.length}</div>}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Adjuntos" icon={<Paperclip />} subtitle={`${req.attachments.length} archivos`} />
            <ul className="p-1.5">
              {req.attachments.map((a) => (
                <li key={a.id}>
                  <button onClick={() => setFocus({ kind: 'att', id: a.id })} className={cx('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors', focus.kind === 'att' && focus.id === a.id ? 'bg-gold/10 ring-1 ring-gold/30' : 'hover:bg-ink/[0.03]')}>
                    <AttIcon a={a} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-[12.5px] text-ink">{a.fileName}</div>
                      <div className="text-[11.5px] text-ink-3">{capLabel(a)}</div>
                    </div>
                    {a.revision && <span className="rounded bg-ink/[0.05] px-1.5 font-mono text-[11px] text-ink-3">{a.revision}</span>}
                  </button>
                </li>
              ))}
            </ul>
            <div className="p-3 pt-0">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files); }}
                className={cx('rounded-xl border border-dashed px-3 py-4 text-center transition-colors', dragging ? 'border-gold bg-gold/5' : 'border-line-strong')}>
                <Upload className="mx-auto size-5 text-ink-3" />
                <p className="mt-1 text-[12.5px] text-ink-3">STEP, DXF, CSV, PDF o imagen</p>
                <Button size="sm" className="mt-2" onClick={() => fileInput.current?.click()} disabled={reading}>{reading ? 'Leyendo…' : 'Añadir archivo'}</Button>
                <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} aria-label="Añadir archivo" />
              </div>
            </div>
          </Card>
        </div>

        {/* Visor */}
        <Card className="min-h-[520px] overflow-hidden">
          <Viewer req={req} focus={focus} />
        </Card>

        {/* Campos */}
        <div className="space-y-4 lg:col-span-2 xl:col-span-1">
          <FieldsCard req={req} onSource={openEvidence} />
          {req.replyDraft && req.steps.intake?.status === 'needs_input' && <QuestionDraft text={req.replyDraft} />}
        </div>
      </div>
    </div>
  );
}

const capLabel = (a: Attachment) => ({ fixture_parsed: 'Extracción de ejemplo', header_read: 'Lectura real de cabecera', text_read: 'Lectura real de texto', preview_only: 'Solo vista previa', unsupported: 'Formato no soportado' }[a.capability]);

function AttIcon({ a }: { a: Attachment }) {
  const cls = 'flex size-8 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4';
  if (a.kind === 'step' || a.kind === 'glb') return <span className={cx(cls, 'bg-[#eef2ff] text-[#4338ca]')}><Box /></span>;
  if (a.kind === 'dxf') return <span className={cx(cls, 'bg-[#ecfeff] text-[#0e7490]')}><PenLine /></span>;
  if (a.kind === 'csv') return <span className={cx(cls, 'bg-ok-bg text-ok')}><FileSpreadsheet /></span>;
  return <span className={cx(cls, 'bg-err-bg text-err')}><FileText /></span>;
}

function Viewer({ req, focus }: { req: ManufacturingRequest; focus: Focus }) {
  if (focus.kind === 'email') {
    const m = req.emails.find((e) => e.id === focus.id);
    if (!m) return <EmptyState icon={<Mail />} title="Sin correo">Selecciona un mensaje o adjunto.</EmptyState>;
    return (
      <div className="p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
          <span className="font-medium text-ink-2">{m.fromName}</span><span>&lt;{m.from}&gt;</span><span>→ {m.to}</span><span className="ml-auto">{dateTimeEs(m.date)}</span>
        </div>
        <h2 className="mt-2 text-[18px] font-semibold">{m.subject}</h2>
        <Highlighted className="mt-4 block whitespace-pre-wrap text-[15px] leading-[1.7] text-ink-2" text={m.body} needle={focus.anchor} />
        {m.attachmentIds.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            {m.attachmentIds.map((id) => { const a = req.attachments.find((x) => x.id === id); return a ? <span key={id} className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2 py-1 font-mono text-[12px] text-ink-2 ring-1 ring-line"><Paperclip className="size-3" />{a.fileName}</span> : null; })}
          </div>
        )}
        <p className="mt-6 text-[12px] text-ink-3">El contenido del correo es un input: no puede introducir herramientas, credenciales ni instrucciones de escritura.</p>
      </div>
    );
  }
  const a = req.attachments.find((x) => x.id === focus.id);
  if (!a) return null;
  const header = (
    <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
      <AttIcon a={a} />
      <span className="font-mono text-[13px] font-medium">{a.fileName}</span>
      <Badge tone={a.capability === 'unsupported' ? 'err' : a.capability === 'preview_only' ? 'warn' : a.capability === 'fixture_parsed' ? 'gold' : 'ok'}>{capLabel(a)}</Badge>
      {a.sha256 && <span className="font-mono text-[11px] text-ink-3" title={a.sha256}>sha256 {a.sha256.slice(0, 10)}…</span>}
      {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[12.5px] text-info hover:underline">Abrir original <ExternalLink className="size-3" /></a>}
    </div>
  );
  if (a.fileName.startsWith('Requisitos') && REQUIREMENTS[req.ref]) return <>{header}<div className="p-5"><RequirementsSheetView sheetId={req.ref} highlight={focus.anchor} /></div></>;
  if (a.kind === 'pdf' && a.capability === 'fixture_parsed') {
    const spec = DRAWINGS[`${req.partNumber}:${a.revision}`];
    return <>{header}<div className="bg-canvas p-4">{spec ? <PartDrawing spec={spec} highlight={focus.anchor} className="w-full rounded-lg shadow-sm ring-1 ring-line" /> : null}<Summary a={a} /></div></>;
  }
  if (a.kind === 'step' && a.capability === 'fixture_parsed') {
    return <>{header}<div className="p-5"><p className="rounded-xl bg-gold/10 px-4 py-3 text-[13.5px] text-[#7a5600] ring-1 ring-gold/30">{a.substituteNote}</p><Summary a={a} /><Link to={`/fabricacion/${req.id}/pieza`} className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-info hover:underline"><Box className="size-4" /> Ver modelo de ejemplo en 3D</Link></div></>;
  }
  if (a.kind === 'dxf' && a.url) return <>{header}<DxfLive url={a.url} /></>;
  const preview = previewUrls.get(a.id);
  return (
    <>
      {header}
      <div className="p-5">
        <Summary a={a} />
        {a.textPreview && <pre className="mt-3 max-h-[360px] overflow-auto rounded-xl bg-canvas p-3 font-mono text-[12px] ring-1 ring-line scroll-thin">{a.textPreview}</pre>}
        {preview && a.kind === 'pdf' && <iframe title={a.fileName} src={preview} className="mt-3 h-[480px] w-full rounded-xl ring-1 ring-line" />}
        {preview && a.kind === 'image' && <img src={preview} alt={a.fileName} className="mt-3 max-h-[480px] rounded-xl ring-1 ring-line" />}
        {!preview && (a.kind === 'pdf' || a.kind === 'image') && <p className="mt-3 text-[12.5px] text-ink-3">La vista previa solo existe durante la sesión en que se subió: el archivo no se almacena en la demo.</p>}
        {(a.capability === 'preview_only' || a.capability === 'unsupported') && <p className="mt-3 rounded-xl bg-info-bg px-3 py-2 text-[13px] text-info">Para estimar con este archivo, introduce o confirma los rasgos y parámetros en «Estimación» o crea una solicitud manual. No se aplican resultados de ejemplo.</p>}
      </div>
    </>
  );
}

function Summary({ a }: { a: Attachment }) {
  if (!a.readSummary?.length) return null;
  return (
    <ul className="mt-3 space-y-1 text-[13px] text-ink-2">
      {a.readSummary.map((s) => <li key={s} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-ok" />{s}</li>)}
    </ul>
  );
}

function DxfLive({ url }: { url: string }) {
  const [lines, setLines] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch(url).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`)))).then((t) => setLines(summarizeDxf(parseDxf(t)))).catch((e) => setErr(String(e.message)));
  }, [url]);
  return (
    <div className="p-5">
      <p className="text-[12.5px] text-ink-3">Lectura real del archivo DXF en el navegador (entidades y extensión):</p>
      {err && <p className="mt-2 text-[13px] text-err">No se pudo leer: {err}</p>}
      {!lines && !err && <div className="skeleton mt-3 h-20 rounded-xl" />}
      {lines && <ul className="mt-2 space-y-1 text-[13.5px] text-ink-2">{lines.map((s) => <li key={s} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-ok" />{s}</li>)}</ul>}
    </div>
  );
}

function FieldsCard({ req, onSource }: { req: ManufacturingRequest; onSource: (evId: string) => void }) {
  return (
    <Card>
      <CardHeader title="Campos extraídos" subtitle="Cada valor con su fuente y estado" />
      <ul className="divide-y divide-line">
        {req.fields.map((f) => <FieldRow key={f.key} req={req} f={f} onSource={onSource} />)}
      </ul>
    </Card>
  );
}

function FieldRow({ req, f, onSource }: { req: ManufacturingRequest; f: ExtractedField; onSource: (evId: string) => void }) {
  const confirm = useStudio((s) => s.confirmField);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(f.key === 'material' ? req.draft.material ?? '' : f.value ?? '');
  const contradiction = new Set(f.candidates.map((c) => c.value.toLowerCase())).size > 1 && f.status !== 'confirmed';
  const editable: FieldKey[] = ['quantity', 'material', 'finish', 'dueDate', 'tolerance'];
  const save = () => { if (String(value).trim()) { confirm(req.id, f.key, String(value)); setEditing(false); } };
  return (
    <li className={cx('px-4 py-3', f.status === 'missing' && ['material', 'quantity'].includes(f.key) && 'bg-warn-bg/60')} data-field={f.key}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] text-ink-3">{f.label}</div>
          {editing ? (
            <div className="mt-1 flex gap-2">
              {f.key === 'material' ? (
                <Select value={value} onChange={(e) => setValue(e.target.value)} aria-label="Material">
                  <option value="">Selecciona material…</option>
                  {Object.values(MATERIALS).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              ) : (
                <Input value={value} onChange={(e) => setValue(e.target.value)} type={f.key === 'quantity' ? 'number' : f.key === 'dueDate' ? 'date' : 'text'} min={1} aria-label={f.label} onKeyDown={(e) => e.key === 'Enter' && save()} />
              )}
              <Button size="sm" variant="primary" onClick={save} disabled={!String(value).trim() || (f.key === 'quantity' && !(Number(value) > 0))} disabledReason="Introduce un valor válido">Guardar</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
            </div>
          ) : (
            <div className="mt-0.5 text-[14px] font-medium text-ink">{f.value ?? <span className="text-warn">Sin dato</span>}{f.unit && f.value ? ` ${f.unit}` : ''}</div>
          )}
        </div>
        <Badge tone={FIELD_TONE[f.status]}>{FIELD_STATUS_LABEL[f.status]}</Badge>
      </div>
      {f.note && <p className="mt-1 text-[12.5px] text-ink-3">{f.note}</p>}
      {contradiction && (
        <div className="mt-2 rounded-lg bg-warn-bg px-2.5 py-2 text-[12.5px] text-[#7c3d06] ring-1 ring-warn/20">
          <div className="mb-1 flex items-center gap-1.5 font-medium"><AlertTriangle className="size-3.5" /> Fuentes contradictorias</div>
          {f.candidates.map((c) => (
            <div key={c.evidenceId} className="flex items-center justify-between gap-2 py-0.5">
              <button className="truncate text-left underline-offset-2 hover:underline" onClick={() => onSource(c.evidenceId)}>«{c.value}» · {findEvidence(req, c.evidenceId)?.locator.split(' · ')[0]}</button>
              <button className="shrink-0 rounded-md bg-white px-2 py-0.5 font-medium text-ink ring-1 ring-line hover:ring-gold" onClick={() => confirm(req.id, f.key, c.value)}>Usar este</button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {f.evidenceIds.map((id) => {
          const ev = findEvidence(req, id);
          if (!ev) return null;
          return <button key={id} onClick={() => onSource(id)} className={cx('rounded-md px-1.5 py-0.5 text-[11.5px] ring-1 ring-inset hover:ring-gold', ev.kind === 'human' ? 'bg-ok-bg text-ok ring-ok/15' : 'bg-info-bg text-info ring-info/15')} title={ev.locator}>{ev.locator.split(' · ').slice(0, 1)[0].replace(/ \d.*$/, '')} · {ev.locator.split(' · ').at(-1)}</button>;
        })}
        {editable.includes(f.key) && !editing && (
          <button className="ml-auto text-[12.5px] font-medium text-ink-3 hover:text-ink" onClick={() => setEditing(true)}>{f.status === 'missing' ? 'Completar' : 'Editar'}</button>
        )}
        {f.status !== 'confirmed' && f.status !== 'missing' && f.value && !editing && (
          <button className="text-[12.5px] font-medium text-ok hover:underline" onClick={() => confirm(req.id, f.key, f.key === 'material' ? req.draft.material ?? f.value! : f.value!)}>Confirmar</button>
        )}
      </div>
    </li>
  );
}

function QuestionDraft({ text }: { text: string }) {
  const toast = useStudio((s) => s.toast);
  return (
    <Card>
      <CardHeader title="Pregunta al cliente (borrador)" subtitle="No se envía automáticamente" actions={<Button size="sm" icon={<Copy />} onClick={() => { navigator.clipboard?.writeText(text); toast('info', 'Texto copiado'); }}>Copiar</Button>} />
      <pre className="whitespace-pre-wrap px-4 py-3 font-sans text-[13.5px] leading-relaxed text-ink-2">{text}</pre>
    </Card>
  );
}
