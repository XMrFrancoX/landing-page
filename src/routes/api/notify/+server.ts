import { json, type RequestHandler } from '@sveltejs/kit';
import { createSupabaseAdminClient } from '$lib/supabase.server';
import { notifySuperadmins } from '$lib/server/notifications';

type NotifyPayload = {
  type: 'solicitud' | 'mensaje' | 'baja';
  requestId: string;
};

export const POST: RequestHandler = async ({ request }) => {
  const payload = (await request.json()) as Partial<NotifyPayload>;
  if (!payload?.type || !payload?.requestId) {
    return json({ error: 'Faltan type/requestId' }, { status: 400 });
  }

  const adminClient = createSupabaseAdminClient();

  const { data: req, error } = await adminClient
    .schema('landing')
    .from('requests')
    .select('id, contact_name, contact_email, school_id, services(name)')
    .eq('id', payload.requestId)
    .single();

  if (error || !req) {
    console.error('notify: no se pudo cargar la solicitud', payload.requestId, error?.message);
    return json({ error: 'Solicitud no encontrada' }, { status: 404 });
  }

  let schoolName: string | null = null;
  if (req.school_id) {
    const { data: school } = await adminClient.from('schools').select('name').eq('id', req.school_id).single();
    schoolName = school?.name ?? null;
  }

  const who = schoolName ?? req.contact_name;
  const serviceName = (req.services as unknown as { name: string } | null)?.name ?? 'un servicio';

  let subject = '';
  let html = '';

  if (payload.type === 'solicitud') {
    subject = `Nueva solicitud: ${serviceName} — ${who}`;
    html = `<p><strong>${who}</strong> (${req.contact_email}) solicitó contratar <strong>${serviceName}</strong>.</p><p>Revisala en /admin/solicitudes.</p>`;
  } else if (payload.type === 'mensaje') {
    const { data: lastMessage } = await adminClient
      .schema('landing')
      .from('request_messages')
      .select('body')
      .eq('request_id', payload.requestId)
      .eq('sender_role', 'client')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    subject = `Nuevo mensaje de ${who} — ${serviceName}`;
    html = `<p><strong>${who}</strong> escribió sobre <strong>${serviceName}</strong>:</p><blockquote>${lastMessage?.body ?? ''}</blockquote><p>Respondé desde /admin/solicitudes.</p>`;
  } else if (payload.type === 'baja') {
    subject = `Solicitud de baja: ${serviceName} — ${who}`;
    html = `<p><strong>${who}</strong> pidió dar de baja <strong>${serviceName}</strong>.</p><p>Revisalo en /admin/solicitudes.</p>`;
  } else {
    return json({ error: 'type inválido' }, { status: 400 });
  }

  await notifySuperadmins(subject, html);

  return json({ success: true });
};
