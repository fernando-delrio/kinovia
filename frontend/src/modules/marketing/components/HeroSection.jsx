import heroImg from '../../../assets/landing/hero.jpg'
import { Navbar } from './Navbar'

export const HeroSection = () => (
  <section className="relative overflow-hidden bg-neutral-950 px-6 pt-32 pb-16 md:px-15 md:pt-40 md:pb-24">
    <Navbar />
    <div className="absolute inset-0">
      <img src={heroImg} alt="" className="size-full object-cover opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent" />
    </div>
    <div className="relative flex max-w-lg flex-col gap-8">
      <div className="flex flex-col gap-6">
        <h1 className="text-5xl leading-[1.1] font-bold text-neutral-200 md:text-7xl">
          Entrena seguro, incluso con lesiones
        </h1>
        <p className="text-lg text-neutral-400 md:text-xl">
          Kinovia adapta cada plan a la condición física real del cliente — sin que el entrenador tenga que ser fisioterapeuta.
        </p>
      </div>
      <a href="#validacion" className="w-fit rounded-lg bg-[#4F46E5] px-6 py-3 text-sm font-semibold text-white hover:bg-[#818CF8]">
        Solicitar acceso anticipado
      </a>
    </div>
  </section>
)
