-- Única vía de cambiar el trainer_id de un cliente ajeno: el admin de la
-- organización reasigna explícitamente (acción puntual y auditable, no
-- visibilidad permanente — decisión de brainstorming del 3 de agosto de
-- 2026). Nunca un UPDATE directo desde el frontend sobre trainer_id de
-- otro usuario.
create or replace function public.reassign_client(target_client_id uuid, new_trainer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_org_id uuid;
  client_belongs_to_org boolean;
  new_trainer_belongs_to_org boolean;
begin
  select id into caller_org_id from public.organizations where owner_id = auth.uid();
  if caller_org_id is null then
    raise exception 'Solo el admin de una organización puede reasignar clientes';
  end if;

  select exists (
    select 1
    from public.profiles client
    join public.profiles trainer on trainer.id = client.trainer_id
    where client.id = target_client_id
      and client.role = 'client'
      and trainer.organization_id = caller_org_id
  ) into client_belongs_to_org;
  if not client_belongs_to_org then
    raise exception 'El cliente no pertenece a un entrenador de tu organización';
  end if;

  select exists (
    select 1 from public.profiles
    where id = new_trainer_id and role = 'trainer' and organization_id = caller_org_id
  ) into new_trainer_belongs_to_org;
  if not new_trainer_belongs_to_org then
    raise exception 'El entrenador destino no pertenece a tu organización';
  end if;

  update public.profiles set trainer_id = new_trainer_id where id = target_client_id;
end;
$$;

grant execute on function public.reassign_client(uuid, uuid) to authenticated;
revoke execute on function public.reassign_client(uuid, uuid) from public;
