import coach1 from '../../../assets/landing/coach-1.jpg'
import coach2 from '../../../assets/landing/coach-2.jpg'

export const SubstitutionEngineSection = () => (
  <section id="motor-sustitucion" className="flex flex-col items-center gap-20 bg-[#F7F5F0] px-6 py-20 md:flex-row md:px-15">
    <div className="flex gap-4">
      <img src={coach1} alt="" className="h-72 w-44 rounded-2xl object-cover shadow-lg" />
      <img src={coach2} alt="" className="h-72 w-44 rounded-2xl object-cover shadow-lg" />
    </div>
    <div className="flex max-w-lg flex-col gap-8">
      <div className="flex flex-col gap-4">
        <p className="text-2xl text-neutral-500">¿Tienes un cliente con lesión o limitación?</p>
        <h2 className="text-4xl font-bold text-[#23241F] md:text-5xl">El motor de sustitución</h2>
      </div>
      <p className="text-xl text-neutral-500">
        Cada ejercicio de riesgo documenta el porqué clínico concreto, la alternativa exacta y por qué esa
        alternativa entrena lo mismo sin el riesgo — no es una nota manual, es parte del dato de la plantilla.
      </p>
      <a href="#por-que-kinovia" className="w-fit rounded-lg bg-[#5B7B6B] px-6 py-3 text-sm font-semibold text-white hover:bg-[#8FA895]">
        Saber más
      </a>
    </div>
  </section>
)
