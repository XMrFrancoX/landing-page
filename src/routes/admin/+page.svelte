<script lang="ts">
  import { onMount } from 'svelte';
  import { landing } from '$lib/supabaseClient';
  import { FileText, Clock, CheckCircle2, Users, RefreshCcw, Eye, X, AlertOctagon } from 'lucide-svelte';

  let requests = $state<any[]>([]);
  let isLoading = $state(true);
  let selectedRequest = $state<any>(null);

  let pendingCount = $derived(requests.filter(r => r.status === 'pending').length);
  let contactedCount = $derived(requests.filter(r => r.status === 'contacted').length);
  let resolvedCount = $derived(requests.filter(r => r.status === 'resolved').length);
  let bajaCount = $derived(requests.filter(r => r.status === 'baja_solicitada').length);
  let totalCount = $derived(requests.length);

  onMount(async () => {
    await fetchRequests();
  });

  async function fetchRequests() {
    isLoading = true;
    const { data, error } = await landing
      .from('requests')
      .select('*, services(name)')
      .order('created_at', { ascending: false });

    if (!error && data) requests = data;
    isLoading = false;
  }

  async function updateStatus(id: string, newStatus: string) {
    const { error } = await landing.from('requests').update({ status: newStatus }).eq('id', id);
    if (!error) await fetchRequests();
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function statusLabel(s: string) {
    if (s === 'pending') return 'Pendiente';
    if (s === 'contacted') return 'Contactado';
    if (s === 'baja_solicitada') return 'Baja solicitada';
    return 'Resuelto';
  }

  function statusBadgeClass(s: string) {
    if (s === 'pending') return 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300';
    if (s === 'contacted') return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300';
    if (s === 'baja_solicitada') return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400';
    return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300';
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-foreground">Panel Principal</h1>
      <p class="text-sm text-muted-foreground mt-1">Resumen general de solicitudes y servicios.</p>
    </div>
    <button
      onclick={fetchRequests}
      class="inline-flex items-center gap-2 h-10 rounded-md border border-border bg-card px-4 text-sm font-medium text-muted-foreground shadow-sm hover:bg-muted transition-colors"
    >
      <RefreshCcw class="h-4 w-4" />
      Actualizar
    </button>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
    <div class="rounded-2xl border bg-card p-5 shadow-sm">
      <div class="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText class="h-5 w-5" />
      </div>
      <div class="text-2xl font-bold text-foreground">{totalCount}</div>
      <div class="text-xs font-medium text-muted-foreground mt-0.5">Total Solicitudes</div>
    </div>
    <div class="rounded-2xl border bg-card p-5 shadow-sm">
      <div class="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
        <Clock class="h-5 w-5" />
      </div>
      <div class="text-2xl font-bold text-foreground">{pendingCount}</div>
      <div class="text-xs font-medium text-muted-foreground mt-0.5">Pendientes</div>
    </div>
    <div class="rounded-2xl border bg-card p-5 shadow-sm">
      <div class="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
        <Users class="h-5 w-5" />
      </div>
      <div class="text-2xl font-bold text-foreground">{contactedCount}</div>
      <div class="text-xs font-medium text-muted-foreground mt-0.5">Contactados</div>
    </div>
    <div class="rounded-2xl border bg-card p-5 shadow-sm">
      <div class="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400">
        <CheckCircle2 class="h-5 w-5" />
      </div>
      <div class="text-2xl font-bold text-foreground">{resolvedCount}</div>
      <div class="text-xs font-medium text-muted-foreground mt-0.5">Resueltos</div>
    </div>
    <div class="rounded-2xl border bg-card p-5 shadow-sm">
      <div class="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
        <AlertOctagon class="h-5 w-5" />
      </div>
      <div class="text-2xl font-bold text-foreground">{bajaCount}</div>
      <div class="text-xs font-medium text-muted-foreground mt-0.5">Bajas</div>
    </div>
  </div>

  <!-- Table -->
  <div class="rounded-2xl border bg-card shadow-sm overflow-hidden">
    <div class="p-5 border-b flex items-center justify-between">
      <h2 class="text-lg font-bold text-foreground">Últimas Solicitudes</h2>
      <span class="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">{requests.length} registros</span>
    </div>

    {#if isLoading}
      <div class="p-12 text-center text-muted-foreground text-sm">
        <div class="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
        Cargando solicitudes...
      </div>
    {:else if requests.length === 0}
      <div class="p-12 text-center text-muted-foreground text-sm">
        Aún no hay solicitudes de contratación.
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="bg-muted text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <th class="p-4">Fecha</th>
              <th class="p-4">Cliente</th>
              <th class="p-4">Servicio</th>
              <th class="p-4">Estado</th>
              <th class="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="text-sm divide-y">
            {#each requests as req}
              <tr class="hover:bg-muted/50 transition-colors">
                <td class="p-4 text-muted-foreground whitespace-nowrap">{formatDate(req.created_at)}</td>
                <td class="p-4">
                  <div class="font-medium text-foreground">{req.contact_name}</div>
                  <div class="text-muted-foreground text-xs">{req.contact_email}</div>
                </td>
                <td class="p-4 font-medium text-primary">{req.services?.name || '—'}</td>
                <td class="p-4">
                  <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {statusBadgeClass(req.status)}">
                    {statusLabel(req.status)}
                  </span>
                </td>
                <td class="p-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <select
                      value={req.status}
                      onchange={(e) => updateStatus(req.id, e.currentTarget.value)}
                      class="text-xs border rounded-md px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="contacted">Contactado</option>
                      <option value="resolved">Resuelto</option>
                      <option value="baja_solicitada">Baja solicitada</option>
                    </select>
                    <button
                      onclick={() => selectedRequest = req}
                      class="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-card text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                      title="Ver detalle"
                    >
                      <Eye class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<!-- Modal Detalle -->
{#if selectedRequest}
  <div class="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onclick={() => selectedRequest = null}>
    <div class="bg-card rounded-2xl border shadow-xl w-full max-w-lg overflow-hidden" onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center justify-between p-5 border-b">
        <h3 class="text-lg font-bold text-foreground">Detalle de Solicitud</h3>
        <button onclick={() => selectedRequest = null} class="text-muted-foreground hover:text-muted-foreground">
          <X class="h-5 w-5" />
        </button>
      </div>
      <div class="p-5 space-y-4 text-sm">
        <div class="flex justify-between"><span class="text-muted-foreground font-medium">Nombre</span><span class="text-foreground">{selectedRequest.contact_name}</span></div>
        <div class="flex justify-between"><span class="text-muted-foreground font-medium">Email</span><span class="text-foreground">{selectedRequest.contact_email}</span></div>
        {#if selectedRequest.contact_phone}
          <div class="flex justify-between"><span class="text-muted-foreground font-medium">Teléfono</span><span class="text-foreground">{selectedRequest.contact_phone}</span></div>
        {/if}
        <div class="flex justify-between"><span class="text-muted-foreground font-medium">Servicio</span><span class="text-primary font-medium">{selectedRequest.services?.name || '—'}</span></div>
        <div class="flex justify-between items-center">
          <span class="text-muted-foreground font-medium">Estado</span>
          <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
            {selectedRequest.status === 'pending' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' :
             selectedRequest.status === 'contacted' ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300' :
             'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300'}">
            {statusLabel(selectedRequest.status)}
          </span>
        </div>
        <div class="flex justify-between"><span class="text-muted-foreground font-medium">Fecha</span><span class="text-foreground">{formatDate(selectedRequest.created_at)}</span></div>
        {#if selectedRequest.message}
          <div class="pt-2 border-t">
            <span class="text-muted-foreground font-medium block mb-2">Mensaje</span>
            <p class="bg-muted rounded-lg p-3 text-foreground leading-relaxed">{selectedRequest.message}</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
