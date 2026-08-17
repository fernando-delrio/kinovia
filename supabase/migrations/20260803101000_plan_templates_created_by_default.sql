-- Regresión real encontrada al correr la suite completa tras la Task 18:
-- la Task 17 puso created_by NOT NULL sin default, pero el insert personal
-- original (plan_templates_insert_own, Task 1) nunca lo rellena — solo
-- fija trainer_id (que sí tiene default auth.uid() desde la Task 3). Toda
-- plantilla personal nueva empezó a romper con 23502 "created_by viola
-- not-null". Mismo patrón que la Task 3: quien crea la fila es, por
-- defecto, quien la crea.
alter table public.plan_templates alter column created_by set default auth.uid();
