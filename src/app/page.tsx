import { Hero } from '@/components/landing/Hero';
import { FeatureBento } from '@/components/landing/FeatureBento';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Footer } from '@/components/landing/Footer';

export default function Home() {
  return (
    <>
      <Hero />
      <FeatureBento />
      <HowItWorks />
      <Footer />
    </>
  );
}
