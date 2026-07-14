-- ══════════════════════════════════════════════════════════════════
-- Restringe la administración del schema `landing` a superadmin.
--
-- El rol 'admin' es el admin de UNA escuela puntual (equivalente al
-- 'admin' de Agenda Educativa) y no debe poder editar/eliminar el
-- catálogo global de servicios ni gestionar solicitudes de otras
-- escuelas — eso es exclusivo de 'superadmin' (NMF). 'admin' queda
-- con el mismo alcance que cualquier usuario de /cliente: puede ver
-- (RLS de landing.services ya es de lectura pública) e insertar
-- solicitudes, no administrar.
-- ══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "landing_services_admin_write" ON landing.services;
CREATE POLICY "landing_services_admin_write" ON landing.services
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'superadmin')
  WITH CHECK (public.get_user_role() = 'superadmin');

DROP POLICY IF EXISTS "landing_requests_admin_all" ON landing.requests;
CREATE POLICY "landing_requests_admin_all" ON landing.requests
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'superadmin')
  WITH CHECK (public.get_user_role() = 'superadmin');

NOTIFY pgrst, 'reload schema';
