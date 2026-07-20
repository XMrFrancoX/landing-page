<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { Lock, ShieldCheck, CheckCircle2, Sun, Moon } from 'lucide-svelte';
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
    // Si esta contraseña era la temporal que le asignó el superadmin al
    // crear la cuenta, ya la cambió — no hay que volver a pedírsela.
    await supabase.from('profiles').update({ must_change_password: false }).eq('id', session.user.id);
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

<div class="login-page">
  <div class="login-bg">
    <div class="bg-orb orb-1"></div>
    <div class="bg-orb orb-2"></div>
    <div class="bg-orb orb-3"></div>
  </div>

  <button
    type="button"
    onclick={toggleTheme}
    class="theme-toggle-floating"
    aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
    title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
  >
    {#if theme === 'light'}
      <Moon class="h-4 w-4" />
    {:else}
      <Sun class="h-4 w-4" />
    {/if}
  </button>

  <div class="login-container">
    <div class="login-brand">
      <img src="/logo.png" alt="NMF Soluciones Educativas" class="h-9 w-9 object-contain" />
      <div>
        <h1 class="brand-name">NMF</h1>
        <p class="brand-tagline">Seguridad</p>
      </div>
    </div>

    <div class="login-card">
      <div class="login-card-header">
        <h2>Restablecer contraseña</h2>
        <p>Elegí una nueva contraseña para tu cuenta.</p>
      </div>

      {#if linkExpired}
        <div class="alert alert-destructive alert-column">
          <span>El enlace de recuperación es inválido o expiró.</span>
          <a href="/recuperar-password" class="btn-login" style="text-decoration: none; width: auto; padding: 0 1rem; height: 2.25rem;">
            Solicitar nuevo enlace
          </a>
        </div>
      {:else if isSuccess}
        <div class="alert alert-success">
          <CheckCircle2 size={16} />
          <span>¡Contraseña actualizada! Redirigiendo...</span>
        </div>
      {:else}
        <form onsubmit={handleSubmit}>
          {#if errorMessage}
            <div class="alert alert-destructive" style="margin-bottom: 1.25rem;">
              <span>{errorMessage}</span>
            </div>
          {/if}

          <div class="form-group">
            <label for="password" class="input-label">Nueva contraseña</label>
            <div class="input-wrapper">
              <Lock class="input-icon" size={16} />
              <input
                id="password"
                type="password"
                required
                minlength="6"
                bind:value={password}
                placeholder="Mínimo 6 caracteres"
                class="input has-icon"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="confirmPassword" class="input-label">Confirmar contraseña</label>
            <div class="input-wrapper">
              <ShieldCheck class="input-icon" size={16} />
              <input
                id="confirmPassword"
                type="password"
                required
                minlength="6"
                bind:value={confirmPassword}
                placeholder="Repetí la contraseña"
                class="input has-icon"
              />
            </div>
          </div>

          <button type="submit" class="btn-login" disabled={isLoading}>
            {#if isLoading}
              <span class="spinner"></span>
              Guardando...
            {:else}
              Guardar contraseña
            {/if}
          </button>
        </form>
      {/if}
    </div>
  </div>
</div>

<style>
  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    background: var(--color-background);
  }
  .login-bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }
  .bg-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.12;
  }
  .orb-1 { width: 500px; height: 500px; background: radial-gradient(circle, #0a3055, transparent); top: -100px; left: -100px; }
  .orb-2 { width: 400px; height: 400px; background: radial-gradient(circle, #f59d1e, transparent); bottom: -80px; right: -80px; }
  .orb-3 { width: 300px; height: 300px; background: radial-gradient(circle, #fbb117, transparent); top: 50%; left: 60%; }

  .theme-toggle-floating {
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 999px;
    background: var(--color-card);
    border: 1px solid var(--color-border);
    color: var(--color-muted-foreground);
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    transition: color 0.15s ease, border-color 0.15s ease;
  }
  .theme-toggle-floating:hover {
    color: var(--color-primary);
    border-color: var(--color-primary);
  }

  .login-container {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 400px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .login-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .brand-name {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--color-foreground);
    line-height: 1;
  }
  .brand-tagline {
    font-size: 0.75rem;
    color: var(--color-muted-foreground);
    margin-top: 0.2rem;
  }

  .login-card {
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    padding: 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .login-card-header h2 {
    font-size: 1.375rem;
    font-weight: 800;
    color: var(--color-foreground);
  }
  .login-card-header p {
    color: var(--color-muted-foreground);
    font-size: 0.9375rem;
    margin-top: 0.25rem;
  }

  .alert {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-radius: var(--radius-md);
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
  }
  .alert-column {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
    gap: 0.75rem;
  }
  .alert-destructive {
    background: color-mix(in srgb, var(--color-destructive) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-destructive) 30%, transparent);
    color: var(--color-destructive);
  }
  .alert-success {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #16a34a;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }
  .input-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-foreground);
  }
  .input-wrapper {
    position: relative;
  }
  .input-wrapper :global(.input-icon) {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-muted-foreground);
    pointer-events: none;
  }
  .input {
    width: 100%;
    height: 2.75rem;
    padding: 0 0.875rem;
    background: transparent;
    border: 1px solid var(--color-input);
    border-radius: var(--radius-md);
    color: var(--color-foreground);
    font-size: 0.9375rem;
    outline: none;
    transition: border-color 0.15s ease;
  }
  .input:focus { border-color: var(--color-primary); }
  .input.has-icon { padding-left: 2.5rem; }

  .btn-login {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    height: 2.75rem;
    border-radius: var(--radius-md);
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    font-size: 0.9375rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: opacity 0.15s ease;
  }
  .btn-login:hover:not(:disabled) { opacity: 0.92; }
  .btn-login:disabled { opacity: 0.7; cursor: not-allowed; }
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
