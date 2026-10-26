import type { ComponentType } from 'react';

export interface DemoScene {
  id: string;
  /** Sección del software donde ocurre (aparece en el selector de secciones). */
  section: string;
  /** Ruta real equivalente en la aplicación. */
  where: { label: string; to: string };
  title: string;
  narration: string;
  agents: string[];
  duration: number; // ms a velocidad 1×
  /** Trabajo real del motor al entrar en la escena (se ejecuta una vez). */
  enter?: () => unknown | Promise<unknown>;
  /** Trabajo real disparado en un instante de la escena (p. ej. una decisión humana). */
  at?: { t: number; run: () => unknown | Promise<unknown> }[];
  Component: ComponentType<{ t: number }>;
}

export interface DemoScenario {
  id: string;
  title: string;
  subtitle: string;
  reference: string;
  prepare: () => void;
  scenes: DemoScene[];
  finale: { label: string; to: () => string }[];
}
