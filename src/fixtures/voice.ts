// Notas de voz de ejemplo (transcripciones ficticias). Se usan cuando el navegador no ofrece
// reconocimiento de voz o para la demo guiada.
export interface VoiceSample { id: string; title: string; context: string; durationS: number; transcript: string }

export const VOICE_SAMPLES: VoiceSample[] = [
  {
    id: 'v-oceano', title: 'Tras la visita a Conservas Océano', context: 'En el coche, al salir del cliente', durationS: 34,
    transcript: 'Acabo de salir de Conservas Océano. Uxía me confirma que para la parada de diciembre necesitan 300 casquillos CB-30 en vez de 200 y que les preocupa el plazo. Están comparando con otro proveedor de Portugal. Les mando la oferta actualizada mañana y les llamo el jueves para cerrar.',
  },
  {
    id: 'v-cies', title: 'Contacto nuevo en la feria', context: 'Pasillo de la feria Navalia', durationS: 27,
    transcript: 'Nota rápida: en la feria Navalia hablé con Brais de Náutica Cíes. Quieren 40 bridas BR-210 en inoxidable para enero, con un presupuesto aproximado de 6.000 euros. Hay que visitarles la semana que viene.',
  },
  {
    id: 'v-lameiro', title: 'Oportunidad perdida en Lameiro', context: 'Tras una llamada', durationS: 22,
    transcript: 'Me dicen en Distribuciones Lameiro que han cerrado las válvulas con otro proveedor porque necesitaban el 15 por ciento de descuento. Damos la oportunidad por perdida, pero quieren que les visitemos en marzo para la tarifa de 2027.',
  },
];
