// Escapa texto para meterlo en el HTML de un mail. Todo lo que escribe un usuario pasa por acá.
export function escapeHtml(valor: unknown): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Para asuntos de mail: sin saltos de línea.
export function lineaSimple(valor: unknown): string {
  return String(valor ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
