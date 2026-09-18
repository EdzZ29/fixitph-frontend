/**
 * Display helpers for the dashboards.
 *
 * Two rules the whole dashboard follows, both enforced here rather than
 * remembered at each call site:
 *
 *   1. Money from the API is a decimal *string*. It is formatted, never added.
 *      Parsing one into a float to display it is how ₱1,250.10 becomes
 *      ₱1,250.0999999.
 *   2. Every status enum has exactly one human label and one tone. A status
 *      rendered two different ways on two screens reads as two things.
 */

import type {
  BookingStatus,
  DisputeStatus,
  PaymentStatus,
  PricingType,
  QuoteStatus,
  ReportStatus,
  RequestStatus,
  RequestUrgency,
  ServiceStatus,
  UserStatus,
  VerificationStatus,
} from "@/lib/api/client";

/** The four ways a badge can read. Maps onto the Badge variants we have. */
export type Tone = "neutral" | "positive" | "warning" | "critical" | "muted";

// ---------------------------------------------------------------------------
// Money, dates, numbers
// ---------------------------------------------------------------------------

/**
 * Two formatters rather than one, because there is no single fraction-digit
 * setting that renders both ₱1,500 and ₱1,250.10 correctly: a minimum of 0
 * turns 1250.10 into "₱1,250.1", and a minimum of 2 turns 1500 into
 * "₱1,500.00" on every price on the site. Which one applies is decided by
 * whether the amount actually has centavos.
 */
const pesoWhole = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const pesoCentavos = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a decimal string as pesos. The string goes through Number only for
 * grouping; anything unparseable is shown as an em dash rather than NaN.
 */
export function money(
  value: string | number | null | undefined,
  currency = "PHP",
): string {
  if (value === null || value === undefined || value === "") return "—";
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return "—";
  if (currency !== "PHP") {
    return `${currency} ${amount.toLocaleString("en-PH", {
      maximumFractionDigits: 2,
    })}`;
  }
  // Rounded to centavos first, so 1500.004 counts as a whole peso amount
  // rather than taking the two-decimal path and rendering "₱1,500.00".
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded)
    ? pesoWhole.format(rounded)
    : pesoCentavos.format(rounded);
}

/** A price band, collapsing to a single figure when both ends match. */
export function moneyRange(
  min: string | null | undefined,
  max: string | null | undefined,
): string {
  if (!min && !max) return "—";
  if (min && !max) return `from ${money(min)}`;
  if (!min && max) return `up to ${money(max)}`;
  if (min === max) return money(min);
  return `${money(min)} – ${money(max)}`;
}

const dateFmt = new Intl.DateTimeFormat("en-PH", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-PH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const timeFmt = new Intl.DateTimeFormat("en-PH", {
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? dateFmt.format(date) : "—";
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? dateTimeFmt.format(date) : "—";
}

export function formatTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? timeFmt.format(date) : "—";
}

/**
 * "in 3 days", "2 hours ago". Used wherever the gap matters more than the
 * date: a booking tomorrow and a booking in March are read differently.
 */
/**
 * Opening hours, as somebody would say them.
 *
 * The API sends a time of day — "08:00" — because these columns hold a
 * wall-clock time with no date. It is formatted here rather than there so it
 * follows the reader's locale, and parsed as UTC so the hour survives the
 * trip: read in the local zone, "08:00" becomes eight in the morning
 * somewhere else.
 */
export function openingTime(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) return value;

  const at = new Date(Date.UTC(1970, 0, 1, Number(match[1]), Number(match[2])));
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(at);
}

export function relativeTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";

  const seconds = (date.getTime() - Date.now()) / 1000;
  const abs = Math.abs(seconds);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return rtf.format(Math.round(seconds), "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 2_592_000) return rtf.format(Math.round(seconds / 86_400), "day");
  if (abs < 31_536_000)
    return rtf.format(Math.round(seconds / 2_592_000), "month");
  return rtf.format(Math.round(seconds / 31_536_000), "year");
}

