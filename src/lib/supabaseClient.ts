import { createBrowserClient } from '@supabase/ssr';
import { browser } from '$app/environment';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// createBrowserClient (en vez del createClient de supabase-js a secas)
// persiste la sesión también en cookies, no solo localStorage, para que
// hooks.server.ts pueda leerla y hacer chequeos de rol server-side
// (ej. /admin/superadmin).
//
// Solo se instancia en el browser: SvelteKit evalúa este módulo también
// server-side (SSR y el paso de análisis post-build), donde
// import.meta.env.VITE_* no está disponible igual y createBrowserClient
// tira. Todo lo que usa `supabase`/`landing` server-side (+page.ts,
// analyse) corre dentro de `if (browser)` o con fallback propio.
export const supabase = (browser
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null) as ReturnType<typeof createBrowserClient>;

// Tablas propias de Landing Page (services, requests) viven en el
// schema `landing` del proyecto Supabase compartido, no en `public`
// (que es de Agenda Educativa: profiles, schools, etc.).
export const landing = browser
  ? supabase.schema('landing')
  : (null as unknown as ReturnType<NonNullable<typeof supabase>['schema']>);
