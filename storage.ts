import { Medicine, DoseLog, CachedInteractionReport } from './types';

const MEDS_KEY = 'meditrack.medicines.v1';
const LOGS_KEY = 'meditrack.logs.v1';
const INTERACTIONS_KEY = 'meditrack.interactions.v1';

export const loadMedicines = (): Medicine[] => {
  try {
    const raw = localStorage.getItem(MEDS_KEY);
    return raw ? (JSON.parse(raw) as Medicine[]) : [];
  } catch (e) {
    console.error('Error leyendo medicinas de localStorage:', e);
    return [];
  }
};

export const saveMedicines = (medicines: Medicine[]): void => {
  try {
    localStorage.setItem(MEDS_KEY, JSON.stringify(medicines));
  } catch (e) {
    console.error('Error guardando medicinas:', e);
    // Si se llenó el almacenamiento (fotos grandes), reintenta sin fotos de receta
    try {
      const slim = medicines.map(m => ({ ...m, prescriptionPhoto: undefined }));
      localStorage.setItem(MEDS_KEY, JSON.stringify(slim));
    } catch (e2) {
      console.error('Error guardando medicinas sin fotos:', e2);
    }
  }
};

export const loadLogs = (): DoseLog[] => {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    return raw ? (JSON.parse(raw) as DoseLog[]) : [];
  } catch (e) {
    console.error('Error leyendo historial de localStorage:', e);
    return [];
  }
};

export const saveLogs = (logs: DoseLog[]): void => {
  try {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Error guardando historial:', e);
  }
};

const PROFILE_KEY = 'meditrack.profile.v1';
const ALERTS_SEEN_KEY = 'meditrack.alertsSeen.v1';

export const loadProfileName = (): string => {
  try {
    return localStorage.getItem(PROFILE_KEY) || '';
  } catch {
    return '';
  }
};

export const saveProfileName = (name: string): void => {
  try {
    localStorage.setItem(PROFILE_KEY, name);
  } catch (e) {
    console.error('Error guardando perfil:', e);
  }
};

/** Última vez que se abrió el panel de avisos (para el contador de no leídos) */
export const loadAlertsSeenAt = (): string => {
  try {
    return localStorage.getItem(ALERTS_SEEN_KEY) || '';
  } catch {
    return '';
  }
};

export const saveAlertsSeenAt = (iso: string): void => {
  try {
    localStorage.setItem(ALERTS_SEEN_KEY, iso);
  } catch {
    /* sin consecuencias */
  }
};

export const loadInteractionReport = (): CachedInteractionReport | null => {
  try {
    const raw = localStorage.getItem(INTERACTIONS_KEY);
    return raw ? (JSON.parse(raw) as CachedInteractionReport) : null;
  } catch {
    return null;
  }
};

export const saveInteractionReport = (cached: CachedInteractionReport): void => {
  try {
    localStorage.setItem(INTERACTIONS_KEY, JSON.stringify(cached));
  } catch (e) {
    console.error('Error guardando revisión de interacciones:', e);
  }
};
