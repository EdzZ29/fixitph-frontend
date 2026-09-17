import { SiteHeader } from "@/components/site/site-header";
import { Hero } from "@/components/site/hero";
import { ServiceCategories } from "@/components/site/service-categories";
import { HowItWorks } from "@/components/site/how-it-works";
import { WhyFixItPH } from "@/components/site/why-fixitph";
import { FeaturedProviders } from "@/components/site/featured-providers";
import { Coverage } from "@/components/site/coverage";
import { ProviderCta } from "@/components/site/provider-cta";
import { SiteFooter } from "@/components/site/site-footer";

export default function HomePage() {
  return (
    <>
      <a
        href="#main"
        className="bg-primary text-primary-foreground sr-only rounded-md px-4 py-2 font-medium focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100]"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main id="main" className="flex-1">
        <Hero />
        <ServiceCategories />
        <HowItWorks />
        <WhyFixItPH />
        <FeaturedProviders />
        <Coverage />
        <ProviderCta />
      </main>

      <SiteFooter />
    </>
  );
}
