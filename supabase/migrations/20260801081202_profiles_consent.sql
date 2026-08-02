-- consent_accepted_at: gate único de política de privacidad, aplica igual
-- a entrenador y cliente (el entrenador también maneja datos de salud de
-- sus clientes, tiene que aceptar la misma política).
alter table public.profiles
  add column consent_accepted_at timestamptz;

-- Alta propia del entrenador: a diferencia del cliente (creado por
-- service_role en la Edge Function), el entrenador se registra público y
-- crea su propia fila. Esta política SOLO permite crear una fila de rol
-- 'trainer' para uno mismo — nunca 'client' (eso sigue exigiendo
-- service_role, ver Task 8). El CHECK client_has_trainer de la migración
-- anterior ya impide guardar un 'trainer' con trainer_id relleno.
create policy profiles_insert_own_trainer
  on public.profiles
  for insert
  to authenticated
  with check (
    (select auth.uid()) = id
    and role = 'trainer'
    and trainer_id is null
  );

-- Sin GRANT insert, ni RLS ni políticas importan — la operación se
-- rechaza antes de llegar a evaluarlas (lección de ERRORES_APRENDIDOS.md).
grant insert on public.profiles to authenticated;
