-- ══════════════════════════════════════════════════════════════════
-- La vista "school-scoped" (ver todo lo que contrató la institución,
-- no solo lo propio) quedó abierta a CUALQUIER rol con school_id
-- asignado — incluye teacher/student/tutor, que no tienen ninguna
-- autoridad administrativa/de facturación sobre la escuela. Se
-- restringe esa rama a admin/director (superadmin ya tiene acceso
-- total vía "landing_requests_admin_all").
--
-- De paso, se agrega el UPDATE que faltaba: hoy solo existe
-- "landing_requests_admin_all" (FOR ALL, superadmin-only), así que un
-- cliente/admin/director real no podía pedir la baja de su propio
-- servicio sin loguearse como superadmin. Se agrega un UPDATE propio,
-- acotado a mover un request 'resolved' -> 'baja_solicitada'.
-- ══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "landing_requests_select_own" ON landing.requests;
CREATE POLICY "landing_requests_select_own" ON landing.requests
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR contact_email = (auth.jwt() ->> 'email')
    OR (
      school_id IS NOT NULL
      AND school_id = public.get_user_school()
      AND public.get_user_role() IN ('admin', 'director')
    )
  );

DROP POLICY IF EXISTS "landing_requests_self_baja" ON landing.requests;
CREATE POLICY "landing_requests_self_baja" ON landing.requests
  FOR UPDATE TO authenticated
  USING (
    status = 'resolved'
    AND (
      auth.uid() = user_id
      OR contact_email = (auth.jwt() ->> 'email')
      OR (
        school_id IS NOT NULL
        AND school_id = public.get_user_school()
        AND public.get_user_role() IN ('admin', 'director')
      )
    )
  )
  WITH CHECK (status = 'baja_solicitada');

DROP POLICY IF EXISTS "request_messages_select" ON landing.request_messages;
CREATE POLICY "request_messages_select" ON landing.request_messages
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'superadmin'
    OR request_id IN (
      SELECT id FROM landing.requests
      WHERE auth.uid() = user_id
         OR contact_email = (auth.jwt() ->> 'email')
         OR (
           school_id IS NOT NULL
           AND school_id = public.get_user_school()
           AND public.get_user_role() IN ('admin', 'director')
         )
    )
  );

DROP POLICY IF EXISTS "request_messages_insert" ON landing.request_messages;
CREATE POLICY "request_messages_insert" ON landing.request_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (sender_role = 'nmf' AND public.get_user_role() = 'superadmin')
    OR (sender_role = 'client' AND request_id IN (
      SELECT id FROM landing.requests
      WHERE auth.uid() = user_id
         OR contact_email = (auth.jwt() ->> 'email')
         OR (
           school_id IS NOT NULL
           AND school_id = public.get_user_school()
           AND public.get_user_role() IN ('admin', 'director')
         )
    ))
  );

NOTIFY pgrst, 'reload schema';
