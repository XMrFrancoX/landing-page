import { createSupabaseAdminClient } from '$lib/supabase.server';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const adminClient = createSupabaseAdminClient();

  const { data: service } = await adminClient
    .schema('landing')
    .from('services')
    .select('id, name, description, price, features')
    .eq('id', params.service_id)
    .eq('is_active', true)
    .single();

  if (!service) {
    throw error(404, 'Servicio no encontrado');
  }

  return { service };
};
