import { MessageSquare } from 'lucide-react';
import { useState } from 'react';
import type { ManufacturingRequest } from '@/domain/types';
import { Button, Card, CardHeader, Textarea } from '@/components/ui';
import { agentByCode } from '@/fixtures/agents';
import { useStudio } from '@/store/useStudio';
import { cx, dateTimeEs } from '@/lib/format';

const DOT = { info: 'bg-info', success: 'bg-ok', warning: 'bg-warn', error: 'bg-err', human: 'bg-gold' } as const;

export function ActivityTab({ req }: { req: ManufacturingRequest }) {
  const add = useStudio((s) => s.addComment);
  const [text, setText] = useState('');
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardHeader title="Actividad" subtitle="Pasos de herramientas y decisiones humanas (no se muestra razonamiento interno del modelo)" />
        <ol className="relative px-5 py-4">
          <span className="absolute bottom-6 left-[27px] top-6 w-px bg-line" aria-hidden />
          {[...req.activity].reverse().map((a) => {
            const agent = agentByCode(a.actor);
            return (
              <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
                <span className={cx('relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-white', DOT[a.kind])} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
                    <span className={cx('rounded px-1.5 py-px font-mono text-[11px]', agent ? 'bg-ink/[0.06] text-ink-2' : 'bg-gold/12 text-[#7a5600]')}>{agent ? a.actor : a.actor.split(' (')[0]}</span>
                    {agent && <span>{agent.name}</span>}
                    <span>{dateTimeEs(a.at)}</span>
                  </div>
                  <p className="mt-0.5 text-[13.5px] text-ink-2">{a.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
      <Card className="h-fit">
        <CardHeader title="Comentarios" icon={<MessageSquare />} />
        <div className="space-y-3 p-4">
          {req.comments.length === 0 && <p className="text-[13px] text-ink-3">Sin comentarios.</p>}
          {req.comments.map((c) => (
            <div key={c.id} className="rounded-xl bg-canvas px-3 py-2 ring-1 ring-line">
              <div className="text-[12px] text-ink-3">{c.by} · {dateTimeEs(c.at)}{c.opId ? ` · ${c.opId.replace('op-', '')}` : ''}</div>
              <div className="text-[13.5px]">{c.text}</div>
            </div>
          ))}
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe un comentario para el expediente" aria-label="Comentario" />
          <Button variant="primary" disabled={!text.trim()} disabledReason="Escribe un comentario" onClick={() => { add(req.id, text.trim()); setText(''); }}>Añadir comentario</Button>
        </div>
      </Card>
    </div>
  );
}
