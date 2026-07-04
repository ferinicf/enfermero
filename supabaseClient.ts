import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './config';

const { supabaseUrl, supabaseAnonKey } = getConfig();

/**
 * Cliente de Supabase para el "modo familiar": si hay conexión configurada
 * (desde Ajustes o por variables de entorno), las medicinas y tomas se
 * sincronizan entre todos los teléfonos de la familia. Si no, la app
 * funciona solo con localStorage.
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const syncEnabled = supabase !== null;
