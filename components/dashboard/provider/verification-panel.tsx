"use client";

import { BadgeCheck, CircleAlert, FileText, Upload } from "lucide-react";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { VerificationBadges } from "@/components/search/verification-badges";
import {
  ErrorState,
  LoadingRows,
} from "@/components/dashboard/states";
import { providers } from "@/lib/api/client";
import { formatDate, humanise, statusMeta } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

/**
 * A provider's own view of their verification.
 *
 * Deliberately richer than the public one. This is the only place a rejected
 * document and the reason for it are visible, because the person who has to
 * act on that is the one who uploaded it — and it is the only screen that
 * shows what is still outstanding for their trading type.
 *
 * Nothing here is editable. Badges follow from documents an administrator
 * approved, and a provider who could set their own would make every badge on
 * the platform worthless.
 */
export function VerificationPanel() {
  const { data, loading, error, reload } = useQuery(
    () => providers.myVerification(),
    [],
  );

  if (loading) return <LoadingRows rows={3} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const outstanding = data.outstanding;

  return (
    <section className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-heading flex items-center gap-2 text-base font-medium">
          <BadgeCheck className="size-4" aria-hidden />
          Verification
        </h2>
        <StatusBadge meta={statusMeta.verification(data.overallStatus)} />
      </div>

      <p className="text-muted-foreground mt-1 text-sm">
        {data.providerType === "BUSINESS"
          ? "You trade as a registered business, so a permit unlocks the Business Verified badge as well."
          : "You trade on your own, so we ask for proof of identity rather than business papers."}
      </p>

      {/* The full set, earned and not, so the gap is visible at a glance. */}
      <VerificationBadges
        verification={data}
        variant="full"
        className="mt-4"
      />

      {outstanding.length ? (
        <div className="border-border bg-secondary mt-4 rounded-md border px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Upload className="size-3.5" aria-hidden />
            Still to do
          </p>
          <ul className="mt-2 space-y-1.5">
            {outstanding.map((item) => (
              <li key={item.badge} className="text-sm">
                <span className="font-medium">{item.label}</span>
                <span className="text-muted-foreground block text-xs">
                  {item.means}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-muted-foreground mt-4 text-sm">
          Every check for your trading type is complete.
        </p>
      )}

      {data.documents.length ? (
        <div className="mt-4">
          <p className="text-sm font-medium">Documents you have sent</p>
          <ul className="mt-2 space-y-2">
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

                  {/*
                    The reason is the whole point of showing a rejected
                    document: without it the provider has no idea what to send
                    instead.
                  */}
                  {doc.status === "REJECTED" && doc.rejectionReason ? (
                    <p className="text-destructive mt-1 flex items-start gap-1.5 text-sm">
                      <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      {doc.rejectionReason}
                    </p>
                  ) : null}

                  {doc.expiresAt ? (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Expires {formatDate(doc.expiresAt)}
                    </p>
                  ) : null}
                </div>

                <StatusBadge meta={statusMeta.verification(doc.status)} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
