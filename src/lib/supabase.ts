import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes('seu-projeto') &&
    supabaseUrl.startsWith('https://')
  );
};

export const isGoogleMapsBrowserConfigured = (): boolean => {
  const key = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;
  return Boolean(key && !key.startsWith('AIzaSy_EXEMPLO') && key.length > 20);
};

// Cria o cliente oficial se as variáveis estiverem presentes
let clientInstance: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  try {
    clientInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.warn('Erro ao inicializar cliente Supabase:', err);
  }
}

export const supabase = clientInstance;
