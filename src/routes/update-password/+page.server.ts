import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { createSupabaseAdminClient } from '$lib/supabase.server';

// Esta pantalla atiende DOS flujos distintos con el mismo formulario:
// 1) El link nativo de invitación/recovery de Supabase (?code=... o
//    #access_token=..., manejado 100% del lado del cliente en +page.svelte,
//    sin tocar acá) -- lo usa el superadmin al crear una cuenta con
//    contraseña temporal.
// 2) El token propio de "olvidé mi contraseña" (?token=...), que vence a
//    los 10 minutos y se valida server-side acá, independiente del OTP
//    global de Supabase.
export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');
	if (!token) return { resetToken: null, resetTokenInvalid: false };

	const adminClient = createSupabaseAdminClient();
	const { data: row } = await adminClient
		.schema('core')
		.from('password_reset_tokens')
		.select('expires_at, used_at')
		.eq('token', token)
		.maybeSingle();

	const valido = !!row && !row.used_at && new Date(row.expires_at) > new Date();
	return { resetToken: valido ? token : null, resetTokenInvalid: !valido };
};

export const actions: Actions = {
	resetWithToken: async ({ request }) => {
		const formData = await request.formData();
		const token = (formData.get('token') as string) ?? '';
		const password = (formData.get('password') as string) ?? '';

		if (password.length < 6) {
			return fail(400, { error: 'La contraseña debe tener al menos 6 caracteres.', expired: false });
		}

		const adminClient = createSupabaseAdminClient();
		if (!token) return fail(400, { error: 'El enlace es inválido o expiró.', expired: true });

		// El token es de un solo uso: se consume ANTES de cambiar la contraseña y en un solo UPDATE
		// condicional, así dos envíos simultáneos con el mismo link no pueden usarlo los dos.
		const { data: row } = await adminClient
			.schema('core')
			.from('password_reset_tokens')
			.update({ used_at: new Date().toISOString() })
			.eq('token', token)
			.is('used_at', null)
			.gt('expires_at', new Date().toISOString())
			.select('id, user_id')
			.maybeSingle();

		if (!row) {
			return fail(400, { error: 'El enlace es inválido o expiró.', expired: true });
		}

		const { error: updateError } = await adminClient.auth.admin.updateUserById(row.user_id, { password });
		if (updateError) {
			console.error('update-password resetWithToken error:', updateError.message);
			return fail(500, { error: 'No se pudo actualizar la contraseña. Pedí un enlace nuevo.', expired: true });
		}

		// Si alguien más tenía la sesión abierta (por eso se recupera la contraseña), queda afuera.
		const { error: sesionesError } = await adminClient.schema('core').rpc('cerrar_sesiones', { p_user_id: row.user_id });
		if (sesionesError) console.error('update-password: no se pudieron cerrar las sesiones', sesionesError.message);
		await adminClient.schema('core').from('profiles').update({ must_change_password: false }).eq('id', row.user_id);

		return { success: true };
	}
};
