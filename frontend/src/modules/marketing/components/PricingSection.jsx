import { cx } from '../../core/lib/cx'
import { PRICING_PLANS } from '../lib/landingContent'

const cardClass = (highlighted) =>
  highlighted
    ? 'flex w-full max-w-[380px] flex-col justify-between gap-8 rounded-2xl bg-[#5B7B6B] p-7 text-white shadow-lg'
    : 'flex w-full max-w-[380px] flex-col justify-between gap-8 rounded-2xl border border-neutral-200 bg-white p-7 shadow-lg'

const buttonClass = (highlighted) =>
  highlighted
    ? 'w-full rounded-2xl bg-white py-4 text-center font-bold text-[#5B7B6B]'
    : 'w-full rounded-2xl bg-[#5B7B6B] py-4 text-center font-bold text-white hover:bg-[#8FA895]'

const PlanCard = ({ name, price, description, features, highlighted }) => (
  <div className={cardClass(highlighted)}>
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <p className={highlighted ? 'text-neutral-50' : 'text-neutral-500'}>{name}</p>
        <p className="text-4xl font-bold">{price}</p>
        <p className={highlighted ? 'text-sm text-neutral-300' : 'text-sm text-neutral-500'}>{description}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <i className={cx('bx bx-check-circle mt-0.5 text-lg', highlighted ? 'text-white/80' : 'text-[#5B7B6B]')} />
            <span className={highlighted ? 'text-neutral-100' : 'text-neutral-700'}>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
    <button type="button" className={buttonClass(highlighted)}>
      Avisadme cuando esté disponible
    </button>
  </div>
)

export const PricingSection = () => (
  <section id="precios" className="flex flex-col items-center gap-15 bg-[#F7F5F0] px-6 py-20 md:px-15">
    <div className="flex max-w-2xl flex-col items-center gap-4 text-center">
      <p className="text-2xl text-neutral-500">Precios</p>
      <h2 className="text-4xl font-bold tracking-wide text-[#23241F] uppercase md:text-5xl">Así lo pensamos</h2>
      <p className="text-lg text-neutral-500">
        Aún sin confirmar — estamos validando con entrenadores reales antes de cerrar precio y planes.
      </p>
    </div>
    <div className="flex flex-col items-center gap-8 md:flex-row md:items-stretch">
      {PRICING_PLANS.map((plan) => (
        <PlanCard key={plan.name} {...plan} />
      ))}
    </div>
  </section>
)
