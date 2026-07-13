<script lang="ts">
  import { onMount } from 'svelte';
  import { landing } from '$lib/supabaseClient';
  import { Plus, Pencil, Trash2, X, Package, RefreshCcw, ToggleLeft, ToggleRight, Check } from 'lucide-svelte';
  import { getServiceIcon, SERVICE_ICON_OPTIONS } from '$lib/serviceIcons';

  let services = $state<any[]>([]);
  let isLoading = $state(true);
  let showForm = $state(false);
  let editingService = $state<any>(null);
  let deleteConfirmId = $state<string | null>(null);
  let isSaving = $state(false);

  // Form fields
  let formName = $state('');
  let formDescription = $state('');
  let formPrice = $state('');
  let formFeatures = $state('');
  let formIsActive = $state(true);
  let formIcon = $state('Package');
  let FormIconPreview = $derived(getServiceIcon(formIcon));

  onMount(async () => {
    await fetchServices();
  });

  async function fetchServices() {
    isLoading = true;
    const { data, error } = await landing
      .from('services')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) services = data;
    isLoading = false;
  }

  function openAddForm() {
    editingService = null;
    formName = '';
    formDescription = '';
    formPrice = '';
    formFeatures = '';
    formIsActive = true;
    formIcon = 'Package';
    showForm = true;
  }

  function openEditForm(service: any) {
    editingService = service;
    formName = service.name || '';
    formDescription = service.description || '';
    formPrice = service.price?.toString() || '';
    formFeatures = Array.isArray(service.features) ? service.features.join(', ') : '';
    formIsActive = service.is_active ?? true;
    formIcon = service.icon || 'Package';
    showForm = true;
  }

  function closeForm() {
    showForm = false;
    editingService = null;
  }

  async function handleSubmit() {
    isSaving = true;

    const featuresArray = formFeatures
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const serviceData = {
      name: formName,
      description: formDescription,
      price: formPrice,
      features: featuresArray,
      is_active: formIsActive,
      icon: formIcon,
    };

    if (editingService) {
      const { error } = await landing
        .from('services')
        .update(serviceData)
        .eq('id', editingService.id);
      if (!error) {
        closeForm();
        await fetchServices();
      }
    } else {
      const { error } = await landing
        .from('services')
        .insert(serviceData);
      if (!error) {
        closeForm();
        await fetchServices();
      }
    }
    isSaving = false;
  }

  async function deleteService(id: string) {
    const { error } = await landing.from('services').delete().eq('id', id);
    if (!error) {
      deleteConfirmId = null;
      await fetchServices();
    }
  }

  async function toggleActive(service: any) {
    const { error } = await landing
      .from('services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id);
    if (!error) await fetchServices();
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-foreground">Servicios</h1>
      <p class="text-sm text-muted-foreground mt-1">Administra los servicios que ofrece NMF Soluciones Educativas.</p>
    </div>
    <div class="flex items-center gap-2">
      <button
        onclick={fetchServices}
        class="inline-flex items-center gap-2 h-10 rounded-md border border-border bg-card px-4 text-sm font-medium text-muted-foreground shadow-sm hover:bg-muted transition-colors"
      >
        <RefreshCcw class="h-4 w-4" />
        Actualizar
      </button>
      <button
        onclick={openAddForm}
        class="inline-flex items-center gap-2 h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
      >
        <Plus class="h-4 w-4" />
        Agregar Servicio
      </button>
    </div>
  </div>

  <!-- Services Grid -->
  {#if isLoading}
    <div class="rounded-2xl border bg-card shadow-sm p-12 text-center text-muted-foreground text-sm">
      <div class="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
      Cargando servicios...
    </div>
  {:else if services.length === 0}
    <div class="rounded-2xl border bg-card shadow-sm p-12 text-center">
      <div class="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
        <Package class="h-7 w-7" />
      </div>
      <h3 class="text-sm font-semibold text-foreground mb-1">No hay servicios</h3>
      <p class="text-sm text-muted-foreground mb-4">Comienza agregando tu primer servicio.</p>
      <button
        onclick={openAddForm}
        class="inline-flex items-center gap-2 h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
      >
        <Plus class="h-4 w-4" />
        Agregar Servicio
      </button>
    </div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {#each services as service}
        {@const ServiceIcon = getServiceIcon(service.icon)}
        <div class="rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col">
          <!-- Card Header -->
          <div class="p-5 flex-1">
            <div class="flex items-start justify-between gap-3 mb-3">
              <div class="flex items-start gap-3 flex-1 min-w-0">
                <div class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ServiceIcon class="h-4 w-4" />
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-foreground truncate">{service.name}</h3>
                  {#if service.price}
                    <p class="text-lg font-bold text-primary mt-1">{service.price}</p>
                  {/if}
                </div>
              </div>
              <button
                onclick={() => toggleActive(service)}
                class="shrink-0 transition-colors {service.is_active ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground hover:text-muted-foreground'}"
                title={service.is_active ? 'Activo — Click para desactivar' : 'Inactivo — Click para activar'}
              >
                {#if service.is_active}
                  <ToggleRight class="h-7 w-7" />
                {:else}
                  <ToggleLeft class="h-7 w-7" />
                {/if}
              </button>
            </div>

            <!-- Status Badge -->
            <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mb-3
              {service.is_active ? 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300' : 'bg-muted text-muted-foreground'}">
              {service.is_active ? 'Activo' : 'Inactivo'}
            </span>

            {#if service.description}
              <p class="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-3">{service.description}</p>
            {/if}

            <!-- Features -->
            {#if service.features && service.features.length > 0}
              <div class="space-y-1.5">
                {#each service.features as feature}
                  <div class="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check class="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Card Actions -->
          <div class="px-5 py-3 border-t bg-muted/50 flex items-center justify-end gap-2">
            <button
              onclick={() => openEditForm(service)}
              class="inline-flex items-center gap-1.5 h-8 rounded-md border bg-card px-3 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
            >
              <Pencil class="h-3.5 w-3.5" />
              Editar
            </button>
            {#if deleteConfirmId === service.id}
              <button
                onclick={() => deleteService(service.id)}
                class="inline-flex items-center gap-1.5 h-8 rounded-md bg-red-600 px-3 text-xs font-medium text-white hover:bg-red-700 transition-colors"
              >
                Confirmar
              </button>
              <button
                onclick={() => deleteConfirmId = null}
                class="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-card text-muted-foreground hover:text-muted-foreground transition-colors"
              >
                <X class="h-3.5 w-3.5" />
              </button>
            {:else}
              <button
                onclick={() => deleteConfirmId = service.id}
                class="inline-flex items-center gap-1.5 h-8 rounded-md border bg-card px-3 text-xs font-medium text-muted-foreground hover:text-red-600 hover:border-red-200 dark:hover:border-red-800 transition-colors"
              >
                <Trash2 class="h-3.5 w-3.5" />
                Eliminar
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Add/Edit Modal -->
{#if showForm}
  <div class="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onclick={closeForm}>
    <div class="bg-card rounded-2xl border shadow-xl w-full max-w-lg overflow-hidden" onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center justify-between p-5 border-b">
        <h3 class="text-lg font-bold text-foreground">
          {editingService ? 'Editar Servicio' : 'Agregar Servicio'}
        </h3>
        <button onclick={closeForm} class="text-muted-foreground hover:text-muted-foreground">
          <X class="h-5 w-5" />
        </button>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="p-5 space-y-4">
        <!-- Name -->
        <div>
          <label for="service-name" class="block text-sm font-medium text-foreground mb-1.5">Nombre del servicio</label>
          <input
            id="service-name"
            type="text"
            bind:value={formName}
            required
            placeholder="Ej: Tutorías Personalizadas"
            class="h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <!-- Description -->
        <div>
          <label for="service-desc" class="block text-sm font-medium text-foreground mb-1.5">Descripción</label>
          <textarea
            id="service-desc"
            bind:value={formDescription}
            rows={3}
            placeholder="Describe el servicio..."
            class="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          ></textarea>
        </div>

        <!-- Price -->
        <div>
          <label for="service-price" class="block text-sm font-medium text-foreground mb-1.5">Precio</label>
          <input
            id="service-price"
            type="text"
            bind:value={formPrice}
            placeholder="Ej: $15.000/mes"
            class="h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <!-- Features -->
        <div>
          <label for="service-features" class="block text-sm font-medium text-foreground mb-1.5">Características</label>
          <input
            id="service-features"
            type="text"
            bind:value={formFeatures}
            placeholder="Separadas por coma: Clases en vivo, Material digital, Soporte 24/7"
            class="h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p class="text-xs text-muted-foreground mt-1">Separa las características con comas.</p>
        </div>

        <!-- Icon -->
        <div>
          <label for="service-icon" class="block text-sm font-medium text-foreground mb-1.5">Ícono</label>
          <div class="flex items-center gap-3">
            <div class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border bg-muted text-primary">
              <FormIconPreview class="h-5 w-5" />
            </div>
            <select
              id="service-icon"
              bind:value={formIcon}
              class="h-11 flex-1 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {#each SERVICE_ICON_OPTIONS as iconName}
                <option value={iconName}>{iconName}</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- Active -->
        <div class="flex items-center gap-3">
          <input
            id="service-active"
            type="checkbox"
            bind:checked={formIsActive}
            class="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <label for="service-active" class="text-sm font-medium text-foreground">Servicio activo</label>
        </div>

        <!-- Form Actions -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onclick={closeForm}
            class="h-10 rounded-md border border-border bg-card px-4 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving || !formName.trim()}
            class="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if isSaving}
              Guardando...
            {:else}
              {editingService ? 'Guardar Cambios' : 'Crear Servicio'}
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
