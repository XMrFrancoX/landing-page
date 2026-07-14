/**
 * Server-only Supabase utilities.
 * NEVER import this file from browser components or +page.svelte scripts.
 * Only use in +page.server.ts, +server.ts, and hooks.server.ts.
 */
import { env } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Create a Supabase client for use in SvelteKit server hooks/load functions.
 * Reads and writes auth cookies automatically.
 */
export function createSupabaseServerClient(
  fetch: typeof globalThis.fetch,
  getAll: () => { name: string; value: string }[],
  setAll: (cookies: { name: string; value: string; options: Record<string, unknown> }[]) => void
) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: { getAll, setAll },
    global: { fetch }
  });
}

/**
 * Create a Supabase admin client using the service_role key.
 * BYPASSES RLS — only use server-side for trusted operations
 * (ej. gestión cross-tenant de schools/profiles en /admin/escuelas).
 */
export function createSupabaseAdminClient() {
  return createClient(supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
