<script lang="ts">
  import { enhance } from '$app/forms';
  import { ArrowLeft, CheckCircle2, ChevronRight, Sun, Moon } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { getInitialTheme, applyTheme, type Theme } from '$lib/theme';

  let { data, form } = $props();

  let theme = $state<Theme>('light');
  onMount(() => { theme = getInitialTheme(); });
  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme(theme);
  }

  let isLoading = $state(false);
  let isSuccess = $state(false);
</script>

<div class="flex flex-col min-h-screen">
  <!-- Header -->
  <header class="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
    <div class="container mx-auto px-4 h-20 flex items-center justify-between">
      <a href="/" class="flex items-center gap-3">
        <img src="/logo.png" alt="NMF Soluciones Educativas" class="h-12 w-12 object-contain" />
        <div class="flex flex-col">
          <span class="text-2xl font-bold tracking-tight text-primary leading-none">NMF</span>
          <span class="text-xs font-semibold text-secondary-foreground uppercase tracking-widest">Soluciones Educativas</span>
        </div>
      </a>
      <div class="flex items-center gap-4">
        <button
          onclick={toggleTheme}
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm hover:text-primary transition-colors"
          aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
        >
          {#if theme === 'light'}
            <Moon class="h-4 w-4" />
          {:else}
            <Sun class="h-4 w-4" />
          {/if}
        </button>
        <a href="/#servicios" class="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft class="h-4 w-4" />
          Volver a Servicios
        </a>
      </div>
    </div>
  </header>

  <main class="flex-1 bg-muted py-12">
    <div class="container mx-auto px-4 max-w-2xl">

      {#if isSuccess}
        <div class="rounded-2xl border bg-card p-8 md:p-12 shadow-sm text-center">
          <div class="w-16 h-16 bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 class="w-8 h-8" />
          </div>
          <h2 class="text-2xl font-bold tracking-tight text-foreground mb-3">¡Solicitud Enviada!</h2>
          <p class="text-muted-foreground mb-8 max-w-md mx-auto">
            Gracias por tu interés en <strong>{data.service.name}</strong>. Nuestro equipo comercial se comunicará contigo a la brevedad.
          </p>
          <a href="/" class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            Volver al Inicio
          </a>
        </div>
      {:else}
        <!-- Plan summary card -->
        <div class="rounded-2xl border bg-card p-6 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div class="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Plan seleccionado</div>
            <h2 class="text-xl font-bold text-foreground">{data.service.name}</h2>
            <p class="text-sm text-muted-foreground mt-0.5">{data.service.description}</p>
          </div>
          <div class="text-2xl font-bold text-primary whitespace-nowrap">{data.service.price}</div>
        </div>

        <!-- Form card -->
        <div class="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div class="p-6 border-b">
            <h1 class="text-xl font-bold tracking-tight text-foreground">Solicitar Contratación</h1>
            <p class="text-sm text-muted-foreground mt-1">Completá el formulario y nuestro equipo te contactará.</p>
          </div>
          
          <div class="p-6">
            {#if form?.error}
              <div class="mb-6 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded-md text-sm border border-red-100 dark:border-red-900">
                {form.error}
              </div>
            {/if}

            <form
              method="POST"
              class="space-y-5"
              use:enhance={() => {
                isLoading = true;
                return async ({ result, update }) => {
                  isLoading = false;
                  if (result.type === 'success') {
                    isSuccess = true;
                  } else {
                    await update();
                  }
                };
              }}
            >
              <input type="hidden" name="service_id" value={data.service.id} />
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div class="space-y-2">
                  <label for="name" class="text-sm font-medium text-foreground">Nombre / Institución *</label>
                  <input id="name" name="contact_name" type="text" required class="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Ej. Colegio San José" />
                </div>
                <div class="space-y-2">
                  <label for="email" class="text-sm font-medium text-foreground">Correo Electrónico *</label>
                  <input id="email" name="contact_email" type="email" required class="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="correo@institucion.edu" />
                </div>
              </div>

              <div class="space-y-2">
                <label for="phone" class="text-sm font-medium text-foreground">Teléfono de Contacto</label>
                <input id="phone" name="contact_phone" type="tel" class="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="+54 9 11 1234-5678" />
              </div>

              <div class="space-y-2">
                <label for="message" class="text-sm font-medium text-foreground">Mensaje Adicional</label>
                <textarea id="message" name="message" rows="4" class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Cuénntanos cuántos alumnos o dispositivos manejan..."></textarea>
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
              <p class="text-xs text-center text-muted-foreground">Tus datos están seguros. Un miembro de NMF se pondrá en contacto pronto.</p>
            </form>
          </div>
        </div>
      {/if}
    </div>
  </main>

  <!-- Footer -->
  <footer class="border-t bg-card py-6 text-center text-sm text-muted-foreground">
    © {new Date().getFullYear()} NMF Soluciones Educativas. Todos los derechos reservados.
  </footer>
</div>
