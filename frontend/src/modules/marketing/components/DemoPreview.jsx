import { useState, useEffect } from 'react'
import { cx } from '../../core/lib/cx'

// Paleta propia de Kinovia para este widget: acento índigo (ni el teal del
// proyecto personal ni el amarillo de Weldix), sobre terminal oscuro.
const S = {
  text: 'text-zinc-300',
  textStrong: 'text-zinc-100',
  textMuted: 'text-zinc-500',
  accent: 'text-indigo-400',
  green: 'text-emerald-400',
  blue: 'text-sky-400',
  red: 'text-red-400',
  border: 'border-zinc-800',
  cardBg: 'bg-zinc-900/60',
}

const SCENES = [
  { id: 'plantilla', label: 'Plantilla', icon: 'bx bx-list-check', steps: 5, ms: 6200 },
  { id: 'invitar', label: 'Invitar', icon: 'bx bx-envelope', steps: 4, ms: 5500 },
  { id: 'sustitucion', label: 'Sustitución', icon: 'bx bx-transfer-alt', steps: 4, ms: 6000 },
  { id: 'registro', label: 'Registro', icon: 'bx bx-check-square', steps: 4, ms: 5500 },
  { id: 'progreso', label: 'Progreso', icon: 'bx bx-line-chart', steps: 4, ms: 5500 },
  { id: 'rls', label: 'RLS', icon: 'bx bx-lock-alt', steps: 4, ms: 5500 },
]

// Aparición instantánea — sin transition para no crear parpadeo de opacidad intermedia
const vis = (step, n) => (step >= n ? 'opacity-100' : 'opacity-0')

const Row = ({ label, value, show = true, green = false }) => (
  <div
    className={cx(
      'flex items-center gap-3 border-b border-zinc-800/80 px-4 py-2.5',
      show ? 'opacity-100' : 'opacity-0'
    )}
  >
    <span className={cx('w-20 shrink-0 text-[0.58rem] uppercase tracking-wider', S.textMuted)}>
      {label}
    </span>
    <span className={cx('text-[0.75rem]', green ? S.green : S.text)}>{value}</span>
  </div>
)

const Cmd = ({ cmd, step }) => (
  <div className={cx('flex items-center gap-2 pt-2', vis(step, 0))}>
    <span className={cx('text-sm', S.accent)}>$</span>
    <span className={cx('text-[0.78rem]', S.text)}>{cmd}</span>
  </div>
)

