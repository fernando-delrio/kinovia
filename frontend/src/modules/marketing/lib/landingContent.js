export const NAV_LINKS = [
  { label: 'Producto', href: '#por-que-kinovia' },
  { label: 'Cómo funciona', href: '#motor-sustitucion' },
  { label: 'Precios', href: '#precios' },
  { label: 'Contacto', href: '#validacion' },
]

// Estado real del producto (pre-lanzamiento) — nada de cifras de usuarios inventadas.
export const HIGHLIGHTS = [
  { value: 'RLS', label: 'Cada entrenador ve solo lo suyo' },
  { value: 'JSONB', label: 'Plantillas que edita el entrenador, no un programador' },
  { value: 'PWA', label: 'En el móvil y en el ordenador' },
  { value: 'Beta', label: 'Así estamos ahora mismo' },
]

export const FEATURES = [
  {
    icon: 'bx-transfer-alt',
    title: 'Motor de sustitución',
    description: 'Cada ejercicio de riesgo para una condición física tiene una alternativa concreta y el porqué clínico detrás.',
  },
  {
    icon: 'bx-lock-alt',
    title: 'Multi-tenant seguro',
    description: 'Cada entrenador ve solo sus propios clientes y plantillas — el aislamiento lo garantiza RLS, no la confianza.',
  },
  {
    icon: 'bx-line-chart',
    title: 'Seguimiento sin fricción',
    description: 'El cliente registra su entreno, dolor y progreso; el entrenador lo ve todo en un único sitio.',
  },
  {
    icon: 'bx-envelope',
    title: 'Alta por invitación',
    description: 'Ningún cliente se registra por su cuenta — siempre entra invitado por su propio entrenador.',
  },
]

export const PRICING_PLANS = [
  {
    name: 'Básico',
    price: 'A definir',
    description: 'Para entrenadores que empiezan a digitalizar sus planes.',
    features: ['Plantillas ilimitadas', 'Clientes ilimitados', 'Motor de sustitución'],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 'A definir',
    description: 'Para entrenadores con clientes con condiciones físicas variadas.',
    features: ['Todo lo del plan Básico', 'Seguimiento avanzado', 'Soporte prioritario'],
    highlighted: true,
  },
  {
    name: 'Studio',
    price: 'A definir',
    description: 'Para equipos de varios entrenadores.',
    features: ['Todo lo del plan Pro', 'Varios entrenadores', 'Panel de equipo'],
    highlighted: false,
  },
]

export const FOOTER_LINK_GROUPS = [
  { title: 'Producto', links: ['Por qué Kinovia', 'Cómo funciona', 'Precios'] },
  { title: 'Compañía', links: ['Contacto', 'Validación'] },
]
