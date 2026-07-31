import footerBg from '../../../assets/landing/footer-bg.jpg'
import { FOOTER_LINK_GROUPS } from '../lib/landingContent'

export const Footer = () => (
  <footer className="bg-[#F7F5F0]">
    <div className="relative flex h-72 items-center justify-center overflow-hidden text-center text-white">
      <img src={footerBg} alt="" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-black/65" />
      <div className="relative flex flex-col gap-4">
        <p className="text-2xl font-medium">¿Tienes preguntas?</p>
        <a href="mailto:melacrujo@gmail.com" className="text-3xl font-bold">melacrujo@gmail.com</a>
      </div>
    </div>
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 md:flex-row md:justify-between md:px-15">
      <div className="flex flex-col gap-6">
        <span className="text-xl font-bold text-[#23241F]">Kinovia</span>
        <p className="max-w-xs text-[#23241F]/80">
          SaaS vertical para entrenadores personales — planes seguros para clientes con condiciones físicas reales.
        </p>
      </div>
      <div className="flex gap-16">
        {FOOTER_LINK_GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-6">
            <p className="text-lg font-medium text-[#23241F]">{group.title}</p>
            <ul className="flex flex-col gap-3 text-[#23241F]/60">
              {group.links.map((link) => (
                <li key={link}>{link}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </footer>
)
