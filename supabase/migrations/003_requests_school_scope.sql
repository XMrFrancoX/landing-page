-- ══════════════════════════════════════════════════════════════════
-- Permite que un admin/director de escuela vea TODAS las solicitudes
-- de SU escuela en /cliente, no solo las que él mismo mandó por email.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE landing.requests ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

DROP POLICY IF EXISTS "landing_requests_select_own" ON landing.requests;
CREATE POLICY "landing_requests_select_own" ON landing.requests
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR contact_email = (auth.jwt() ->> 'email')
    OR (school_id IS NOT NULL AND school_id = public.get_user_school())
  );

NOTIFY pgrst, 'reload schema';
