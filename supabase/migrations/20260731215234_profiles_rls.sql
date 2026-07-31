-- profiles: identidad de cada usuario dentro de Kinovia (trainer o client)
-- y el enlace client -> trainer que sostiene el aislamiento multi-tenant.
--
-- Aislamiento que garantiza esta migración (NORMAS_INAMOVIBLES.md §8):
--   - Cualquier usuario autenticado solo puede LEER y ACTUALIZAR su propia fila.
--   - Un entrenador, además, puede LEER (nunca escribir) las filas de sus propios
--     clientes (trainer_id = su uid) — necesario para el panel del entrenador.
--   - No existe política de INSERT para `authenticated`: las filas de profiles
--     las crea el service_role desde la futura Edge Function de invitación
--     (alta siempre por invitación, nunca alta pública — NORMAS_INAMOVIBLES.md §7).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('trainer', 'client')),
  trainer_id uuid references public.profiles (id) on delete set null,
  display_name text,
  created_at timestamptz not null default now(),
  -- un client siempre tiene entrenador asignado; un trainer nunca tiene entrenador
  constraint client_has_trainer check (
    (role = 'client' and trainer_id is not null) or
    (role = 'trainer' and trainer_id is null)
  )
);

-- FK sin índice = full scan en cada lectura de "mis clientes" del entrenador
create index profiles_trainer_id_idx on public.profiles (trainer_id);

alter table public.profiles enable row level security;
-- fuerza RLS incluso para el owner de la tabla; service_role sigue baypaseando
-- RLS por su atributo bypassrls, no se ve afectado por force
alter table public.profiles force row level security;

-- Aislamiento: cada usuario ve solo su propia fila.
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid ()) = id);

-- Aislamiento: un entrenador ve las filas de sus propios clientes,
-- nunca las de un cliente de otro entrenador.
create policy profiles_select_own_clients
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid ()) = trainer_id);

-- Aislamiento: cada usuario solo puede modificar su propia fila.
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid ()) = id)
  with check ((select auth.uid ()) = id);
