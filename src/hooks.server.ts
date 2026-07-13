import { createSupabaseServerClient } from '$lib/supabase.server';
import { dev } from '$app/environment';
import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createSupabaseServerClient(
    event.fetch,
    () => event.cookies.getAll(),
    (cookies) => {
      cookies.forEach(({ name, value, options }) => {
        // @supabase/ssr fuerza `secure: true` por defecto. En dev eso puede
        // hacer que el navegador descarte la cookie si no estás sobre https
        // (ej. probando desde el celular por IP local). En prod (Cloudflare,
        // siempre https) se respeta el `secure: true` normal.
        event.cookies.set(name, value, { path: '/', ...options, secure: dev ? false : (options.secure as boolean | undefined) });
      });
    }
  );

  event.locals.safeGetSession = async () => {
    const {
      data: { session }
    } = await event.locals.supabase.auth.getSession();

    if (!session) return { session: null, user: null };

    const {
      data: { user },
      error
    } = await event.locals.supabase.auth.getUser();

    if (error) return { session: null, user: null };

    return { session, user };
  };

  const { user } = await event.locals.safeGetSession();
  event.locals.user = user;

  if (user) {
    const { data: profile } = await event.locals.supabase
      .from('profiles')
      .select('id, full_name, role, school_id, must_change_password')
      .eq('id', user.id)
      .single();

    event.locals.profile = profile ?? null;
  } else {
    event.locals.profile = null;
  }

  // Cuentas creadas manualmente por el superadmin (con contraseña temporal)
  // no pueden navegar a ningún lado hasta que elijan su propia contraseña.
  if (
    user &&
    event.locals.profile?.must_change_password &&
    event.url.pathname !== '/update-password' &&
    event.url.pathname !== '/logout'
  ) {
    throw redirect(303, '/update-password');
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
};
