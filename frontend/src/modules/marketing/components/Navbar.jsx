import { NAV_LINKS } from '../lib/landingContent'

export const Navbar = () => (
  <nav className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-6 md:px-15">
    <span className="text-xl font-bold tracking-wide text-white">Kinovia</span>
    <ul className="hidden items-center gap-6 md:flex">
      {NAV_LINKS.map((link) => (
        <li key={link.label}>
          <a href={link.href} className="text-sm font-medium text-neutral-400 hover:text-white">
            {link.label}
          </a>
        </li>
      ))}
    </ul>
    <a href="#validacion" className="rounded-lg bg-[#4F46E5] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#818CF8]">
      Solicitar acceso
    </a>
  </nav>
)
