-- Única vía de crear una organización: un entrenador SIN organización
-- previa (organization_id is null) crea la suya y queda como admin en el
-- mismo paso. Nunca un INSERT directo sobre organizations desde el
-- frontend (no hay política que lo permita, ver migración anterior).
create or replace function public.create_organization(org_name text, org_type text default 'gym')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'trainer' and organization_id is null
  ) then
    raise exception 'Solo un entrenador sin organización puede crear una';
  end if;

  insert into public.organizations (name, type, owner_id)
  values (org_name, org_type, auth.uid())
  returning id into new_org_id;

  update public.profiles set organization_id = new_org_id where id = auth.uid();

  return new_org_id;
end;
$$;

grant execute on function public.create_organization(text, text) to authenticated;
revoke execute on function public.create_organization(text, text) from public;
