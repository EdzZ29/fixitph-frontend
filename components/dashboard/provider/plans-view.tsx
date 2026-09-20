"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Sparkles } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { ErrorState, LoadingRows, PageHeader } from "@/components/dashboard/states";
import {
  plans as plansApi,
  type PaymentMethod,
  type PlanDefinition,
  type ProviderPlan,
  type RemittanceDestination,
} from "@/lib/api/client";
import {
  formatDate,
  formatDateTime,
  money,
  PAYMENT_METHOD_LABEL,
  statusMeta,
} from "@/lib/format";
import { useQuery } from "@/lib/use-query";

const ORDER: ProviderPlan[] = ["FREE", "PRO", "MAX"];

/** The same accounts the commission is sent to, so the same shortlist. */
const PAY_METHODS: PaymentMethod[] = [
  "GCASH",
  "MARIBANK",
  "GOTYME_BANK",
  "MAYA",
  "BANK_TRANSFER",
  "CASH",
];

function limitLabel(limit: number | null): string {
  return limit === null ? "Unlimited services" : `Up to ${limit} services`;
}

/**
 * What a provider can buy, and what they are on.
 *
 * One-time purchases, not subscriptions: nothing renews and nothing lapses,
 * which the page says plainly because "plan" usually means the opposite.
 *
 * Buying files a declaration and changes nothing on its own. There is no
 * payment gateway, so an admin checks the money against the receiving account
 * before the limit moves — the page is honest about that rather than showing
 * an upgrade that has not happened.
 */
export function PlansView() {
  const overview = useQuery(() => plansApi.overview(), []);
  const [buying, setBuying] = useState<ProviderPlan | null>(null);

  if (overview.loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Plans" />
        <LoadingRows rows={3} />
      </div>
    );
  }
  if (overview.error) {
    return (
      <div className="space-y-5">
        <PageHeader title="Plans" />
        <ErrorState error={overview.error} onRetry={overview.reload} />
      </div>
    );
  }
  if (!overview.data) return null;

  const {
    plans,
    current,
    serviceLimit,
    servicesUsed,
    trialEndsAt,
    trialActive,
    trialDaysLeft,
    pending,
    destinations,
  } = overview.data;

  const atLimit = serviceLimit !== null && servicesUsed >= serviceLimit;
  const onTrial = current === "FREE" && !!trialEndsAt;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Plans"
        description="A free week to start, then a one-time payment that keeps your listings up for good."
      />

      {/*
        The trial says plainly what happens when it runs out. A countdown on
        its own reads as a nudge; somebody whose listings are about to come
        down deserves to be told that, not left to discover it.
      */}
      {onTrial ? (
        <div
          className={cn(
            "rounded-xl px-4 py-3 ring-1",
            trialActive ? "ring-foreground/10" : "ring-destructive/30 bg-destructive/5",
          )}
        >
          {trialActive ? (
            <>
              <p className="text-sm font-medium">
                {trialDaysLeft === 1
                  ? "Last day of your free trial"
                  : `${trialDaysLeft} days left in your free trial`}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Your listings come down on {formatDate(trialEndsAt)} unless you
                buy a plan. Nothing is deleted — they go back up the moment a
                payment is verified.
              </p>
            </>
          ) : (
            <>
              <p className="text-destructive text-sm font-medium">
                Your free trial ended on {formatDate(trialEndsAt)}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Your services are hidden from search and you cannot list new
                ones. Everything is still here — buy Pro or Max and your
                listings are live again as soon as FixItPH confirms the payment.
              </p>
            </>
          )}
        </div>
      ) : null}

      <div className="ring-foreground/10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl px-4 py-3 ring-1">
        <p className="text-sm">
          You are on <span className="font-medium">{plans[current].label}</span>
          <span className="text-muted-foreground">
            {" · "}
            {servicesUsed} of{" "}
            {serviceLimit === null ? "unlimited" : serviceLimit} services used
          </span>
        </p>
        {atLimit ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Your plan is full. Upgrade, or archive a service you no longer offer.
          </p>
        ) : null}
      </div>

      {pending ? (
        <div className="ring-foreground/10 rounded-xl px-4 py-3 ring-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">
              {plans[pending.plan].label} payment submitted
            </p>
            <StatusBadge meta={statusMeta.planPurchase(pending.status)} />
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {money(pending.amount, pending.currency)} ·{" "}
            {PAYMENT_METHOD_LABEL[pending.paymentMethod]}{" "}
            {pending.paymentReference} · sent{" "}
            {formatDateTime(pending.submittedAt)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            FixItPH checks this against the receiving account before your limit
            changes. Nothing has moved yet.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() =>
              void plansApi.cancel(pending.id).then(() => overview.reload())
            }
          >
            Withdraw it
          </Button>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-3">
        {ORDER.map((key) => (
          <PlanCard
            key={key}
            plan={key}
            definition={plans[key]}
            current={current === key}
            /* A plan already held, or one somebody is mid-payment for, is not
               something to offer again. */
            disabled={current === key || !!pending}
            onBuy={() => setBuying(key)}
          />
        ))}
      </div>

      <p className="text-muted-foreground text-xs">
        Pro and Max are a one-time payment — no renewal, and they do not
        expire. Only the free trial runs out. The marketplace commission on
        completed bookings is charged separately.
      </p>

      {buying && buying !== "FREE" ? (
        <BuyDialog
          plan={buying}
          definition={plans[buying]}
          destinations={destinations}
          onClose={() => setBuying(null)}
          onDone={overview.reload}
        />
      ) : null}
    </div>
  );
}

