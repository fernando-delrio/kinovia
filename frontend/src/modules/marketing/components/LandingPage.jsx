import { HeroSection } from './HeroSection'
import { HighlightsSection } from './HighlightsSection'
import { WhyKinoviaSection } from './WhyKinoviaSection'
import { SubstitutionEngineSection } from './SubstitutionEngineSection'
import { DemoSection } from './DemoSection'
import { ContextGallerySection } from './ContextGallerySection'
import { PricingSection } from './PricingSection'
import { ValidationCtaSection } from './ValidationCtaSection'
import { Footer } from './Footer'

export const LandingPage = () => (
  <div className="font-sans">
    <HeroSection />
    <HighlightsSection />
    <WhyKinoviaSection />
    <SubstitutionEngineSection />
    <DemoSection />
    <ContextGallerySection />
    <PricingSection />
    <ValidationCtaSection />
    <Footer />
  </div>
)
