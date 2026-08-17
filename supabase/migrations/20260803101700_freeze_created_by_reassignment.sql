-- Cierra el resto del Minor #11 de la revisión final: la migración
-- 20260803101600 descartó congelar created_by en el trigger de la Task 18
-- por conflicto aparente con el ON DELETE SET NULL de 20260803101500 (un
-- trigger BEFORE UPDATE se dispara igual para updates provocados por la
-- propia FK). El re-review encontró la forma de tener ambas cosas: la FK
-- solo mueve created_by hacia null (old -> null), nunca hacia otro valor
-- no nulo — así que basta con permitir esa transición concreta y seguir
-- bloqueando cualquier reasignación a otro creador.
create or replace function public.prevent_plan_template_ownership_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.trainer_id is distinct from old.trainer_id
     or new.organization_id is distinct from old.organization_id then
    raise exception 'No se puede cambiar trainer_id/organization_id de una plantilla ya creada';
  end if;

  if new.created_by is distinct from old.created_by and new.created_by is not null then
    raise exception 'No se puede reasignar created_by de una plantilla ya creada';
  end if;

  return new;
end;
$$;
