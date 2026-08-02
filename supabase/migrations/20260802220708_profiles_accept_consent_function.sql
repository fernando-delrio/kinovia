-- Hallazgo de la revisión final de rama (2 agosto 2026): la Task 11.5
-- cerró la falsificación de consent_accepted_at en el INSERT, pero el
-- GRANT de UPDATE de la Task 8.5 deja la misma columna abierta — cualquier
-- usuario puede retrodatar, falsificar o borrar su propio consentimiento
-- por UPDATE directo, y el timestamp lo pone el navegador, no el servidor.
--
-- Fix: la columna deja de ser escribible por UPDATE directo. Solo se
-- puede fijar a través de esta función, que usa auth.uid() (no un
-- parámetro falseable), pone now() del servidor, y rechaza sobrescribir
-- un valor ya aceptado.
revoke update (consent_accepted_at) on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

create or replace function public.accept_consent()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  result timestamptz;
begin
  update public.profiles
  set consent_accepted_at = now()
  where id = auth.uid()
    and consent_accepted_at is null
  returning consent_accepted_at into result;

  if result is null then
    raise exception 'No se pudo aceptar el consentimiento (ya estaba aceptado, o la fila no existe)';
  end if;

  return result;
end;
$$;

grant execute on function public.accept_consent() to authenticated;
revoke execute on function public.accept_consent() from public;
