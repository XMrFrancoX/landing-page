-- ══════════════════════════════════════════════════════════════════
-- Cada servicio del catálogo puede elegir su propio ícono (antes era
-- un ícono fijo hardcodeado por servicio en el componente, perdido al
-- conectar la landing a la tabla real). Se guarda el nombre del ícono
-- de lucide-svelte como texto; el mapeo nombre -> componente vive en
-- src/lib/serviceIcons.ts tanto en /admin/servicios como en la landing.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE landing.services ADD COLUMN IF NOT EXISTS icon text DEFAULT 'Package';

NOTIFY pgrst, 'reload schema';
