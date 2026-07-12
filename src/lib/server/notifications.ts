import { env } from '$env/dynamic/private';
import { createSupabaseAdminClient } from '$lib/supabase.server';

/**
 * Manda un mail a todos los perfiles con role='superadmin' (dueños de NMF).
 * Fetch-based a la API de Resend (compatible con Cloudflare Pages/Workers),
 * mismo patrón que src/lib/server/notifications.ts de Agenda Educativa.
 */
export async function notifySuperadmins(subject: string, html: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.error('notifySuperadmins: RESEND_API_KEY no está configurada en este entorno, no se envía mail.');
    return;
  }

  const adminClient = createSupabaseAdminClient();

  const { data: superadmins, error } = await adminClient
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'superadmin');

  if (error) {
    console.error('notifySuperadmins: error cargando perfiles superadmin:', error.message);
    return;
  }
  if (!superadmins?.length) return;

  for (const profile of superadmins) {
    const { data: userAuth, error: authError } = await adminClient.auth.admin.getUserById(profile.id);
    if (authError) {
      console.error(`notifySuperadmins: error obteniendo email de ${profile.id}:`, authError.message);
      continue;
    }
    const email = userAuth?.user?.email;
    if (!email) continue;

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM || 'Landing Page NMF <onboarding@resend.dev>',
          to: email,
          reply_to: 'nmfsoluciones@gmail.com',
          subject,
          html
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error(`notifySuperadmins: Resend respondió ${res.status} al enviar a ${email}:`, errText);
      }
    } catch (err) {
      console.error('notifySuperadmins: excepción enviando mail a', email, err);
    }
  }
}
