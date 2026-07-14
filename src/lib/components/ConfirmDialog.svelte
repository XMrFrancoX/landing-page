<script lang="ts">
  import { TriangleAlert } from 'lucide-svelte';

  let {
    open = $bindable(false),
    title,
    description,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    destructive = false,
    onConfirm
  }: {
    open?: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
  } = $props();

  function handleConfirm() {
    open = false;
    onConfirm();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) open = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false;
  }
</script>

<svelte:window onkeydown={open ? handleKeydown : undefined} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
    onclick={handleBackdropClick}
  >
    <div class="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-lg" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div class="flex items-start gap-3">
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full {destructive ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'}">
          <TriangleAlert class="h-5 w-5" />
        </div>
        <div class="flex-1 pt-1">
          <h2 id="confirm-dialog-title" class="text-base font-bold text-slate-900">{title}</h2>
          <p class="mt-1 text-sm text-slate-600">{description}</p>
        </div>
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onclick={() => (open = false)}
          class="inline-flex h-9 items-center justify-center rounded-md border bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onclick={handleConfirm}
          class="inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium shadow transition-colors {destructive
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'}"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}
