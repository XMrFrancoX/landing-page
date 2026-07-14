import { env } from '$env/dynamic/private';
import { createSupabaseAdminClient } from '$lib/supabase.server';

/**
 * Fetch-based a la API de Resend (compatible con Cloudflare Pages/Workers).
 * Devuelve true si se pudo enviar.
 */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.error('sendEmail: RESEND_API_KEY no está configurada en este entorno, no se envía mail.');
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || 'Landing Page NMF <onboarding@resend.dev>',
        to,
        reply_to: 'nmfsoluciones@gmail.com',
        subject,
        html
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(`sendEmail: Resend respondió ${res.status} al enviar a ${to}:`, errText);
      return false;
    }
    return true;
  } catch (err) {
    console.error('sendEmail: excepción enviando mail a', to, err);
    return false;
  }
}

/**
 * Manda un mail a todos los perfiles con role='superadmin' (dueños de NMF).
 */
export async function notifySuperadmins(subject: string, html: string): Promise<void> {
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

    await sendEmail(email, subject, html);
  }
}

/**
 * Manda el mail de recuperación de contraseña con el link que generó
 * supabase.auth.admin.generateLink({ type: 'recovery' }).
 * Mismo flujo que Agenda Educativa (src/routes/recuperar-password), acá
 * fetch-based en vez del SDK de `resend` para no sumar una dependencia.
 */
export async function sendPasswordResetEmail(email: string, actionLink: string): Promise<void> {
  await sendEmail(
    email,
    'Recuperación de Contraseña - NMF Soluciones Educativas',
    `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #0a3055; text-align: center;">Recuperación de Contraseña</h2>
        <p style="color: #4b5563; line-height: 1.5;">Hola,</p>
        <p style="color: #4b5563; line-height: 1.5;">Solicitaste restablecer tu contraseña de NMF Soluciones Educativas. Hacé clic en el siguiente enlace para crear una nueva. <strong>Este enlace expira en 24 horas</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${actionLink}" style="display: inline-block; padding: 12px 24px; background-color: #0a3055; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Restablecer mi contraseña</a>
        </div>
        <p style="color: #4b5563; line-height: 1.5; font-size: 14px;">Si el botón no funciona, copiá y pegá este enlace en tu navegador:</p>
        <p style="color: #0a3055; word-break: break-all; font-size: 14px;">${actionLink}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">Si no solicitaste este correo, podés ignorarlo de forma segura. Tu contraseña no va a cambiar hasta que entres al enlace de arriba y crees una nueva.</p>
      </div>
    `
  );
}
