import { createClient } from '@supabase/supabase-js';

// Aquí Vite lee las variables seguras que guardaste en el archivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase no configurado. Revisa .env:', {
    supabaseUrl,
    supabaseAnonKey: supabaseAnonKey ? '********' : null
  });
  throw new Error('Supabase URL y ANON KEY obligatorios en .env');
}

// Creamos la conexión oficial
export const supabase = createClient(supabaseUrl, supabaseAnonKey);