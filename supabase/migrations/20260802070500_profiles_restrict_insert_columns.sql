-- Hallazgo de seguridad (Task 11, rls-reviewer, 2 agosto 2026):
-- el GRANT insert de la migración de consentimiento no restringía
-- columnas. Un entrenador podía insertar su propia fila con
-- consent_accepted_at ya relleno, fingiendo haber aceptado la política de
-- privacidad sin pasar por el gate real (/consent + acceptConsent()).
-- Mismo principio que el fix de UPDATE de la Task 8.5: RLS decide QUÉ
-- FILA, el GRANT por columna decide QUÉ CAMPO — ninguna política
-- USING/WITH CHECK puede expresar "esta columna no se toca en este INSERT".
revoke insert on public.profiles from authenticated;
grant insert (id, role, trainer_id, display_name) on public.profiles to authenticated;
