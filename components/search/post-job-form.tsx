"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CircleCheck, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ActionError, Spinner } from "@/components/dashboard/states";
import {
  categories as categoriesApi,
  providers as providersApi,
  serviceRequests,
  type CategoryNode,
  type RequestUrgency,
} from "@/lib/api/client";
import { useSession } from "@/lib/auth/session";
import { toDateTimeInputValue } from "@/lib/format";
import { useAction, useQuery } from "@/lib/use-query";

/**
 * Posting a job — requirement five, and the "Request Quote / Book" step.
 *
 * Two shapes, one form. With `providerId` in the query it is a direct request
 * to one provider, sent from their profile or a listing. Without it, the job
 * is broadcast and any verified provider in the area can quote, which is what
 * the provider-side feed reads.
 *
 * The address is asked for but is not released to the provider until a
 * booking is confirmed — the API serves it through a view that withholds it,
 * so this form can promise that and mean it.
 */

const URGENCIES: { value: RequestUrgency; label: string; hint: string }[] = [
  { value: "FLEXIBLE", label: "Whenever", hint: "No particular rush" },
  { value: "WITHIN_WEEK", label: "This week", hint: "Within seven days" },
  { value: "WITHIN_48H", label: "Within two days", hint: "Soon, but it can wait a day" },
  { value: "EMERGENCY", label: "Emergency", hint: "Today. Water, power or safety" },
];