function PlanCard({
  plan,
  definition,
  current,
  disabled,
  onBuy,
}: {
  plan: ProviderPlan;
  definition: PlanDefinition;
  current: boolean;
  disabled: boolean;
  onBuy: () => void;
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-xl px-4 py-4 ring-1",
        current ? "ring-accent" : "ring-foreground/10",
      )}
    >
      <div className="flex items-center gap-2">
        <h2 className="font-heading text-base font-medium">
          {definition.label}
        </h2>
        {current ? (
          <span className="bg-accent text-accent-foreground rounded-4xl px-2 text-xs font-medium">
            Current
          </span>
        ) : null}
      </div>

      <p className="font-heading mt-1 text-3xl font-semibold tabular-nums">
        {definition.price === 0 ? "Free" : money(definition.price)}
        {definition.price > 0 ? (
          <span className="text-muted-foreground ml-1.5 font-sans text-xs font-normal">
            one time
          </span>
        ) : null}
      </p>

      {definition.tagline ? (
        <p className="text-muted-foreground mt-1 text-sm">{definition.tagline}</p>
      ) : null}

      <p className="mt-3 text-sm font-medium">
        {limitLabel(definition.serviceLimit)}
      </p>

      {definition.features?.length ? (
        <ul className="mt-2 space-y-1.5">
          {definition.features.map((feature) => (
            <li key={feature} className="flex gap-2 text-sm">
              <Check className="text-accent mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex-1" />

      {plan === "FREE" ? (
        <p className="text-muted-foreground text-xs">
          Where every provider starts
          {definition.trialDays ? `, for ${definition.trialDays} days` : ""}.
        </p>
      ) : (
        <Button
          variant={current ? "outline" : "accent"}
          size="sm"
          disabled={disabled}
          onClick={onBuy}
        >
          <Sparkles aria-hidden />
          {current ? "Your plan" : `Get ${definition.label}`}
        </Button>
      )}
    </section>
  );
}

function BuyDialog({
  plan,
  definition,
  destinations,
  onClose,
  onDone,
}: {
  plan: Exclude<ProviderPlan, "FREE">;
  definition: PlanDefinition;
  destinations: Partial<Record<PaymentMethod, RemittanceDestination>>;
  onClose: () => void;
  onDone: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("GCASH");
  const [reference, setReference] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const destination = destinations[method];

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`Get ${definition.label} for ${money(definition.price)}`}
      description="Send the payment by the method below, then record it here. FixItPH checks it against the receiving account before your limit changes."
      confirmLabel="Submit payment"
      onConfirm={async () => {
        if (reference.trim().length < 3) {
          setProblem("Enter the reference number from your transfer.");
          throw new Error("Enter the reference number from your transfer.");
        }
        setProblem(null);
        const purchase = await plansApi.buy({
          plan,
          method,
          reference: reference.trim(),
        });
        // Attached afterwards, so a failed upload never loses a payment that
        // has already been made.
        if (receipt) await plansApi.uploadProof(purchase.id, receipt);
        return purchase;
      }}
      onDone={() => {
        onDone();
        onClose();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="plan-method">How did you send it?</Label>
          <Select
            id="plan-method"
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
          >
            {PAY_METHODS.map((option) => (
              <option key={option} value={option}>
                {PAYMENT_METHOD_LABEL[option]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="plan-ref">Reference number</Label>
          <Input
            id="plan-ref"
            value={reference}
            onChange={(event) => {
              setReference(event.target.value);
              setProblem(null);
            }}
            placeholder="e.g. GC-8842119"
            aria-invalid={!!problem || undefined}
          />
          {problem ? <p className="text-destructive text-sm">{problem}</p> : null}
        </div>
      </div>

      {destination ? (
        <div className="ring-foreground/10 rounded-xl px-3 py-3 ring-1">
          <p className="text-muted-foreground text-xs">
            Send {money(definition.price)} by{" "}
            {PAYMENT_METHOD_LABEL[method]} to
          </p>
          {destination.qr ? (
            <div className="mt-2 flex items-start gap-3">
              <Image
                src={destination.qr}
                alt={`${PAYMENT_METHOD_LABEL[method]} QR code`}
                width={144}
                height={144}
                className="size-36 shrink-0 rounded-lg bg-white p-1.5"
                unoptimized
              />
              <div className="min-w-0 text-sm">
                {destination.accountName ? (
                  <p className="font-medium">{destination.accountName}</p>
                ) : null}
                {destination.reference ? (
                  <p className="text-muted-foreground">{destination.reference}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-1 text-sm">
              {destination.contact ? (
                <p className="font-medium tabular-nums">{destination.contact}</p>
              ) : null}
              {destination.note ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  {destination.note}
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          Contact FixItPH support for where to send a{" "}
          {PAYMENT_METHOD_LABEL[method]} payment.
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="plan-receipt">
          Receipt{" "}
          <span className="text-muted-foreground font-normal">
            (optional, but it gets you activated faster)
          </span>
        </Label>
        <Input
          id="plan-receipt"
          type="file"
          accept="image/*,application/pdf"
          onChange={(event) => setReceipt(event.target.files?.[0] ?? null)}
        />
        {receipt ? (
          <p className="text-muted-foreground text-xs">
            {receipt.name} · {(receipt.size / 1024).toFixed(0)} KB
          </p>
        ) : null}
      </div>

      <p className="text-muted-foreground text-xs">
        One-time payment. Your plan will not change until FixItPH has confirmed
        the money arrived.
      </p>
    </ConfirmDialog>
  );
}
