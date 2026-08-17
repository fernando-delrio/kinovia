-- Hallazgo de la revisión final de rama: organizations.owner_id y
-- plan_templates.created_by referencian profiles(id) sin ON DELETE (queda
-- NO ACTION por defecto). Borrar el profile de un admin de organización, o
-- de cualquier entrenador que haya propuesto alguna vez una rutina
-- estándar, rompe con violación de FK. deleteTestUser() (test/rls/testUsers.js)
-- descartaba ese error en silencio, así que cada corrida de tests RLS de
-- hoy dejó entrenadores/admins huérfanos sin limpiar — probablemente la
-- causa real de los "rate limit reached" repetidos, no cuota externa
-- agotada por volumen legítimo.
--
-- organizations.owner_id -> cascade: en el modelo actual de un solo admin
-- por organización, una organización sin su dueño no tiene sentido; se
-- borra con él.
-- plan_templates.created_by -> set null: una rutina de organización no
-- debe desaparecer porque su creador original se borre (podría estar
-- publicada y en uso); created_by deja de ser NOT NULL para permitirlo. El
-- trigger de la Task 18 no se ve afectado (solo congela cambios directos
-- de un cliente autenticado, no un SET NULL disparado por la FK).

alter table public.organizations
  drop constraint organizations_owner_id_fkey,
  add constraint organizations_owner_id_fkey
    foreign key (owner_id) references public.profiles (id) on delete cascade;

alter table public.plan_templates alter column created_by drop not null;
alter table public.plan_templates
  drop constraint plan_templates_created_by_fkey,
  add constraint plan_templates_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;
