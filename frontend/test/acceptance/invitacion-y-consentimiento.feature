Feature: Alta de entrenador, invitación de cliente y consentimiento

  # Nota (2 agosto 2026): el dominio pasó por dos correcciones antes de
  # correr de verdad contra el proyecto Supabase real:
  #   1. "@kinovia.test" -> ".test" es un TLD reservado (RFC 2606),
  #      rechazado por auth.signUp y admin.inviteUserByEmail con
  #      "Email address ... is invalid".
  #   2. "@kinovia-qa.com" -> dominio ficticio sin DNS/MX real. El primer
  #      intento pareció válido porque el proyecto ya estaba al límite de
  #      envío de emails (rate limit) y ese error enmascaró la validación
  #      real; en cuanto el rate limit dejó de intervenir, signUp lo
  #      rechazó igual con "email_address_invalid".
  #   3. "@mailinator.com" -> dominio real con DNS/MX válidos, ya probado
  #      con éxito en esta misma sesión (Task 8, prueba manual del Edge
  #      Function invite-client). Es el que se queda.
  # Cambios aprobados por Fernando. El resto del escenario, sin cambios.

  Scenario: Un entrenador se registra y acepta la política antes de entrar
    Given no existe ninguna cuenta con el email "ana@mailinator.com"
    When Ana se registra como entrenadora con ese email y una contraseña válida
    Then Ana ve la pantalla de consentimiento, no el panel de entrenador
    When Ana acepta la política de privacidad
    Then Ana ve su panel de entrenador

  Scenario: Un entrenador invita a un cliente por email
    Given Ana es una entrenadora autenticada y con consentimiento aceptado
    When Ana invita a "laura@mailinator.com" como cliente
    Then se crea una invitación pendiente para "laura@mailinator.com" asociada a Ana

  Scenario: Un cliente acepta la invitación, pone contraseña y consiente
    Given existe una invitación pendiente para "laura@mailinator.com" de Ana
    When Laura abre el enlace de invitación y establece su contraseña
    Then Laura ve la pantalla de consentimiento, no la vista de cliente
    When Laura acepta la política de privacidad
    Then Laura ve su propia vista de cliente

  Scenario: Un entrenador no puede invitar a alguien que ya tiene cuenta
    Given Ana es una entrenadora autenticada y con consentimiento aceptado
    And ya existe una cuenta de entrenador con el email "bruno@mailinator.com"
    When Ana invita a "bruno@mailinator.com" como cliente
    Then la invitación se rechaza con un mensaje claro
