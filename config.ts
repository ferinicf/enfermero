/**
 * Configuración de la app (clave de Gemini y conexión de Supabase).
 *
 * Se puede definir de dos maneras:
 * 1. En tiempo de ejecución, desde la pantalla de Ajustes (se guarda en el
 *    dispositivo). Es la vía normal para la familia: quien configura primero
 *    genera un "enlace de configuración" (#cfg=...) y los demás solo lo abren.
 * 2. Con variables de entorno al compilar (VITE_GEMINI_API_KEY, etc.), útil
 *    en desarrollo. Lo guardado en el dispositivo tiene prioridad.
 */

export interface AppConfig {
  geminiKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const CONFIG_KEY = 'meditrack.config.v1';

const env = (import.meta as any).env || {};

const readStored = (): Partial<AppConfig> => {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as Partial<AppConfig>) : {};
  } catch {
    return {};
  }
};

export const saveConfig = (cfg: Partial<AppConfig>): void => {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...readStored(), ...cfg }));
  } catch (e) {
    console.error('Error guardando configuración:', e);
  }
};

/** Aplica un enlace de configuración familiar (#cfg=<base64 JSON>) si está en la URL */
const applyConfigFromUrl = (): void => {
  try {
    const match = window.location.hash.match(/#cfg=([A-Za-z0-9+/=_-]+)/);
    if (!match) return;
    const json = atob(match[1].replace(/-/g, '+').replace(/_/g, '/'));
    const incoming = JSON.parse(json) as Partial<AppConfig>;
    saveConfig({
      geminiKey: typeof incoming.geminiKey === 'string' ? incoming.geminiKey : undefined,
      supabaseUrl: typeof incoming.supabaseUrl === 'string' ? incoming.supabaseUrl : undefined,
      supabaseAnonKey: typeof incoming.supabaseAnonKey === 'string' ? incoming.supabaseAnonKey : undefined,
    });
    // Quita las claves de la barra de direcciones
    history.replaceState({}, '', window.location.pathname + window.location.search);
  } catch (e) {
    console.error('Enlace de configuración no válido:', e);
  }
};

applyConfigFromUrl();

// Si el enlace se abre con la app ya cargada (solo cambia el #hash), aplícalo también
window.addEventListener('hashchange', () => {
  if (window.location.hash.startsWith('#cfg=')) {
    applyConfigFromUrl();
    window.location.reload();
  }
});

export const getConfig = (): AppConfig => {
  const stored = readStored();
  return {
    geminiKey:
      stored.geminiKey ||
      env.VITE_GEMINI_API_KEY ||
      (typeof process !== 'undefined' ? (process as any).env?.API_KEY : '') ||
      '',
    supabaseUrl: stored.supabaseUrl || env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: stored.supabaseAnonKey || env.VITE_SUPABASE_ANON_KEY || '',
  };
};

/** Enlace que deja configurado otro teléfono al abrirlo (solo compartir con la familia) */
export const buildConfigLink = (): string => {
  const { geminiKey, supabaseUrl, supabaseAnonKey } = getConfig();
  const payload = btoa(JSON.stringify({ geminiKey, supabaseUrl, supabaseAnonKey }));
  return `${window.location.origin}${window.location.pathname}#cfg=${payload}`;
};
