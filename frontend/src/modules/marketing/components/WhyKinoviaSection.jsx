import why1 from '../../../assets/landing/why-1.jpg'
import why2 from '../../../assets/landing/why-2.jpg'
import why3 from '../../../assets/landing/why-3.jpg'
import { FEATURES } from '../lib/landingContent'

const FeatureItem = ({ icon, title, description }) => (
  <div className="flex gap-6">
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#5B7B6B]">
      <i className={`bx ${icon} text-lg text-white`} />
    </span>
    <div className="flex flex-col gap-3">
      <p className="text-xl font-medium text-[#23241F]">{title}</p>
      <p className="text-neutral-500">{description}</p>
    </div>
  </div>
)

export const WhyKinoviaSection = () => (
  <section id="por-que-kinovia" className="flex flex-col items-center gap-15 bg-[#F7F5F0] px-6 py-20 md:px-15">
    <div className="flex max-w-2xl flex-col items-center gap-4 text-center">
      <h2 className="text-4xl font-bold text-[#23241F] md:text-5xl">Por qué Kinovia</h2>
      <p className="text-xl text-neutral-500">
        Un genérico de gestión de entrenadores no sabe qué hacer con un cliente lesionado. Kinovia sí.
      </p>
    </div>
    <div className="flex flex-col items-center gap-12 md:flex-row">
      <div className="grid grid-cols-1 gap-x-12 gap-y-15 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <FeatureItem key={feature.title} {...feature} />
        ))}
      </div>
      <div className="flex gap-6">
        <img src={why1} alt="" className="h-[410px] w-[220px] rounded-2xl object-cover shadow-lg" />
        <div className="flex flex-col gap-6">
          <img src={why2} alt="" className="h-[192px] w-[205px] rounded-2xl object-cover shadow-lg" />
          <img src={why3} alt="" className="h-[192px] w-[205px] rounded-2xl object-cover shadow-lg" />
        </div>
      </div>
    </div>
  </section>
)
