# Deuda técnica — Kinovia

> Decisiones conscientes de dejar algo sin resolver, con el motivo y qué
> haría falta para cerrarlo. No es un backlog de bugs — si algo es un bug
> real y barato de arreglar, se arregla, no se documenta aquí.

---

## Rutinas estándar: el cliente objetivo no puede llegar a existir todavía

**Qué falta:** el flujo "cliente sin entrenador personal ve las rutinas
estándar de su gimnasio" (Pieza 3, `docs/superpowers/plans/2026-08-03-organizaciones-gimnasios.md`)
está completo y probado del lado de datos/RLS/UI, pero **ningún camino real
de la app pone `organization_id` en el perfil de un cliente**:
- `invite-client` (Edge Function) crea al cliente con `trainer_id`, nunca
  con `organization_id`.
- `reassign_client()` solo cambia `trainer_id` de un cliente que ya tenía
  entrenador; no puede sacar a nadie del estado "sin entrenador".
- El único sitio que hoy crea un cliente en ese estado es el harness de
  tests, directamente con `service_role`.

**Por qué se deja así:** la brainstorming original (2026-08-03) sí decidió
este flujo ("el admin invita a clientes solo-org directamente"), pero
nunca se convirtió en una tarea del plan de 24 tareas — se detectó en la
revisión final de rama, ya con las 4 piezas cerradas. Fernando decidió
documentarlo en vez de abrir una tarea nueva en caliente.

**Qué haría falta para cerrarlo:** una Edge Function (o extensión de
`invite-trainer`) tipo `invite-org-client` — el admin invita a un email
como `role: 'client'`, `trainer_id: null`, `organization_id: <la suya>` —
más su UI en `TrainerDashboard` y su test de aislamiento RLS (mismo
patrón que `invite-trainer`).

## `invite-client` tiene el mismo bug de paginación que se arregló en `invite-trainer`

**Qué falta:** `supabase/functions/invite-client/index.ts` comprueba si un
email ya tiene cuenta con `auth.admin.listUsers()` sin paginar — con
cientos de usuarios reales en el proyecto, esa comprobación nunca
encuentra una cuenta reciente y siempre concluye "no existe", dejando
pasar invitaciones duplicadas hasta que `inviteUserByEmail` las rechaza
más abajo (con un mensaje genérico de GoTrue en vez del "ese email ya
tiene cuenta" propio).

**Por qué se deja así:** es un bug preexistente (de antes de este plan),
no introducido por la rama de organizaciones. Se arregló su gemelo
(`invite-trainer`) porque era código nuevo de esta rama; tocar
`invite-client` es fuera de alcance de este cierre.

**Qué haría falta:** aplicar el mismo `findUserIdByEmail` paginado que ya
tiene `invite-trainer/index.ts`.

## `invite-trainer` sin test automatizado de verdad

**Qué falta:** el único componente nuevo de esta rama con `service_role`
(la superficie de mayor privilegio) no tiene ningún test que dispare la
Edge Function real por HTTP — solo verificación manual (curl) en su
momento, y el escenario Gherkin lo rodea con `generateLink` porque
`inviteUserByEmail` está bloqueado por el límite de dominio sandbox de
Resend (ver más abajo).

**Qué haría falta:** un test de integración que invoque la función
desplegada con un JWT real de un admin/no-admin y verifique 200/401/403,
independiente de si el envío de email en sí funciona.

## Límite de dominio sandbox de Resend

**Qué falta:** sin verificar un dominio propio en Resend,
`onboarding@resend.dev` solo puede mandar a la dirección del propio dueño
de la cuenta de Resend — cualquier otra dirección (incluidas las de test,
`@mailinator.com`) recibe un 500 de GoTrue con `message: "{}"`.
Diagnosticado en detalle en tareas anteriores de esta sesión (root-cause:
`@supabase/auth-js` convierte cualquier 5xx genérico de GoTrue en ese
string vacío). Confirmado de nuevo en la revisión final de rama — no es un
incidente nuevo.

**Qué haría falta:** verificar un dominio propio en Resend (o cambiar de
proveedor de email transaccional) antes de invitar a usuarios reales en
producción.

## Alta parcial fallida en el registro de organización

**Qué falta:** `useSignUpForm` encadena `signUp` → crear perfil de
entrenador → `createOrganization` sin ninguna compensación. Si el tercer
paso falla (red, o el índice único `organizations_owner_id_key`), la
persona queda con cuenta de auth y perfil de entrenador pero sin
organización, y no hay ningún sitio fuera de `/signup` desde el que crear
una — reintentar el alta falla con "email ya registrado".

**Qué haría falta:** o bien un botón "crear mi organización" en el panel
del entrenador para quien no tiene una (llama a `create_organization()`
directamente, que ya acepta llamarse sin duplicar), o una limpieza/retry
explícito en el propio `useSignUpForm`.

## Duplicación menor entre hooks/services (no bloqueante)

- `extractErrorMessage` está copiado literalmente (comentario incluido)
  entre `trainer/services/inviteService.js` y
  `organizations/services/organizationsService.js` — candidato a subir a
  `core/lib/`.
- 5 hooks de formulario (`useInviteClientForm`, `useInviteTrainerForm`,
  `useReassignClientForm`, `usePublishTemplateAction`,
  `useCreateOrganizationTemplateForm`) comparten el mismo cuerpo
  `{status, submit → try/catch → boolean}` — candidato a un
  `useAsyncFormSubmit` compartido en `core/hooks/` si aparece un sexto
  caso.
- 4 hooks de carga (`useMyOrganization`, `useOrganizationClients`,
  `useOrganizationTemplates`, `useStandardRoutines`) comparten el mismo
  patrón de `useEffect` con guard + try/catch/finally — mismo candidato a
  compartir si aparece un quinto caso.
- Ninguno de los 8 hooks nuevos de esta rama tiene test propio (la regla
  del proyecto es "testea el hook, nunca el componente") — solo están
  cubiertos los 2 services que consumen.
- `organizations.type` (`'gym' | 'clinic'`) no tiene ningún efecto real
  todavía — el selector de alta no lo distingue y `createOrganization`
  siempre usa `'gym'` por defecto. Dato reservado para cuando haga falta
  copy o comportamiento distinto entre gimnasio y clínica.
