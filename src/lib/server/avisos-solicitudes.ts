import { createSupabaseAdminClient } from '$lib/supabase.server';
import { notifySuperadmins } from '$lib/server/notifications';
import { escapeHtml, lineaSimple } from '$lib/server/html';

export type TipoAviso = 'solicitud' | 'mensaje' | 'baja';

/**
 * Avisa por mail a los superadmins de una solicitud nueva, un mensaje del cliente o un pedido de baja.
 * Todo lo que escribió el cliente (nombre, mail, mensaje) va escapado: antes se podía meter HTML propio
 * (links falsos) en un mail que sale con el remitente de NMF.
 */
export async function avisarSolicitud(tipo: TipoAviso, requestId: string): Promise<void> {
  const adminClient = createSupabaseAdminClient();

  const { data: req, error } = await adminClient
    .schema('landing')
    .from('requests')
    .select('id, contact_name, contact_email, school_id, services(name)')
    .eq('id', requestId)
    .single();

  if (error || !req) {
    console.error('avisarSolicitud: no se pudo cargar la solicitud', requestId, error?.message);
    return;
  }

  let schoolName: string | null = null;
  if (req.school_id) {
    const { data: school } = await adminClient.schema('core').from('schools').select('name').eq('id', req.school_id).single();
    schoolName = school?.name ?? null;
  }

  const who = schoolName ?? req.contact_name;
  const serviceName = (req.services as unknown as { name: string } | null)?.name ?? 'un servicio';
  const whoHtml = escapeHtml(who);
  const servicioHtml = escapeHtml(serviceName);

  let subject = '';
  let html = '';

  if (tipo === 'solicitud') {
    subject = `Nueva solicitud: ${serviceName} — ${who}`;
    html = `<p><strong>${whoHtml}</strong> (${escapeHtml(req.contact_email)}) solicitó contratar <strong>${servicioHtml}</strong>.</p><p>Revisala en /admin/solicitudes.</p>`;
  } else if (tipo === 'mensaje') {
    const { data: lastMessage } = await adminClient
      .schema('landing')
      .from('request_messages')
      .select('body')
      .eq('request_id', requestId)
      .eq('sender_role', 'client')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    subject = `Nuevo mensaje de ${who} — ${serviceName}`;
    html = `<p><strong>${whoHtml}</strong> escribió sobre <strong>${servicioHtml}</strong>:</p><blockquote>${escapeHtml(lastMessage?.body ?? '').replace(/\n/g, '<br>')}</blockquote><p>Respondé desde /admin/solicitudes.</p>`;
  } else {
    subject = `Solicitud de baja: ${serviceName} — ${who}`;
    html = `<p><strong>${whoHtml}</strong> pidió dar de baja <strong>${servicioHtml}</strong>.</p><p>Revisalo en /admin/solicitudes.</p>`;
  }

  await notifySuperadmins(lineaSimple(subject), html);
}
