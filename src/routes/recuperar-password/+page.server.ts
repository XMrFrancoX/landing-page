import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { createSupabaseAdminClient } from '$lib/supabase.server';
import { sendPasswordResetEmail } from '$lib/server/notifications';

// Token propio, separado del recovery link nativo de Supabase Auth: ese
// vencimiento (mailer_otp_exp) es UN SOLO valor global que también rige
// invitaciones y confirmación de cuenta -- bajarlo a 10 min ahí adentro
// habría matado invitaciones a usuarios nuevos antes de que llegaran a
// abrir el mail. Este token vive en public.password_reset_tokens y sólo
// se usa para esto, así puede vencer en 10 min sin tocar nada más.
function generarToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

const EXPIRACION_MS = 10 * 60 * 1000;

export const actions: Actions = {
	default: async ({ request, url }) => {
		const formData = await request.formData();
		const email = (formData.get('email') as string)?.trim();

		if (!email) return fail(400, { error: 'El correo es obligatorio.' });

		// Mismo tratamiento de seguridad que antes: siempre devolvemos success
		// para no revelar qué correos existen en la base.
		try {
			const adminClient = createSupabaseAdminClient();

			const { data: profile } = await adminClient
				.from('profiles')
				.select('id')
				.eq('email', email)
				.maybeSingle();

			if (profile) {
				const token = generarToken();
				const expiresAt = new Date(Date.now() + EXPIRACION_MS).toISOString();
				const { error: insertError } = await adminClient
					.from('password_reset_tokens')
					.insert({ user_id: profile.id, token, expires_at: expiresAt });

				if (insertError) {
					console.error('recuperar-password: insert token error:', insertError.message);
				} else {
					const resetLink = `${url.origin}/update-password?token=${token}`;
					await sendPasswordResetEmail(email, resetLink);
				}
			}
		} catch (err) {
			console.error('recuperar-password: error inesperado:', err);
		}

		return { success: true };
	}
};
