// Dictado por voz con la Web Speech API del navegador (es-ES). Si no está disponible
// (Firefox, navegadores sin micrófono, pruebas), la interfaz ofrece notas de ejemplo o texto.
import { useCallback, useEffect, useRef, useState } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */
const Ctor: any = typeof window !== 'undefined' ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition : undefined;

export function useSpeech(lang = 'es-ES') {
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<any>(null);

  useEffect(() => () => rec.current?.abort?.(), []);

  const start = useCallback(() => {
    if (!Ctor) { setError('Este navegador no ofrece reconocimiento de voz. Usa una nota de ejemplo o escribe el texto.'); return; }
    setError(null); setFinalText(''); setInterim('');
    const r = new Ctor();
    r.lang = lang; r.continuous = true; r.interimResults = true;
    r.onresult = (ev: any) => {
      let fin = ''; let tmp = '';
      for (let i = 0; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res.isFinal) fin += res[0].transcript; else tmp += res[0].transcript;
      }
      setFinalText(fin.trim()); setInterim(tmp);
    };
    r.onerror = (ev: any) => { setError(ev.error === 'not-allowed' ? 'Permiso de micrófono denegado.' : `Error de reconocimiento: ${ev.error}`); setListening(false); };
    r.onend = () => setListening(false);
    rec.current = r;
    r.start();
    setListening(true);
  }, [lang]);

  const stop = useCallback(() => { rec.current?.stop?.(); setListening(false); }, []);

  return { supported: Boolean(Ctor), listening, text: `${finalText}${interim ? ` ${interim}` : ''}`.trim(), finalText, error, start, stop, setFinalText };
}
