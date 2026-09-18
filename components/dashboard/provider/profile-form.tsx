"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ExternalLink, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ActionError,
  ErrorState,
  LoadingRows,
  PageHeader,
  Spinner,
} from "@/components/dashboard/states";
import {
  providers,
  type PaymentMethod,
  type ProviderProfile,
  type ProviderType,
} from "@/lib/api/client";
import { ProfileImages } from "@/components/dashboard/provider/profile-images";
import { AvailabilityEditor } from "@/components/dashboard/provider/availability-editor";
import { PortfolioEditor } from "@/components/dashboard/provider/portfolio-editor";
import { VerificationPanel } from "@/components/dashboard/provider/verification-panel";
import { useCurrentUser, useSession } from "@/lib/auth/session";
import { useAction, useQuery } from "@/lib/use-query";

/**
 * Creating and editing a provider profile — requirement three.
 *
 * Two jobs in one form. A customer with no provider profile is creating one,
 * which also flips their account role to PROVIDER; an existing provider is
 * editing theirs. The difference is only which endpoint the save hits.
 *
 * Verification status is shown but never editable here. It is moved only by
 * the admin verification flow, which writes an audit row when it does — a
 * provider marking themselves verified is exactly the thing that would make
 * the badge worthless.
 */

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "GCASH", label: "GCash" },
  { value: "MAYA", label: "Maya" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
];

interface FormState {
  providerType: ProviderType;
  businessName: string;
  headline: string;
  bio: string;
  yearsExperience: string;
  baseCity: string;
  baseBarangay: string;
  serviceRadiusKm: string;
  acceptsEmergency: boolean;
  paymentMethods: PaymentMethod[];
}

const EMPTY: FormState = {
  providerType: "INDIVIDUAL",
  businessName: "",
  headline: "",
  bio: "",
  yearsExperience: "",
  baseCity: "",
  baseBarangay: "",
  serviceRadiusKm: "",
  acceptsEmergency: false,
  paymentMethods: ["CASH"],
};

