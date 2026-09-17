import { SectionHeading } from "@/components/site/section-heading";
import { CoverageMap } from "@/components/site/coverage-map";

export function Coverage() {
  return (
    <section
      id="coverage"
      aria-labelledby="coverage-heading"
      className="border-border bg-secondary/60 border-b scroll-mt-28"
    >
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8">
        <SectionHeading
          id="coverage-heading"
          title="Where FixItPH works right now"
          lead="We open a city only once there are enough verified providers to answer a request the same week. If your town is not listed, post the job anyway and we route it to the nearest covered city with the travel charge shown up front."
        />
        <div className="mt-10">
          <CoverageMap />
        </div>
      </div>
    </section>
  );
}
