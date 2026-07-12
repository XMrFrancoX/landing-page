<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  import { Home, LogOut } from 'lucide-svelte';

  let { children } = $props();
  let isChecking = $state(true);
  let user = $state<any>(null);

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      goto('/login');
    } else {
      user = session.user;
    }
    isChecking = false;

    supabase.auth.onAuthStateChange((_event: string, session: unknown) => {
      if (!session) goto('/login');
    });
  });

  async function handleLogout() {
    await supabase.auth.signOut();
  }
</script>

{#if isChecking}
  <div class="min-h-screen flex items-center justify-center bg-slate-50">
    <div class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
  </div>
{:else}
  <div class="flex flex-col min-h-screen bg-slate-50">
    <!-- Header idéntico al de la landing -->
    <header class="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div class="container mx-auto px-4 h-20 flex items-center justify-between">
        <a href="/cliente" class="flex items-center gap-3">
          <img src="/logo.png" alt="NMF Soluciones Educativas" class="h-12 w-12 object-contain" />
          <div class="flex flex-col">
            <span class="text-2xl font-bold tracking-tight text-primary leading-none">NMF</span>
            <span class="text-xs font-semibold text-secondary-foreground uppercase tracking-widest">Mi Panel</span>
          </div>
        </a>

        <div class="flex items-center gap-4">
          <div class="hidden sm:flex items-center gap-2">
            <div class="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <span class="text-sm text-slate-600">{user?.email}</span>
          </div>
          <a href="/" class="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-white text-slate-500 hover:text-primary hover:border-primary/30 transition-colors" title="Ir al inicio">
            <Home class="h-4 w-4" />
          </a>
          <button onclick={handleLogout} class="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-white text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors" title="Cerrar sesión">
            <LogOut class="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-1 container mx-auto px-4 py-8 max-w-4xl">
      {@render children()}
    </main>

    <!-- Footer -->
    <footer class="border-t bg-white py-6 text-center text-sm text-slate-500">
      © {new Date().getFullYear()} NMF Soluciones Educativas. Todos los derechos reservados.
    </footer>
  </div>
{/if}
