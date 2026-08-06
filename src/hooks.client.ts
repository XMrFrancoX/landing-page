import * as Sentry from '@sentry/sveltekit';

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
	Sentry.init({
		dsn,
		tracesSampleRate: 0.2
	});
}

// Si alguien tiene el sitio abierto en medio de un deploy nuevo, un chunk JS
// hasheado de la build vieja puede dejar de existir. Recargar en vez de dejarlo
// varado en una página rota.
window.addEventListener('vite:preloadError', () => {
	window.location.reload();
});

export const handleError = Sentry.handleErrorWithSentry();
