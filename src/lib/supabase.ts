import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Remove sufixos como /rest/v1/ ou barras finais da URL para evitar erros na Auth API
export const cleanSupabaseUrl = (url?: string): string => {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
};

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabaseUrl = cleanSupabaseUrl(rawUrl);
const supabaseKey = rawKey?.trim();

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
