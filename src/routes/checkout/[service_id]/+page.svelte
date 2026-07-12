<script lang="ts">
  import { supabase, landing } from '$lib/supabaseClient';
  import { ArrowLeft, CheckCircle2, ChevronRight } from 'lucide-svelte';

  let { data } = $props();
  
  let contact_name = $state('');
  let contact_email = $state('');
  let contact_phone = $state('');
  let message = $state('');
  
  let isLoading = $state(false);
  let isSuccess = $state(false);
  let errorMessage = $state('');

  async function handleSubmit(event: Event) {
    event.preventDefault();
    isLoading = true;
    errorMessage = '';

    // Si hay una sesión activa, vinculamos la solicitud a esa cuenta y a
    // su escuela — así un admin/director puede ver en /cliente todo lo
    // que contrató su institución, no solo lo que él mismo pidió.
    let user_id: string | null = null;
    let school_id: string | null = null;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      user_id = session.user.id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', session.user.id)
        .single();
      school_id = profile?.school_id ?? null;
    }

    const { data: inserted, error } = await landing
      .from('requests')
      .insert([
        {
          service_id: data.service.id,
          user_id,
          school_id,
          contact_name,
          contact_email,
          contact_phone,
          message
        }
      ])
      .select('id')
      .single();

    isLoading = false;

    if (error) {
      console.error(error);
      errorMessage = 'Hubo un error al enviar tu solicitud. Intenta nuevamente o contáctanos por teléfono.';
    } else {
      isSuccess = true;
      // Avisa a NMF por mail. Fire-and-forget: si falla, no debe romper
      // la confirmación que ya vio el usuario.
      if (inserted?.id) {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'solicitud', requestId: inserted.id })
        }).catch(() => {});
      }
    }
  }
</script>

<div class="flex flex-col min-h-screen">
  <!-- Header -->
  <header class="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
    <div class="container mx-auto px-4 h-20 flex items-center justify-between">
      <a href="/" class="flex items-center gap-3">
        <img src="/logo.png" alt="NMF Soluciones Educativas" class="h-12 w-12 object-contain" />
        <div class="flex flex-col">
          <span class="text-2xl font-bold tracking-tight text-primary leading-none">NMF</span>
          <span class="text-xs font-semibold text-secondary-foreground uppercase tracking-widest">Soluciones Educativas</span>
        </div>
      </a>
      <a href="/#servicios" class="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary transition-colors">
        <ArrowLeft class="h-4 w-4" />
        Volver a Servicios
      </a>
    </div>
  </header>

  <main class="flex-1 bg-slate-50 py-12">
    <div class="container mx-auto px-4 max-w-2xl">

      {#if isSuccess}
        <div class="rounded-2xl border bg-white p-8 md:p-12 shadow-sm text-center">
          <div class="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 class="w-8 h-8" />
          </div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900 mb-3">¡Solicitud Enviada!</h2>
          <p class="text-slate-600 mb-8 max-w-md mx-auto">
            Gracias por tu interés en <strong>{data.service.name}</strong>. Nuestro equipo comercial se comunicará contigo a la brevedad.
          </p>
          <a href="/" class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            Volver al Inicio
          </a>
        </div>
      {:else}
        <!-- Plan summary card -->
        <div class="rounded-2xl border bg-white p-6 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div class="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Plan seleccionado</div>
            <h2 class="text-xl font-bold text-slate-900">{data.service.name}</h2>
            <p class="text-sm text-slate-600 mt-0.5">{data.service.description}</p>
          </div>
          <div class="text-2xl font-bold text-primary whitespace-nowrap">{data.service.price}</div>
        </div>

        <!-- Form card -->
        <div class="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div class="p-6 border-b">
            <h1 class="text-xl font-bold tracking-tight text-slate-900">Solicitar Contratación</h1>
            <p class="text-sm text-slate-600 mt-1">Completá el formulario y nuestro equipo te contactará.</p>
          </div>
          
          <div class="p-6">
            {#if errorMessage}
              <div class="mb-6 p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-100">
                {errorMessage}
              </div>
            {/if}

            <form onsubmit={handleSubmit} class="space-y-5">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div class="space-y-2">
                  <label for="name" class="text-sm font-medium text-slate-900">Nombre / Institución *</label>
                  <input id="name" type="text" required bind:value={contact_name} class="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Ej. Colegio San José" />
                </div>
                <div class="space-y-2">
                  <label for="email" class="text-sm font-medium text-slate-900">Correo Electrónico *</label>
                  <input id="email" type="email" required bind:value={contact_email} class="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="correo@institucion.edu" />
                </div>
              </div>

              <div class="space-y-2">
                <label for="phone" class="text-sm font-medium text-slate-900">Teléfono de Contacto</label>
                <input id="phone" type="tel" bind:value={contact_phone} class="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="+54 9 11 1234-5678" />
              </div>

              <div class="space-y-2">
                <label for="message" class="text-sm font-medium text-slate-900">Mensaje Adicional</label>
                <textarea id="message" rows="4" bind:value={message} class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Cuénntanos cuántos alumnos o dispositivos manejan..."></textarea>
              </div>

              <button type="submit" disabled={isLoading} class="inline-flex w-full h-11 items-center justify-center gap-2 rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none">
                {#if isLoading}
                  <div class="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Enviando solicitud...
                {:else}
                  Enviar Solicitud
                  <ChevronRight class="h-4 w-4" />
                {/if}
              </button>
              <p class="text-xs text-center text-slate-500">Tus datos están seguros. Un miembro de NMF se pondrá en contacto pronto.</p>
            </form>
          </div>
        </div>
      {/if}
    </div>
  </main>

  <!-- Footer -->
  <footer class="border-t bg-white py-6 text-center text-sm text-slate-500">
    © {new Date().getFullYear()} NMF Soluciones Educativas. Todos los derechos reservados.
  </footer>
</div>
