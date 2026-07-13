<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase, landing } from '$lib/supabaseClient';
  import { toast } from 'svelte-sonner';
  import { Clock, CheckCircle2, AlertCircle, Package, ArrowRight, MessageCircle, Send, XCircle } from 'lucide-svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

  let bajaDialogOpen = $state(false);
  let requestIdPendingBaja = $state<string | null>(null);

  let requests = $state<any[]>([]);
  let messagesByRequest = $state<Record<string, any[]>>({});
  let openThreadId = $state<string | null>(null);
  let draftMessage = $state('');
  let isSending = $state(false);
  let isRequestingBaja = $state<string | null>(null);
  let isLoading = $state(true);
  let user = $state<any>(null);
  let schoolId = $state<string | null>(null);
  // Color institucional que la escuela eligió (schools.primary_color,
  // configurado por superadmin en /admin/escuelas). Se usa SOLO como acento
  // visual en las cards de servicio de esta página — no debe tocar el resto
  // de la identidad de marca de Landing Page (botones, nav, toasts, etc.).
  let schoolColor = $state<string | null>(null);

  let pendingCount = $derived(requests.filter(r => r.status === 'pending').length);
  let contactedCount = $derived(requests.filter(r => r.status === 'contacted').length);
  let resolvedCount = $derived(requests.filter(r => r.status === 'resolved').length);

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      user = session.user;
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id, role, schools(primary_color)')
        .eq('id', session.user.id)
        .single();
      // Solo admin/director tienen autoridad sobre lo que contrató toda
      // la escuela. teacher/student/tutor (mismo school_id, sin ese rol)
      // deben quedar acotados a lo que ellos mismos pidieron, como
      // cualquier cliente sin escuela.
      const hasSchoolAuthority = profile?.role === 'admin' || profile?.role === 'director';
      schoolId = hasSchoolAuthority ? (profile?.school_id ?? null) : null;
      schoolColor = (profile?.schools as unknown as { primary_color: string | null } | null)?.primary_color ?? null;
      await fetchRequests();
    }
  });

  async function fetchRequests() {
    isLoading = true;
    // Si el usuario tiene una escuela asignada (admin/director), vemos
    // todo lo que contrató la institución. Si no (cliente sin escuela),
    // vemos solo lo que él mismo pidió por email.
    let query = landing
      .from('requests')
      .select('*, services(name, description)')
      .order('created_at', { ascending: false });
    query = schoolId ? query.eq('school_id', schoolId) : query.eq('contact_email', user.email);

    const { data, error } = await query;

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

  function toggleThread(requestId: string) {
    openThreadId = openThreadId === requestId ? null : requestId;
    draftMessage = '';
  }

  async function sendMessage(requestId: string) {
    const body = draftMessage.trim();
    if (!body) return;
    isSending = true;
    const { error } = await landing.from('request_messages').insert({
      request_id: requestId,
      sender_role: 'client',
      sender_name: user?.email ?? null,
      body
    });
    if (!error) {
      draftMessage = '';
      await fetchMessages();
      toast.success('Mensaje enviado a NMF.');
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'mensaje', requestId })
      }).catch(() => {});
    } else {
      toast.error('No se pudo enviar el mensaje. Intentá de nuevo.');
    }
    isSending = false;
  }

  function askRequestBaja(requestId: string) {
    requestIdPendingBaja = requestId;
    bajaDialogOpen = true;
  }

  async function requestBaja(requestId: string) {
    isRequestingBaja = requestId;
    const { error } = await landing.from('requests').update({ status: 'baja_solicitada' }).eq('id', requestId);
    if (!error) {
      await landing.from('request_messages').insert({
        request_id: requestId,
        sender_role: 'client',
        sender_name: user?.email ?? null,
        body: 'Solicitó dar de baja este servicio.'
      });
      await fetchRequests();
      toast.success('Solicitud de baja enviada. NMF se va a contactar con vos.');
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'baja', requestId })
      }).catch(() => {});
    } else {
      toast.error('No se pudo enviar la solicitud de baja. Intentá de nuevo.');
    }
    isRequestingBaja = null;
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  function statusInfo(status: string) {
    switch (status) {
      case 'pending': return { label: 'Pendiente', desc: 'Tu solicitud está siendo revisada por nuestro equipo.' };
      case 'contacted': return { label: 'En Proceso', desc: 'Un miembro de NMF se puso en contacto contigo.' };
      case 'resolved': return { label: 'Finalizado', desc: 'Tu servicio está activo o la solicitud fue completada.' };
      case 'baja_solicitada': return { label: 'Baja solicitada', desc: 'Le avisamos a NMF que querés dar de baja este servicio.' };
      default: return { label: status, desc: '' };
    }
  }

  function statusBadgeClass(status: string) {
    if (status === 'pending') return 'bg-amber-100 text-amber-800';
    if (status === 'contacted') return 'bg-blue-100 text-blue-800';
    if (status === 'baja_solicitada') return 'bg-red-100 text-red-700';
    return 'bg-green-100 text-green-800';
  }
