"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Check } from "lucide-react";

import { SectionHeading } from "@/components/site/section-heading";
import { steps } from "@/lib/site-data";
import { cn } from "cn";

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function focusTab(index: number) {
    const next = (index + steps.length) % steps.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusTab(active + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusTab(active - 1);
        break;
      case "Home":
        event.preventDefault();
        focusTab(0);
        break;
      case "End":
        event.preventDefault();
        focusTab(steps.length - 1);
        break;
    }
  }

  const current = steps[active];

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="border-border bg-secondary/60 border-b scroll-mt-28"
    >
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 lg:px-8">
        <SectionHeading
          id="how-heading"
          title="From a leaking pipe to a paid receipt"
          lead="Five steps, in order. You can stop after the quote if the price is not right, and nothing is charged either way."
        />

        {/* The rail carries progress, so the sequence is the visual, not five
            identical numbered circles. */}
        <div className="mt-12">
          <div
            role="tablist"
            aria-label="How FixItPH works"
            aria-orientation="horizontal"
            onKeyDown={handleKeyDown}
            className="relative grid grid-cols-5"
          >
            {/* Track */}
            <div
              aria-hidden
              className="bg-border absolute top-[13px] right-[10%] left-[10%] h-0.5 dark:bg-white/15"
            />
            {/* Progress up to the active step */}
            <div
              aria-hidden
              className="bg-primary absolute top-[13px] left-[10%] h-0.5 transition-[width] duration-300"
              style={{ width: `${(active / (steps.length - 1)) * 80}%` }}
            />

            {steps.map((step, index) => {
              const isActive = index === active;
              const isDone = index < active;
              return (
                <button
                  key={step.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  role="tab"
                  id={`step-tab-${step.id}`}
                  aria-selected={isActive}
                  aria-controls={`step-panel-${step.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActive(index)}
                  className="group relative flex cursor-pointer flex-col items-center gap-2.5 rounded-md py-1 focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-md border-2 transition-colors",
                      isActive &&
                        "border-accent bg-accent text-accent-foreground",
                      isDone && "border-primary bg-primary text-primary-foreground",
                      !isActive &&
                        !isDone &&
                        "border-border bg-background text-muted-foreground group-hover:border-primary",
                    )}
                  >
                    {isDone ? (
                      <Check className="size-4" aria-hidden />
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "px-1 text-center text-[11px] leading-tight font-semibold transition-colors sm:text-sm",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    <span className="sm:hidden">{step.shortLabel}</span>
                    <span className="hidden sm:inline">{step.label}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {steps.map((step, index) => (
            <div
              key={step.id}
              role="tabpanel"
              id={`step-panel-${step.id}`}
              aria-labelledby={`step-tab-${step.id}`}
              hidden={index !== active}
              tabIndex={0}
              className="border-border bg-card mt-8 grid gap-6 rounded-lg border-2 p-6 focus-visible:outline-2 focus-visible:outline-offset-2 sm:p-8 lg:grid-cols-12 lg:gap-10"
            >
              <div className="lg:col-span-7">
                <p className="text-muted-foreground text-sm font-medium">
                  Step {index + 1} of {steps.length}
                </p>
                <h3 className="mt-2 text-xl font-bold text-balance sm:text-2xl">
                  {step.headline}
                </h3>
                <p className="text-muted-foreground mt-3 leading-relaxed">
                  {step.body}
                </p>
              </div>

              <div className="border-border bg-secondary/70 rounded-md border p-5 lg:col-span-5">
                <p className="text-muted-foreground text-sm font-medium">
                  What this means in practice
                </p>
                <p className="mt-2 leading-relaxed font-semibold">
                  {step.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Announced to screen readers, not shown, so the tablist behaves the
            way sighted users already see it behave. */}
        <p aria-live="polite" className="sr-only">
          Showing step {active + 1} of {steps.length}: {current.label}.
        </p>
      </div>
    </section>
  );
}
