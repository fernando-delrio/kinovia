import avatar1 from '../../../assets/landing/avatar-1.jpg'
import avatar2 from '../../../assets/landing/avatar-2.jpg'
import avatar3 from '../../../assets/landing/avatar-3.jpg'
import avatar4 from '../../../assets/landing/avatar-4.jpg'

export const ValidationCtaSection = () => (
  <section id="validacion" className="flex flex-col items-center gap-15 bg-[#F7F5F0] px-6 py-20 md:flex-row md:items-center md:justify-between md:px-15">
    <div className="grid w-64 shrink-0 grid-cols-2 gap-4">
      <img src={avatar1} alt="" className="size-28 rounded-full object-cover" />
      <img src={avatar2} alt="" className="size-24 translate-y-6 rounded-full object-cover justify-self-end" />
      <img src={avatar3} alt="" className="size-32 rounded-full object-cover" />
      <img src={avatar4} alt="" className="size-20 rounded-full object-cover justify-self-end" />
    </div>
    <div className="flex max-w-xl flex-col gap-6">
      <p className="text-2xl text-neutral-500">Todavía no tenemos clientes — y eso es intencional</p>
      <h2 className="text-4xl font-bold text-[#23241F] md:text-5xl">¿Eres entrenador personal?</h2>
      <p className="text-lg text-neutral-500">
        Antes de construir el editor de plantillas a fondo, queremos hablar con 15-20 entrenadores reales sobre
        cómo adaptáis hoy los planes a clientes con lesiones. 15 minutos, sin compromiso.
      </p>
      <a
        href="mailto:melacrujo@gmail.com?subject=Quiero%20hablar%20sobre%20Kinovia"
        className="w-fit rounded-lg bg-[#5B7B6B] px-6 py-3 text-sm font-semibold text-white hover:bg-[#8FA895]"
      >
        Quiero ayudar a validarlo
      </a>
    </div>
  </section>
)
