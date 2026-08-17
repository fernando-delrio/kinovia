-- organizations: un gimnasio o clínica. "type" es solo una etiqueta
-- informativa para copy/UI futura — el comportamiento es idéntico para
-- 'gym' y 'clinic' (confirmado en el spec, no hay lógica distinta).
--
-- owner_id es el ÚNICO admin de la organización (un solo admin por ahora,
-- YAGNI — nadie ha pedido co-dueños todavía).
--
-- Sin política de insert/update/delete para `authenticated`: la única vía
-- de crear una organización es la función create_organization() de la
-- siguiente migración (SECURITY DEFINER, corre con privilegios de su
-- dueño, no del rol authenticated).

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'gym' check (type in ('gym', 'clinic')),
  owner_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.organizations force row level security;

-- Un entrenador ve la organización a la que pertenece (para pintar su
-- nombre), y el admin siempre ve la suya propia.
create policy organizations_select_member
  on public.organizations
  for select
  to authenticated
  using (
    id in (select organization_id from public.profiles where id = (select auth.uid ()) and organization_id is not null)
    or owner_id = (select auth.uid ())
  );

grant select on public.organizations to authenticated;
grant select, insert, update, delete on public.organizations to service_role;
