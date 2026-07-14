-- ══════════════════════════════════════════════════════════════════
-- Comunicación cliente <-> NMF sobre una solicitud/servicio contratado
-- (ej. pedir la baja, hacer una consulta) + nuevo status 'baja_solicitada'.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE landing.requests DROP CONSTRAINT IF EXISTS requests_status_check;
ALTER TABLE landing.requests ADD CONSTRAINT requests_status_check
  CHECK (status IN ('pending', 'contacted', 'resolved', 'baja_solicitada'));

CREATE TABLE IF NOT EXISTS landing.request_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid REFERENCES landing.requests(id) ON DELETE CASCADE NOT NULL,
  sender_role text CHECK (sender_role IN ('client', 'nmf')) NOT NULL,
  sender_name text,
  body        text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

GRANT ALL ON landing.request_messages TO anon, authenticated, service_role;

ALTER TABLE landing.request_messages ENABLE ROW LEVEL SECURITY;

-- Ver mensajes: mismo criterio que ver la solicitud (dueño/escuela) o NMF (superadmin)
DROP POLICY IF EXISTS "request_messages_select" ON landing.request_messages;
CREATE POLICY "request_messages_select" ON landing.request_messages
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'superadmin'
    OR request_id IN (
      SELECT id FROM landing.requests
      WHERE auth.uid() = user_id
         OR contact_email = (auth.jwt() ->> 'email')
         OR (school_id IS NOT NULL AND school_id = public.get_user_school())
    )
  );

-- Escribir: el cliente solo en sus propias solicitudes (sender_role='client'),
-- NMF (superadmin) en cualquiera (sender_role='nmf')
DROP POLICY IF EXISTS "request_messages_insert" ON landing.request_messages;
CREATE POLICY "request_messages_insert" ON landing.request_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (sender_role = 'nmf' AND public.get_user_role() = 'superadmin')
    OR (sender_role = 'client' AND request_id IN (
      SELECT id FROM landing.requests
      WHERE auth.uid() = user_id
         OR contact_email = (auth.jwt() ->> 'email')
         OR (school_id IS NOT NULL AND school_id = public.get_user_school())
    ))
  );

NOTIFY pgrst, 'reload schema';
