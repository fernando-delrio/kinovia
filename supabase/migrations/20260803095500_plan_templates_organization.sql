-- plan_templates gana un segundo modo: plantilla COMPARTIDA de una
-- organización (rutina estándar para clientes sin entrenador personal),
-- en vez de personal de un entrenador. Nunca las dos cosas a la vez.
alter table public.plan_templates
  add column organization_id uuid references public.organizations (id) on delete cascade,
  add column status text not null default 'published' check (status in ('draft', 'published')),
  add column created_by uuid references public.profiles (id);

-- Las filas ya existentes son todas personales (trainer_id set); rellena
-- created_by con el propio trainer_id para no dejar nulos en filas viejas.
update public.plan_templates set created_by = trainer_id where created_by is null;
alter table public.plan_templates alter column created_by set not null;

-- trainer_id deja de ser NOT NULL: una plantilla de organización no tiene
-- trainer_id, solo organization_id.
alter table public.plan_templates alter column trainer_id drop not null;

alter table public.plan_templates add constraint template_owner check (
  (trainer_id is not null and organization_id is null) or
  (trainer_id is null and organization_id is not null)
);

create index plan_templates_organization_id_idx on public.plan_templates (organization_id);
