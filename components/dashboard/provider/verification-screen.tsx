"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CircleAlert,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { VerificationBadges } from "@/components/search/verification-badges";
import {
  EmailStep,
  StepNumber,
} from "@/components/dashboard/provider/email-step";
import {
  ActionError,
  ErrorState,
  LoadingRows,
  PageHeader,
} from "@/components/dashboard/states";
import {
  providers,
  type DocumentType,
  type VerificationBadge,
} from "@/lib/api/client";
import { formatDate, humanise, statusMeta } from "@/lib/format";
import { useAction, useQuery } from "@/lib/use-query";

/**
 * Where a provider actually gets verified.
 *
 * The badges themselves are never editable here — they follow from documents
 * an administrator approved, and a provider who could grant their own would
 * make every badge on the platform worthless. What this screen does is the
 * one thing the provider controls: send the right document, see what happened
 * to it, and see exactly what is still missing.
 *
 * A rejected document shows its reason, which is the whole point of surfacing
 * it: the person who has to send a replacement is the one who uploaded it.
 */

/** Which documents satisfy which badge, in the words a provider would use. */
const DOCUMENT_OPTIONS: {
  value: DocumentType;
  label: string;
  hint: string;
  earns: VerificationBadge;
}[] = [
  {
    value: "GOVERNMENT_ID",
    label: "Government ID",
    hint: "PhilSys, driver’s licence, passport, UMID, postal ID.",
    earns: "IDENTITY",
  },
  {
    value: "PRC_LICENSE",
    label: "PRC licence",
    hint: "For a regulated trade. Also proves who you are.",
    earns: "IDENTITY",
  },
  {
    value: "TESDA_CERTIFICATE",
    label: "TESDA certificate",
    hint: "National Certificate for your trade.",
    earns: "IDENTITY",
  },
  {
    value: "BUSINESS_PERMIT",
    label: "Business permit",
    hint: "Mayor’s permit or DTI/SEC registration.",
    earns: "BUSINESS",
  },
  {
    value: "BARANGAY_CLEARANCE",
    label: "Barangay clearance",
    hint: "Supporting document. Helps an administrator place you.",
    earns: "IDENTITY",
  },
  {
    value: "PROOF_OF_ADDRESS",
    label: "Proof of address",
    hint: "A recent bill in your name.",
    earns: "IDENTITY",
  },
];

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function VerificationScreen() {
  const { data, loading, error, reload } = useQuery(
    () => providers.myVerification(),
    [],
  );

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Verify your account" />
        <LoadingRows rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader title="Verify your account" />
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  if (!data) return null;

  const outstanding = data.outstanding;
  const done = outstanding.length === 0;

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/provider">
          <ArrowLeft aria-hidden />
          Back to dashboard
        </Link>
      </Button>

      <PageHeader
        title="Verify your account"
        description="Customers filter for verified providers, and your listings stay private until an administrator approves you."
        action={
          <StatusBadge meta={statusMeta.verification(data.overallStatus)} />
        }
      />

      {/* What they have, and what is missing, before anything else. */}
      <section className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
        <h2 className="font-heading flex items-center gap-2 text-base font-medium">
          <BadgeCheck className="size-4" aria-hidden />
          Where you stand
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {data.providerType === "BUSINESS"
            ? "You trade as a registered business, so a permit unlocks the Business Verified badge as well as proof of identity."
            : "You trade on your own, so we ask for proof of identity rather than business papers."}
        </p>

        <VerificationBadges
          verification={data}
          variant="full"
          // Earned, plus whatever is still owed for this trading type. A
          // business permit is neither of those for an individual.
          only={[...data.earned, ...outstanding.map((item) => item.badge)]}
          className="mt-4"
        />
      </section>

      {done ? (
        <section className="ring-foreground/10 flex flex-col items-center gap-3 rounded-xl px-6 py-10 text-center ring-1">
          <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-full">
            <BadgeCheck className="size-5" aria-hidden />
          </span>
          <div>
            <p className="font-heading text-base font-medium">
              Every check is complete
            </p>
            <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
              Nothing else is needed for your trading type.
            </p>
          </div>
        </section>
      ) : (
        <section className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
          <h2 className="font-heading text-base font-medium">
            What is still needed
          </h2>
          <ul className="mt-3 space-y-2">
            {outstanding.map((item) => (
              <li key={item.badge} className="text-sm">
                <span className="font-medium">{item.label}</span>
                <span className="text-muted-foreground block text-xs">
                  {item.means}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <EmailStep onVerified={reload} />

      <UploadPanel providerType={data.providerType} onUploaded={reload} />

      {data.documents.length ? (
        <section className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
          <h2 className="font-heading text-base font-medium">
            Documents you have sent
          </h2>
          <ul className="mt-3 space-y-2">
            {data.documents.map((doc) => (
              <li
                key={doc.id}
                className="border-border flex flex-wrap items-start gap-x-3 gap-y-1.5 rounded-lg border px-3 py-2.5"
              >
                <FileText
                  className="text-muted-foreground mt-0.5 size-4 shrink-0"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {humanise(doc.documentType)}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {doc.originalFilename} · sent {formatDate(doc.createdAt)}
                  </p>

                  {doc.status === "REJECTED" && doc.rejectionReason ? (
                    <p className="text-muted-foreground mt-1 flex items-start gap-1.5 text-sm">
                      <CircleAlert
                        className="mt-0.5 size-3.5 shrink-0"
                        aria-hidden
                      />
                      {doc.rejectionReason}
                    </p>
                  ) : null}
                </div>
                <StatusBadge meta={statusMeta.verification(doc.status)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-muted-foreground text-xs">{data.disclaimer}</p>
    </div>
  );
}

function UploadPanel({
  providerType,
  onUploaded,
}: {
  providerType: "INDIVIDUAL" | "BUSINESS";
  onUploaded: () => void;
}) {
  // A business is the only case where a permit is worth offering.
  const options = DOCUMENT_OPTIONS.filter(
    (option) => providerType === "BUSINESS" || option.earns !== "BUSINESS",
  );

  const [documentType, setDocumentType] = useState<DocumentType>(
    options[0].value,
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const { run, pending, error } = useAction();

  const chosen = options.find((option) => option.value === documentType);

  async function upload(file: File) {
    setLocalError(null);
    setSent(false);

    if (!ACCEPTED.includes(file.type)) {
      setLocalError("Send a JPEG, PNG, WebP or PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError("That file is over 10MB. Try a smaller scan or photo.");
      return;
    }

    const result = await run(() =>
      providers.uploadDocument(documentType, file),
    );
    if (result !== null) {
      setSent(true);
      onUploaded();
    }
  }

  return (
    <section className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <h2 className="font-heading flex items-center gap-2 text-base font-medium">
        <StepNumber done={false}>2</StepNumber>
        Send your documents
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">
        An administrator checks each one by hand, so this is the slower half.
        You will be notified either way, and a rejected document tells you what
        to send instead.
      </p>

      <div className="mt-4 max-w-md space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="doc-type">What are you sending?</Label>
          <Select
            id="doc-type"
            value={documentType}
            onChange={(event) => {
              setDocumentType(event.target.value as DocumentType);
              setSent(false);
            }}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          {chosen ? (
            <p className="text-muted-foreground text-sm">{chosen.hint}</p>
          ) : null}
        </div>

        <Button
          type="button"
          variant="accent"
          size="lg"
          onClick={() => input.current?.click()}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Upload aria-hidden />
          )}
          Choose a file
        </Button>

        <input
          ref={input}
          type="file"
          accept={ACCEPTED.join(",")}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Reset so choosing the same file twice still fires.
            event.target.value = "";
            if (file) void upload(file);
          }}
        />

        <ActionError message={localError ?? error} />

        {sent && !pending ? (
          <p className="text-muted-foreground text-center text-sm">
            Sent. An administrator will review it.
          </p>
        ) : null}

        <p className="text-muted-foreground text-xs">
          Stored privately and only ever shown to an administrator reviewing
          your account. JPEG, PNG, WebP or PDF, up to 10MB.
        </p>
      </div>
    </section>
  );
}