</script>

<div class="space-y-8">
  <!-- Welcome -->
  <div>
    <h1 class="text-2xl font-bold tracking-tight text-foreground">¡Hola! 👋</h1>
    <p class="text-sm text-muted-foreground mt-1">
      {schoolId ? 'Desde acá podés ver el estado de las solicitudes de contratación de tu institución.' : 'Desde acá podés ver el estado de tus solicitudes de contratación.'}
    </p>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-3 gap-4">
    <div class="rounded-2xl border bg-card p-5 shadow-sm">
      <div class="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
        <Clock class="h-5 w-5" />
      </div>
      <div class="text-2xl font-bold text-foreground">{pendingCount}</div>
      <div class="text-xs font-medium text-muted-foreground mt-0.5">En Revisión</div>
    </div>
    <div class="rounded-2xl border bg-card p-5 shadow-sm">
      <div class="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
        <AlertCircle class="h-5 w-5" />
      </div>
      <div class="text-2xl font-bold text-foreground">{contactedCount}</div>
      <div class="text-xs font-medium text-muted-foreground mt-0.5">En Proceso</div>
    </div>
    <div class="rounded-2xl border bg-card p-5 shadow-sm">
      <div class="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
        <CheckCircle2 class="h-5 w-5" />
      </div>
      <div class="text-2xl font-bold text-foreground">{resolvedCount}</div>
      <div class="text-xs font-medium text-muted-foreground mt-0.5">Finalizados</div>
    </div>
  </div>

  <!-- Requests -->
  <div>
    <h2 class="text-lg font-bold text-foreground mb-4">Mis Solicitudes</h2>

    {#if isLoading}
      <div class="rounded-2xl border bg-card p-12 shadow-sm text-center text-sm text-muted-foreground">
        <div class="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
        Cargando tus solicitudes...
      </div>
    {:else if requests.length === 0}
      <div class="rounded-2xl border bg-card p-12 shadow-sm text-center">
        <Package class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 class="text-lg font-bold text-foreground mb-1">No tenés solicitudes todavía</h3>
        <p class="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">Explorá nuestros servicios y enviá tu primera solicitud de contratación.</p>
        <a href="/#servicios" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
          Ver Servicios
          <ArrowRight class="h-4 w-4" />
        </a>
      </div>
    {:else}
      <div class="space-y-4">
        {#each requests as req}
          {@const info = statusInfo(req.status)}
          {@const thread = messagesByRequest[req.id] ?? []}
          <div class="group rounded-2xl border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/20">
            <!-- Card top -->
            <div class="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div class="flex items-start gap-3">
                <div
                  class="inline-flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 {schoolColor ? '' : 'bg-primary/10 text-primary'}"
                  style={schoolColor ? `background: ${schoolColor}1A; color: ${schoolColor};` : ''}
                >
                  <Package class="h-5 w-5" />
                </div>
                <div>
                  <h3 class="font-bold text-foreground">{req.services?.name || 'Servicio'}</h3>
                  {#if req.services?.description}
                    <p class="text-xs text-muted-foreground mt-0.5">{req.services.description}</p>
                  {/if}
                </div>
              </div>
              <span class="inline-flex self-start items-center rounded-full px-2.5 py-0.5 text-xs font-medium {statusBadgeClass(req.status)}">
                {info.label}
              </span>
            </div>

            <!-- Progress -->
            <div class="px-5 py-4 border-t bg-muted/50">
              <div class="flex items-center gap-0">
                <!-- Step 1 -->
                <div class="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div class="h-3 w-3 rounded-full bg-primary ring-4 ring-primary/10"></div>
                  <span class="text-[10px] font-medium text-foreground whitespace-nowrap">Enviada</span>
                </div>
                <!-- Line -->
                <div class="flex-1 h-0.5 mx-1 rounded {req.status !== 'pending' ? 'bg-primary' : 'bg-muted'}"></div>
                <!-- Step 2 -->
                <div class="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div class="h-3 w-3 rounded-full {req.status === 'contacted' || req.status === 'resolved' || req.status === 'baja_solicitada' ? 'bg-primary ring-4 ring-primary/10' : 'bg-muted'}"></div>
                  <span class="text-[10px] font-medium {req.status === 'contacted' || req.status === 'resolved' || req.status === 'baja_solicitada' ? 'text-foreground' : 'text-muted-foreground'} whitespace-nowrap">Contactado</span>
                </div>
                <!-- Line -->
                <div class="flex-1 h-0.5 mx-1 rounded {req.status === 'resolved' || req.status === 'baja_solicitada' ? 'bg-primary' : 'bg-muted'}"></div>
                <!-- Step 3 -->
                <div class="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div class="h-3 w-3 rounded-full {req.status === 'resolved' || req.status === 'baja_solicitada' ? 'bg-green-500 ring-4 ring-green-500/10' : 'bg-muted'}"></div>
                  <span class="text-[10px] font-medium {req.status === 'resolved' || req.status === 'baja_solicitada' ? 'text-foreground' : 'text-muted-foreground'} whitespace-nowrap">Finalizado</span>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="px-5 py-3 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
              <span class="text-muted-foreground">Solicitado el {formatDate(req.created_at)}</span>
              <span class="text-muted-foreground italic">{info.desc}</span>
            </div>

            <!-- Comunicación con NMF -->
            <div class="px-5 py-3 border-t flex items-center justify-between gap-2">
              <button
                onclick={() => toggleThread(req.id)}
                class="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle class="h-3.5 w-3.5" />
                {openThreadId === req.id ? 'Ocultar mensajes' : `Mensajes${thread.length ? ` (${thread.length})` : ''}`}
              </button>

              {#if req.status === 'resolved'}
                <button
                  onclick={() => askRequestBaja(req.id)}
                  disabled={isRequestingBaja === req.id}
                  class="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
                >
                  <XCircle class="h-3.5 w-3.5" />
                  {isRequestingBaja === req.id ? 'Enviando...' : 'Solicitar baja'}
                </button>
              {/if}
            </div>

            {#if openThreadId === req.id}
              <div class="px-5 py-4 border-t bg-muted/50 space-y-3">
                {#if thread.length === 0}
                  <p class="text-xs text-muted-foreground italic">Todavía no hay mensajes en esta solicitud.</p>
                {:else}
                  <div class="space-y-2 max-h-64 overflow-y-auto">
                    {#each thread as msg}
                      <div class="flex {msg.sender_role === 'nmf' ? 'justify-start' : 'justify-end'}">
                        <div class="max-w-[85%] rounded-lg px-3 py-2 text-xs {msg.sender_role === 'nmf' ? 'bg-card border text-foreground' : 'bg-primary/10 text-foreground'}">
                          <p class="font-medium mb-0.5 {msg.sender_role === 'nmf' ? 'text-primary' : 'text-muted-foreground'}">
                            {msg.sender_role === 'nmf' ? 'NMF' : (msg.sender_name || 'Vos')}
                          </p>
                          <p class="leading-relaxed">{msg.body}</p>
                          <p class="text-[10px] text-muted-foreground mt-1">{formatDateTime(msg.created_at)}</p>
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}

                <form onsubmit={(e) => { e.preventDefault(); sendMessage(req.id); }} class="flex gap-2">
                  <input
                    type="text"
                    bind:value={draftMessage}
                    placeholder="Escribí un mensaje para NMF..."
                    class="h-9 flex-1 rounded-md border border-input bg-card px-3 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !draftMessage.trim()}
                    class="inline-flex items-center gap-1.5 h-9 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Send class="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<ConfirmDialog
  bind:open={bajaDialogOpen}
  title="Solicitar baja del servicio"
  description="Le avisamos a NMF para que se contacte con vos y coordine la baja."
  confirmLabel="Solicitar baja"
  destructive
  onConfirm={() => { if (requestIdPendingBaja) requestBaja(requestIdPendingBaja); }}
/>
