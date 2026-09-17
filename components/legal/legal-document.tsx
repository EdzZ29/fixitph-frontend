import Link from "next/link";
import { CalendarClock, Info } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { TableOfContents } from "./table-of-contents";
import type { LegalBlock, LegalDocument } from "@/lib/legal/types";

/**
 * Renders a legal document from data. Both /terms and /privacy use this, so
 * anchors, heading levels, spacing and the table of contents stay identical
 * between them and the wording stays in lib/legal.
 */
export function LegalDocumentView({
  document: doc,
  counterpart,
}: {
  document: LegalDocument;
  /** The other legal page, linked from the header and the footer note. */
  counterpart: { href: string; label: string };
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14 lg:px-8">
      <header className="mx-auto max-w-3xl lg:mx-0">
        <h1 className="text-4xl font-extrabold text-balance sm:text-5xl">
          {doc.title}
        </h1>
        <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
          {doc.summary}
        </p>

        <dl className="text-muted-foreground mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4" aria-hidden />
            <dt className="sr-only">Last updated</dt>
            <dd>
              Last updated{" "}
              <time dateTime={toIsoDate(doc.lastUpdated)} className="text-foreground font-medium">
                {doc.lastUpdated}
              </time>
            </dd>
          </div>
          <div>
            <dt className="sr-only">Effective date</dt>
            <dd>
              Effective{" "}
              <time dateTime={toIsoDate(doc.effectiveDate)} className="text-foreground font-medium">
                {doc.effectiveDate}
              </time>
            </dd>
          </div>
        </dl>

        <p className="mt-6 text-sm">
          See also{" "}
          <Link href={counterpart.href} className="link-lime">
            {counterpart.label}
          </Link>
          .
        </p>

        {/* Stated plainly rather than buried: this wording has not been through
            a lawyer, and anyone reading it should know that. */}
        <div className="border-border bg-secondary mt-8 flex gap-3 rounded-md border p-4">
          <Info className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden />
          <p className="text-muted-foreground text-sm leading-relaxed">
            <span className="text-foreground font-semibold">Development draft.</span>{" "}
            This document has not yet been reviewed by a Philippine lawyer or privacy
            professional. It is written to be reviewed and replaced before launch, and
            it is not legal advice.
          </p>
        </div>
      </header>

      <div className="mt-12 lg:grid lg:grid-cols-12 lg:gap-12">
        <TableOfContents sections={doc.sections} className="lg:col-span-4" />

        <article className="mx-auto max-w-3xl lg:col-span-8 lg:mx-0">
          {doc.sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              // Clears the sticky header when jumped to from the contents.
              className="scroll-mt-28 border-border border-t py-8 first:border-t-0 first:pt-0"
            >
              <h2 className="text-2xl font-bold">
                <span className="text-muted-foreground mr-3 font-normal tabular-nums">
                  {index + 1}.
                </span>
                {section.title}
              </h2>

              <Blocks blocks={section.blocks} />

              {section.subsections?.map((sub) => (
                <div key={sub.id} id={sub.id} className="mt-6 scroll-mt-28">
                  <h3 className="text-lg font-semibold">{sub.title}</h3>
                  <Blocks blocks={sub.blocks} />
                </div>
              ))}
            </section>
          ))}

          <Separator className="my-8" />

          <p className="text-muted-foreground text-sm leading-relaxed">
            This page forms part of the FixItPH{" "}
            <Link href="/terms" className="link-lime">
              Terms and Conditions
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="link-lime">
              Privacy Policy
            </Link>
            . If anything here is unclear, ask us before you rely on it.
          </p>
        </article>
      </div>
    </div>
  );
}

function Blocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === 'list') {
          return (
            <ul key={i} className="text-muted-foreground mt-4 space-y-2.5 text-[15px] leading-relaxed">
              {(block.items ?? []).map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="bg-accent mt-2 size-1.5 shrink-0 rounded-full" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'note') {
          return (
            <p
              key={i}
              className="border-accent bg-secondary/60 text-foreground mt-4 border-l-2 py-2 pl-4 text-[15px] leading-relaxed"
            >
              {block.text}
            </p>
          );
        }

        return (
          <p key={i} className="text-muted-foreground mt-4 text-[15px] leading-relaxed">
            {block.text}
          </p>
        );
      })}
    </>
  );
}

/** "17 September 2026" to "2026-09-17", for the datetime attribute. */
function toIsoDate(value: string): string {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed)
    ? value
    : new Date(parsed).toISOString().slice(0, 10);
}
