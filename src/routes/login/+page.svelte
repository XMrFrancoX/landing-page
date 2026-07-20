<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { Mail, Lock, Eye, EyeOff, LogIn, Sun, Moon, ArrowLeft } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { getInitialTheme, applyTheme, type Theme } from '$lib/theme';

  let theme = $state<Theme>('light');
  onMount(() => { theme = getInitialTheme(); });
  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    applyTheme(theme);
  }

  let email = $state('');
  let password = $state('');
  let showPassword = $state(false);
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
          .select('role, must_change_password')
          .eq('id', data.user.id)
          .single();

        if (profile?.must_change_password) {
          goto('/update-password');
        } else if (profile?.role === 'superadmin') {
          goto('/admin');
        } else {
          goto('/cliente');
        }
      }
    }
  }
</script>

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
        <p class="brand-tagline">Soluciones Educativas</p>
      </div>
    </div>

    <div class="login-card">
      <div class="login-card-header">
        <h2>{isRegister ? 'Crear Cuenta' : 'Bienvenido de vuelta'}</h2>
        <p>{isRegister ? 'Registrate para acceder a tu panel de cliente.' : 'Ingresá tus credenciales para continuar.'}</p>
      </div>

      {#if errorMessage}
        <div class="alert alert-destructive">
          <span>{errorMessage}</span>
        </div>
      {/if}

      <form class="flex flex-col gap-5" onsubmit={handleSubmit}>
        <div class="form-group">
          <label for="email" class="input-label">Correo electrónico</label>
          <div class="input-wrapper">
            <Mail class="input-icon" size={16} />
            <input
              id="email"
              type="email"
              required
              bind:value={email}
              placeholder="correo@ejemplo.com"
              class="input has-icon"
              autocomplete="email"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="password" class="input-label">Contraseña</label>
          <div class="input-wrapper">
            <Lock class="input-icon" size={16} />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              bind:value={password}
              placeholder="••••••••"
              class="input has-icon has-icon-right"
              autocomplete={isRegister ? 'new-password' : 'current-password'}
            />
            <button
              type="button"
              class="input-icon-right"
              onclick={() => (showPassword = !showPassword)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {#if showPassword}
                <EyeOff size={16} />
              {:else}
                <Eye size={16} />
              {/if}
            </button>
          </div>
          {#if !isRegister}
            <div class="forgot-password-row">
              <a href="/recuperar-password" class="forgot-password-link">¿Olvidaste tu contraseña?</a>
            </div>
          {/if}
        </div>

        <button type="submit" class="btn btn-primary btn-login" disabled={isLoading}>
          {#if isLoading}
            <span class="spinner"></span>
            {isRegister ? 'Creando cuenta...' : 'Verificando...'}
          {:else}
            <LogIn size={16} />
            {isRegister ? 'Crear Cuenta' : 'Ingresar'}
          {/if}
        </button>
      </form>

      <button
        type="button"
        onclick={() => { isRegister = !isRegister; errorMessage = ''; }}
        class="toggle-register-link"
      >
        {isRegister ? '¿Ya tenés cuenta? Iniciá sesión' : '¿No tenés cuenta? Registrate como cliente'}
      </button>

      <p class="login-footer">
        <a href="/"><ArrowLeft size={12} /> Volver al inicio</a>
      </p>
    </div>

    <p class="login-version">© {new Date().getFullYear()} NMF Soluciones Educativas</p>
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
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--color-muted-foreground);
    margin-top: 0.15rem;
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
  .alert-destructive {
    background: color-mix(in srgb, var(--color-destructive) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-destructive) 30%, transparent);
    color: var(--color-destructive);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
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
  .input-icon-right {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--color-muted-foreground);
    cursor: pointer;
    padding: 0;
    display: flex;
    transition: color 0.15s ease;
  }
  .input-icon-right:hover { color: var(--color-foreground); }
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
  .input.has-icon-right { padding-right: 2.5rem; }

  .forgot-password-row {
    text-align: right;
  }
  .forgot-password-link {
    font-size: 0.8125rem;
    color: var(--color-muted-foreground);
    text-decoration: none;
  }
  .forgot-password-link:hover { color: var(--color-primary); }

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

  .toggle-register-link {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-primary);
    cursor: pointer;
    text-align: center;
  }
  .toggle-register-link:hover { opacity: 0.85; }

  .login-footer {
    font-size: 0.8125rem;
    text-align: center;
    margin: 0;
  }
  .login-footer a {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--color-muted-foreground);
    text-decoration: none;
  }
  .login-footer a:hover { color: var(--color-foreground); }

  .login-version {
    text-align: center;
    font-size: 0.7rem;
    color: var(--color-muted-foreground);
    opacity: 0.6;
  }
</style>