// Crossfade suave solo para el toggle botón→éxito dentro de una misma escena
const Swap = ({ showA, a, b, className = 'h-[72px]' }) => (
  <div className={cx('relative', className)}>
    <div
      className={cx(
        'absolute top-0 left-0 w-full transition-opacity duration-300',
        showA ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      {a}
    </div>
    <div
      className={cx(
        'absolute top-0 left-0 w-full transition-opacity duration-300',
        showA ? 'opacity-0 pointer-events-none' : 'opacity-100'
      )}
    >
      {b}
    </div>
  </div>
)

// ─── escenas ──────────────────────────────────────────────────────────────────

const ScenePlantilla = ({ step }) => (
  <div className="space-y-4 px-6 pb-4 pt-2">
    <Cmd cmd="nueva-plantilla --objetivo hipertrofia" step={step} />
    <div className={cx('overflow-hidden rounded-sm border', S.border, S.cardBg, vis(step, 1))}>
      <Row label="Nombre" value="Fuerza + movilidad de cadera" />
      <Row label="Fases" value="3 fases · 10 semanas" show={step >= 2} />
      <Row label="Cliente" value="Sin asignar todavía" show={step >= 3} />
    </div>
    <Swap
      showA={step < 5}
      className={cx('relative h-[72px]', vis(step, 3))}
      a={
        <button className="flex items-center gap-2 rounded-sm bg-indigo-500 px-5 py-2.5 text-[0.68rem] font-black uppercase tracking-wider text-white">
          <i className="bx bx-plus" /> Crear plantilla
        </button>
      }
      b={
        <div className="space-y-1.5">
          <div
            className={cx(
              'flex items-center gap-2 rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-[0.68rem] font-black uppercase tracking-wider',
              S.green
            )}
          >
            <i className="bx bx-check-circle" /> PLANTILLA-014 — creada correctamente
          </div>
          <p className={cx('pl-1 text-[0.6rem]', S.textMuted)}>Lista para asignar a un cliente</p>
        </div>
      }
    />
  </div>
)

const SceneInvitar = ({ step }) => (
  <div className="space-y-4 px-6 pb-4 pt-2">
    <Cmd cmd="invitar-cliente --email laura@ejemplo.com" step={step} />
    <div className={cx('overflow-hidden rounded-sm border', S.border, S.cardBg, vis(step, 1))}>
      <Row label="Nombre" value="Laura Gómez" />
      <Row label="Email" value="laura@ejemplo.com" show={step >= 2} />
      <Row label="Plantilla" value="Fuerza + movilidad de cadera" show={step >= 3} />
    </div>
    <Swap
      showA={step < 4}
      className={cx('relative h-[72px]', vis(step, 3))}
      a={
        <button className="flex items-center gap-2 rounded-sm bg-indigo-500 px-5 py-2.5 text-[0.68rem] font-black uppercase tracking-wider text-white">
          <i className="bx bx-send" /> Enviar invitación
        </button>
      }
      b={
        <div className="space-y-1.5">
          <div
            className={cx(
              'flex items-center gap-2 rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-[0.68rem] font-black uppercase tracking-wider',
              S.green
            )}
          >
            <i className="bx bx-check-circle" /> Invitación enviada
          </div>
          <p className={cx('pl-1 text-[0.6rem]', S.textMuted)}>
            Laura entra con su propia cuenta — nunca alta pública
          </p>
        </div>
      }
    />
  </div>
)

const SceneSustitucion = ({ step }) => (
  <div className="space-y-4 px-6 pb-4 pt-2">
    <Cmd cmd="sustituir --condicion cadera_femoroacetabular" step={step} />
    <div className={cx('overflow-hidden rounded-sm border', S.border, S.cardBg, vis(step, 1))}>
      <div className="flex items-center gap-3 border-b border-zinc-800/80 px-4 py-2.5">
        <span className={cx('w-20 shrink-0 text-[0.58rem] uppercase tracking-wider', S.textMuted)}>
          Ejercicio
        </span>
        <span className={cx('text-[0.75rem]', S.red)}>⚠ Sentadilla profunda · riesgo</span>
      </div>
      <Row label="Motivo" value="Flexión de cadera cargada >80°" show={step >= 2} />
      <Row
        label="Alternativa"
        value="Elevación de cadera con banda · core neutro"
        show={step >= 3}
        green
      />
    </div>
    <p className={cx('text-[0.62rem]', S.textMuted, vis(step, 3))}>
      Mismo reto de core, sin el mecanismo de riesgo — documentado en la propia plantilla.
    </p>
  </div>
)

const SceneRegistro = ({ step }) => (
  <div className="space-y-4 px-6 pb-4 pt-2">
    <Cmd cmd="registrar --entreno hoy" step={step} />
    <div className={cx('overflow-hidden rounded-sm border', S.border, S.cardBg, vis(step, 1))}>
      <Row label="Ejercicios" value="4/4 completados" />
      <Row label="RPE" value="7/10" show={step >= 2} />
      <Row label="Dolor" value="0/10 · sin molestias" show={step >= 2} green />
    </div>
    <Swap
      showA={step < 4}
      className={cx('relative h-[72px]', vis(step, 2))}
      a={
        <button className="flex items-center gap-2 rounded-sm bg-indigo-500 px-5 py-2.5 text-[0.68rem] font-black uppercase tracking-wider text-white">
          <i className="bx bx-save" /> Guardar registro
        </button>
      }
      b={
        <div className="space-y-1.5">
          <div
            className={cx(
              'flex items-center gap-2 rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-[0.68rem] font-black uppercase tracking-wider',
              S.green
            )}
          >
            <i className="bx bx-check-circle" /> Registro guardado
          </div>
          <p className={cx('pl-1 text-[0.6rem]', S.textMuted)}>Tu entrenador lo verá en su panel</p>
        </div>
      }
    />
  </div>
)

const SceneProgreso = ({ step }) => {
  const progress = step >= 3 ? 62 : step >= 2 ? 25 : 0
  return (
    <div className="space-y-4 px-6 pb-4 pt-2">
      <div className={cx('flex items-center justify-between', vis(step, 0))}>
        <div>
          <p className={cx('text-[0.6rem] font-bold uppercase tracking-wider', S.textMuted)}>
            Cliente
          </p>
          <p className={cx('text-[0.9rem] font-black', S.textStrong)}>Laura Gómez</p>
        </div>
        <span
          className={cx(
            'rounded-sm border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-wider',
            S.blue
          )}
        >
          EN CURSO
        </span>
      </div>
      <div className={cx('space-y-3', vis(step, 1))}>
        <div className="flex items-center gap-3">
          {[
            { label: 'Fase 1', done: true },
            { label: 'Fase 2', active: true },
            { label: 'Fase 3', pending: true },
          ].map(({ label, done, active }) => (
            <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={cx(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[0.6rem] font-black',
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'bg-indigo-500 text-white'
                      : cx('border', S.border, S.textMuted)
                )}
              >
                {done ? '✓' : active ? '●' : '○'}
              </div>
              <span
                className={cx(
                  'text-[0.55rem] uppercase tracking-wider',
                  done ? 'text-emerald-500' : active ? 'text-indigo-400' : S.textMuted
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-[0.6rem]">
            <span className={cx('uppercase tracking-wider', S.textMuted)}>Adherencia</span>
            <span className={cx('font-bold', S.accent)}>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
      <div className={cx('flex items-center gap-2', vis(step, 3))}>
        <i className={cx('bx bx-mood text-sm', S.green)} />
        <span className={cx('text-[0.62rem]', S.textMuted)}>
          Sin dolor registrado en las últimas 2 semanas
        </span>
      </div>
    </div>
  )
}

const SceneRls = ({ step }) => (
  <div className="space-y-4 px-6 pb-4 pt-2">
    <Cmd cmd="rls --verificar aislamiento" step={step} />
    <div className={cx('overflow-hidden rounded-sm border', S.border, S.cardBg, vis(step, 1))}>
      <Row label="Entrenador A" value="Ve sus 8 clientes" />
      <Row label="Entrenador B" value="0 filas visibles de A" show={step >= 2} green />
    </div>
    <div className={cx('flex items-center gap-2', vis(step, 3))}>
      <i className={cx('bx bx-shield-quarter text-sm', S.green)} />
      <span className={cx('text-[0.65rem]', S.textMuted)}>
        Aislamiento confirmado por política RLS — no por confianza
      </span>
    </div>
  </div>
)

// ─── componente principal ─────────────────────────────────────────────────────

const SCENE_COMPONENTS = [
  ScenePlantilla,
  SceneInvitar,
  SceneSustitucion,
  SceneRegistro,
  SceneProgreso,
  SceneRls,
]

export const DemoPreview = () => {
  const [sceneIdx, setSceneIdx] = useState(0)
  const [step, setStep] = useState(0)

  const scene = SCENES[sceneIdx]

  useEffect(() => {
    if (step >= scene.steps) return
    const id = setTimeout(() => setStep((s) => s + 1), 900)
    return () => clearTimeout(id)
  }, [step, scene.steps])

  useEffect(() => {
    const id = setTimeout(() => {
      setSceneIdx((s) => (s + 1) % SCENES.length)
      setStep(0)
    }, scene.ms)
    return () => clearTimeout(id)
  }, [sceneIdx, scene.ms])

  const goTo = (idx) => {
    setSceneIdx(idx)
    setStep(0)
  }

  return (
    <div className="relative overflow-hidden rounded-sm border border-zinc-800 bg-[#070b0f] font-mono shadow-2xl shadow-black/60">
      <div className="pointer-events-none absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-indigo-500/40" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-indigo-500/40" />

      <div className={cx('flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-5 py-3', S.border)}>
        <span className="h-2 w-2 rounded-full bg-indigo-400" />
        <span className={cx('text-[0.58rem] uppercase tracking-widest', S.textMuted)}>
          kinovia · demo en vivo
        </span>
        <div className="ml-auto flex flex-wrap gap-1">
          {SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              className={cx(
                'flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-[0.55rem] font-bold uppercase tracking-wider transition-colors duration-200',
                i === sceneIdx
                  ? cx('border border-indigo-500/30 bg-indigo-500/15', S.accent)
                  : cx(S.textMuted, 'hover:text-zinc-400')
              )}
            >
              <i className={cx(s.icon, 'text-xs')} />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Todas las escenas en el DOM a la vez — crossfade solo con opacidad del padre,
          sin desmonte/monte no hay flash ni salto al cambiar de escena. */}
      <div className="relative h-[280px] overflow-hidden bg-[#070b0f]">
        {SCENE_COMPONENTS.map((Scene, i) => (
          <div
            key={i}
            className={cx(
              'absolute inset-0 overflow-hidden transition-opacity duration-500',
              i === sceneIdx ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
          >
            <Scene step={i === sceneIdx ? step : SCENES[i].steps} />
          </div>
        ))}
      </div>

      <div className={cx('flex gap-1.5 border-t px-5 py-3', S.border)}>
        {SCENES.map((s, i) => (
          <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{
                width: i === sceneIdx ? `${Math.min(100, (step / scene.steps) * 100)}%` : '0%',
                transition: i === sceneIdx ? 'width 900ms linear' : 'none',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default DemoPreview
