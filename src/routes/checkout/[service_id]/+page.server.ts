import { createSupabaseAdminClient } from '$lib/supabase.server';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

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

export const actions: Actions = {
  // Insertar la solicitud pasa por service_role (no por el cliente con la
  // key anónima) a propósito: un visitante anónimo puede INSERTAR una fila
  // en landing.requests, pero no puede LEERLA de vuelta (RLS de SELECT
  // exige ser dueño/tener sesión) -- y Postgres exige poder ver la fila
  // recién insertada para satisfacer el RETURNING de `.select().single()`,
  // asi que ese insert siempre fallaba con "violates row-level security
  // policy" pese a que la policy de INSERT en si era abierta.
  default: async ({ request, fetch, locals: { user } }) => {
    const formData = await request.formData();
    const serviceId = formData.get('service_id') as string;
    const contact_name = (formData.get('contact_name') as string)?.trim();
    const contact_email = (formData.get('contact_email') as string)?.trim();
    const contact_phone = (formData.get('contact_phone') as string)?.trim() || null;
    const message = (formData.get('message') as string)?.trim() || null;

    if (!serviceId || !contact_name || !contact_email) {
      return fail(400, { error: 'Faltan datos obligatorios.' });
    }

    const adminClient = createSupabaseAdminClient();

    let school_id: string | null = null;
    if (user) {
      const { data: profile } = await adminClient.from('profiles').select('school_id').eq('id', user.id).single();
      school_id = profile?.school_id ?? null;
    }

    const { data: inserted, error: insertError } = await adminClient
      .schema('landing')
      .from('requests')
      .insert({
        service_id: serviceId,
        user_id: user?.id ?? null,
        school_id,
        contact_name,
        contact_email,
        contact_phone,
        message
      })
      .select('id')
      .single();

    if (insertError || !inserted) {
      console.error('checkout: no se pudo crear la solicitud', insertError?.message);
      return fail(500, { error: 'Hubo un error al enviar tu solicitud. Intenta nuevamente o contáctanos por teléfono.' });
    }

    // Best-effort (mismo endpoint que ya usa el resto de la app): si el
    // mail falla, no debe romper la confirmación que ya va a ver el usuario.
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'solicitud', requestId: inserted.id })
    }).catch(() => {});

    return { success: true };
  }
};
