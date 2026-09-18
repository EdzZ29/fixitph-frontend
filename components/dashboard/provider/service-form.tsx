"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ActionError,
  ErrorState,
  GateCard,
  LoadingRows,
  PageHeader,
  Spinner,
} from "@/components/dashboard/states";
import {
  categories as categoriesApi,
  services,
  type CategoryNode,
  type OwnService,
  type PricingType,
  type ServiceStatus,
} from "@/lib/api/client";
import { useCurrentUser } from "@/lib/auth/session";
import { VerifyReminder } from "@/components/dashboard/provider/verify-reminder";
import { PRICING_LABEL } from "@/lib/format";
import { useAction, useQuery } from "@/lib/use-query";

/**
 * Create or edit one listing.
 *
 * The pricing rules here are not this form's invention. The API checks them
 * (services.service.ts) and Postgres CHECK constraints enforce them under
 * that, which means a mismatch would come back as a 400 with a code like
 * PRICE_UNIT_REQUIRED. Validating the same rules up front is the difference
 * between "Hourly pricing needs the unit named" appearing next to the field
 * and appearing as a red banner after a round trip:
 *
 *   - QUOTE_REQUIRED carries no price at all;
 *   - every other type requires one;
 *   - HOURLY and PER_UNIT require the unit to be named;
 *   - a price band cannot run backwards.
 */

const PRICING_TYPES: PricingType[] = [
  "FIXED",
  "HOURLY",
  "PER_UNIT",
  "QUOTE_REQUIRED",
];

const UNIT_PLACEHOLDER: Partial<Record<PricingType, string>> = {
  HOURLY: "hour",
  PER_UNIT: "split-type unit",
};

interface FormState {
  categoryId: string;
  title: string;
  description: string;
  pricingType: PricingType;
  price: string;
  priceUnit: string;
  minPrice: string;
  maxPrice: string;
  durationMinutes: string;
}

const EMPTY: FormState = {
  categoryId: "",
  title: "",
  description: "",
  pricingType: "FIXED",
  price: "",
  priceUnit: "",
  minPrice: "",
  maxPrice: "",
  durationMinutes: "",
};

