Feature: Organizaciones — alta de gimnasio, invitar entrenador, rutinas estándar

  Scenario: Un entrenador se registra como organización y aparece como admin
    Given no existe ninguna cuenta con el email "admin@mailinator.com"
    When Marta se registra eligiendo "Gimnasio o clínica" con el nombre "Gimnasio Marta" y ese email
    Then Marta ve la pantalla de consentimiento
    When Marta acepta la política de privacidad
    Then Marta ve su panel de entrenador con el nombre "Gimnasio Marta" y la sección para invitar entrenadores

  Scenario: La admin invita a un entrenador y este entra a su organización
    Given Marta es admin de "Gimnasio Marta", autenticada y con consentimiento aceptado
    When Marta invita a "entrenador@mailinator.com" como entrenador de su gimnasio
    Then se crea una invitación pendiente para "entrenador@mailinator.com" asociada a la organización de Marta
    When ese entrenador abre el enlace de invitación y establece su contraseña
    Then ve la pantalla de consentimiento
    When acepta la política de privacidad
    Then ve su panel de entrenador con el nombre "Gimnasio Marta"

  Scenario: Un cliente sin entrenador personal ve la rutina estándar publicada
    Given Marta es admin de "Gimnasio Marta", autenticada y con consentimiento aceptado
    And existe una rutina estándar "Rutina de bienvenida" publicada en su gimnasio
    And existe un cliente de su gimnasio sin entrenador personal asignado
    When ese cliente entra a su cuenta
    Then ve la rutina "Rutina de bienvenida" en su panel

  Scenario: Un entrenador no admin no puede publicar una rutina estándar
    Given un entrenador de "Gimnasio Marta" (no admin), autenticado y con consentimiento aceptado
    And ha propuesto una rutina estándar "Rutina de prueba" (queda en borrador)
    When intenta publicarla él mismo
    Then la acción se rechaza y la rutina sigue en borrador
