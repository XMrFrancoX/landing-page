import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createSupabaseAdminClient } from '$lib/supabase.server';
import { env } from '$env/dynamic/private';

// Desde que Fichero Escolar/Agenda Educativa/Inventario PCs se fusionaron en
// un solo portal (nmf-portal), un colegio tiene UN dominio propio para todo,
// no uno por servicio — antes acá había 3 proyectos de Cloudflare Pages
// separados (fichero-escolar/agenda-educativa/inventario-pcs-nmf), todos
// dados de baja el 2026-08-11 cuando se migró a portal.nmfsoluciones.com.ar.
const PORTAL_CLOUDFLARE_PROJECT = 'nmf-portal';

// Proyecto de Supabase de PRODUCCIÓN de nmf-portal (no el de dev) — el que
// hay que mantener sincronizado en su Auth > URL Configuration cada vez que
// un colegio agrega su propio dominio, si no /forgot-password y las
// invitaciones le van a redirigir a un dominio no permitido y van a fallar
// (pasó una vez a mano, ver sesión 2026-08-25 de nmf-portal).
const NMF_PORTAL_PROD_PROJECT_REF = 'mqkflseqxiijzxnialkv';

// Agrega `https://{domain}/**` al uri_allow_list de Auth de nmf-portal-prod
// vía la Management API de Supabase, sin pisar lo que ya haya cargado a
// mano. No se llama en el sentido inverso (al borrar un dominio) por la
// misma cautela que ya aplicaba el adjuntado de Cloudflare: no cortar por
// error algo que el colegio pueda seguir usando.
async function agregarDominioAAuthAllowList(domain: string): Promise<string | null> {
	const accessToken = env.SUPABASE_ACCESS_TOKEN;
	if (!accessToken) {
		return 'Falta configurar SUPABASE_ACCESS_TOKEN — el dominio no se agregó automáticamente a la lista de redirects permitidos de Supabase Auth (Auth > URL Configuration en el proyecto de producción de nmf-portal). Agregalo a mano: https://{dominio}/**';
	}

	const configRes = await fetch(`https://api.supabase.com/v1/projects/${NMF_PORTAL_PROD_PROJECT_REF}/config/auth`, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!configRes.ok) {
		return `No se pudo leer la configuración de Auth de Supabase (HTTP ${configRes.status}) — agregá el dominio a mano en Auth > URL Configuration.`;
	}
	const config = (await configRes.json()) as { uri_allow_list?: string };
	const actuales = (config.uri_allow_list ?? '').split(',').filter(Boolean);
	const patron = `https://${domain}/**`;
	if (actuales.includes(patron)) return null;

	const patchRes = await fetch(`https://api.supabase.com/v1/projects/${NMF_PORTAL_PROD_PROJECT_REF}/config/auth`, {
		method: 'PATCH',
		headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ uri_allow_list: [...actuales, patron].join(',') })
	});
	if (!patchRes.ok) {
		return `Supabase rechazó agregar el dominio a la lista de redirects permitidos (HTTP ${patchRes.status}) — agregalo a mano.`;
	}
	return null;
}

export const load: PageServerLoad = async ({ locals: { profile } }) => {
  if (profile?.role !== 'superadmin') {
    throw redirect(303, '/admin');
  }

  const adminClient = createSupabaseAdminClient();

  const { data: schools } = await adminClient.from('schools').select('*').order('name');

  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, full_name, role, school_id, schools(name)')
    .order('created_at', { ascending: false });

  // Config propia de Inventario PCs: no todas las escuelas asignan laptops a
  // alumnos. El rol de usuario ya es global (una sola columna en profiles de
  // arriba, compartida por las 3 apps) — nada que traer aparte para eso.
  const { data: inventarioSettings } = await adminClient
    .schema('inventario')
    .from('school_settings')
    .select('school_id, student_laptops_enabled');

  const inventarioSettingsBySchool = new Map(
    (inventarioSettings ?? []).map((s) => [s.school_id, s.student_laptops_enabled])
  );

  const { data: schoolDomains } = await adminClient.from('school_domains').select('school_id, domain');
  const domainBySchool = new Map((schoolDomains ?? []).map((d) => [d.school_id, d.domain]));

  return {
    schools: (schools ?? []).map((s) => ({
      ...s,
      inventario_student_laptops_enabled: inventarioSettingsBySchool.get(s.id) ?? true,
      domain: domainBySchool.get(s.id) ?? ''
    })),
    profiles: profiles ?? []
  };
};

function requireSuperadmin(profile: App.Locals['profile']) {
  if (profile?.role !== 'superadmin') return fail(403, { error: 'No autorizado' });
  return null;
}

