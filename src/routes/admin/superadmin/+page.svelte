<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { Building2, Users, Plus, Trash2, Upload } from 'lucide-svelte';

  let { data } = $props();

  let newSchoolName = $state('');
  const roleLabels: Record<string, string> = {
    student: 'Alumno/a', tutor: 'Tutor/a', teacher: 'Docente',
    director: 'Director', admin: 'Admin. Escuela', superadmin: 'Super Admin', client: 'Cliente'
  };
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold tracking-tight text-slate-900">Escuelas (Global Admin)</h1>
    <p class="text-sm text-slate-600 mt-1">Gestión cross-tenant de escuelas y usuarios de toda la plataforma NMF.</p>
  </div>

  <div class="rounded-2xl border bg-white shadow-sm p-5">
    <h2 class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Building2 class="h-5 w-5 text-primary" /> Escuelas registradas</h2>

    <form method="POST" action="?/createSchool" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') { newSchoolName = ''; await invalidateAll(); } else await update(); }} class="flex gap-2 mb-4">
      <input type="text" name="name" bind:value={newSchoolName} required placeholder="Nombre de la nueva escuela..." class="h-10 flex-1 rounded-md border border-input px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      <button type="submit" class="inline-flex items-center gap-2 h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"><Plus class="h-4 w-4" /> Crear</button>
    </form>

    <div class="space-y-3">
      {#each data.schools as school}
        <div class="rounded-xl border p-4 {school.status === 'suspended' ? 'bg-slate-50 opacity-70' : ''}">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-3">
              {#if school.logo_url}<img src={school.logo_url} alt={school.name} class="h-8 w-8 rounded object-cover border" />{/if}
              <div>
                <span class="font-semibold text-slate-900">{school.name}</span>
                {#if school.status === 'suspended'}<span class="ml-2 text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">Suspendida</span>{/if}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <form method="POST" action="?/toggleSchoolStatus" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') await invalidateAll(); else await update(); }}>
                <input type="hidden" name="school_id" value={school.id} />
                <input type="hidden" name="current_status" value={school.status} />
                <button type="submit" class="h-8 rounded-md border bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50">{school.status === 'suspended' ? 'Reactivar' : 'Suspender'}</button>
              </form>
              <form method="POST" action="?/deleteSchool" use:enhance={() => async ({ result, update }) => { if (confirm('¿Eliminar esta escuela y todos sus datos? No se puede deshacer.')) { if (result.type === 'success') await invalidateAll(); } else return; await update(); }}>
                <input type="hidden" name="school_id" value={school.id} />
                <button type="submit" class="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-white text-slate-400 hover:text-red-600 hover:border-red-200"><Trash2 class="h-3.5 w-3.5" /></button>
              </form>
            </div>
          </div>

          <div class="mt-3 pt-3 border-t flex flex-wrap items-center gap-3">
            <form method="POST" action="?/updateDomain" class="flex gap-2 items-center flex-1 min-w-[220px]" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') await invalidateAll(); else await update(); }}>
              <input type="hidden" name="school_id" value={school.id} />
              <input type="text" name="domain" value={school.custom_domain || ''} placeholder="dominio.edu.ar" class="h-8 flex-1 rounded-md border px-2 text-xs" />
              <button type="submit" class="h-8 rounded-md border bg-white px-3 text-xs font-medium hover:bg-slate-50">Vincular dominio</button>
            </form>

            <form method="POST" action="?/uploadLogo" enctype="multipart/form-data" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') await invalidateAll(); await update(); }}>
              <input type="hidden" name="school_id" value={school.id} />
              <input type="file" name="logo" id="logo-{school.id}" accept=".jpg,.jpeg,.png,.webp,.svg" required class="hidden" onchange={(e) => e.currentTarget.form?.requestSubmit()} />
              <label for="logo-{school.id}" class="inline-flex items-center gap-1 h-8 rounded-md border bg-white px-3 text-xs font-medium cursor-pointer hover:bg-slate-50"><Upload class="h-3.5 w-3.5" /> Logo</label>
            </form>

            <form method="POST" action="?/toggleWhatsapp" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') await invalidateAll(); else await update(); }}>
              <input type="hidden" name="school_id" value={school.id} />
              <input type="hidden" name="current_value" value={school.whatsapp_enabled ? 'true' : 'false'} />
              <button type="submit" class="h-8 rounded-md border px-3 text-xs font-medium {school.whatsapp_enabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-slate-500'}">WhatsApp {school.whatsapp_enabled ? 'ON' : 'OFF'}</button>
            </form>
          </div>
        </div>
      {:else}
        <p class="text-sm text-slate-500 text-center py-6">No hay escuelas creadas.</p>
      {/each}
    </div>
  </div>

  <div class="rounded-2xl border bg-white shadow-sm p-5">
    <h2 class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Users class="h-5 w-5 text-primary" /> Usuarios de la plataforma</h2>
    <div class="space-y-2">
      {#each data.profiles as user}
        <form method="POST" action="?/updateUser" class="flex items-center justify-between gap-3 rounded-lg border p-3 flex-wrap" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') await invalidateAll(); else await update(); }}>
          <input type="hidden" name="user_id" value={user.id} />
          <div>
            <span class="block text-sm font-medium text-slate-900">{user.full_name || 'Sin nombre'}</span>
            <span class="block text-xs text-slate-500">{roleLabels[user.role] ?? user.role} · {user.schools?.[0]?.name ?? 'Sin escuela'}</span>
          </div>
          <div class="flex items-center gap-2">
            <select name="role" value={user.role} class="h-8 rounded-md border px-2 text-xs bg-white">
              {#each Object.entries(roleLabels) as [value, label]}<option {value}>{label}</option>{/each}
            </select>
            <select name="school_id" value={user.school_id ?? ''} class="h-8 rounded-md border px-2 text-xs bg-white">
              <option value="">Ninguna</option>
              {#each data.schools as school}<option value={school.id}>{school.name}</option>{/each}
            </select>
            <button type="submit" class="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">Guardar</button>
          </div>
        </form>
      {:else}
        <p class="text-sm text-slate-500 text-center py-6">No hay usuarios.</p>
      {/each}
    </div>
  </div>
</div>
