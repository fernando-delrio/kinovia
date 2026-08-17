-- Hallazgo menor de la revisión final: prevent_plan_template_ownership_change
-- (Task 18) es la única función nueva de esta rama sin `set search_path`.
-- No es SECURITY DEFINER, así que no hay riesgo real de search_path
-- hijacking, pero se añade por consistencia con el resto de funciones.
--
-- Se descarta explícitamente la sugerencia de congelar también created_by
-- en este mismo trigger: la migración 20260803101500 le puso
-- `on delete set null` a created_by precisamente para que borrar el
-- profile de quien propuso una rutina no bloquee el delete. Si el trigger
-- también rechazara cambios a created_by, bloquearía ese propio SET NULL
-- disparado por la FK (los triggers BEFORE UPDATE se disparan igual para
-- updates provocados por acciones de FK) y reintroduciría el mismo bug de
-- limpieza que se acaba de arreglar. El hueco teórico que cerraría
-- (un admin de organización reasignando created_by para robar la
-- editabilidad de un draft ajeno) queda como riesgo aceptado y documentado
-- aquí, no como trigger.
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
  return new;
end;
$$;
