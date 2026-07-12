-- ══════════════════════════════════════════════════════════════════
-- Seed: "Agenda Educativa" como servicio real del catálogo, y como
-- solicitud YA RESUELTA (contratada) para cada escuela que ya tiene
-- un director/admin usándola — porque esos perfiles vienen de la base
-- de Agenda Educativa, o sea que esas escuelas YA la tienen.
--
-- No incluye escuelas sin director/admin asignado (ej. "Pirolo", sin
-- perfiles todavía) ni cuentas superadmin (son de NMF, no clientes).
-- ══════════════════════════════════════════════════════════════════

INSERT INTO landing.services (name, description, features, is_active)
SELECT
  'Agenda Educativa',
  'Calendario compartido, tareas, reuniones y comunicación docente-familia para tu institución.',
  ARRAY['Calendario por curso', 'Reuniones y actas', 'Tareas y seguimiento', 'Notificaciones a tutores'],
  true
WHERE NOT EXISTS (SELECT 1 FROM landing.services WHERE name = 'Agenda Educativa');

INSERT INTO landing.requests (service_id, user_id, school_id, contact_name, contact_email, status)
SELECT
  (SELECT id FROM landing.services WHERE name = 'Agenda Educativa'),
  p.id,
  p.school_id,
  COALESCE(NULLIF(p.full_name, ''), s.name),
  u.email,
  'resolved'
FROM public.profiles p
JOIN public.schools s ON s.id = p.school_id
JOIN auth.users u ON u.id = p.id
WHERE p.school_id IS NOT NULL
  AND p.role IN ('director', 'admin')
  AND NOT EXISTS (
    SELECT 1 FROM landing.requests r
    WHERE r.school_id = p.school_id
      AND r.service_id = (SELECT id FROM landing.services WHERE name = 'Agenda Educativa')
  );

NOTIFY pgrst, 'reload schema';