export function ServiceForm({ serviceId }: { serviceId?: string }) {
  const user = useCurrentUser();
  const router = useRouter();

  const categories = useQuery(() => categoriesApi.tree(), []);

  // An edit loads the provider's own copy of the listing, which is the only
  // read that includes a draft.
  const existing = useQuery(
    () => (serviceId ? services.mineById(serviceId) : Promise.resolve(null)),
    [serviceId],
  );

  const [form, setForm] = useState<FormState>(EMPTY);
  /**
   * Whether the form has been filled from the loaded listing. For a create it
   * starts true, because there is nothing to wait for.
   *
   * This is not the same as "the query has settled", which is what the
   * not-found branch below keys off. Conflating the two is how an edit for a
   * listing that could not be loaded used to fall through to a blank form
   * titled "Edit service" — and saving that blank form overwrote the real row.
   */
  const [hydrated, setHydrated] = useState(!serviceId);
  const [touched, setTouched] = useState(false);
  const { run, pending, error } = useAction();

  // Seeded the moment the listing arrives, during render rather than in an
  // effect, so the fields are never briefly blank over data that is already
  // loaded. The hydrated flag makes it happen exactly once, which is what
  // stops a later refetch overwriting what the user has typed.
  if (serviceId && !hydrated && existing.data) {
    setForm(toFormState(existing.data));
    setHydrated(true);
  }

  const verified = user.provider?.verificationStatus === "APPROVED";

  if (!user.provider) {
    return (
      <GateCard
        title="Create your provider profile first"
        description="A listing belongs to a provider profile. Set one up and you can start adding services."
        href="/provider"
        cta="Go to my dashboard"
      />
    );
  }

  if (serviceId && existing.loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Edit service" />
        <LoadingRows rows={4} />
      </div>
    );
  }

  if (serviceId && existing.error) {
    return (
      <div className="space-y-5">
        <BackLink />
        <ErrorState error={existing.error} onRetry={existing.reload} />
      </div>
    );
  }

  // The query has finished and produced nothing: the listing is gone, or it
  // belongs to another account. Never fall through to the form.
  if (serviceId && !existing.loading && !existing.error && !existing.data) {
    return (
      <div className="space-y-5">
        <BackLink />
        <GateCard
          title="Listing not found"
          description="It may have been archived, or it belongs to another account."
          href="/provider/services"
          cta="Back to my services"
        />
      </div>
    );
  }

  const problems = validate(form);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const quoteOnly = form.pricingType === "QUOTE_REQUIRED";
  const needsUnit =
    form.pricingType === "HOURLY" || form.pricingType === "PER_UNIT";

  async function submit(event: FormEvent, status: ServiceStatus) {
    event.preventDefault();
    setTouched(true);
    if (Object.keys(problems).length) return;

    const payload = {
      categoryId: form.categoryId,
      title: form.title.trim(),
      description: form.description.trim(),
      pricingType: form.pricingType,
      // A quote-only listing must carry no price, and saying so explicitly
      // is the only way to clear one that is already stored: an omitted
      // field leaves the old price in place, which the API then rejects as
      // incoherent with QUOTE_REQUIRED.
      price: quoteOnly ? null : Number(form.price),
      ...(needsUnit ? { priceUnit: form.priceUnit.trim() } : {}),
      ...(form.minPrice ? { minPrice: Number(form.minPrice) } : {}),
      ...(form.maxPrice ? { maxPrice: Number(form.maxPrice) } : {}),
      ...(form.durationMinutes
        ? { durationMinutes: Number(form.durationMinutes) }
        : {}),
      status,
    };

    const result = await run(() =>
      serviceId ? services.update(serviceId, payload) : services.create(payload),
    );

    if (result !== null) router.push("/provider/services");
  }

  // A problem is only shown once the field has been left, so the form does
  // not start out red.
  const show = (key: keyof FormState): string | undefined =>
    touched ? problems[key] : undefined;

  return (
    <div className="space-y-5">
      <BackLink />

      <PageHeader
        title={serviceId ? "Edit service" : "New service"}
        description={
          serviceId
            ? "Changes are live as soon as you save a published listing."
            : "Describe one thing you do, and what it costs."
        }
      />

<VerifyReminder />

      <form className="max-w-2xl space-y-5" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="title">What is the service?</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(event) => set("title", event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={!!show("title") || undefined}
            aria-describedby="title-hint"
            placeholder="Split-type aircon cleaning"
            maxLength={160}
          />
          <FieldHint id="title-hint" error={show("title")}>
            The name a customer searches for. 3 to 160 characters.
          </FieldHint>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="categoryId">Category</Label>
          {categories.loading ? (
            <Input disabled placeholder="Loading categories" />
          ) : (
            <Select
              id="categoryId"
              value={form.categoryId}
              onChange={(event) => set("categoryId", event.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={!!show("categoryId") || undefined}
              aria-describedby="category-hint"
            >
              <option value="">Choose a category</option>
              {flatten(categories.data ?? []).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
          <FieldHint id="category-hint" error={show("categoryId")}>
            Where this sits in the directory.
          </FieldHint>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">What does the job involve?</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={!!show("description") || undefined}
            aria-describedby="description-hint"
            rows={5}
            maxLength={5000}
            placeholder="What you do, what is included, what the customer needs to have ready."
          />
          <FieldHint id="description-hint" error={show("description")}>
            At least 20 characters. {form.description.trim().length} so far.
          </FieldHint>
        </div>

        <fieldset className="space-y-4">
          <legend className="font-heading text-base font-medium">Pricing</legend>

          <div className="space-y-1.5">
            <Label htmlFor="pricingType">How do you charge?</Label>
            <Select
              id="pricingType"
              value={form.pricingType}
              onChange={(event) =>
                set("pricingType", event.target.value as PricingType)
              }
            >
              {PRICING_TYPES.map((type) => (
                <option key={type} value={type}>
                  {PRICING_LABEL[type]}
                </option>
              ))}
            </Select>
          </div>

          {quoteOnly ? (
            <p className="text-muted-foreground text-sm">
              A quote-only listing shows no price. Customers send a request and
              you reply with a figure for their job.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="price">
                  {form.pricingType === "FIXED" ? "Price" : "Rate"}
                </Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(event) => set("price", event.target.value)}
                  onBlur={() => setTouched(true)}
                  aria-invalid={!!show("price") || undefined}
                  aria-describedby="price-hint"
                  placeholder="1500"
                />
                <FieldHint id="price-hint" error={show("price")}>
                  In pesos.
                </FieldHint>
              </div>

              {needsUnit ? (
                <div className="space-y-1.5">
                  <Label htmlFor="priceUnit">Per what?</Label>
                  <Input
                    id="priceUnit"
                    value={form.priceUnit}
                    onChange={(event) => set("priceUnit", event.target.value)}
                    onBlur={() => setTouched(true)}
                    aria-invalid={!!show("priceUnit") || undefined}
                    aria-describedby="unit-hint"
                    placeholder={UNIT_PLACEHOLDER[form.pricingType]}
                    maxLength={40}
                  />
                  <FieldHint id="unit-hint" error={show("priceUnit")}>
                    Shown as “{form.priceUnit || UNIT_PLACEHOLDER[form.pricingType]}”
                    after the rate.
                  </FieldHint>
                </div>
              ) : null}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="minPrice">
                Typical from{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="minPrice"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={form.minPrice}
                onChange={(event) => set("minPrice", event.target.value)}
                placeholder="1200"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxPrice">
                Typical up to{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="maxPrice"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={form.maxPrice}
                onChange={(event) => set("maxPrice", event.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={!!show("maxPrice") || undefined}
                aria-describedby="band-hint"
                placeholder="2500"
              />
              <FieldHint id="band-hint" error={show("maxPrice")}>
                Sets expectations when a job varies.
              </FieldHint>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="durationMinutes">
                Usual length{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="durationMinutes"
                type="number"
                min={5}
                max={10080}
                step={5}
                inputMode="numeric"
                value={form.durationMinutes}
                onChange={(event) => set("durationMinutes", event.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={!!show("durationMinutes") || undefined}
                aria-describedby="duration-hint"
                placeholder="90"
              />
              <FieldHint id="duration-hint" error={show("durationMinutes")}>
                Minutes.
              </FieldHint>
            </div>
          </div>
        </fieldset>

        <ActionError message={error} />

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="submit"
            variant="accent"
            size="lg"
            disabled={pending || !verified}
            onClick={(event) => void submit(event, "ACTIVE")}
            title={
              verified
                ? undefined
                : "Your documents have to be approved before a listing can go live."
            }
          >
            {pending ? <Spinner /> : <Save aria-hidden />}
            {serviceId ? "Save and publish" : "Publish"}
          </Button>
          <Button
            type="submit"
            variant="outline"
            size="lg"
            disabled={pending}
            onClick={(event) => void submit(event, "DRAFT")}
          >
            Save as draft
          </Button>
          <Button asChild variant="ghost" size="lg" disabled={pending}>
            <Link href="/provider/services">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

/**
 * Mirrors the API's rules, keyed by field so each message lands next to the
 * input it is about.
 */
function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const problems: Partial<Record<keyof FormState, string>> = {};

  const title = form.title.trim();
  if (title.length < 3) problems.title = "Give it a name of at least 3 characters.";

  if (!form.categoryId) problems.categoryId = "Choose a category.";

  if (form.description.trim().length < 20) {
    problems.description = "Describe the work in at least 20 characters.";
  }

  if (form.pricingType !== "QUOTE_REQUIRED") {
    const price = Number(form.price);
    if (!form.price || !Number.isFinite(price) || price < 0) {
      problems.price = "A price is required unless the listing is quote-only.";
    }
    if (
      (form.pricingType === "HOURLY" || form.pricingType === "PER_UNIT") &&
      !form.priceUnit.trim()
    ) {
      problems.priceUnit = 'Name the unit, for example "hour".';
    }
  }

  if (form.minPrice && form.maxPrice) {
    if (Number(form.minPrice) > Number(form.maxPrice)) {
      problems.maxPrice = "The upper figure is below the lower one.";
    }
  }

  if (form.durationMinutes) {
    const minutes = Number(form.durationMinutes);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 10_080) {
      problems.durationMinutes = "Between 5 minutes and 7 days.";
    }
  }

  return problems;
}

function toFormState(service: OwnService): FormState {
  return {
    categoryId: service.category.id,
    title: service.title,
    description: service.description,
    pricingType: service.pricingType,
    price: service.price ?? "",
    priceUnit: service.priceUnit ?? "",
    minPrice: service.minPrice ?? "",
    maxPrice: service.maxPrice ?? "",
    durationMinutes: service.durationMinutes
      ? String(service.durationMinutes)
      : "",
  };
}

/** Flattens the category tree into indented options for a native select. */
function flatten(
  nodes: CategoryNode[],
  depth = 0,
): { id: string; label: string }[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${"— ".repeat(depth)}${node.name}` },
    ...flatten(node.children ?? [], depth + 1),
  ]);
}

function FieldHint({
  id,
  error,
  children,
}: {
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      id={id}
      className={error ? "text-destructive text-sm" : "text-muted-foreground text-sm"}
    >
      {error ?? children}
    </p>
  );
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2">
      <Link href="/provider/services">
        <ArrowLeft aria-hidden />
        My services
      </Link>
    </Button>
  );
}