export const actions: Actions = {
  createSchool: async ({ request, locals: { profile } }) => {
    const denied = requireSuperadmin(profile);
    if (denied) return denied;

    const formData = await request.formData();
    const name = (formData.get('name') as string)?.trim();
    if (!name) return fail(400, { error: 'El nombre de la escuela es obligatorio.' });

    const { error } = await createSupabaseAdminClient().from('schools').insert({ name });
    if (error) return fail(500, { error: 'No se pudo crear la escuela.' });
    return { success: true };
  },

  createUser: async ({ request, locals: { profile } }) => {
    const denied = requireSuperadmin(profile);
    if (denied) return denied;

    const formData = await request.formData();
    const email = (formData.get('email') as string)?.trim();
    const fullName = (formData.get('full_name') as string)?.trim();
    const password = formData.get('password') as string;
    const role = formData.get('role') as string;
    let schoolId = formData.get('school_id') as string | null;
    if (schoolId === '') schoolId = null;

    if (!email || !password) return fail(400, { error: 'Correo y contraseña son obligatorios.' });
    if (password.length < 6) return fail(400, { error: 'La contraseña debe tener al menos 6 caracteres.' });

    const adminClient = createSupabaseAdminClient();

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (error || !data?.user) {
      return fail(500, { error: `No se pudo crear la cuenta: ${error?.message ?? 'error desconocido'}` });
    }

    // El trigger de creación de perfil (compartido con Agenda Educativa) ya
    // insertó una fila en profiles — acá solo la completamos con rol/escuela
    // y marcamos que tiene que elegir su propia contraseña al entrar.
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        full_name: fullName || null,
        role: role || 'client',
        school_id: schoolId,
        must_change_password: true
      })
      .eq('id', data.user.id);

    if (updateError) {
      return fail(500, { error: 'Se creó la cuenta pero no se pudo completar el perfil: ' + updateError.message });
    }

    return { success: true, createdEmail: email };
  },

  updateUser: async ({ request, locals: { profile } }) => {
    const denied = requireSuperadmin(profile);
    if (denied) return denied;

    const formData = await request.formData();
    const targetUserId = formData.get('user_id') as string;
    const role = formData.get('role') as string;
    let schoolId = formData.get('school_id') as string | null;
    if (!targetUserId) return fail(400, { error: 'ID de usuario requerido.' });
    if (schoolId === '') schoolId = null;

    const { error } = await createSupabaseAdminClient()
      .from('profiles')
      .update({ role, school_id: schoolId })
      .eq('id', targetUserId);
    if (error) return fail(500, { error: 'No se pudo actualizar el usuario.' });
    return { success: true };
  },

  uploadLogo: async ({ request, locals: { profile } }) => {
    const denied = requireSuperadmin(profile);
    if (denied) return denied;

    const formData = await request.formData();
    const schoolId = formData.get('school_id') as string;
    const file = formData.get('logo') as File;
    if (!schoolId || !file || file.size === 0) return fail(400, { error: 'Faltan datos o archivo inválido.' });

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(ext ?? '')) {
      return fail(400, { error: 'Formato de imagen no soportado.' });
    }

    const fileName = `${schoolId}-${Date.now()}.${ext}`;
    const adminClient = createSupabaseAdminClient();

    const { error: uploadError } = await adminClient.storage
      .from('school_logos')
      .upload(fileName, file, { contentType: file.type || 'image/png', cacheControl: '3600', upsert: true });
    if (uploadError) return fail(500, { error: `No se pudo subir la imagen: ${uploadError.message}` });

    const { data: publicUrlData } = adminClient.storage.from('school_logos').getPublicUrl(fileName);

    const { error: updateError } = await adminClient
      .from('schools')
      .update({ logo_url: publicUrlData.publicUrl })
      .eq('id', schoolId);
    if (updateError) return fail(500, { error: 'No se pudo vincular el logo a la escuela.' });
    return { success: true };
  },

  toggleSchoolStatus: async ({ request, locals: { profile } }) => {
    const denied = requireSuperadmin(profile);
    if (denied) return denied;

    const formData = await request.formData();
    const schoolId = formData.get('school_id') as string;
    const currentStatus = formData.get('current_status') as string;
    if (!schoolId) return fail(400, { error: 'ID de escuela requerido.' });

    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const { error } = await createSupabaseAdminClient()
      .from('schools')
      .update({ status: newStatus })
      .eq('id', schoolId);
    if (error) return fail(500, { error: 'No se pudo cambiar el estado de la escuela.' });
    return { success: true };
  },

  deleteSchool: async ({ request, locals: { profile } }) => {
    const denied = requireSuperadmin(profile);
    if (denied) return denied;

    const formData = await request.formData();
    const schoolId = formData.get('school_id') as string;
    if (!schoolId) return fail(400, { error: 'ID de escuela requerido.' });

    const { error } = await createSupabaseAdminClient().from('schools').delete().eq('id', schoolId);
    if (error) return fail(500, { error: 'No se pudo eliminar la escuela. Verifique que no haya datos huérfanos.' });
    return { success: true };
  },

  updateColor: async ({ request, locals: { profile } }) => {
    const denied = requireSuperadmin(profile);
    if (denied) return denied;

    const formData = await request.formData();
    const schoolId = formData.get('school_id') as string;
    const color = formData.get('color') as string;
    if (!schoolId) return fail(400, { error: 'ID de escuela requerido.' });

    const { error } = await createSupabaseAdminClient()
      .from('schools')
      .update({ primary_color: color || null })
      .eq('id', schoolId);
    if (error) return fail(500, { error: 'No se pudo actualizar el color.' });
    return { success: true };
  },

  // Dominio propio del colegio (school_domains, uno por escuela) — se
  // adjunta automático al proyecto único de Cloudflare Pages (nmf-portal) y
  // se agrega a la lista de redirects permitidos de Supabase Auth en
  // producción, para que /forgot-password, invitaciones y magic links
  // funcionen apenas se carga el dominio (antes había que hacer las dos
  // cosas a mano — se nos había olvidado hacerlo para portal.nmfsoluciones.com.ar
  // hasta que un reset de contraseña en vivo lo mostró roto).
  updateDomain: async ({ request, locals: { profile } }) => {
    const denied = requireSuperadmin(profile);
    if (denied) return denied;

    const formData = await request.formData();
    const schoolId = formData.get('school_id') as string;
    let domain = formData.get('domain') as string;
    if (!schoolId) return fail(400, { error: 'ID de escuela requerido.' });

    const adminClient = createSupabaseAdminClient();

    if (!domain) {
      // Solo se quita de nuestro lado -- no se borra automático de Cloudflare
      // ni de Supabase Auth para no cortar por error un dominio que la
      // escuela siga usando.
      const { error } = await adminClient.from('school_domains').delete().eq('school_id', schoolId);
      if (error) return fail(500, { error: 'No se pudo quitar el dominio.' });
      return { success: true };
    }

    domain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

    const { error } = await adminClient
      .from('school_domains')
      .upsert({ school_id: schoolId, domain }, { onConflict: 'school_id' });
    if (error) {
      if ((error as { code?: string }).code === '23505') {
        return fail(400, { error: 'Ese dominio ya está vinculado a otra escuela.' });
      }
      return fail(500, { error: 'No se pudo guardar el dominio.' });
    }

    const warnings: string[] = [];

    const apiToken = env.CLOUDFLARE_API_TOKEN;
    const accountId = env.CLOUDFLARE_ACCOUNT_ID;

    if (!apiToken || !accountId) {
      warnings.push(
        `Falta configurar CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID para adjuntarlo automático. Agregalo a mano en Cloudflare Pages → ${PORTAL_CLOUDFLARE_PROJECT} → Custom domains.`
      );
    } else {
      const cfRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${PORTAL_CLOUDFLARE_PROJECT}/domains`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: domain })
        }
      );
      const cfData = (await cfRes.json()) as { success: boolean; errors?: { code: number; message: string }[] };

      if (!cfData.success) {
        // 8000018 = "You have already added this custom domain" (código estable
        // de Cloudflare) -- confirmado en vivo, más confiable que matchear texto.
        const alreadyAttached = cfData.errors?.some((e) => e.code === 8000018);
        if (!alreadyAttached) {
          warnings.push(
            `Cloudflare rechazó el dominio: ${cfData.errors?.[0]?.message ?? 'error desconocido'}. Revisá que el colegio ya tenga el CNAME apuntando a ${PORTAL_CLOUDFLARE_PROJECT}.pages.dev antes de reintentar.`
          );
        }
      }
    }

    const authWarning = await agregarDominioAAuthAllowList(domain);
    if (authWarning) warnings.push(authWarning);

    if (warnings.length > 0) return { success: true, warning: warnings.join(' ') };
    return { success: true };
  },

  toggleWhatsapp: async ({ request, locals: { profile } }) => {
    const denied = requireSuperadmin(profile);
    if (denied) return denied;

    const formData = await request.formData();
    const schoolId = formData.get('school_id') as string;
    const current = formData.get('current_value') === 'true';
    if (!schoolId) return fail(400, { error: 'ID de escuela requerido.' });

    const { error } = await createSupabaseAdminClient()
      .from('schools')
      .update({ whatsapp_enabled: !current })
      .eq('id', schoolId);
    if (error) return fail(500, { error: 'No se pudo actualizar la configuración de WhatsApp.' });
    return { success: true };
  },

  // Inventario PCs: no todas las escuelas asignan laptops a alumnos.
  toggleInventarioStudentLaptops: async ({ request, locals: { profile } }) => {
    const denied = requireSuperadmin(profile);
    if (denied) return denied;

    const formData = await request.formData();
    const schoolId = formData.get('school_id') as string;
    const current = formData.get('current_value') === 'true';
    if (!schoolId) return fail(400, { error: 'ID de escuela requerido.' });

    const { error } = await createSupabaseAdminClient()
      .schema('inventario')
      .from('school_settings')
      .upsert({ school_id: schoolId, student_laptops_enabled: !current }, { onConflict: 'school_id' });
    if (error) return fail(500, { error: 'No se pudo actualizar la configuración de laptops de alumno.' });
    return { success: true };
  }
};
