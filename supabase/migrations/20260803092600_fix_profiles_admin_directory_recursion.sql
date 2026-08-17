-- Hallazgo CRÍTICO de la revisión de la Task 6, confirmado en vivo contra
-- el proyecto real: la política profiles_select_org_admin_clients
-- (migración 20260803092500) consulta la propia tabla profiles dentro de
-- su USING — Postgres tiene que reevaluar TODAS las políticas de SELECT
-- de profiles (incluida esta misma) para resolver esa subquery, lo que
-- crea un ciclo sin punto fijo: "infinite recursion detected in policy
-- for relation \"profiles\"" (código 42P17). Rompía CUALQUIER lectura
-- autenticada de profiles, no solo el caso del admin — login, sesión,
-- todo.
--
-- Fix: el mismo patrón ya usado en accept_consent() y create_organization()
-- — una función SECURITY DEFINER (plpgsql, nunca "language sql" porque
-- Postgres puede inlinearla y perder el bypass de RLS) que consulta
-- profiles con los privilegios de su dueño (bypassrls), fuera del
-- contexto de RLS del rol authenticated que llama. La política ya no
-- referencia profiles dentro de sí misma — llama a la función.
drop policy if exists profiles_select_org_admin_clients on public.profiles;

create or replace function public.trainer_ids_in_my_organization()
returns setof uuid
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return query
    select p.id from public.profiles p
    join public.organizations o on o.id = p.organization_id
    where o.owner_id = auth.uid() and p.role = 'trainer';
end;
$$;

grant execute on function public.trainer_ids_in_my_organization() to authenticated;
revoke execute on function public.trainer_ids_in_my_organization() from public;

create policy profiles_select_org_admin_clients
  on public.profiles
  for select
  to authenticated
  using (
    role = 'client'
    and trainer_id in (select public.trainer_ids_in_my_organization())
  );
