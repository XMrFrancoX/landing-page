import { createSupabaseAdminClient } from '$lib/supabase.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const adminClient = createSupabaseAdminClient();

  const { data: services } = await adminClient
    .schema('landing')
    .from('services')
    .select('id, name, description, price, features, icon')
    .eq('is_active', true)
    .order('id', { ascending: true });

  return { services: services ?? [] };
};
