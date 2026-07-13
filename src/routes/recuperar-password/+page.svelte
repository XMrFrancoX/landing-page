<script lang="ts">
  import { enhance } from '$app/forms';
  import { Mail, ArrowLeft, CheckCircle2, Sun, Moon } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { getInitialTheme, applyTheme, type Theme } from '$lib/theme';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();

  let email = $state('');
  let isLoading = $state(false);

  let theme = $state<Theme>('light');
  onMount(() => { theme = getInitialTheme(); });
  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme(theme);
  }
</script>

<svelte:head>
  <title>Recuperar Contraseña — NMF Soluciones Educativas</title>
</svelte:head>

<div class="flex flex-col min-h-screen bg-muted">
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
        <a href="/login" class="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft class="h-4 w-4" />
          Volver a iniciar sesión
        </a>
      </div>
    </div>
  </header>

  <main class="flex-1 flex items-center justify-center px-4 py-16">
    <div class="w-full max-w-sm">
      <div class="rounded-2xl border bg-card p-8 shadow-sm">
        <div class="text-center mb-6">
          <h1 class="text-2xl font-extrabold tracking-tight text-foreground">Recuperar Contraseña</h1>
          <p class="mt-1.5 text-sm text-muted-foreground">Ingresá tu correo y te enviamos un enlace para restablecerla.</p>
        </div>

        {#if form?.error}
          <div class="mb-5 p-3 rounded-md bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-900 text-center">
            {form.error}
          </div>
        {/if}

        {#if form?.success}
          <div class="p-4 rounded-md bg-green-50 dark:bg-green-950 border border-green-100 dark:border-green-900 text-center space-y-1.5">
            <CheckCircle2 class="h-6 w-6 text-green-600 dark:text-green-400 mx-auto" />
            <p class="text-sm font-medium text-green-800 dark:text-green-300">Enlace enviado</p>
            <p class="text-xs text-green-700 dark:text-green-400">Si el correo existe en nuestro sistema, vas a recibir un enlace para restablecer tu contraseña en los próximos minutos.</p>
          </div>
        {:else}
          <form
            method="POST"
            class="space-y-5"
            use:enhance={() => {
              isLoading = true;
              return async ({ update }) => {
                isLoading = false;
                await update();
              };
            }}
          >
            <div class="space-y-2">
              <label for="email" class="text-sm font-medium text-foreground">Correo electrónico</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                bind:value={email}
                placeholder="correo@ejemplo.com"
                class="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              class="inline-flex w-full h-11 items-center justify-center gap-2 rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
            >
              {#if isLoading}
                <div class="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Enviando...
              {:else}
                <Mail class="h-4 w-4" />
                Enviar Enlace
              {/if}
            </button>
          </form>
        {/if}
      </div>
    </div>
  </main>

  <footer class="border-t bg-card py-6 text-center text-sm text-muted-foreground">
    © {new Date().getFullYear()} NMF Soluciones Educativas. Todos los derechos reservados.
  </footer>
</div>
