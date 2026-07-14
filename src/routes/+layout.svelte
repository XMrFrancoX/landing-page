<script lang="ts">
	import './layout.css';
	import { Toaster } from 'svelte-sonner';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href="/logo.png" /></svelte:head>
<Toaster richColors position="top-right" closeButton />
{@render children()}
