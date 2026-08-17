-- La columna profiles.organization_id ya existe (creada fuera de
-- secuencia por la Task 4, ver nota arriba) — sin FK ni índice todavía.
-- Esta migración completa eso, en vez de crear la columna desde cero.
alter table public.profiles
  add constraint profiles_organization_id_fkey
  foreign key (organization_id) references public.organizations (id) on delete set null;

create index profiles_organization_id_idx on public.profiles (organization_id);

-- Antes: un cliente SIEMPRE necesitaba trainer_id. Ahora: trainer_id O
-- organization_id (al menos uno) — nunca los dos vacíos.
alter table public.profiles drop constraint client_has_trainer;
alter table public.profiles add constraint client_has_trainer check (
  (role = 'client' and (trainer_id is not null or organization_id is not null)) or
  (role = 'trainer' and trainer_id is null)
);

-- Directorio básico del admin: ve qué clientes tiene cada entrenador de SU
-- organización (para poder reasignar al despedir a alguien, pieza 2) —
-- pero nunca ve planes, entrenos ni datos de salud, esas tablas ni
-- siquiera tienen política que se lo permita.
create policy profiles_select_org_admin_clients
  on public.profiles
  for select
  to authenticated
  using (
    role = 'client'
    and trainer_id in (
      select p.id from public.profiles p
      join public.organizations o on o.id = p.organization_id
      where o.owner_id = (select auth.uid ()) and p.role = 'trainer'
    )
  );
