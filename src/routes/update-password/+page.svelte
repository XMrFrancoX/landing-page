<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { KeyRound, ArrowLeft, Sun, Moon } from 'lucide-svelte';
  import { getInitialTheme, applyTheme, type Theme } from '$lib/theme';

  let password = $state('');
  let confirmPassword = $state('');
  let isLoading = $state(false);
  let errorMessage = $state('');
  let isSuccess = $state(false);
  let linkExpired = $state(false);

  let theme = $state<Theme>('light');
  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme(theme);
  }

  onMount(async () => {
    theme = getInitialTheme();

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        linkExpired = true;
        return;
      }
      url.searchParams.delete('code');
      window.history.replaceState({}, '', url.toString());
    }

    // Fallback para implicit flow (#access_token=...) si el cliente no usó PKCE.
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.substring(1));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) {
          linkExpired = true;
          return;
        }
        window.location.hash = '';
      }
    }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    errorMessage = '';

    if (password.length < 6) {
      errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }
    if (password !== confirmPassword) {
      errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    isLoading = true;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      isLoading = false;
      linkExpired = true;
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    isLoading = false;

    if (error) {
      errorMessage = 'No se pudo actualizar la contraseña. Verificá que el enlace no haya expirado.';
      return;
    }

    isSuccess = true;
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    setTimeout(() => {
      window.location.href = profile?.role === 'superadmin' ? '/admin' : '/cliente';
    }, 1500);
  }
</script>

<svelte:head>
  <title>Restablecer Contraseña — NMF Soluciones Educativas</title>
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
          <h1 class="text-2xl font-extrabold tracking-tight text-foreground">Restablecer Contraseña</h1>
          <p class="mt-1.5 text-sm text-muted-foreground">Elegí una nueva contraseña para tu cuenta.</p>
        </div>

        {#if linkExpired}
          <div class="p-3 rounded-md bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-900 text-center space-y-3">
            <p>El enlace de recuperación es inválido o expiró.</p>
            <a href="/recuperar-password" class="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
              Solicitar nuevo enlace
            </a>
          </div>
        {:else if isSuccess}
          <div class="p-3 rounded-md bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 text-sm border border-green-100 dark:border-green-900 text-center">
            ¡Contraseña actualizada! Redirigiendo...
          </div>
        {:else}
          <form class="space-y-5" onsubmit={handleSubmit}>
            {#if errorMessage}
              <div class="p-3 rounded-md bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-900 text-center">
                {errorMessage}
              </div>
            {/if}

            <div class="space-y-2">
              <label for="password" class="text-sm font-medium text-foreground">Nueva contraseña</label>
              <input
                id="password"
                type="password"
                required
                minlength="6"
                bind:value={password}
                placeholder="Mínimo 6 caracteres"
                class="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div class="space-y-2">
              <label for="confirmPassword" class="text-sm font-medium text-foreground">Confirmar contraseña</label>
              <input
                id="confirmPassword"
                type="password"
                required
                minlength="6"
                bind:value={confirmPassword}
                placeholder="Repetí la contraseña"
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
                Guardando...
              {:else}
                <KeyRound class="h-4 w-4" />
                Guardar Contraseña
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
