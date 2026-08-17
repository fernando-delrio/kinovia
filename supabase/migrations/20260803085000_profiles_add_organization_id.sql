-- Añade soporte para organizaciones (gimnasios/clínicas) a profiles.
-- Un entrenador puede opcionalmente pertenecer a una organización.
-- Los clientes heredarán la organización de su entrenador.

alter table public.profiles
  add column organization_id uuid;