export function ProviderProfileForm() {
  const user = useCurrentUser();
  const { refresh } = useSession();
  const router = useRouter();

  const providerId = user.provider?.id;
  const isNew = !providerId;

  const existing = useQuery(
    () => (providerId ? providers.profile(providerId) : Promise.resolve(null)),
    [providerId],
  );

  const [form, setForm] = useState<FormState>(EMPTY);
  // Images upload immediately and independently of Save, so the newest URLs
  // are held here rather than being folded into the form state.
  const [images, setImages] = useState<{
    avatarUrl: string | null;
    coverUrl: string | null;
  }>({ avatarUrl: null, coverUrl: null });
  const [touched, setTouched] = useState(false);
  const [hydrated, setHydrated] = useState(isNew);
  const { run, pending, error } = useAction();

  // Seeded from the loaded profile once, during render: the fields are never
  // briefly blank over data that has already arrived.
  if (!isNew && !hydrated && existing.data) {
    setForm(toFormState(existing.data));
    setHydrated(true);
  }

  // Prefill a new profile from the account's own address, once.
  const [seeded, setSeeded] = useState(!isNew);
  if (isNew && !seeded) {
    setSeeded(true);
    setForm((current) => ({
      ...current,
      baseCity: user.profile?.city ?? "",
      baseBarangay: user.profile?.barangay ?? "",
    }));
  }

  if (!isNew && existing.loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="My profile" />
        <LoadingRows rows={4} />
      </div>
    );
  }

  if (!isNew && existing.error) {
    return (
      <div className="space-y-5">
        <PageHeader title="My profile" />
        <ErrorState error={existing.error} onRetry={existing.reload} />
      </div>
    );
  }

  const problems = validate(form);
  const show = (key: keyof FormState): string | undefined =>
    touched ? problems[key] : undefined;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  function togglePayment(method: PaymentMethod, on: boolean) {
    set(
      "paymentMethods",
      on
        ? [...form.paymentMethods, method]
        : form.paymentMethods.filter((item) => item !== method),
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (Object.keys(problems).length) return;

    const payload = {
      providerType: form.providerType,
      businessName: form.businessName.trim(),
      headline: form.headline.trim() || null,
      bio: form.bio.trim() || null,
      yearsExperience: form.yearsExperience
        ? Number(form.yearsExperience)
        : null,
      baseCity: form.baseCity.trim(),
      baseBarangay: form.baseBarangay.trim() || null,
      serviceRadiusKm: form.serviceRadiusKm
        ? Number(form.serviceRadiusKm)
        : null,
      acceptsEmergency: form.acceptsEmergency,
      paymentMethods: form.paymentMethods,
    };

    const result = await run(() =>
      providerId
        ? providers.update(providerId, payload)
        : providers.create(payload),
    );

    if (result !== null) {
      // Creating a profile changes the account's role, so the session has to
      // be re-read or the shell keeps showing the customer navigation.
      await refresh();
      router.push("/provider");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={isNew ? "Set up your provider profile" : "My profile"}
        description={
          isNew
            ? "This is what customers see when they find you. You can add services straight after."
            : "What customers see on your public profile."
        }
        action={
          !isNew && existing.data ? (
            <Button asChild variant="outline" size="lg">
              <Link href={`/providers/${existing.data.slug}`}>
                <ExternalLink aria-hidden />
                View public profile
              </Link>
            </Button>
          ) : undefined
        }
      />

      {!isNew && existing.data ? (
        <div className="max-w-2xl">
          <ProfileImages
            name={form.businessName}
            avatarUrl={images.avatarUrl ?? existing.data.avatarUrl}
            coverUrl={images.coverUrl ?? existing.data.coverUrl}
            onUploaded={setImages}
          />
        </div>
      ) : null}

      <form className="max-w-2xl space-y-5" onSubmit={submit} noValidate>
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-medium">
            How do you trade?
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                {
                  value: "INDIVIDUAL" as const,
                  label: "On my own",
                  hint: "A sole tradesperson. We ask for a government ID, PRC licence or TESDA certificate.",
                },
                {
                  value: "BUSINESS" as const,
                  label: "As a business",
                  hint: "A registered business. We also ask for your permit, which unlocks the Business Verified badge.",
                },
              ]
            ).map((option) => (
              <label
                key={option.value}
                className="border-border has-checked:border-foreground has-checked:bg-secondary flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm"
              >
                <input
                  type="radio"
                  name="providerType"
                  value={option.value}
                  checked={form.providerType === option.value}
                  onChange={() => set("providerType", option.value)}
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

        <div className="space-y-1.5">
          <Label htmlFor="business-name">
            {form.providerType === "BUSINESS"
              ? "Business name"
              : "Your trading name"}
          </Label>
          <Input
            id="business-name"
            value={form.businessName}
            onChange={(event) => set("businessName", event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={!!show("businessName") || undefined}
            aria-describedby="business-name-hint"
            placeholder="Saavedra Aircon Services"
            maxLength={160}
          />
          <Hint id="business-name-hint" error={show("businessName")}>
            {isNew
              ? "This becomes your public web address, so pick the name you trade under."
              : "Your public web address does not change when you rename."}
          </Hint>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="headline">
            One-line summary{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="headline"
            value={form.headline}
            onChange={(event) => set("headline", event.target.value)}
            placeholder="Aircon cleaning and repair across Butuan, 12 years on the tools"
            maxLength={200}
          />
          <Hint id="headline-hint">
            The first thing a customer reads under your name.
          </Hint>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">
            About your work{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="bio"
            value={form.bio}
            onChange={(event) => set("bio", event.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="What you specialise in, the brands you know, how you work, and anything a customer should know before booking."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="base-city">Based in which city?</Label>
            <Input
              id="base-city"
              value={form.baseCity}
              onChange={(event) => set("baseCity", event.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={!!show("baseCity") || undefined}
              aria-describedby="base-city-hint"
              placeholder="Butuan"
              maxLength={120}
            />
            <Hint id="base-city-hint" error={show("baseCity")}>
              Required. Customers filter by this.
            </Hint>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="base-barangay">
              Barangay{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="base-barangay"
              value={form.baseBarangay}
              onChange={(event) => set("baseBarangay", event.target.value)}
              placeholder="Libertad"
              maxLength={120}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="radius">
              How far will you travel?{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="radius"
              type="number"
              min={1}
              max={500}
              inputMode="numeric"
              value={form.serviceRadiusKm}
              onChange={(event) => set("serviceRadiusKm", event.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={!!show("serviceRadiusKm") || undefined}
              aria-describedby="radius-hint"
              placeholder="25"
            />
            <Hint id="radius-hint" error={show("serviceRadiusKm")}>
              In kilometres from your base.
            </Hint>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="years">
              Years in the trade{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="years"
              type="number"
              min={0}
              max={80}
              inputMode="numeric"
              value={form.yearsExperience}
              onChange={(event) => set("yearsExperience", event.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={!!show("yearsExperience") || undefined}
              aria-describedby="years-hint"
              placeholder="12"
            />
            <Hint id="years-hint" error={show("yearsExperience")}>
              Shown on your profile.
            </Hint>
          </div>
        </div>

        <fieldset className="space-y-2.5">
          <legend className="mb-1.5 text-sm font-medium">
            How can customers pay you?
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {PAYMENT_METHODS.map((method) => (
              <label
                key={method.value}
                className="flex items-center gap-2.5 text-sm"
              >
                <Checkbox
                  checked={form.paymentMethods.includes(method.value)}
                  onCheckedChange={(checked) =>
                    togglePayment(method.value, checked === true)
                  }
                />
                {method.label}
              </label>
            ))}
          </div>
          <Hint id="payment-hint" error={show("paymentMethods")}>
            You collect payment directly. FixItPH does not handle the money.
          </Hint>
        </fieldset>

        <fieldset className="space-y-2.5">
          <legend className="mb-1.5 text-sm font-medium">Availability</legend>

          <label className="flex items-start gap-2.5 text-sm">
            <Checkbox
              checked={form.acceptsEmergency}
              onCheckedChange={(checked) =>
                set("acceptsEmergency", checked === true)
              }
              className="mt-0.5"
            />
            <span>
              I take emergency callouts
              <span className="text-muted-foreground block text-xs">
                Same-day and after-hours. Customers can filter for this.
              </span>
            </span>
          </label>

          {/*
            "Taking new bookings" lives in Settings, not here.
            
            It is an operational switch — flipped on the day you fill up, and
            back the day you free up — whereas this form is the shop window,
            opened when the business itself changes. Two controls writing one
            field is also two places to disagree about its value.
          */}
          {!isNew ? (
            <p className="text-muted-foreground text-xs">
              Taking new bookings is{" "}
              <Link
                href="/provider/settings"
                className="underline underline-offset-4"
              >
                in Settings
              </Link>
              .
            </p>
          ) : null}
        </fieldset>

        <ActionError message={error} />

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="submit"
            variant="accent"
            size="lg"
            disabled={pending}
          >
            {pending ? <Spinner /> : <Save aria-hidden />}
            {isNew ? "Create my profile" : "Save changes"}
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/provider">Cancel</Link>
          </Button>
        </div>

        {isNew ? (
          <p className="text-muted-foreground text-xs">
            Creating a profile turns this account into a provider account. Your
            listings stay private until an administrator approves your
            documents.
          </p>
        ) : null}
      </form>

      {/* Only once the profile exists: all three write to it by id. */}
      {!isNew ? (
        <div className="max-w-2xl space-y-5">
          <VerificationPanel />
          <AvailabilityEditor />
          <PortfolioEditor />
        </div>
      ) : null}
    </div>
  );
}

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const problems: Partial<Record<keyof FormState, string>> = {};

  if (form.businessName.trim().length < 2) {
    problems.businessName = "Give the name you trade under.";
  }
  if (!form.baseCity.trim()) {
    problems.baseCity = "Which city are you based in?";
  }
  if (!form.paymentMethods.length) {
    problems.paymentMethods = "Pick at least one way to be paid.";
  }
  if (form.serviceRadiusKm) {
    const km = Number(form.serviceRadiusKm);
    if (!Number.isFinite(km) || km < 1 || km > 500) {
      problems.serviceRadiusKm = "Between 1 and 500 km.";
    }
  }
  if (form.yearsExperience) {
    const years = Number(form.yearsExperience);
    if (!Number.isInteger(years) || years < 0 || years > 80) {
      problems.yearsExperience = "Between 0 and 80.";
    }
  }

  return problems;
}

function toFormState(profile: ProviderProfile): FormState {
  return {
    providerType: profile.providerType,
    businessName: profile.businessName,
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    yearsExperience: profile.yearsExperience
      ? String(profile.yearsExperience)
      : "",
    baseCity: profile.baseCity,
    baseBarangay: profile.baseBarangay ?? "",
    serviceRadiusKm: profile.serviceRadiusKm
      ? String(profile.serviceRadiusKm)
      : "",
    acceptsEmergency: profile.acceptsEmergency,
    paymentMethods: profile.paymentMethods.length
      ? profile.paymentMethods
      : ["CASH"],
  };
}

function Hint({
  id,
  error,
  children,
}: {
  id: string;
  error?: string;
  children?: React.ReactNode;
}) {
  if (!error && !children) return null;
  return (
    <p
      id={id}
      className={error ? "text-destructive text-sm" : "text-muted-foreground text-sm"}
    >
      {error ?? children}
    </p>
  );
}
