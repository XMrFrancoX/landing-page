import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { createSupabaseAdminClient } from '$lib/supabase.server';
import { sendPasswordResetEmail } from '$lib/server/notifications';

export const actions: Actions = {
  default: async ({ request, url }) => {
    const formData = await request.formData();
    const email = (formData.get('email') as string)?.trim();

    if (!email) return fail(400, { error: 'El correo es obligatorio.' });

    // Mismo tratamiento de seguridad que Agenda Educativa: siempre
    // devolvemos success para no revelar qué correos existen en la base.
    try {
      const adminClient = createSupabaseAdminClient();

      const { data, error } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${url.origin}/update-password` }
      });

      if (error || !data.properties?.action_link) {
        console.error('recuperar-password: generateLink error:', error?.message);
        return { success: true };
      }

      await sendPasswordResetEmail(email, data.properties.action_link);
      return { success: true };
    } catch (err) {
      console.error('recuperar-password: error inesperado:', err);
      return { success: true };
    }
  }
};
