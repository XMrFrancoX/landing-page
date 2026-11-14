import { json, type RequestHandler } from '@sveltejs/kit';
import { createSupabaseAdminClient } from '$lib/supabase.server';
import { avisarSolicitud } from '$lib/server/avisos-solicitudes';
import { UUID } from '$lib/server/html';

// Lo llama el área de clientes (/cliente) después de mandar un mensaje o pedir la baja. Antes no pedía
// login y cualquiera podía disparar mails a los superadmins sobre cualquier solicitud; ahora sólo el
// dueño de la solicitud, y la "solicitud nueva" la avisa directamente el checkout desde el servidor.
export const POST: RequestHandler = async ({ request, locals: { user } }) => {
  if (!user) return json({ error: 'No autenticado' }, { status: 401 });

  const payload = (await request.json().catch(() => ({}))) as { type?: string; requestId?: string };
  if ((payload.type !== 'mensaje' && payload.type !== 'baja') || !payload.requestId || !UUID.test(payload.requestId)) {
    return json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const { data: req } = await createSupabaseAdminClient()
    .schema('landing')
    .from('requests')
    .select('id, user_id, contact_email, status')
    .eq('id', payload.requestId)
    .maybeSingle();

  const esDuenio =
    !!req && (req.user_id === user.id || (!!user.email && req.contact_email?.toLowerCase() === user.email.toLowerCase()));
  if (!esDuenio) return json({ error: 'Solicitud no encontrada' }, { status: 404 });
  if (payload.type === 'baja' && req.status !== 'baja_solicitada') {
    return json({ error: 'La solicitud no pidió la baja' }, { status: 400 });
  }

  await avisarSolicitud(payload.type, payload.requestId);
  return json({ success: true });
};
