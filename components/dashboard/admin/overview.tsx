"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { StatCard, StatGrid, StatusBars } from "@/components/dashboard/stat-card";
import {
  ErrorState,
  LoadingRows,
  PageHeader,
} from "@/components/dashboard/states";
import { NAV_FOR_ROLE } from "@/components/dashboard/nav";
import { admin } from "@/lib/api/client";
import { statusMeta } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

/**
 * Platform analytics, and the front door to every queue.
 *
 * The figures come from one endpoint (GET /admin/stats) that counts rather
 * than reading stored totals, because these numbers drive moderation
 * decisions and a stale count is worse than a slow one.
 *
 * The queue row is first and coloured, because those four numbers are the
 * only ones on this page that represent work nobody has done yet.
 */
export function AdminOverview() {
  const { data, loading, error, reload } = useQuery(() => admin.stats(), []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Platform" />
        <LoadingRows rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Platform" />
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  if (!data) return null;

  const { users, providers, bookings, queue, catalog } = data;
  const bookingTotal = bookings.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform"
        description="Where FixItPH stands, and what is waiting on an administrator."
      />

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-medium">Needs an administrator</h2>
        <StatGrid>
          <StatCard
            label="Verifications pending"
            value={queue.pendingVerifications}
            hint="Providers awaiting review"
            tone={queue.pendingVerifications ? "warning" : "neutral"}
            href="/admin/verification"
          />
          <StatCard
            label="Open reports"
            value={queue.openReports}
            hint="Flagged by users"
            tone={queue.openReports ? "critical" : "neutral"}
            href="/admin/reports"
          />
          <StatCard
            label="Open disputes"
            value={queue.openDisputes}
            hint="Awaiting a decision"
            tone={queue.openDisputes ? "critical" : "neutral"}
            href="/admin/disputes"
          />
          <StatCard
            label="Disputed bookings"
            value={queue.disputedBookings}
            hint="Jobs currently in dispute"
            tone={queue.disputedBookings ? "warning" : "neutral"}
            href="/admin/bookings"
          />
        </StatGrid>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-medium">Accounts and activity</h2>
        <StatGrid>
          <StatCard
            label="Users"
            value={(users.total ?? 0).toLocaleString("en-PH")}
            hint={`${users.newLast30Days ?? 0} joined in the last 30 days`}
            href="/admin/users"
          />
          <StatCard
            label="Providers"
            value={(providers.APPROVED ?? 0).toLocaleString("en-PH")}
            hint="Verified and discoverable"
            href="/admin/users?role=PROVIDER"
          />
          <StatCard
            label="Bookings"
            value={bookingTotal.toLocaleString("en-PH")}
            hint={`${bookings.last30Days ?? 0} in the last 30 days`}
            href="/admin/bookings"
          />
          <StatCard
            label="Live listings"
            value={catalog.activeServices.toLocaleString("en-PH")}
            hint={`across ${catalog.categories} categories`}
            href="/admin/listings"
          />
        </StatGrid>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <StatusBars
          title="Bookings by status"
          total={bookingTotal}
          rows={[
            "PENDING_CONFIRMATION",
            "CONFIRMED",
            "IN_PROGRESS",
            "COMPLETED",
            "CANCELLED_BY_CUSTOMER",
            "CANCELLED_BY_PROVIDER",
            "NO_SHOW_CUSTOMER",
            "NO_SHOW_PROVIDER",
            "DISPUTED",
          ].map((status) => {
            const meta = statusMeta.booking(status as never);
            return {
              label: meta.label,
              value: bookings[status] ?? 0,
              tone: meta.tone,
            };
          })}
        />

        <StatusBars
          title="Provider verification"
          total={Object.entries(providers)
            .filter(([key]) => key !== "suspended")
            .reduce((sum, [, value]) => sum + value, 0)}
          rows={[
            "APPROVED",
            "PENDING",
            "UNVERIFIED",
            "REJECTED",
            "EXPIRED",
          ].map((status) => {
            const meta = statusMeta.verification(status as never);
            return {
              label: meta.label,
              value: providers[status] ?? 0,
              tone: meta.tone,
            };
          })}
        />

        <StatusBars
          title="Accounts by role"
          total={users.total ?? 0}
          rows={[
            { label: "Customers", value: users.CUSTOMER ?? 0 },
            { label: "Providers", value: users.PROVIDER ?? 0 },
            { label: "Administrators", value: users.ADMIN ?? 0 },
            {
              label: "Suspended",
              value: users.suspended ?? 0,
              tone: "critical" as const,
            },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-medium">Manage</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NAV_FOR_ROLE.ADMIN.flatMap((section) => section.items)
            .filter((item) => item.href !== "/admin")
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="ring-foreground/10 group/card hover:bg-secondary/50 rounded-xl px-4 py-3.5 ring-1 transition-colors"
              >
                <p className="font-heading flex items-center gap-1.5 text-sm font-medium">
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  {item.label}
                  <ArrowUpRight
                    className="ml-auto size-3.5 opacity-0 transition-opacity group-hover/card:opacity-100"
                    aria-hidden
                  />
                </p>
                <p className="text-muted-foreground mt-1 text-sm">{item.blurb}</p>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
