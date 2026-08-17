-- Lectura: cualquier entrenador de la organización ve TODAS las plantillas
-- de esa organización (draft incluido, para poder revisarlas); un cliente
-- de esa organización SOLO ve las ya publicadas.
create policy plan_templates_select_organization
  on public.plan_templates
  for select
  to authenticated
  using (
    organization_id is not null
    and (
      organization_id in (
        select organization_id from public.profiles
        where id = (select auth.uid ()) and role = 'trainer' and organization_id is not null
      )
      or (
        status = 'published'
        and organization_id in (
          select organization_id from public.profiles
          where id = (select auth.uid ()) and role = 'client' and organization_id is not null
        )
      )
    )
  );

-- Creación: cualquier entrenador de la organización puede proponer una
-- plantilla estándar — nace SIEMPRE en draft (with check lo fuerza, nunca
-- se puede insertar ya publicada).
create policy plan_templates_insert_organization
  on public.plan_templates
  for insert
  to authenticated
  with check (
    trainer_id is null
    and status = 'draft'
    and created_by = (select auth.uid ())
    and organization_id in (
      select organization_id from public.profiles
      where id = (select auth.uid ()) and role = 'trainer' and organization_id is not null
    )
  );

-- Edición: quien la propuso puede seguir editando el CONTENIDO mientras
-- siga en draft. Solo el admin (organizations.owner_id) puede publicarla
-- o editar una ya publicada.
create policy plan_templates_update_organization_creator_draft
  on public.plan_templates
  for update
  to authenticated
  using (
    organization_id is not null
    and status = 'draft'
    and created_by = (select auth.uid ())
  )
  with check (
    organization_id is not null
    and status = 'draft'
    and created_by = (select auth.uid ())
  );

create policy plan_templates_update_organization_admin
  on public.plan_templates
  for update
  to authenticated
  using (
    organization_id in (select id from public.organizations where owner_id = (select auth.uid ()))
  )
  with check (
    organization_id in (select id from public.organizations where owner_id = (select auth.uid ()))
  );
