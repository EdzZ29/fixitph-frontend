"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { BadgeCheck, KeyRound, Power, UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  ActionError,
  ErrorState,
  GateCard,
  LoadingRows,
  PageHeader,
} from "@/components/dashboard/states";
import { auth, providers, users } from "@/lib/api/client";
import { useCurrentUser } from "@/lib/auth/session";
import { formatDate, statusMeta } from "@/lib/format";
import { useAction, useQuery } from "@/lib/use-query";

/**
 * Settings, as distinct from the profile.
 *
 * The line between the two is what a customer sees. "My profile" is the shop
 * window — the business name, the rates, the areas covered — and it is edited
 * when something about the business changes. This screen is the switches and
 * the account behind it: whether work is being taken at all, who the person
 * is, and how they get back in. Those are things you change on a Tuesday
 * because you are full, or because you moved house, and hunting for them at
 * the bottom of a long profile form is the wrong place to put them.
 */
export function ProviderSettingsView() {
  const me = useCurrentUser();

  if (!me.provider) {
    return (
      <div className="space-y-5">
        <PageHeader title="Settings" />
        <GateCard
          title="No provider profile yet"
          description="Create your business profile first. Its settings live here afterwards."
          href="/provider/profile"
          cta="Set up my profile"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Whether you are taking work, who you are, and how you sign in."
      />

      <TakingWork providerId={me.provider.id} />
      <AccountDetails />
      <SignInAndSecurity />
    </div>
  );
}

/**
 * The one switch a provider reaches for most, on its own and near the top.
 *
 * It writes immediately rather than sitting behind a Save button: there is
 * one field, and a switch that needs confirming is a switch somebody leaves
 * in the wrong position.
 */
function TakingWork({ providerId }: { providerId: string }) {
  const { data, loading, error, reload } = useQuery(
    () => providers.profile(providerId),
    [providerId],
  );
  const { run, pending, error: saveError } = useAction();
  const [saved, setSaved] = useState(false);

  if (loading) return <LoadingRows rows={1} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const accepting = data.isAcceptingBookings;

  return (
    <section className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <h2 className="font-heading flex items-center gap-2 text-base font-medium">
        <Power className="size-4" aria-hidden />
        Taking new work
      </h2>

      <label className="mt-3 flex items-start gap-2.5 text-sm">
        <Checkbox
          checked={accepting}
          disabled={pending}
          onCheckedChange={(checked) => {
            setSaved(false);
            void run(
              () =>
                providers.update(providerId, {
                  isAcceptingBookings: checked === true,
                }),
              {
                onSuccess: () => {
                  setSaved(true);
                  reload();
                },
              },
            );
          }}
          className="mt-0.5"
        />
        <span>
          I am taking new bookings
          <span className="text-muted-foreground block text-xs">
            Turn this off when you are fully booked. Your profile and listings
            stay up, and customers can still see you — they just cannot request
            new work until you turn it back on.
          </span>
        </span>
      </label>

      <ActionError message={saveError} />

      {saved && !pending && !saveError ? (
        <p className="text-muted-foreground mt-3 text-center text-sm">Saved.</p>
      ) : null}
    </section>
  );
}

/**
 * The person, not the business.
 *
 * Nothing on the provider side could edit this before: the profile form edits
 * the trading identity, and the name on the account was whatever registration
 * captured. It is the name an administrator checks an ID against, so being
 * unable to correct a typo in it mattered.
 */
function AccountDetails() {
  const { data, loading, error, reload } = useQuery(
    () => users.myProfile(),
    [],
  );
  const { run, pending, error: saveError } = useAction();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    city: "",
    barangay: "",
  });
  const [seeded, setSeeded] = useState(false);
  const [saved, setSaved] = useState(false);

  // Seeded once, so a live refetch cannot overwrite what is being typed.
  if (!seeded && data) {
    setForm({
      firstName: data.firstName ?? "",
      lastName: data.lastName ?? "",
      city: data.city ?? "",
      barangay: data.barangay ?? "",
    });
    setSeeded(true);
  }

  if (loading) return <LoadingRows rows={2} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const set = (key: keyof typeof form, value: string) => {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;

    await run(
      () =>
        users.updateMyProfile({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          city: form.city.trim() || null,
          barangay: form.barangay.trim() || null,
        }),
      {
        onSuccess: () => {
          setSaved(true);
          reload();
        },
      },
    );
  }

  return (
    <section className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <h2 className="font-heading flex items-center gap-2 text-base font-medium">
        <UserCog className="size-4" aria-hidden />
        Your details
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">
        The person behind the business. Customers see your business name, not
        this — but an administrator checks it against your ID, so it should
        match.
      </p>

      <form onSubmit={submit} className="mt-4 max-w-lg space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="set-first">First name</Label>
            <Input
              id="set-first"
              value={form.firstName}
              onChange={(event) => set("firstName", event.target.value)}
              autoComplete="given-name"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-last">Last name</Label>
            <Input
              id="set-last"
              value={form.lastName}
              onChange={(event) => set("lastName", event.target.value)}
              autoComplete="family-name"
              required
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="set-city">City</Label>
            <Input
              id="set-city"
              value={form.city}
              onChange={(event) => set("city", event.target.value)}
              placeholder="Butuan City"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="set-barangay">Barangay</Label>
            <Input
              id="set-barangay"
              value={form.barangay}
              onChange={(event) => set("barangay", event.target.value)}
              placeholder="Ampayon"
            />
          </div>
        </div>

        <ActionError message={saveError} />

        <div className="flex items-center gap-3">
          <Button type="submit" variant="accent" disabled={pending}>
            {pending ? "Saving" : "Save details"}
          </Button>
          {saved && !pending && !saveError ? (
            <span className="text-muted-foreground text-sm">Saved.</span>
          ) : null}
        </div>
      </form>
    </section>
  );
}

