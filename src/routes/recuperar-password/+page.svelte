<script lang="ts">
  import { enhance } from '$app/forms';
  import { Mail, Send, CheckCircle2, Sun, Moon, ArrowLeft } from 'lucide-svelte';
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
        <p class="brand-tagline">Recuperación de Acceso</p>
      </div>
    </div>

    <div class="login-card">
      <div class="login-card-header">
        <h2>Restablecer contraseña</h2>
        <p>Ingresá tu correo y te enviamos un enlace para restablecerla.</p>
      </div>

      {#if form?.error}
        <div class="alert alert-destructive">
          <span>{form.error}</span>
        </div>
      {:else if form?.success}
        <div class="alert alert-success">
          <CheckCircle2 size={16} />
          <span>Si el correo existe en nuestro sistema, vas a recibir un enlace de recuperación en los próximos minutos.</span>
        </div>
      {/if}

      {#if !form?.success}
        <form
          method="POST"
          use:enhance={() => {
            isLoading = true;
            return async ({ update }) => {
              isLoading = false;
              await update();
            };
          }}
        >
          <div class="form-group">
            <label for="email" class="input-label">Correo electrónico</label>
            <div class="input-wrapper">
              <Mail class="input-icon" size={16} />
              <input
                id="email"
                name="email"
                type="email"
                required
                bind:value={email}
                placeholder="correo@ejemplo.com"
                class="input has-icon"
                autocomplete="email"
              />
            </div>
          </div>

          <button type="submit" class="btn-login" disabled={isLoading}>
            {#if isLoading}
              <span class="spinner"></span>
              Enviando...
            {:else}
              <Send size={16} />
              Enviar enlace
            {/if}
          </button>
        </form>
      {/if}

      <p class="login-footer">
        <a href="/login"><ArrowLeft size={12} /> Volver al inicio de sesión</a>
      </p>
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
    max-width: 420px;
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
    font-family: 'Plus Jakarta Sans', sans-serif;
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
    border-radius: 24px;
    padding: 2rem;
    box-shadow: 0 8px 32px rgba(15, 23, 42, 0.14);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  :global(.dark) .login-card {
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  }
  .login-card-header h2 {
    font-family: 'Plus Jakarta Sans', sans-serif;
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
    border-radius: 10px;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
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
    border-radius: 10px;
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
    border-radius: 10px;
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    font-size: 0.9375rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: background 0.15s ease, box-shadow 0.15s ease;
  }
  .btn-login:hover:not(:disabled) {
    background: #082846;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  }
  :global(.dark) .btn-login:hover:not(:disabled) {
    background: #e08c0a;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  }
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
</style>
