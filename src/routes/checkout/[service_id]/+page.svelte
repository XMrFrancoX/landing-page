<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { ArrowLeft, CheckCircle2 } from 'lucide-svelte';

  let { data } = $props();
  
  // Datos del formulario
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

    const { error } = await supabase
      .from('requests')
      .insert([
        {
          service_id: data.service.id,
          contact_name,
          contact_email,
          contact_phone,
          message
        }
      ]);

    isLoading = false;

    if (error) {
      console.error(error);
      errorMessage = 'Hubo un error al enviar tu solicitud. Intenta nuevamente o contáctanos por teléfono.';
    } else {
      isSuccess = true;
    }
  }
</script>

<div class="min-h-screen bg-slate-50 py-12">
  <div class="container mx-auto px-4 max-w-3xl">
    <a href="/#servicios" class="inline-flex items-center text-sm font-medium text-slate-500 hover:text-primary mb-8 transition-colors">
      <ArrowLeft class="w-4 h-4 mr-2" />
      Volver a Servicios
    </a>

    {#if isSuccess}
      <div class="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-green-100 text-center">
        <div class="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 class="w-8 h-8" />
        </div>
        <h2 class="text-3xl font-bold text-slate-900 mb-4">¡Solicitud Enviada!</h2>
        <p class="text-lg text-slate-600 mb-8">
          Gracias por tu interés en <strong>{data.service.name}</strong>. Nuestro equipo comercial se comunicará contigo a la brevedad al correo o teléfono proporcionado para avanzar con la contratación.
        </p>
        <a href="/" class="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-white shadow transition-colors hover:bg-primary/90">
          Volver al Inicio
        </a>
      </div>
    {:else}
      <div class="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div class="bg-primary p-8 text-white">
          <h1 class="text-3xl font-bold mb-2">Solicitar Contratación</h1>
          <p class="text-primary-foreground/80">Estás a un paso de optimizar tu institución con <strong>{data.service.name}</strong>.</p>
        </div>
        
        <div class="p-8">
          <div class="flex items-center justify-between mb-8 pb-8 border-b">
            <div>
              <h3 class="text-lg font-semibold text-slate-900">Resumen del Plan</h3>
              <p class="text-slate-600">{data.service.description}</p>
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold text-primary">{data.service.price}</div>
            </div>
          </div>

          {#if errorMessage}
            <div class="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
              {errorMessage}
            </div>
          {/if}

          <form onsubmit={handleSubmit} class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label for="name" class="text-sm font-medium text-slate-900">Nombre Completo Institución/Contacto *</label>
                <input id="name" type="text" required bind:value={contact_name} class="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" placeholder="Ej. Colegio San José / Juan Pérez" />
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
              <textarea id="message" rows="4" bind:value={message} class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Cuéntanos cuántos alumnos o dispositivos manejan, o cualquier duda particular..."></textarea>
            </div>

            <button type="submit" disabled={isLoading} class="inline-flex w-full h-12 items-center justify-center rounded-md bg-accent px-8 text-sm font-medium text-white shadow transition-colors hover:bg-accent/90 disabled:opacity-50 disabled:pointer-events-none">
              {#if isLoading}
                Enviando solicitud...
              {:else}
                Enviar Solicitud de Contratación
              {/if}
            </button>
            <p class="text-xs text-center text-slate-500">Tus datos están seguros. Un miembro de NMF se pondrá en contacto pronto.</p>
          </form>
        </div>
      </div>
    {/if}
  </div>
</div>
