import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createSupabaseAdminClient } from '$lib/supabase.server';

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

  return {
    schools: schools ?? [],
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

  updateDomain: async ({ request, locals: { profile } }) => {
    const denied = requireSuperadmin(profile);
    if (denied) return denied;

    const formData = await request.formData();
    const schoolId = formData.get('school_id') as string;
    let domain = formData.get('domain') as string;
    if (!schoolId) return fail(400, { error: 'ID de escuela requerido.' });

    if (domain) {
      domain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    }

    const { error } = await createSupabaseAdminClient()
      .from('schools')
      .update({ custom_domain: domain || null })
      .eq('id', schoolId);
    if (error) {
      if ((error as { code?: string }).code === '23505') {
        return fail(400, { error: 'Este dominio ya está registrado por otra escuela.' });
      }
      return fail(500, { error: 'No se pudo actualizar el dominio.' });
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
  }
};
