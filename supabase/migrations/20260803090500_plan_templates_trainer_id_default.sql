-- Bug encontrado al correr el test de aislamiento de la Task 3: la
-- migración de Task 1 no le da ningún valor por defecto a trainer_id, y
-- ni planTemplatesService.createTemplate (Task 2) ni el propio test lo
-- mandan explícitamente en el insert — así que trainer_id llegaba NULL,
-- y el "with check ((select auth.uid()) = trainer_id)" de
-- plan_templates_insert_own lo rechazaba siempre con "new row violates
-- row-level security policy", incluso para el propio dueño.
--
-- Mismo patrón que profiles_insert_own_trainer, pero aquí resuelto con un
-- default de columna en vez de exigir que el cliente mande el id a mano —
-- así createTemplate() se queda simple (insert({name, content})) y no
-- hace falta que el frontend conozca su propio auth.uid() de antemano.
alter table public.plan_templates
  alter column trainer_id set default auth.uid ();
