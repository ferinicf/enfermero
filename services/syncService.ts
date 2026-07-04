import { supabase, syncEnabled } from '../supabaseClient';
import { Medicine, DoseLog } from '../types';

/**
 * Sincronización del "modo familiar" con Supabase.
 *
 * Las tablas guardan cada objeto completo como JSON (columna `data`),
 * así el esquema no se rompe cuando la app agrega campos nuevos:
 *
 *   create table medicines (
 *     id text primary key,
 *     data jsonb not null,
 *     updated_at timestamptz not null default now()
 *   );
 *   create table dose_logs (
 *     id text primary key,
 *     data jsonb not null,
 *     updated_at timestamptz not null default now()
 *   );
 *
 * (El SQL completo, con políticas y realtime, está en el README.)
 */

export interface RemoteData {
  medicines: Medicine[];
  logs: DoseLog[];
}

export const fetchRemote = async (): Promise<RemoteData | null> => {
  if (!supabase) return null;
  const [meds, logs] = await Promise.all([
    supabase.from('medicines').select('data'),
    supabase.from('dose_logs').select('data'),
  ]);
  if (meds.error) throw meds.error;
  if (logs.error) throw logs.error;
  return {
    medicines: (meds.data ?? []).map(r => r.data as Medicine),
    logs: (logs.data ?? []).map(r => r.data as DoseLog),
  };
};

export const pushMedicine = async (med: Medicine): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase
    .from('medicines')
    .upsert({ id: med.id, data: med, updated_at: new Date().toISOString() });
  if (error) console.error('Sync: error subiendo medicina', error);
};

export const removeMedicine = async (id: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from('medicines').delete().eq('id', id);
  if (error) console.error('Sync: error eliminando medicina', error);
  const { error: logError } = await supabase.from('dose_logs').delete().eq('data->>medicineId', id);
  if (logError) console.error('Sync: error eliminando tomas de la medicina', logError);
};

export const pushLog = async (log: DoseLog): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase
    .from('dose_logs')
    .upsert({ id: log.id, data: log, updated_at: new Date().toISOString() });
  if (error) console.error('Sync: error subiendo toma', error);
};

export const removeLog = async (id: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from('dose_logs').delete().eq('id', id);
  if (error) console.error('Sync: error eliminando toma', error);
};

/** Sube todo el estado local (primer arranque con la nube vacía) */
export const pushAll = async (medicines: Medicine[], logs: DoseLog[]): Promise<void> => {
  if (!supabase) return;
  const now = new Date().toISOString();
  if (medicines.length > 0) {
    const { error } = await supabase
      .from('medicines')
      .upsert(medicines.map(m => ({ id: m.id, data: m, updated_at: now })));
    if (error) console.error('Sync: error subiendo medicinas locales', error);
  }
  if (logs.length > 0) {
    const { error } = await supabase
      .from('dose_logs')
      .upsert(logs.map(l => ({ id: l.id, data: l, updated_at: now })));
    if (error) console.error('Sync: error subiendo tomas locales', error);
  }
};

/**
 * Se suscribe a cambios en tiempo real hechos desde otros teléfonos.
 * Devuelve la función para cancelar la suscripción.
 */
export const subscribeToChanges = (onRemoteChange: () => void): (() => void) => {
  if (!supabase) return () => {};
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(onRemoteChange, 500);
  };
  const channel = supabase
    .channel('meditrack-family')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'medicines' }, debounced)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'dose_logs' }, debounced)
    .subscribe();
  return () => {
    if (timer) clearTimeout(timer);
    supabase.removeChannel(channel);
  };
};

export { syncEnabled };
