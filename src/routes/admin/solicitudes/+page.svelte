<script lang="ts">
  import { onMount } from 'svelte';
  import { landing } from '$lib/supabaseClient';
  import { toast } from 'svelte-sonner';
  import { RefreshCcw, Eye, Trash2, X, Clock, Users, CheckCircle2, FileText, ChevronDown, ChevronUp, AlertOctagon, Send } from 'lucide-svelte';

  let requests = $state<any[]>([]);
  let messagesByRequest = $state<Record<string, any[]>>({});
  let isLoading = $state(true);
  let selectedRequest = $state<any>(null);
  let expandedId = $state<string | null>(null);
  let activeFilter = $state<string>('all');
  let deleteConfirmId = $state<string | null>(null);
  let draftReply = $state('');
  let isSendingReply = $state(false);

  let filteredRequests = $derived(
    activeFilter === 'all'
      ? requests
      : requests.filter(r => r.status === activeFilter)
  );

  let pendingCount = $derived(requests.filter(r => r.status === 'pending').length);
  let contactedCount = $derived(requests.filter(r => r.status === 'contacted').length);
  let resolvedCount = $derived(requests.filter(r => r.status === 'resolved').length);
  let bajaCount = $derived(requests.filter(r => r.status === 'baja_solicitada').length);

  const filters = [
    { key: 'all', label: 'Todas', icon: FileText },
    { key: 'pending', label: 'Pendientes', icon: Clock },
    { key: 'contacted', label: 'Contactados', icon: Users },
    { key: 'resolved', label: 'Resueltos', icon: CheckCircle2 },
    { key: 'baja_solicitada', label: 'Bajas', icon: AlertOctagon },
  ];

  onMount(async () => {
    await fetchRequests();
  });

  async function fetchRequests() {
    isLoading = true;
    const { data, error } = await landing
      .from('requests')
      .select('*, services(name)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      requests = data;
      await fetchMessages();
    }
    isLoading = false;
  }

  async function fetchMessages() {
    if (requests.length === 0) return;
    const { data, error } = await landing
      .from('request_messages')
      .select('*')
      .in('request_id', requests.map(r => r.id))
      .order('created_at', { ascending: true });

    if (!error && data) {
      const grouped: Record<string, any[]> = {};
      for (const msg of data) {
        (grouped[msg.request_id] ??= []).push(msg);
      }
      messagesByRequest = grouped;
    }
  }

  async function sendReply(requestId: string) {
    const body = draftReply.trim();
    if (!body) return;
    isSendingReply = true;
    const { error } = await landing.from('request_messages').insert({
      request_id: requestId,
      sender_role: 'nmf',
      sender_name: 'NMF',
      body
    });
    if (!error) {
      draftReply = '';
      await fetchMessages();
      toast.success('Respuesta enviada.');
    } else {
      toast.error('No se pudo enviar la respuesta.');
    }
    isSendingReply = false;
  }

  async function updateStatus(id: string, newStatus: string) {
    const { error } = await landing.from('requests').update({ status: newStatus }).eq('id', id);
    if (!error) await fetchRequests();
  }

  async function deleteRequest(id: string) {
    const { error } = await landing.from('requests').delete().eq('id', id);
    if (!error) {
      deleteConfirmId = null;
      await fetchRequests();
    }
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

  function toggleExpanded(id: string) {
    expandedId = expandedId === id ? null : id;
    draftReply = '';
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  function filterCount(key: string) {
    if (key === 'all') return requests.length;
    if (key === 'pending') return pendingCount;
    if (key === 'contacted') return contactedCount;
    if (key === 'baja_solicitada') return bajaCount;
    return resolvedCount;
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-foreground">Solicitudes</h1>
      <p class="text-sm text-muted-foreground mt-1">Gestiona todas las solicitudes de contratación de servicios.</p>
    </div>
    <button
      onclick={fetchRequests}
      class="inline-flex items-center gap-2 h-10 rounded-md border border-border bg-card px-4 text-sm font-medium text-muted-foreground shadow-sm hover:bg-muted transition-colors"
    >
      <RefreshCcw class="h-4 w-4" />
      Actualizar
    </button>
  </div>

  <!-- Filter Tabs -->
  <div class="flex flex-wrap gap-2">
    {#each filters as filter}
      {@const Icon = filter.icon}
      <button
        onclick={() => activeFilter = filter.key}
        class="inline-flex items-center gap-2 h-10 rounded-md px-4 text-sm font-medium transition-colors
          {activeFilter === filter.key
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'border border-border bg-card text-muted-foreground hover:bg-muted'}"
      >
        <Icon class="h-4 w-4" />
        {filter.label}
        <span class="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium
          {activeFilter === filter.key
            ? 'bg-card/20 text-primary-foreground'
            : 'bg-muted text-muted-foreground'}">
          {filterCount(filter.key)}
        </span>
      </button>
    {/each}
  </div>

  <!-- Table -->
  <div class="rounded-2xl border bg-card shadow-sm overflow-hidden">
    <div class="p-5 border-b flex items-center justify-between">
      <h2 class="text-lg font-bold text-foreground">
        {activeFilter === 'all' ? 'Todas las Solicitudes' :
         activeFilter === 'pending' ? 'Solicitudes Pendientes' :
         activeFilter === 'contacted' ? 'Solicitudes Contactadas' :
         activeFilter === 'baja_solicitada' ? 'Bajas Solicitadas' : 'Solicitudes Resueltas'}
      </h2>
      <span class="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">{filteredRequests.length} registros</span>
    </div>

    {#if isLoading}
      <div class="p-12 text-center text-muted-foreground text-sm">
        <div class="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
        Cargando solicitudes...
      </div>
    {:else if filteredRequests.length === 0}
      <div class="p-12 text-center text-muted-foreground text-sm">
        {activeFilter === 'all' ? 'Aún no hay solicitudes de contratación.' : 'No hay solicitudes con este estado.'}
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="bg-muted text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <th class="p-4">Fecha</th>
              <th class="p-4">Cliente</th>
              <th class="p-4 hidden md:table-cell">Email</th>
              <th class="p-4 hidden lg:table-cell">Teléfono</th>
              <th class="p-4">Servicio</th>
              <th class="p-4">Estado</th>
              <th class="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="text-sm divide-y">
            {#each filteredRequests as req}
              <tr class="hover:bg-muted/50 transition-colors">
                <td class="p-4 text-muted-foreground whitespace-nowrap">{formatDate(req.created_at)}</td>
                <td class="p-4">
                  <div class="font-medium text-foreground">{req.contact_name}</div>
                  <div class="text-muted-foreground text-xs md:hidden">{req.contact_email}</div>
                </td>
                <td class="p-4 text-muted-foreground hidden md:table-cell">{req.contact_email}</td>
                <td class="p-4 text-muted-foreground hidden lg:table-cell">{req.contact_phone || '—'}</td>
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
                      onclick={() => toggleExpanded(req.id)}
                      class="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-card text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors relative"
                      title={expandedId === req.id ? 'Ocultar mensajes' : 'Ver mensajes'}
                    >
                      {#if (messagesByRequest[req.id]?.length ?? 0) > 0}
                        <span class="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary"></span>
                      {/if}
                      {#if expandedId === req.id}
                        <ChevronUp class="h-4 w-4" />
                      {:else}
                        <ChevronDown class="h-4 w-4" />
                      {/if}
                    </button>
                    <button
                      onclick={() => selectedRequest = req}
                      class="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-card text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                      title="Ver detalle completo"
                    >
                      <Eye class="h-4 w-4" />
                    </button>
                    {#if deleteConfirmId === req.id}
                      <button
                        onclick={() => deleteRequest(req.id)}
                        class="inline-flex h-8 items-center gap-1 rounded-md bg-red-600 px-3 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                      >
                        Confirmar
                      </button>
                      <button
                        onclick={() => deleteConfirmId = null}
                        class="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-card text-muted-foreground hover:text-muted-foreground transition-colors"
                      >
                        <X class="h-4 w-4" />
                      </button>
                    {:else}
                      <button
                        onclick={() => deleteConfirmId = req.id}
                        class="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-card text-muted-foreground hover:text-red-600 hover:border-red-200 dark:hover:border-red-800 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 class="h-4 w-4" />
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>

              <!-- Expanded Message Row -->
              {#if expandedId === req.id}
                {@const thread = messagesByRequest[req.id] ?? []}
                <tr class="bg-muted/80">
                  <td colspan="7" class="px-4 py-4 space-y-3">
                    {#if req.message}
                      <div class="flex items-start gap-3">
                        <span class="text-xs font-medium text-muted-foreground mt-0.5 shrink-0">Mensaje inicial:</span>
                        <p class="text-sm text-foreground leading-relaxed">{req.message}</p>
                      </div>
                    {/if}

                    {#if thread.length > 0}
                      <div class="space-y-2 max-h-64 overflow-y-auto">
                        {#each thread as msg}
                          <div class="flex {msg.sender_role === 'nmf' ? 'justify-end' : 'justify-start'}">
                            <div class="max-w-[70%] rounded-lg px-3 py-2 text-xs {msg.sender_role === 'nmf' ? 'bg-primary/10 text-foreground' : 'bg-card border text-foreground'}">
                              <p class="font-medium mb-0.5 {msg.sender_role === 'nmf' ? 'text-primary' : 'text-muted-foreground'}">
                                {msg.sender_role === 'nmf' ? 'NMF' : (msg.sender_name || 'Cliente')}
                              </p>
                              <p class="leading-relaxed">{msg.body}</p>
                              <p class="text-[10px] text-muted-foreground mt-1">{formatDateTime(msg.created_at)}</p>
                            </div>
                          </div>
                        {/each}
                      </div>
                    {:else}
                      <p class="text-xs text-muted-foreground italic">Todavía no hay mensajes en esta solicitud.</p>
                    {/if}

                    <form onsubmit={(e) => { e.preventDefault(); sendReply(req.id); }} class="flex gap-2">
                      <input
                        type="text"
                        bind:value={draftReply}
                        placeholder="Responder al cliente..."
                        class="h-9 flex-1 rounded-md border border-input bg-card px-3 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <button
                        type="submit"
                        disabled={isSendingReply || !draftReply.trim()}
                        class="inline-flex items-center gap-1.5 h-9 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
                      >
                        <Send class="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<!-- Modal Detail -->
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
          <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {statusBadgeClass(selectedRequest.status)}">
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
