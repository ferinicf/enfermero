import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './config';

/**
 * Cliente de Supabase para el "modo familiar". Se crea a partir de la
 * configuración vigente y se reemplaza si esta cambia desde Ajustes,
 * sin necesidad de recargar la página (importante en la app instalada
 * de iPhone, donde recargar podía sacar al usuario a Safari).
 */
let cached: { key: string; client: SupabaseClient | null } | null = null;

export const getSupabase = (): SupabaseClient | null => {
  const { supabaseUrl, supabaseAnonKey } = getConfig();
  const cacheKey = `${supabaseUrl}|${supabaseAnonKey}`;
  if (cached && cached.key === cacheKey) return cached.client;
  cached = {
    key: cacheKey,
    client:
      supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')
        ? createClient(supabaseUrl, supabaseAnonKey)
        : null,
  };
  return cached.client;
};

export const isSyncEnabled = (): boolean => getSupabase() !== null;
