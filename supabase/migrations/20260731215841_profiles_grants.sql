-- Con "Automatically expose new tables" desactivado (decisión deliberada del
-- proyecto: exponer cada tabla a mano), profiles no tenía ningún GRANT para
-- los roles de la API — ni siquiera service_role, que salta RLS pero sigue
-- necesitando el privilegio de tabla estándar de Postgres para poder tocarla.
--
-- RLS (de la migración anterior) sigue siendo quien filtra FILAS.
-- Estos GRANT solo habilitan la OPERACIÓN a nivel de tabla para cada rol.

grant usage on schema public to authenticated, service_role;

-- authenticated: solo lo que sus políticas RLS ya permiten (select/update).
grant select, update on public.profiles to authenticated;

-- service_role: acceso completo, usado desde Edge Functions/admin, nunca
-- desde el frontend.
grant select, insert, update, delete on public.profiles to service_role;
