<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { Building2, Users, Plus, Trash2, Upload } from 'lucide-svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

  let { data } = $props();

  let newSchoolName = $state('');
  const roleLabels: Record<string, string> = {
    student: 'Alumno/a', tutor: 'Tutor/a', teacher: 'Docente',
    director: 'Director', admin: 'Admin. Escuela', superadmin: 'Super Admin', client: 'Cliente'
  };

  let deleteSchoolDialogOpen = $state(false);
  let schoolFormToDelete: HTMLFormElement | null = null;
  function requestDeleteSchool(e: MouseEvent) {
    schoolFormToDelete = (e.currentTarget as HTMLElement).closest('form');
    deleteSchoolDialogOpen = true;
  }
  function confirmDeleteSchool() {
    schoolFormToDelete?.requestSubmit();
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold tracking-tight text-foreground">Escuelas (Global Admin)</h1>
    <p class="text-sm text-muted-foreground mt-1">Gestión cross-tenant de escuelas y usuarios de toda la plataforma NMF.</p>
  </div>

  <div class="rounded-2xl border bg-card shadow-sm p-5">
    <h2 class="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Building2 class="h-5 w-5 text-primary" /> Escuelas registradas</h2>

    <form method="POST" action="?/createSchool" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') { newSchoolName = ''; await invalidateAll(); } else await update(); }} class="flex gap-2 mb-4">
      <input type="text" name="name" bind:value={newSchoolName} required placeholder="Nombre de la nueva escuela..." class="h-10 flex-1 rounded-md border border-input px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      <button type="submit" class="inline-flex items-center gap-2 h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"><Plus class="h-4 w-4" /> Crear</button>
    </form>

    <div class="space-y-3">
      {#each data.schools as school}
        <div class="rounded-xl border p-4 {school.status === 'suspended' ? 'bg-muted opacity-70' : ''}">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div class="flex items-center gap-3">
              {#if school.logo_url}<img src={school.logo_url} alt={school.name} class="h-8 w-8 rounded object-cover border" />{/if}
              <div>
                <span class="font-semibold text-foreground">{school.name}</span>
                {#if school.status === 'suspended'}<span class="ml-2 text-xs bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 rounded-full px-2 py-0.5">Suspendida</span>{/if}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <form method="POST" action="?/toggleSchoolStatus" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') await invalidateAll(); else await update(); }}>
                <input type="hidden" name="school_id" value={school.id} />
                <input type="hidden" name="current_status" value={school.status} />
                <button type="submit" class="h-8 rounded-md border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-muted">{school.status === 'suspended' ? 'Reactivar' : 'Suspender'}</button>
              </form>
              <form method="POST" action="?/deleteSchool" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') await invalidateAll(); else await update(); }}>
                <input type="hidden" name="school_id" value={school.id} />
                <button type="button" onclick={requestDeleteSchool} class="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-card text-muted-foreground hover:text-red-600 hover:border-red-200 dark:hover:border-red-800"><Trash2 class="h-3.5 w-3.5" /></button>
              </form>
            </div>
          </div>

          <div class="mt-3 pt-3 border-t flex flex-wrap items-center gap-3">
            <form method="POST" action="?/updateDomain" class="flex gap-2 items-center flex-1 min-w-[220px]" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') await invalidateAll(); else await update(); }}>
              <input type="hidden" name="school_id" value={school.id} />
              <input type="text" name="domain" value={school.custom_domain || ''} placeholder="dominio.edu.ar" class="h-8 flex-1 rounded-md border px-2 text-xs" />
              <button type="submit" class="h-8 rounded-md border bg-card px-3 text-xs font-medium hover:bg-muted">Vincular dominio</button>
            </form>

            <form method="POST" action="?/updateColor" class="flex gap-2 items-center" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') await invalidateAll(); else await update(); }}>
              <input type="hidden" name="school_id" value={school.id} />
              <label class="text-xs text-muted-foreground" for="color-{school.id}">Color institucional</label>
              <input type="color" id="color-{school.id}" name="color" value={school.primary_color || '#0a3055'} class="h-8 w-8 rounded-md border p-0 cursor-pointer" onchange={(e) => e.currentTarget.form?.requestSubmit()} />
            </form>
            {#if school.primary_color}
              <form method="POST" action="?/updateColor" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') await invalidateAll(); else await update(); }}>
                <input type="hidden" name="school_id" value={school.id} />
                <input type="hidden" name="color" value="" />
                <button type="submit" class="h-8 rounded-md border bg-card px-2 text-xs text-muted-foreground hover:bg-muted">Quitar color</button>
              </form>
            {/if}

            <form method="POST" action="?/uploadLogo" enctype="multipart/form-data" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') await invalidateAll(); await update(); }}>
              <input type="hidden" name="school_id" value={school.id} />
              <input type="file" name="logo" id="logo-{school.id}" accept=".jpg,.jpeg,.png,.webp,.svg" required class="hidden" onchange={(e) => e.currentTarget.form?.requestSubmit()} />
              <label for="logo-{school.id}" class="inline-flex items-center gap-1 h-8 rounded-md border bg-card px-3 text-xs font-medium cursor-pointer hover:bg-muted"><Upload class="h-3.5 w-3.5" /> Logo</label>
            </form>

            <form method="POST" action="?/toggleWhatsapp" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') await invalidateAll(); else await update(); }}>
              <input type="hidden" name="school_id" value={school.id} />
              <input type="hidden" name="current_value" value={school.whatsapp_enabled ? 'true' : 'false'} />
              <button type="submit" class="h-8 rounded-md border px-3 text-xs font-medium {school.whatsapp_enabled ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900' : 'bg-card text-muted-foreground'}">WhatsApp {school.whatsapp_enabled ? 'ON' : 'OFF'}</button>
            </form>
          </div>
        </div>
      {:else}
        <p class="text-sm text-muted-foreground text-center py-6">No hay escuelas creadas.</p>
      {/each}
    </div>
  </div>

  <div class="rounded-2xl border bg-card shadow-sm p-5">
    <h2 class="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Users class="h-5 w-5 text-primary" /> Usuarios de la plataforma</h2>
    <div class="space-y-2">
      {#each data.profiles as user}
        <form method="POST" action="?/updateUser" class="flex items-center justify-between gap-3 rounded-lg border p-3 flex-wrap" use:enhance={() => async ({ result, update }) => { if (result.type === 'success') await invalidateAll(); else await update(); }}>
          <input type="hidden" name="user_id" value={user.id} />
          <div>
            <span class="block text-sm font-medium text-foreground">{user.full_name || 'Sin nombre'}</span>
            <span class="block text-xs text-muted-foreground">{roleLabels[user.role] ?? user.role} · {(user.schools as unknown as { name: string } | null)?.name ?? 'Sin escuela'}</span>
          </div>
          <div class="flex items-center gap-2">
            <select name="role" value={user.role} class="h-8 rounded-md border px-2 text-xs bg-card">
              {#each Object.entries(roleLabels) as [value, label]}<option {value}>{label}</option>{/each}
            </select>
            <select name="school_id" value={user.school_id ?? ''} class="h-8 rounded-md border px-2 text-xs bg-card">
              <option value="">Ninguna</option>
              {#each data.schools as school}<option value={school.id}>{school.name}</option>{/each}
            </select>
            <button type="submit" class="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">Guardar</button>
          </div>
        </form>
      {:else}
        <p class="text-sm text-muted-foreground text-center py-6">No hay usuarios.</p>
      {/each}
    </div>
  </div>
</div>

<ConfirmDialog
  bind:open={deleteSchoolDialogOpen}
  title="Eliminar escuela"
  description="¿Eliminar esta escuela y todos sus datos? No se puede deshacer."
  confirmLabel="Eliminar"
  destructive
  onConfirm={confirmDeleteSchool}
/>
