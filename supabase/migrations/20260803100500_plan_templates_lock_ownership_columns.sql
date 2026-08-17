-- Task 18, fix de revisión: las políticas de update de plan_templates se
-- combinan por OR en Postgres (cualquier WITH CHECK que la fila final
-- satisfaga es suficiente, sin importar qué política dio visibilidad a la
-- fila original). Eso permite a un entrenador "secuestrar" un draft de
-- organización propio poniendo trainer_id = su propio id y
-- organization_id = null en el mismo update: la fila deja de cumplir
-- plan_templates_update_organization_creator_draft pero pasa a cumplir
-- plan_templates_update_own (que no sabe nada de organización), y a partir
-- de ahí el entrenador puede auto-publicarla como si fuera suya —
-- verificado en vivo contra el proyecto real, confirmado explotable.
--
-- Ninguna funcionalidad legítima necesita cambiar trainer_id/organization_id
-- después de creada la plantilla (la propiedad se fija en el insert); la
-- forma robusta de cerrar esto — sin depender de acertar cada combinación
-- de políticas — es prohibir el cambio de esas dos columnas en cualquier
-- update, a nivel de trigger, no de política RLS.
create or replace function public.prevent_plan_template_ownership_change()
returns trigger
language plpgsql
as $$
begin
  if new.trainer_id is distinct from old.trainer_id
     or new.organization_id is distinct from old.organization_id then
    raise exception 'No se puede cambiar trainer_id/organization_id de una plantilla ya creada';
  end if;
  return new;
end;
$$;

create trigger plan_templates_prevent_ownership_change
  before update on public.plan_templates
  for each row
  execute function public.prevent_plan_template_ownership_change();
