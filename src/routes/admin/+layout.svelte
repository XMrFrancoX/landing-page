<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  import { LayoutDashboard, Users, Package, Building2, LogOut, Menu, X, ChevronRight, Sun, Moon } from 'lucide-svelte';
  import { getInitialTheme, applyTheme, type Theme } from '$lib/theme';

  let { children } = $props();
  let isChecking = $state(true);
  let user = $state<any>(null);
  let sidebarOpen = $state(false);
  let currentPath = $state('');
  let theme = $state<Theme>('light');

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme(theme);
  }

  // Todo /admin es exclusivo de superadmin (NMF): son los únicos que
  // administran el catálogo global de servicios, las solicitudes de
  // todas las escuelas y el alta/baja de escuelas. El rol 'admin' es
  // el admin de UNA escuela puntual y no tiene por qué poder editar/
  // eliminar nada de esto — cae a /cliente como cualquier otro usuario.
  const navItems = [
    { href: '/admin', label: 'Panel Principal', icon: LayoutDashboard },
    { href: '/admin/solicitudes', label: 'Solicitudes', icon: Users },
    { href: '/admin/servicios', label: 'Servicios', icon: Package },
    { href: '/admin/escuelas', label: 'Escuelas', icon: Building2 }
  ];

  onMount(async () => {
    theme = getInitialTheme();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      goto('/login');
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role !== 'superadmin') {
        goto('/cliente');
      } else {
        user = session.user;
      }
    }
    isChecking = false;
    currentPath = window.location.pathname;

    supabase.auth.onAuthStateChange((_event: string, session: unknown) => {
      if (!session) goto('/login');
    });
  });

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  function isActive(href: string) {
    if (href === '/admin') return currentPath === '/admin';
    return currentPath.startsWith(href);
  }
</script>

{#if isChecking}
  <div class="min-h-screen flex items-center justify-center bg-muted">
    <div class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
  </div>
{:else}
  <div class="flex min-h-screen bg-muted">
    <!-- Sidebar Desktop -->
    <aside class="hidden lg:flex w-64 bg-card border-r flex-col fixed h-full z-10">
      <div class="h-20 flex items-center gap-3 px-6 border-b">
        <img src="/logo.png" alt="NMF Soluciones Educativas" class="h-10 w-10 object-contain" />
        <div class="flex flex-col">
          <span class="text-xl font-bold tracking-tight text-primary leading-none">NMF</span>
          <span class="text-[10px] font-semibold text-secondary-foreground uppercase tracking-widest">Admin Panel</span>
        </div>
      </div>

      <nav class="flex-1 py-4 px-3 space-y-1">
        {#each navItems as item}
          {@const Icon = item.icon}
          <a
            href={item.href}
            onclick={() => currentPath = item.href}
            class="flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors
              {isActive(item.href)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-primary hover:bg-muted'}"
          >
            <Icon class="h-5 w-5" />
            {item.label}
          </a>
        {/each}
      </nav>

      <div class="p-4 border-t space-y-3">
        <div class="flex items-center gap-3 px-2">
          <div class="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <span class="text-xs text-muted-foreground truncate">{user?.email}</span>
        </div>
        <button
          onclick={handleLogout}
          class="flex items-center gap-2 w-full px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
        >
          <LogOut class="h-4 w-4" />
          Cerrar Sesión
        </button>
      </div>
    </aside>

    <!-- Mobile Sidebar Overlay -->
    {#if sidebarOpen}
      <div class="fixed inset-0 bg-black/30 z-30 lg:hidden" onclick={() => sidebarOpen = false}></div>
      <aside class="fixed inset-y-0 left-0 w-72 bg-card border-r z-40 flex flex-col lg:hidden">
        <div class="h-16 flex items-center justify-between px-4 border-b">
          <span class="text-lg font-bold text-primary">NMF Admin</span>
          <button onclick={() => sidebarOpen = false} class="text-muted-foreground hover:text-foreground">
            <X class="h-5 w-5" />
          </button>
        </div>
        <nav class="flex-1 py-4 px-3 space-y-1">
          {#each navItems as item}
            {@const Icon = item.icon}
            <a
              href={item.href}
              onclick={() => { currentPath = item.href; sidebarOpen = false; }}
              class="flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors
                {isActive(item.href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-primary hover:bg-muted'}"
            >
              <Icon class="h-5 w-5" />
              {item.label}
            </a>
          {/each}
        </nav>
        <div class="p-4 border-t">
          <button onclick={handleLogout} class="flex items-center gap-2 w-full px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
            <LogOut class="h-4 w-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    {/if}

    <!-- Main Content -->
    <main class="flex-1 lg:ml-64 flex flex-col min-h-screen">
      <!-- Top Bar -->
      <header class="h-16 bg-card border-b sticky top-0 z-20 flex items-center px-4 sm:px-6 gap-4">
        <button onclick={() => sidebarOpen = true} class="lg:hidden text-muted-foreground hover:text-primary">
          <Menu class="h-5 w-5" />
        </button>
        <span class="text-sm font-medium text-muted-foreground">Panel de Administración</span>
        <div class="ml-auto">
          <button
            onclick={toggleTheme}
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground hover:text-primary transition-colors"
            aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
          >
            {#if theme === 'light'}
              <Moon class="h-4 w-4" />
            {:else}
              <Sun class="h-4 w-4" />
            {/if}
          </button>
        </div>
      </header>

      <div class="flex-1 p-4 sm:p-6 lg:p-8">
        {@render children()}
      </div>
    </main>
  </div>
{/if}
