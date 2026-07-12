<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { KeyRound, ArrowLeft } from 'lucide-svelte';

  let email = $state('');
  let password = $state('');
  let errorMessage = $state('');
  let isLoading = $state(false);
  let isRegister = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    isLoading = true;
    errorMessage = '';

    if (isRegister) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: 'client' } }
      });
      isLoading = false;
      if (error) {
        errorMessage = error.message;
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (!loginError) {
          goto('/cliente');
        } else {
          errorMessage = 'Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.';
          isRegister = false;
        }
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      isLoading = false;
      if (error) {
        errorMessage = 'Credenciales incorrectas. Verifica tu correo y contraseña.';
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile?.role === 'superadmin') {
          goto('/admin');
        } else {
          goto('/cliente');
        }
      }
    }
  }
</script>

<div class="flex flex-col min-h-screen bg-slate-50">
  <!-- Mismo Header que la landing -->
  <header class="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
    <div class="container mx-auto px-4 h-20 flex items-center justify-between">
      <a href="/" class="flex items-center gap-3">
        <img src="/logo.png" alt="NMF Soluciones Educativas" class="h-12 w-12 object-contain" />
        <div class="flex flex-col">
          <span class="text-2xl font-bold tracking-tight text-primary leading-none">NMF</span>
          <span class="text-xs font-semibold text-secondary-foreground uppercase tracking-widest">Soluciones Educativas</span>
        </div>
      </a>
      <a href="/" class="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary transition-colors">
        <ArrowLeft class="h-4 w-4" />
        Volver al inicio
      </a>
    </div>
  </header>

  <!-- Login centrado -->
  <main class="flex-1 flex items-center justify-center px-4 py-16">
    <div class="w-full max-w-sm">
      <div class="rounded-2xl border bg-white p-8 shadow-sm">
        <div class="text-center mb-6">
          <h1 class="text-2xl font-extrabold tracking-tight text-slate-900">
            {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h1>
          <p class="mt-1.5 text-sm text-slate-600">
            {isRegister ? 'Registrate para acceder a tu panel de cliente.' : 'Ingresá tus credenciales para continuar.'}
          </p>
        </div>

        <form class="space-y-5" onsubmit={handleSubmit}>
          {#if errorMessage}
            <div class="p-3 rounded-md bg-red-50 text-red-600 text-sm border border-red-100 text-center">
              {errorMessage}
            </div>
          {/if}

          <div class="space-y-2">
            <label for="email" class="text-sm font-medium text-slate-900">Correo electrónico</label>
            <input
              id="email"
              type="email"
              required
              bind:value={email}
              placeholder="correo@ejemplo.com"
              class="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div class="space-y-2">
            <label for="password" class="text-sm font-medium text-slate-900">Contraseña</label>
            <input
              id="password"
              type="password"
              required
              bind:value={password}
              placeholder="••••••••"
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
              {isRegister ? 'Creando cuenta...' : 'Verificando...'}
            {:else}
              <KeyRound class="h-4 w-4" />
              {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
            {/if}
          </button>
        </form>

        <div class="mt-6 text-center space-y-2">
          <button
            type="button"
            onclick={() => { isRegister = !isRegister; errorMessage = ''; }}
            class="block w-full text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {isRegister ? '¿Ya tenés cuenta? Iniciá sesión' : '¿No tenés cuenta? Registrate como cliente'}
          </button>
          {#if !isRegister}
            <a href="/recuperar-password" class="block text-sm text-slate-500 hover:text-primary transition-colors">
              ¿Olvidaste tu contraseña?
            </a>
          {/if}
        </div>
      </div>
    </div>
  </main>

  <!-- Footer simple -->
  <footer class="border-t bg-white py-6 text-center text-sm text-slate-500">
    © {new Date().getFullYear()} NMF Soluciones Educativas. Todos los derechos reservados.
  </footer>
</div>
