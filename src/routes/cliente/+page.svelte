<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase, landing } from '$lib/supabaseClient';
  import { Clock, CheckCircle2, AlertCircle, Package, ArrowRight, ChevronRight, ShieldCheck } from 'lucide-svelte';

  let requests = $state<any[]>([]);
  let isLoading = $state(true);
  let user = $state<any>(null);

  let pendingCount = $derived(requests.filter(r => r.status === 'pending').length);
  let contactedCount = $derived(requests.filter(r => r.status === 'contacted').length);
  let resolvedCount = $derived(requests.filter(r => r.status === 'resolved').length);

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      user = session.user;
      await fetchRequests();
    }
  });

  async function fetchRequests() {
    isLoading = true;
    const { data, error } = await landing
      .from('requests')
      .select('*, services(name, description)')
      .eq('contact_email', user.email)
      .order('created_at', { ascending: false });

    if (!error && data) requests = data;
    isLoading = false;
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  }

  function statusInfo(status: string) {
    switch (status) {
      case 'pending': return { label: 'Pendiente', desc: 'Tu solicitud está siendo revisada por nuestro equipo.' };
      case 'contacted': return { label: 'En Proceso', desc: 'Un miembro de NMF se puso en contacto contigo.' };
      case 'resolved': return { label: 'Finalizado', desc: 'Tu servicio está activo o la solicitud fue completada.' };
      default: return { label: status, desc: '' };
    }
  }
</script>

<div class="space-y-8">
  <!-- Welcome -->
  <div>
    <h1 class="text-2xl font-bold tracking-tight text-slate-900">¡Hola! 👋</h1>
    <p class="text-sm text-slate-600 mt-1">Desde acá podés ver el estado de tus solicitudes de contratación.</p>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-3 gap-4">
    <div class="rounded-2xl border bg-white p-5 shadow-sm">
      <div class="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
        <Clock class="h-5 w-5" />
      </div>
      <div class="text-2xl font-bold text-slate-900">{pendingCount}</div>
      <div class="text-xs font-medium text-slate-500 mt-0.5">En Revisión</div>
    </div>
    <div class="rounded-2xl border bg-white p-5 shadow-sm">
      <div class="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
        <AlertCircle class="h-5 w-5" />
      </div>
      <div class="text-2xl font-bold text-slate-900">{contactedCount}</div>
      <div class="text-xs font-medium text-slate-500 mt-0.5">En Proceso</div>
    </div>
    <div class="rounded-2xl border bg-white p-5 shadow-sm">
      <div class="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
        <CheckCircle2 class="h-5 w-5" />
      </div>
      <div class="text-2xl font-bold text-slate-900">{resolvedCount}</div>
      <div class="text-xs font-medium text-slate-500 mt-0.5">Finalizados</div>
    </div>
  </div>

  <!-- Requests -->
  <div>
    <h2 class="text-lg font-bold text-slate-900 mb-4">Mis Solicitudes</h2>

    {#if isLoading}
      <div class="rounded-2xl border bg-white p-12 shadow-sm text-center text-sm text-slate-500">
        <div class="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
        Cargando tus solicitudes...
      </div>
    {:else if requests.length === 0}
      <div class="rounded-2xl border bg-white p-12 shadow-sm text-center">
        <Package class="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 class="text-lg font-bold text-slate-900 mb-1">No tenés solicitudes todavía</h3>
        <p class="text-sm text-slate-500 mb-6 max-w-sm mx-auto">Explorá nuestros servicios y enviá tu primera solicitud de contratación.</p>
        <a href="/#servicios" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
          Ver Servicios
          <ArrowRight class="h-4 w-4" />
        </a>
      </div>
    {:else}
      <div class="space-y-4">
        {#each requests as req}
          {@const info = statusInfo(req.status)}
          <div class="group rounded-2xl border bg-white shadow-sm transition-all hover:shadow-md hover:border-primary/20">
            <!-- Card top -->
            <div class="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div class="flex items-start gap-3">
                <div class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                  <Package class="h-5 w-5" />
                </div>
                <div>
                  <h3 class="font-bold text-slate-900">{req.services?.name || 'Servicio'}</h3>
                  {#if req.services?.description}
                    <p class="text-xs text-slate-500 mt-0.5">{req.services.description}</p>
                  {/if}
                </div>
              </div>
              <span class="inline-flex self-start items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                {req.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                 req.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                 'bg-green-100 text-green-800'}">
                {info.label}
              </span>
            </div>

            <!-- Progress -->
            <div class="px-5 py-4 border-t bg-slate-50/50">
              <div class="flex items-center gap-0">
                <!-- Step 1 -->
                <div class="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div class="h-3 w-3 rounded-full bg-primary ring-4 ring-primary/10"></div>
                  <span class="text-[10px] font-medium text-slate-900 whitespace-nowrap">Enviada</span>
                </div>
                <!-- Line -->
                <div class="flex-1 h-0.5 mx-1 rounded {req.status !== 'pending' ? 'bg-primary' : 'bg-slate-200'}"></div>
                <!-- Step 2 -->
                <div class="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div class="h-3 w-3 rounded-full {req.status === 'contacted' || req.status === 'resolved' ? 'bg-primary ring-4 ring-primary/10' : 'bg-slate-200'}"></div>
                  <span class="text-[10px] font-medium {req.status === 'contacted' || req.status === 'resolved' ? 'text-slate-900' : 'text-slate-400'} whitespace-nowrap">Contactado</span>
                </div>
                <!-- Line -->
                <div class="flex-1 h-0.5 mx-1 rounded {req.status === 'resolved' ? 'bg-primary' : 'bg-slate-200'}"></div>
                <!-- Step 3 -->
                <div class="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div class="h-3 w-3 rounded-full {req.status === 'resolved' ? 'bg-green-500 ring-4 ring-green-500/10' : 'bg-slate-200'}"></div>
                  <span class="text-[10px] font-medium {req.status === 'resolved' ? 'text-slate-900' : 'text-slate-400'} whitespace-nowrap">Finalizado</span>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="px-5 py-3 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
              <span class="text-slate-400">Solicitado el {formatDate(req.created_at)}</span>
              <span class="text-slate-500 italic">{info.desc}</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
