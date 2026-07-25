import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createSupabaseAdminClient } from '$lib/supabase.server';
import { env } from '$env/dynamic/private';

// Un servicio = un proyecto de Cloudflare Pages. Si se agrega un servicio
// nuevo a la plataforma, sumarlo acá y al CHECK de school_domains.service
// en la base (ver school_domains.sql / migraciones).
const SERVICE_PROJECTS: Record<string, string> = {
	fichero: 'fichero-escolar',
	agenda: 'agenda-educativa',
	inventario: 'inventario-pcs-nmf'
};

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

  const { data: schoolDomains } = await adminClient.from('school_domains').select('school_id, service, domain');
  const domainsBySchool = new Map<string, Record<string, string>>();
  for (const d of schoolDomains ?? []) {
    if (!domainsBySchool.has(d.school_id)) domainsBySchool.set(d.school_id, {});
    domainsBySchool.get(d.school_id)![d.service] = d.domain;
  }

  // Qué servicio técnico (fichero/agenda/inventario) tiene REALMENTE
  // contratado cada escuela -- para no ofrecerle un campo de dominio de un
  // servicio que ni contrató. "Contratado" = una solicitud resuelta
  // (landing.requests.status='resolved') de un servicio del catálogo que
  // ya esté vinculado (service_key) a uno de los 3 servicios reales.
  const { data: resolvedRequests } = await adminClient
    .schema('landing')
    .from('requests')
    .select('school_id, services(service_key)')
    .eq('status', 'resolved');

  const contractedServicesBySchool = new Map<string, Set<string>>();
  for (const r of resolvedRequests ?? []) {
    const key = (r as unknown as { services?: { service_key: string | null } | null }).services?.service_key;
    if (!r.school_id || !key) continue;
    if (!contractedServicesBySchool.has(r.school_id)) contractedServicesBySchool.set(r.school_id, new Set());
    contractedServicesBySchool.get(r.school_id)!.add(key);
  }

  return {
    schools: (schools ?? []).map((s) => ({
      ...s,
      inventario_student_laptops_enabled: inventarioSettingsBySchool.get(s.id) ?? true,
      domains: domainsBySchool.get(s.id) ?? {},
      contractedServices: [...(contractedServicesBySchool.get(s.id) ?? [])]
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

  // Dominio propio POR SERVICIO (school_domains) — una escuela puede tener
  // intranet.suescuela.com para Fichero Escolar y calendario.suescuela.com
  // para Agenda Educativa al mismo tiempo, cada uno vinculado acá y
  // adjuntado automáticamente al proyecto de Cloudflare Pages que
  // corresponde (antes había que entrar a mano al dashboard de cada uno).
  updateDomain: async ({ request, locals: { profile } }) => {
    const denied = requireSuperadmin(profile);
    if (denied) return denied;

    const formData = await request.formData();
    const schoolId = formData.get('school_id') as string;
    const service = formData.get('service') as string;
    let domain = formData.get('domain') as string;
    if (!schoolId) return fail(400, { error: 'ID de escuela requerido.' });
    if (!service || !(service in SERVICE_PROJECTS)) return fail(400, { error: 'Servicio inválido.' });

    const adminClient = createSupabaseAdminClient();

    if (!domain) {
      // Solo se quita de nuestro lado -- no se borra automático de Cloudflare
      // para no cortar por error un dominio que la escuela siga usando.
      const { error } = await adminClient
        .from('school_domains')
        .delete()
        .eq('school_id', schoolId)
        .eq('service', service);
      if (error) return fail(500, { error: 'No se pudo quitar el dominio.' });
      return { success: true };
    }

    domain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

    const { error } = await adminClient
      .from('school_domains')
      .upsert({ school_id: schoolId, service, domain }, { onConflict: 'school_id,service' });
    if (error) {
      if ((error as { code?: string }).code === '23505') {
        return fail(400, { error: 'Ese dominio ya está vinculado a otra escuela/servicio.' });
      }
      return fail(500, { error: 'No se pudo guardar el dominio.' });
    }

    const apiToken = env.CLOUDFLARE_API_TOKEN;
    const accountId = env.CLOUDFLARE_ACCOUNT_ID;
    const projectName = SERVICE_PROJECTS[service];

    if (!apiToken || !accountId) {
      return {
        success: true,
        warning: `Se guardó, pero falta configurar CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID para adjuntarlo automático. Agregalo a mano en Cloudflare Pages → ${projectName} → Custom domains.`
      };
    }

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/domains`,
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
        return {
          success: true,
          warning: `Se guardó, pero Cloudflare rechazó el dominio: ${cfData.errors?.[0]?.message ?? 'error desconocido'}. Revisá que el colegio ya tenga el CNAME apuntando a ${projectName}.pages.dev antes de reintentar.`
        };
      }
    }

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
