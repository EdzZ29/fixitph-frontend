"use client";

import Link from "next/link";
import { useState } from "react";
import { Ban, RotateCcw, Search, ShieldAlert, UserCog } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/dashboard/pagination";
import { Segmented } from "@/components/dashboard/segmented";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
  PageHeader,
} from "@/components/dashboard/states";
import {
  admin,
  type AdminUser,
  type UserRole,
  type UserStatus,
} from "@/lib/api/client";
import { formatDate, personName, relativeTime, statusMeta } from "@/lib/format";
import { useQuery } from "@/lib/use-query";

/**
 * Account administration: find someone, see their standing, suspend or
 * reinstate them.
 *
 * Suspension is the sharpest tool on the platform — it stops the account
 * signing in and takes a provider out of search — so both directions demand a
 * written reason of at least ten characters, and both write an insert-only
 * admin_actions row in the same transaction as the change. There is
 * deliberately no delete: `users` has its DELETE privilege revoked from the
 * API's database role outright.
 */

const ROLES: { label: string; value: UserRole | "" }[] = [
  { label: "Every role", value: "" },
  { label: "Customers", value: "CUSTOMER" },
  { label: "Providers", value: "PROVIDER" },
  { label: "Administrators", value: "ADMIN" },
];

const STATUSES: { label: string; value: UserStatus | "" }[] = [
  { label: "Any standing", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Suspended", value: "SUSPENDED" },
  { label: "Unverified", value: "PENDING_VERIFICATION" },
  { label: "Deactivated", value: "DEACTIVATED" },
];

export function AdminUsersView({
  initialRole = "",
}: {
  initialRole?: UserRole | "";
}) {
  const [role, setRole] = useState<UserRole | "">(initialRole);
  const [status, setStatus] = useState<UserStatus | "">("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const { data, loading, error, reload, refreshing } = useQuery(
    () =>
      admin.users({
        role: role || undefined,
        status: status || undefined,
        q: query || undefined,
        page,
        limit: 20,
      }),
    [role, status, query, page],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        description="Every account on the platform. Search by email or phone."
      />

      <div className="flex flex-col gap-3">
        <Segmented
          label="Filter by role"
          segments={ROLES}
          value={role}
          onChange={(value) => {
            setRole(value);
            setPage(1);
          }}
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <form
            className="flex-1"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setQuery(search.trim());
              setPage(1);
            }}
          >
            <label htmlFor="user-search" className="sr-only">
              Search by email or phone
            </label>
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="user-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="name@example.com or 0917…"
                className="pl-8"
              />
            </div>
          </form>

          <div className="sm:w-44">
            <label htmlFor="user-status" className="sr-only">
              Filter by standing
            </label>
            <Select
              id="user-status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as UserStatus | "");
                setPage(1);
              }}
            >
              {STATUSES.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingRows rows={6} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={UserCog}
          title="No accounts matched"
          description={
            query
              ? `Nothing for “${query}” with those filters.`
              : "Try widening the filters."
          }
        />
      ) : (
        <ul
          className={cn("space-y-2", refreshing && "opacity-60 transition-opacity")}
          aria-busy={refreshing}
        >
          {data.items.map((user) => (
            <li key={user.id}>
              <UserRow user={user} onChanged={reload} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} result={data} onPageChange={setPage} unit="account" />
    </div>
  );
}

function UserRow({
  user,
  onChanged,
}: {
  user: AdminUser;
  onChanged: () => void;
}) {
  const [dialog, setDialog] = useState<"suspend" | "reinstate" | null>(null);

  // Read once on mount: the clock is not a pure render input, and a lockout
  // badge does not need to expire in place.
  const [now] = useState(() => Date.now());

  const suspended = user.status === "SUSPENDED";
  const locked = user.lockedUntil
    ? new Date(user.lockedUntil).getTime() > now
    : false;
  const name = personName(user.profile, user.email);

  return (
    <article className="ring-foreground/10 rounded-xl px-4 py-3.5 ring-1">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-medium">{name}</h3>
            <StatusBadge meta={statusMeta.user(user.status)} />
            <span className="text-muted-foreground text-xs">{user.role}</span>
            {locked ? (
              <span className="text-destructive flex items-center gap-1 text-xs">
                <ShieldAlert className="size-3" aria-hidden />
                locked until {formatDate(user.lockedUntil)}
              </span>
            ) : null}
          </div>

          <p className="text-muted-foreground mt-0.5 truncate text-sm">
            {user.email}
            {user.phone ? <> · {user.phone}</> : null}
            {user.profile?.city ? <> · {user.profile.city}</> : null}
          </p>

          {user.provider ? (
            <p className="text-muted-foreground mt-0.5 text-sm">
              Provider:{" "}
              <Link
                href={`/admin/listings?providerId=${user.provider.id}`}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {user.provider.businessName}
              </Link>{" "}
              ·{" "}
              <StatusBadge
                meta={statusMeta.verification(user.provider.verificationStatus)}
                className="align-middle"
              />
            </p>
          ) : null}
        </div>

        <div className="text-muted-foreground shrink-0 text-right text-xs">
          <p>Joined {formatDate(user.createdAt)}</p>
          <p className="mt-0.5">
            {user.lastLoginAt
              ? `Last in ${relativeTime(user.lastLoginAt)}`
              : "Never signed in"}
          </p>
          {user.failedLoginCount > 0 ? (
            <p className="mt-0.5">
              {user.failedLoginCount} failed sign-in
              {user.failedLoginCount === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-2">
          {suspended ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialog("reinstate")}
            >
              <RotateCcw aria-hidden />
              Reinstate
            </Button>
          ) : user.role === "ADMIN" ? (
            // No suspend button for an administrator: the API allows it, but
            // offering it here invites an accident that locks the platform.
            <span className="text-muted-foreground self-center text-xs">
              Administrator
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setDialog("suspend")}
            >
              <Ban aria-hidden />
              Suspend
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={dialog === "suspend"}
        onOpenChange={(open) => setDialog(open ? "suspend" : null)}
        title={`Suspend ${name}?`}
        description={
          user.role === "PROVIDER"
            ? "They cannot sign in, their listings stop appearing in search, and they cannot be booked. Existing bookings are not cancelled."
            : "They cannot sign in. Existing bookings are not cancelled."
        }
        confirmLabel="Suspend account"
        destructive
        reason={{
          label: "Why are you suspending this account?",
          placeholder:
            "What they did, and the report or dispute reference if there is one.",
          minLength: 10,
        }}
        onConfirm={(reason) => admin.suspendUser(user.id, reason)}
        onDone={onChanged}
      />

      <ConfirmDialog
        open={dialog === "reinstate"}
        onOpenChange={(open) => setDialog(open ? "reinstate" : null)}
        title={`Reinstate ${name}?`}
        description="They can sign in again, and a provider goes back into search."
        confirmLabel="Reinstate account"
        reason={{
          label: "Why are you reinstating them?",
          placeholder: "Appeal upheld, suspended in error, matter resolved.",
          minLength: 10,
        }}
        onConfirm={(reason) => admin.reinstateUser(user.id, reason)}
        onDone={onChanged}
      />
    </article>
  );
}
