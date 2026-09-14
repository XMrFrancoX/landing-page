/**
 * Helper mínimo sobre el binding de R2 (`platform.env.NMF_STORAGE`) — mismo
 * bucket y misma firma que el helper equivalente en nmf-portal
 * (src/lib/server/r2.ts), copiado acá porque son dos proyectos separados.
 * Landing Page sólo ESCRIBE acá (logo de colegio); nmf-portal es quien lo
 * sirve de vuelta al mostrarlo.
 */

export async function putObject(bucket: R2Bucket, key: string, file: File): Promise<void> {
	await bucket.put(key, file.stream(), {
		httpMetadata: { contentType: file.type || 'application/octet-stream' }
	});
}

export async function streamObject(bucket: R2Bucket, key: string): Promise<Response> {
	const obj = await bucket.get(key);
	if (!obj) return new Response('No encontrado', { status: 404 });
	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	headers.set('etag', obj.httpEtag);
	return new Response(obj.body, { headers });
}
