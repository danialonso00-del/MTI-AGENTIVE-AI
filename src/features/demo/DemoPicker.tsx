import { motion } from 'motion/react';
import { ArrowRight, Info, LibraryBig, MessageSquare, Mic, PhoneCall, Play, Radio } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/layout/Brand';
import { cx } from '@/lib/format';
import { SCENARIOS, type ScenarioEntry } from './scenarios';
import { DEPARTMENTS, USE_CASES } from './useCases';

export default function DemoPicker() {
  const nav = useNavigate();
  const star = SCENARIOS[0];
  return (
    <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6">
      <p className="text-[13px] font-medium text-[#8a6100]">Demo guiada</p>
      <h1 className="mt-1 text-[28px] font-semibold tracking-tight md:text-[34px]">¿Qué quieres enseñar?</h1>
      <p className="mt-1 max-w-3xl text-[14.5px] text-ink-3">Elige un escenario. Se reproduce a pantalla completa recorriendo las secciones del software, con narración para el presentador. Cada paso lo ejecuta el motor real con datos de ejemplo; al terminar puedes abrir los registros creados.</p>

      <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => nav(`/demo/${star.id}`)}
        className="tech-grid group mt-6 grid w-full items-center gap-6 overflow-hidden rounded-[20px] p-6 text-left ring-1 ring-navy-border transition-shadow hover:ring-gold/60 md:grid-cols-[minmax(0,1fr)_auto] md:p-8">
        <div>
          <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[12px] font-medium text-gold-light ring-1 ring-gold/30">Recorrido estrella · {star.reference}</span>
          <h2 className="mt-3 text-[30px] font-semibold tracking-tight text-white">{star.title}</h2>
          <p className="mt-2 max-w-2xl text-[15px] text-secondary">{star.description}</p>
          <Steps steps={star.steps} dark />
        </div>
        <span className="flex h-14 items-center gap-2 rounded-2xl bg-gold px-6 text-[16px] font-semibold text-navy transition-transform group-hover:scale-[1.03]"><Play className="size-5" />Iniciar demo</span>
      </motion.button>

      <Link to="/casos" className="mt-4 flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-line transition-shadow hover:ring-gold/50" data-testid="library-link">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy text-gold-light"><LibraryBig className="size-5" /></span>
        <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">Biblioteca de casos de uso · {USE_CASES.length} recorridos</span><span className="text-[13px] text-ink-3">Filtra por departamento, sector, proceso, agente o tecnología, con la ficha de cada caso de la presentación.</span></span>
        <ArrowRight className="size-5 text-[#8a6100]" />
      </Link>

      {([
        ['Licitaciones', 'Licitaciones públicas de obra', <img key="l" src="/brands/placsp.svg" alt="" className="h-6" />],
        ['CRM', 'Ayuda al comercial · CRM por voz', <span key="c" className="flex size-7 items-center justify-center rounded-lg bg-gold text-navy"><Mic className="size-4" /></span>],
        ['Odoo', 'Ejemplos con Odoo', <BrandLogo key="o" src="/brands/odoo.svg" name="Odoo" size={26} />],
      ] as const).map(([group, title, icon]) => (
        <section key={group}>
          <div className="mt-7 flex items-center gap-2.5">{icon}<h2 className="text-[18px] font-semibold">{title}</h2></div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {SCENARIOS.filter((s) => s.group === group).map((s, i) => <Card key={s.id} s={s} i={i} onClick={() => nav(`/demo/${s.id}`)} />)}
          </div>
        </section>
      ))}
      {DEPARTMENTS.map((d) => {
        const list = SCENARIOS.filter((s) => s.group === 'Casos de uso' && USE_CASES.find((u) => u.id === s.id)?.departments[0] === d.id);
        if (!list.length) return null;
        return (
          <section key={d.id}>
            <div className="mt-7 flex items-baseline gap-2.5"><h2 className="text-[18px] font-semibold">{d.name}</h2><Link to={`/casos?dept=${d.id}`} className="text-[13px] text-[#8a6100] hover:underline">ver en la biblioteca</Link></div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {list.map((s, i) => <Card key={s.id} s={s} i={i} onClick={() => nav(`/demo/${s.id}`)} />)}
            </div>
          </section>
        );
      })}
      <p className="mt-6 flex items-start gap-2 text-[12.5px] text-ink-3"><Info className="mt-0.5 size-4 shrink-0" />Al iniciar, el expediente o mensaje de ejemplo se restablece. Controles: espacio para pausar, flechas para cambiar de escena, Esc para salir. Con «Movimiento reducido» las escenas se muestran completas sin animación.</p>
    </div>
  );
}

function Card({ s, i, onClick }: { s: ScenarioEntry; i: number; onClick: () => void }) {
  return (
    <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * (i + 1) }} onClick={onClick}
      className="group flex flex-col rounded-2xl bg-white p-5 text-left shadow-[var(--shadow-card)] ring-1 ring-line transition-[box-shadow,transform] hover:-translate-y-0.5 hover:ring-gold/50">
      <div className="flex items-center justify-between">
        {s.channel === 'voz' || s.channel === 'llamada' || s.channel === 'chat' || s.channel === 'sistema' ? <span className="flex size-[30px] items-center justify-center rounded-lg bg-gold text-navy [&>svg]:size-4">{{ voz: <Mic />, llamada: <PhoneCall />, chat: <MessageSquare />, sistema: <Radio /> }[s.channel]}</span>
          : s.channel === 'erp' ? <BrandLogo src="/brands/odoo.svg" name="Odoo" size={30} />
          : s.channel === 'portal' ? <BrandLogo src={s.reference.includes('TED') ? '/brands/ted.png' : '/brands/placsp.svg'} name="Portal" size={30} />
          : <BrandLogo src={s.channel === 'whatsapp' ? '/brands/whatsapp.svg' : '/brands/gmail.svg'} name={s.channel} size={30} />}
        <span className="font-mono text-[11.5px] text-ink-3">{s.reference}</span>
      </div>
      <h3 className="mt-3 text-[17px] font-semibold">{s.title}</h3>
      <p className="mt-1 text-[13.5px] text-ink-3">{s.description}</p>
      <Steps steps={s.steps} />
      <span className="mt-auto flex items-center gap-1.5 pt-4 text-[13.5px] font-semibold text-[#8a6100]">Reproducir <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
    </motion.button>
  );
}

function Steps({ steps, dark }: { steps: string[]; dark?: boolean }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-1">
      {steps.map((x, i) => (
        <span key={x} className="flex items-center gap-1">
          {i > 0 && <ArrowRight className={cx('size-3', dark ? 'text-gold/60' : 'text-ink-3/50')} />}
          <span className={cx('rounded-md px-2 py-0.5 text-[12px]', dark ? 'bg-white/[0.07] text-secondary' : 'bg-canvas text-ink-2 ring-1 ring-line')}>{x}</span>
        </span>
      ))}
    </div>
  );
}
