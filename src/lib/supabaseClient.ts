import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// createBrowserClient (en vez del createClient de supabase-js a secas)
// persiste la sesión también en cookies, no solo localStorage, para que
// hooks.server.ts pueda leerla y hacer chequeos de rol server-side
// (ej. /admin/superadmin).
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Tablas propias de Landing Page (services, requests) viven en el
// schema `landing` del proyecto Supabase compartido, no en `public`
// (que es de Agenda Educativa: profiles, schools, etc.).
export const landing = supabase.schema('landing');
