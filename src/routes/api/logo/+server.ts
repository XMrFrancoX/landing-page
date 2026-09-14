import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { streamObject } from '$lib/server/r2';

// Sólo para el preview del logo en /admin/escuelas — nmf-portal tiene su
// propio endpoint equivalente (api/storage/[area], área "escuelas") para
// mostrarlo a los usuarios reales de cada colegio; acá sólo lo necesita el
// superadmin que lo está subiendo/revisando.
export const GET: RequestHandler = async ({ url, platform, locals: { profile } }) => {
	if (profile?.role !== 'superadmin') throw error(403, 'No autorizado');

	const bucket = platform?.env.NMF_STORAGE;
	if (!bucket) throw error(500, 'Storage no disponible');

	const key = url.searchParams.get('key');
	if (!key) throw error(400, 'Falta key');

	return streamObject(bucket, key);
};