export function PostJobForm() {
  const params = useSearchParams();
  const { state } = useSession();

  const providerId = params.get("providerId") ?? "";
  const serviceId = params.get("serviceId") ?? "";

  const categories = useQuery(() => categoriesApi.tree(), []);

  // Only when the request is aimed at someone, so the form can name them.
  const provider = useQuery(
    () => (providerId ? providersApi.profile(providerId) : Promise.resolve(null)),
    [providerId],
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(params.get("categoryId") ?? "");
  const [urgency, setUrgency] = useState<RequestUrgency>("WITHIN_WEEK");
  const [city, setCity] = useState("");
  const [barangay, setBarangay] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [preferredAt, setPreferredAt] = useState("");
  const [touched, setTouched] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const { run, pending, error } = useAction();

  // Prefill the city from the signed-in profile, once, without an effect.
  const [seeded, setSeeded] = useState(false);
  if (!seeded && state.status === "authenticated") {
    setSeeded(true);
    if (state.user.profile?.city) setCity(state.user.profile.city);
    if (state.user.profile?.barangay) setBarangay(state.user.profile.barangay);
  }

  const problems = validate({
    title,
    description,
    categoryId,
    city,
    budgetMin,
    budgetMax,
  });
  const show = (key: keyof typeof problems) =>
    touched ? problems[key] : undefined;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (Object.keys(problems).length) return;

    const result = await run(() =>
      serviceRequests.create({
        categoryId,
        title: title.trim(),
        description: description.trim(),
        urgency,
        city: city.trim(),
        ...(barangay.trim() ? { barangay: barangay.trim() } : {}),
        ...(addressLine1.trim() ? { addressLine1: addressLine1.trim() } : {}),
        ...(budgetMin ? { budgetMin: Number(budgetMin) } : {}),
        ...(budgetMax ? { budgetMax: Number(budgetMax) } : {}),
        // A cleared datetime-local is "", which is not a date at all.
        ...(preferredAt
          ? { preferredAt: new Date(preferredAt).toISOString() }
          : {}),
        ...(providerId ? { providerId } : {}),
        ...(serviceId ? { serviceId } : {}),
      }),
    );

    if (result) setCreatedId(result.id);
  }

  // -- signed out: the API requires an account, so say so before they type --
  if (state.status === "anonymous") {
    const next = `/post-job?${params.toString()}`;
    return (
      <div className="border-border mx-auto max-w-lg rounded-lg border p-6">
        <h1 className="font-heading text-2xl font-semibold">Post a job</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          You need an account to post a job, so providers can reply to you and
          you can keep track of the quotes.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="accent" className="h-11 px-5">
            <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 px-5">
            <Link href={`/register?next=${encodeURIComponent(next)}`}>
              Create an account
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // -- done ----------------------------------------------------------------
  if (createdId) {
    return (
      <div className="border-border mx-auto max-w-lg rounded-lg border p-6 text-center">
        <span className="bg-accent text-accent-foreground mx-auto flex size-11 items-center justify-center rounded-full">
          <CircleCheck className="size-6" aria-hidden />
        </span>
        <h1 className="font-heading mt-4 text-2xl font-semibold">
          Your job is posted
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {provider.data
            ? `${provider.data.businessName} has been notified and can send you a quote.`
            : "Verified providers in your area can now quote for it. You will be notified as quotes come in."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button asChild variant="accent" className="h-11 px-5">
            <Link href="/dashboard/requests">See my requests</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 px-5">
            <Link href="/providers">Keep browsing</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight">
        {provider.data
          ? `Request a quote from ${provider.data.businessName}`
          : "Post a job"}
      </h1>
      <p className="text-muted-foreground mt-2">
        {provider.data
          ? "Only this provider sees it, and they reply with a price for your job."
          : "Describe what needs doing. Verified providers nearby can quote, and you choose."}
      </p>

      <form className="mt-6 space-y-5" onSubmit={submit} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="job-title">What needs doing?</Label>
          <Input
            id="job-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={!!show("title") || undefined}
            aria-describedby="job-title-hint"
            placeholder="Aircon not cooling in the bedroom"
            maxLength={160}
          />
          <Hint id="job-title-hint" error={show("title")}>
            A short summary. Providers see this first.
          </Hint>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="job-category">What kind of work is it?</Label>
          {categories.loading ? (
            <Input disabled placeholder="Loading categories" />
          ) : (
            <Select
              id="job-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={!!show("categoryId") || undefined}
              aria-describedby="job-category-hint"
            >
              <option value="">Choose a category</option>
              {flatten(categories.data ?? []).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
          <Hint id="job-category-hint" error={show("categoryId")}>
            This is what decides which providers see it.
          </Hint>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="job-description">Tell them more</Label>
          <Textarea
            id="job-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={!!show("description") || undefined}
            aria-describedby="job-description-hint"
            rows={5}
            maxLength={5000}
            placeholder="What is wrong, how long it has been happening, the make and model if you know it, and anything they should bring."
          />
          <Hint id="job-description-hint" error={show("description")}>
            At least 20 characters. {description.trim().length} so far. The more
            detail, the more accurate the quote.
          </Hint>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-medium">How soon?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {URGENCIES.map((option) => (
              <label
                key={option.value}
                className="border-border has-checked:border-foreground has-checked:bg-secondary flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm"
              >
                <input
                  type="radio"
                  name="urgency"
                  value={option.value}
                  checked={urgency === option.value}
                  onChange={() => setUrgency(option.value)}
                  className="accent-brand-lime-ink mt-0.5"
                />
                <span>
                  <span className="font-medium">{option.label}</span>
                  <span className="text-muted-foreground block text-xs">
                    {option.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="job-city">City</Label>
            <Input
              id="job-city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={!!show("city") || undefined}
              aria-describedby="job-city-hint"
              placeholder="Butuan"
              maxLength={120}
            />
            <Hint id="job-city-hint" error={show("city")}>
              Required.
            </Hint>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="job-barangay">
              Barangay{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="job-barangay"
              value={barangay}
              onChange={(event) => setBarangay(event.target.value)}
              placeholder="Libertad"
              maxLength={120}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="job-address">
            Street address{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="job-address"
            value={addressLine1}
            onChange={(event) => setAddressLine1(event.target.value)}
            placeholder="House number and street"
            maxLength={255}
          />
          <p className="text-muted-foreground text-sm">
            Held back until you confirm a booking. Providers see only your city
            and barangay while they are quoting.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="job-min">
              Budget from{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="job-min"
              type="number"
              min={0}
              inputMode="numeric"
              value={budgetMin}
              onChange={(event) => setBudgetMin(event.target.value)}
              placeholder="500"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="job-max">
              Budget up to{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="job-max"
              type="number"
              min={0}
              inputMode="numeric"
              value={budgetMax}
              onChange={(event) => setBudgetMax(event.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={!!show("budgetMax") || undefined}
              aria-describedby="job-budget-hint"
              placeholder="2000"
            />
            <Hint id="job-budget-hint" error={show("budgetMax")}>
              Helps filter out quotes you would never take.
            </Hint>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="job-when">
              Preferred time{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="job-when"
              type="datetime-local"
              value={preferredAt}
              min={toDateTimeInputValue(new Date())}
              onChange={(event) => setPreferredAt(event.target.value)}
            />
          </div>
        </div>

        <ActionError message={error} />

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="submit"
            variant="accent"
            className="h-11 px-5 text-base"
            disabled={pending}
          >
            {pending ? <Spinner /> : <Send aria-hidden />}
            {provider.data ? "Send request" : "Post job"}
          </Button>
          <Button asChild variant="ghost" className="h-11 px-5">
            <Link href="/providers">Cancel</Link>
          </Button>
        </div>

        <p className="text-muted-foreground text-xs">
          Posting a job does not commit you to anything. You pick a quote, agree
          a time, and pay the provider directly.
        </p>
      </form>
    </div>
  );
}

/** Mirrors CreateRequestDto, so the API's 400s are not the first feedback. */
function validate(input: {
  title: string;
  description: string;
  categoryId: string;
  city: string;
  budgetMin: string;
  budgetMax: string;
}): Partial<Record<"title" | "description" | "categoryId" | "city" | "budgetMax", string>> {
  const problems: Partial<
    Record<"title" | "description" | "categoryId" | "city" | "budgetMax", string>
  > = {};

  if (input.title.trim().length < 5) {
    problems.title = "Give it a summary of at least 5 characters.";
  }
  if (input.description.trim().length < 20) {
    problems.description = "Describe the job in at least 20 characters.";
  }
  if (!input.categoryId) problems.categoryId = "Choose a category.";
  if (!input.city.trim()) problems.city = "Which city is the job in?";

  if (
    input.budgetMin &&
    input.budgetMax &&
    Number(input.budgetMin) > Number(input.budgetMax)
  ) {
    problems.budgetMax = "The upper figure is below the lower one.";
  }

  return problems;
}

function Hint({
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

function flatten(
  nodes: CategoryNode[],
  depth = 0,
): { id: string; label: string }[] {
  return nodes.flatMap((node) => [
    { id: node.id, label: `${"— ".repeat(depth)}${node.name}` },
    ...flatten(node.children ?? [], depth + 1),
  ]);
}
