-- Hallazgo de seguridad real (Task 8, rls-reviewer, 2 agosto 2026):
-- profiles_update_own solo comprobaba que la fila era del usuario, sin
-- restringir qué columnas podía cambiar. Un cliente podía ejecutar
--   update profiles set role='trainer', trainer_id=null where id=auth.uid()
-- y auto-promocionarse a entrenador — confirmado con un exploit real
-- contra el proyecto, no solo en teoría.
--
-- El GRANT a nivel de columna es la defensa correcta: Postgres rechaza la
-- operación a nivel de motor si toca una columna no concedida, sin
-- depender de que la política RLS (USING/WITH CHECK) lo capture. RLS
-- sigue decidiendo QUÉ FILA; el GRANT por columna decide QUÉ CAMPO.
revoke update on public.profiles from authenticated;
grant update (display_name, consent_accepted_at) on public.profiles to authenticated;
