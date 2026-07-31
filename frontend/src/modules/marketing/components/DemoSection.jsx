import { DemoPreview } from './DemoPreview'

export const DemoSection = () => (
  <section className="flex flex-col items-center gap-12 bg-neutral-950 px-6 py-20 md:px-15">
    <div className="flex max-w-2xl flex-col items-center gap-4 text-center">
      <h2 className="text-4xl font-bold text-neutral-100 md:text-5xl">Así funciona</h2>
      <p className="text-xl text-neutral-400">
        Del alta de la plantilla al registro del cliente, con el motor de sustitución en medio.
      </p>
    </div>
    <div className="w-full max-w-2xl">
      <DemoPreview />
    </div>
  </section>
)