export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!rest) return `${hours} hr`;
  return `${hours} hr ${rest} min`;
}

/** For a datetime-local input, which wants local time with no timezone. */
export function toDateTimeInputValue(value: string | Date | null): string {
  const date = toDate(value) ?? new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// ---------------------------------------------------------------------------
// Status vocabulary
// ---------------------------------------------------------------------------

export interface StatusMeta {
  label: string;
  tone: Tone;
}

/** Title Case fallback for an enum value nothing has a label for yet. */
export function humanise(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

const BOOKING: Record<BookingStatus, StatusMeta> = {
  PENDING_CONFIRMATION: { label: "Awaiting confirmation", tone: "warning" },
  CONFIRMED: { label: "Confirmed", tone: "positive" },
  IN_PROGRESS: { label: "In progress", tone: "neutral" },
  COMPLETED: { label: "Completed", tone: "positive" },
  CANCELLED_BY_CUSTOMER: { label: "Cancelled by customer", tone: "muted" },
  CANCELLED_BY_PROVIDER: { label: "Cancelled by provider", tone: "muted" },
  NO_SHOW_CUSTOMER: { label: "Customer no-show", tone: "critical" },
  NO_SHOW_PROVIDER: { label: "Provider no-show", tone: "critical" },
  DISPUTED: { label: "Disputed", tone: "critical" },
};

const REQUEST: Record<RequestStatus, StatusMeta> = {
  DRAFT: { label: "Draft", tone: "muted" },
  OPEN: { label: "Open", tone: "neutral" },
  QUOTED: { label: "Quoted", tone: "warning" },
  ACCEPTED: { label: "Accepted", tone: "positive" },
  BOOKED: { label: "Booked", tone: "positive" },
  CANCELLED: { label: "Cancelled", tone: "muted" },
  EXPIRED: { label: "Expired", tone: "muted" },
  CLOSED: { label: "Closed", tone: "muted" },
};

const QUOTE: Record<QuoteStatus, StatusMeta> = {
  PENDING: { label: "Awaiting your decision", tone: "warning" },
  ACCEPTED: { label: "Accepted", tone: "positive" },
  REJECTED: { label: "Declined", tone: "muted" },
  WITHDRAWN: { label: "Withdrawn", tone: "muted" },
  EXPIRED: { label: "Expired", tone: "muted" },
};

const SERVICE: Record<ServiceStatus, StatusMeta> = {
  DRAFT: { label: "Draft", tone: "muted" },
  ACTIVE: { label: "Live", tone: "positive" },
  PAUSED: { label: "Paused", tone: "warning" },
  ARCHIVED: { label: "Archived", tone: "muted" },
};

const VERIFICATION: Record<VerificationStatus, StatusMeta> = {
  UNVERIFIED: { label: "Not submitted", tone: "muted" },
  PENDING: { label: "Under review", tone: "warning" },
  APPROVED: { label: "Verified", tone: "positive" },
  REJECTED: { label: "Rejected", tone: "critical" },
  EXPIRED: { label: "Expired", tone: "critical" },
};

const USER: Record<UserStatus, StatusMeta> = {
  PENDING_VERIFICATION: { label: "Unverified", tone: "warning" },
  ACTIVE: { label: "Active", tone: "positive" },
  SUSPENDED: { label: "Suspended", tone: "critical" },
  DEACTIVATED: { label: "Deactivated", tone: "muted" },
};

const PAYMENT: Record<PaymentStatus, StatusMeta> = {
  UNPAID: { label: "Unpaid", tone: "warning" },
  PARTIALLY_PAID: { label: "Part paid", tone: "warning" },
  PAID: { label: "Paid", tone: "positive" },
  REFUNDED: { label: "Refunded", tone: "muted" },
};

const DISPUTE: Record<DisputeStatus, StatusMeta> = {
  OPEN: { label: "Open", tone: "critical" },
  UNDER_REVIEW: { label: "Under review", tone: "warning" },
  AWAITING_CUSTOMER: { label: "Awaiting customer", tone: "warning" },
  AWAITING_PROVIDER: { label: "Awaiting provider", tone: "warning" },
  ESCALATED: { label: "Escalated", tone: "critical" },
  RESOLVED_REFUND: { label: "Resolved, refunded", tone: "positive" },
  RESOLVED_PARTIAL_REFUND: { label: "Resolved, part refund", tone: "positive" },
  RESOLVED_NO_ACTION: { label: "Resolved, no action", tone: "muted" },
  CLOSED: { label: "Closed", tone: "muted" },
};

const REPORT: Record<ReportStatus, StatusMeta> = {
  OPEN: { label: "Open", tone: "critical" },
  UNDER_REVIEW: { label: "Under review", tone: "warning" },
  RESOLVED: { label: "Resolved", tone: "positive" },
  DISMISSED: { label: "Dismissed", tone: "muted" },
};

const URGENCY: Record<RequestUrgency, StatusMeta> = {
  FLEXIBLE: { label: "Flexible", tone: "muted" },
  WITHIN_WEEK: { label: "Within a week", tone: "neutral" },
  WITHIN_48H: { label: "Within 48 hours", tone: "warning" },
  EMERGENCY: { label: "Emergency", tone: "critical" },
};

/** One lookup for every status enum, so a caller does not pick the map. */
export const statusMeta = {
  booking: (value: BookingStatus) => BOOKING[value] ?? fallback(value),
  request: (value: RequestStatus) => REQUEST[value] ?? fallback(value),
  quote: (value: QuoteStatus) => QUOTE[value] ?? fallback(value),
  service: (value: ServiceStatus) => SERVICE[value] ?? fallback(value),
  verification: (value: VerificationStatus) =>
    VERIFICATION[value] ?? fallback(value),
  user: (value: UserStatus) => USER[value] ?? fallback(value),
  payment: (value: PaymentStatus) => PAYMENT[value] ?? fallback(value),
  dispute: (value: DisputeStatus) => DISPUTE[value] ?? fallback(value),
  report: (value: ReportStatus) => REPORT[value] ?? fallback(value),
  urgency: (value: RequestUrgency) => URGENCY[value] ?? fallback(value),
};

function fallback(value: string): StatusMeta {
  return { label: humanise(value), tone: "neutral" };
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export const PRICING_LABEL: Record<PricingType, string> = {
  FIXED: "Fixed price",
  HOURLY: "Hourly",
  PER_UNIT: "Per unit",
  QUOTE_REQUIRED: "Quote only",
};

/**
 * How a listing's price reads on a card: "₱1,500", "₱450 / hour",
 * "Quote on request".
 */
export function priceLine(service: {
  pricingType: PricingType;
  price: string | null;
  priceUnit: string | null;
  currency?: string;
}): string {
  if (service.pricingType === "QUOTE_REQUIRED") return "Quote on request";
  const amount = money(service.price, service.currency ?? "PHP");
  if (service.pricingType === "FIXED") return amount;
  return service.priceUnit ? `${amount} / ${service.priceUnit}` : amount;
}

/** "Juan D." style short name, falling back to the email local part. */
export function personName(
  profile: { firstName?: string; lastName?: string } | null | undefined,
  email?: string,
): string {
  if (profile?.firstName) {
    const initial = profile.lastName ? ` ${profile.lastName}` : "";
    return `${profile.firstName}${initial}`;
  }
  return email?.split("@")[0] ?? "Unknown";
}

/**
 * How a reviewer is shown publicly: their chosen display name, else their
 * first name, else nothing identifying at all. Never the surname and never
 * the email — a review is public and the author did not choose to be.
 */
export function reviewerName(
  author:
    | { profile: { displayName: string | null; firstName: string } | null }
    | null
    | undefined,
): string {
  return author?.profile?.displayName ?? author?.profile?.firstName ?? "A customer";
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/** "1 booking" / "4 bookings", without a library. */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString("en-PH")} ${count === 1 ? one : many}`;
}
