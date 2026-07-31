import t1 from '../../../assets/landing/trainer-1.jpg'
import t2 from '../../../assets/landing/trainer-2.jpg'
import t3 from '../../../assets/landing/trainer-3.jpg'
import t4 from '../../../assets/landing/trainer-4.jpg'
import t5 from '../../../assets/landing/trainer-5.jpg'
import t6 from '../../../assets/landing/trainer-6.jpg'

const GALLERY_IMAGES = [t1, t2, t3, t4, t5, t6]

export const ContextGallerySection = () => (
  <section className="flex flex-col items-center gap-15 bg-[#F7F5F0] px-6 py-20 md:px-15">
    <div className="flex max-w-2xl flex-col items-center gap-4 text-center">
      <h2 className="text-4xl font-bold text-[#23241F] md:text-5xl">Hecho para el entrenamiento real</h2>
      <p className="text-xl text-neutral-500">
        Fuerza, movilidad, rehabilitación — el mismo modelo de plantilla sirve para cualquier objetivo.
      </p>
    </div>
    <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
      {GALLERY_IMAGES.map((src) => (
        <img key={src} src={src} alt="" className="h-36 w-full rounded-xl object-cover sm:h-48 md:h-72" />
      ))}
    </div>
  </section>
)
