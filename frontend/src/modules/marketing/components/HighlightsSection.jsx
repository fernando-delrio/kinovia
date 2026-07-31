import { HIGHLIGHTS } from '../lib/landingContent'

export const HighlightsSection = () => (
  <section className="flex flex-col items-center justify-between gap-8 bg-neutral-950 px-6 py-10 md:flex-row md:px-15">
    {HIGHLIGHTS.map((item) => (
      <div key={item.label} className="flex flex-col items-center gap-1 text-center">
        <p className="text-3xl font-bold text-[#818CF8]">{item.value}</p>
        <p className="text-sm font-medium text-neutral-400">{item.label}</p>
      </div>
    ))}
  </section>
)
