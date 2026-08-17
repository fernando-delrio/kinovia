-- plan_templates: plantillas de entrenamiento del entrenador (JSONB,
-- fases->días->ejercicios). Prerrequisito nunca construido hasta ahora
-- (doc/fases.md, Fase 1) — sin esto no existe ningún concepto de
-- "plantilla", ni personal ni compartida de organización.
--
-- Esta migración solo cubre el caso personal (un entrenador, sus propias
-- plantillas). El caso de organización (rutinas estándar compartidas)
-- llega en una migración posterior, cuando exista la tabla organizations.

create table public.plan_templates (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

create index plan_templates_trainer_id_idx on public.plan_templates (trainer_id);

alter table public.plan_templates enable row level security;
alter table public.plan_templates force row level security;

-- Aislamiento: cada entrenador ve, crea, edita y borra solo sus propias plantillas.
create policy plan_templates_select_own
  on public.plan_templates
  for select
  to authenticated
  using ((select auth.uid ()) = trainer_id);

create policy plan_templates_insert_own
  on public.plan_templates
  for insert
  to authenticated
  with check ((select auth.uid ()) = trainer_id);

create policy plan_templates_update_own
  on public.plan_templates
  for update
  to authenticated
  using ((select auth.uid ()) = trainer_id)
  with check ((select auth.uid ()) = trainer_id);

create policy plan_templates_delete_own
  on public.plan_templates
  for delete
  to authenticated
  using ((select auth.uid ()) = trainer_id);

grant select, insert, update, delete on public.plan_templates to authenticated;
grant select, insert, update, delete on public.plan_templates to service_role;