/**
 * How the account is reached and how it is got into.
 *
 * Changing a password is deliberately the reset flow rather than a form here.
 * There is no endpoint that takes an old password and a new one, and inventing
 * a client-side "change password" that quietly used the reset machinery would
 * be lying about what just happened — the email that arrives is a reset email.
 */
function SignInAndSecurity() {
  const me = useCurrentUser();
  const status = useQuery(() => auth.emailStatus(), []);
  const { run, pending, error } = useAction();
  const [sent, setSent] = useState(false);

  const verified = status.data?.verified ?? me.emailVerifiedAt !== null;

  return (
    <section className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <h2 className="font-heading flex items-center gap-2 text-base font-medium">
        <KeyRound className="size-4" aria-hidden />
        Signing in
      </h2>

      <dl className="mt-3 space-y-2.5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-muted-foreground">Email address</dt>
          <dd className="flex items-center gap-2">
            <span>{status.data?.email ?? me.email}</span>
            {verified ? (
              <StatusBadge meta={statusMeta.verification("APPROVED")} />
            ) : (
              <Button asChild size="sm" variant="accent">
                <Link href="/provider/verification">
                  <BadgeCheck aria-hidden />
                  Confirm it
                </Link>
              </Button>
            )}
          </dd>
        </div>

        {verified && status.data?.verifiedAt ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Confirmed</dt>
            <dd>{formatDate(status.data.verifiedAt)}</dd>
          </div>
        ) : null}
      </dl>

      <div className="border-border mt-4 border-t pt-4">
        <p className="text-sm font-medium">Password</p>
        <p className="text-muted-foreground mt-0.5 text-sm">
          To change it, we email you a code and you set a new one — the same
          path as forgetting it, so nobody who only has your open tab can change
          the password on your account.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={pending || sent}
            onClick={() => {
              void run(
                () => auth.forgotPassword(status.data?.email ?? me.email),
                {
                  onSuccess: () => setSent(true),
                },
              );
            }}
          >
            {pending ? "Sending" : "Email me a reset code"}
          </Button>
          {sent ? (
            <span className="text-muted-foreground text-sm">
              Check your inbox, then follow the link to set a new password.
            </span>
          ) : null}
        </div>

        <ActionError message={error} />
      </div>
    </section>
  );
}
