/**
 * Typed client for the FixItPH API.
 *
 * Two things it does that a bare fetch wrapper does not:
 *
 *   1. Unwraps the { success, data } envelope, so callers get the payload and
 *      a thrown ApiError rather than having to check a flag every time.
 *   2. Refreshes a stale access token once, transparently, and replays the
 *      original request. The refresh token lives in an httpOnly cookie that
 *      JavaScript cannot read, which is why every call sends credentials.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

// ---------------------------------------------------------------------------
// Response envelope
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  message: string;
  code?: string;
  errors?: string[];
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Thrown for any non-2xx response. `code` is the stable machine-readable one. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly errors?: string[],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  get isValidation(): boolean {
    return this.code === 'VALIDATION_ERROR';
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

// ---------------------------------------------------------------------------
// Access token
// ---------------------------------------------------------------------------

/**
 * Held in memory, never in localStorage. A short-lived token in memory is
 * gone when the tab closes and cannot be read by injected script; the
 * long-lived refresh token stays in an httpOnly cookie.
 */
let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Set false for endpoints that must not trigger a token refresh. */
  retryOnUnauthenticated?: boolean;
  /**
   * How many times a 429 may be waited out before it is raised. Set 0 on
   * anything where a person is waiting on a button and would rather see the
   * message than a long pause.
   */
  retryOnRateLimit?: number;
}

/**
 * How long to wait before retrying a rate-limited request.
 *
 * Prefers the server's own Retry-After, which is authoritative and is what
 * the throttler sets. Falls back to a short exponential backoff with jitter —
 * jittered because several widgets on a dashboard hit the limit at the same
 * instant, and retrying them in lockstep just rebuilds the burst that caused
 * it.
 */
function rateLimitDelay(res: Response, attempt: number): number {
  // With several named buckets the header is suffixed per bucket
  // (Retry-After-auth, Retry-After-write, …), so this takes the soonest of
  // whichever ones came back rather than looking for a bare "Retry-After"
  // that may not exist.
  let soonest = Number.POSITIVE_INFINITY;
  res.headers.forEach((value, name) => {
    if (!name.toLowerCase().startsWith('retry-after')) return;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) {
      soonest = Math.min(soonest, seconds);
    }
  });

  if (Number.isFinite(soonest)) {
    // Capped: past a few seconds the honest thing is to surface the error
    // rather than leave someone staring at a spinner.
    return Math.min(soonest * 1000, 10_000);
  }

  const base = Math.min(500 * 2 ** attempt, 4_000);
  return base + Math.random() * 250;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(
    path.startsWith('/') ? `${API_URL}${path}` : `${API_URL}/${path}`,
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  // One refresh at a time. Without this, five parallel 401s become five
  // rotations, and rotation treats a reused token as theft.
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) {
        accessToken = null;
        return false;
      }
      const body = (await res.json()) as ApiSuccess<{ accessToken: string }>;
      accessToken = body.data.accessToken;
      return true;
    } catch {
      accessToken = null;
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    body,
    query,
    retryOnUnauthenticated = true,
    retryOnRateLimit = 2,
    headers,
    ...rest
  } = options;

  /**
   * A file upload is sent as FormData and must not be touched: serialising it
   * would destroy it, and setting Content-Type ourselves would omit the
   * multipart boundary the browser generates, which the server needs to parse
   * the parts at all.
   */
  const isMultipart =
    typeof FormData !== 'undefined' && body instanceof FormData;

  const send = async (): Promise<Response> =>
    fetch(buildUrl(path, query), {
      ...rest,
      // Needed for the httpOnly refresh cookie. The API's CORS allow-list is
      // what keeps this from being usable by other origins.
      credentials: 'include',
      headers: {
        ...(body !== undefined && !isMultipart
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      ...(body !== undefined
        ? { body: isMultipart ? (body as FormData) : JSON.stringify(body) }
        : {}),
    });

  let res = await send();

  if (res.status === 401 && retryOnUnauthenticated) {
    const refreshed = await refreshAccessToken();
    if (refreshed) res = await send();
  }

  /**
   * A 429 is a "not yet", not a "no".
   *
   * Reads are idempotent and the window is short, so waiting it out and
   * trying again is both safe and what the caller wanted — far better than
   * showing someone an error on a list they are entitled to see. Bounded, so
   * a genuinely exhausted budget still surfaces rather than hanging.
   */
  for (let attempt = 0; res.status === 429 && attempt < retryOnRateLimit; attempt++) {
    const wait = rateLimitDelay(res, attempt);
    // Waiting out a long window would be worse than saying so.
    if (wait > 5_000) break;
    await sleep(wait);
    res = await send();
  }

  const payload = await parseBody(res);

  if (!res.ok) {
    const failure = (payload ?? {}) as ApiFailure;
    throw new ApiError(
      res.status,
      failure.code ?? 'UNKNOWN_ERROR',
      failure.message ?? `Request failed with status ${res.status}`,
      failure.errors,
    );
  }

  const envelope = payload as ApiSuccess<T> | null;
  // Every successful response is wrapped, but a 204 has no body at all.
  return (envelope?.data ?? (null as T)) as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'body' | 'method'>) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body' | 'method'>) =>
    request<T>(path, { ...options, method: 'POST', body }),

  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body' | 'method'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),

  /** For replacing a whole collection, as the weekly schedule does. */
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body' | 'method'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),

  delete: <T>(path: string, options?: Omit<RequestOptions, 'body' | 'method'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Domain types (mirror the API selects, not the database tables)
// ---------------------------------------------------------------------------

export type UserRole = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
export type UserStatus =
  | 'PENDING_VERIFICATION'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'DEACTIVATED';
export type VerificationStatus =
  | 'UNVERIFIED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED';
export type ProviderType = 'INDIVIDUAL' | 'BUSINESS';
export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

/**
 * A verification badge names one check that was carried out — not a rating,
 * and not a promise about the provider's work. The API sends the disclaimer
 * that says so alongside the badges, so it cannot be dropped in the UI.
 */
export type VerificationBadge = 'EMAIL' | 'IDENTITY' | 'BUSINESS';
export type VerificationLevel = 'NONE' | 'BASIC' | 'IDENTITY' | 'BUSINESS';

/** Where the account stands on step one: proving the email address works. */
export interface EmailVerificationStatus {
  email: string;
  verified: boolean;
  verifiedAt: string | null;
  /** A code is out and has not expired, so the UI can go straight to entry. */
  codePending: boolean;
  codeExpiresAt: string | null;
}

export interface VerificationBadgeDetail {
  badge: VerificationBadge;
  label: string;
  /** Plain-words explanation of what was checked. */
  means: string;
  earned: boolean;
  at: string | null;
}

export interface VerificationSummary {
  level: VerificationLevel;
  /**
   * Every check this provider's trading type calls for has been passed. The
   * API decides it, because an individual is finished with proof of identity
   * while a business also needs its permit.
   */
  complete: boolean;
  badges: VerificationBadgeDetail[];
  earned: VerificationBadge[];
  disclaimer: string;
}

export type PricingType = 'FIXED' | 'HOURLY' | 'PER_UNIT' | 'QUOTE_REQUIRED';
export type ServiceStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type RequestUrgency =
  | 'FLEXIBLE'
  | 'WITHIN_WEEK'
  | 'WITHIN_48H'
  | 'EMERGENCY';
export type RequestStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'BOOKED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'CLOSED';
export type QuoteStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED';
export type PaymentMethod = 'CASH' | 'GCASH' | 'MAYA' | 'BANK_TRANSFER';
export type PaymentStatus =
  | 'UNPAID'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'REFUNDED';
export type BookingStatus =
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED_BY_CUSTOMER'
  | 'CANCELLED_BY_PROVIDER'
  | 'NO_SHOW_CUSTOMER'
  | 'NO_SHOW_PROVIDER'
  | 'DISPUTED';
export type DisputeStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'AWAITING_CUSTOMER'
  | 'AWAITING_PROVIDER'
  | 'RESOLVED_REFUND'
  | 'RESOLVED_PARTIAL_REFUND'
  | 'RESOLVED_NO_ACTION'
  | 'ESCALATED'
  | 'CLOSED';
export type ReportStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
export type ReportTargetType =
  | 'USER'
  | 'PROVIDER'
  | 'SERVICE'
  | 'REVIEW'
  | 'MESSAGE'
  | 'BOOKING';
export type ReportReason =
  | 'SPAM'
  | 'FRAUD'
  | 'INAPPROPRIATE_CONTENT'
  | 'HARASSMENT'
  | 'NO_SHOW'
  | 'POOR_WORKMANSHIP'
  | 'FAKE_REVIEW'
  | 'OFF_PLATFORM_PAYMENT'
  | 'OTHER';
export type DocumentType =
  | 'GOVERNMENT_ID'
  | 'BUSINESS_PERMIT'
  | 'BARANGAY_CLEARANCE'
  | 'PRC_LICENSE'
  | 'TESDA_CERTIFICATE'
  | 'PROOF_OF_ADDRESS'
  | 'OTHER';

/** Decimal columns arrive as strings. Never do arithmetic on one directly. */
export type Decimal = string;

export interface Me {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  profile: {
    firstName: string;
    lastName: string;
    displayName: string | null;
    city: string | null;
    barangay: string | null;
    province: string | null;
  } | null;
  provider: {
    id: string;
    slug: string;
    businessName: string;
    verificationStatus: VerificationStatus;
  } | null;
}

export interface ProviderSummary {
  id: string;
  slug: string;
  providerType: ProviderType;
  businessName: string;
  /** Short-lived signed URLs. The storage keys never leave the server. */
  avatarUrl: string | null;
  coverUrl: string | null;
  verification: VerificationSummary;
  headline: string | null;
  baseCity: string;
  baseBarangay: string | null;
  ratingAvg: Decimal;
  ratingCount: number;
  completedJobsCount: number;
  verificationStatus: VerificationStatus;
  isAcceptingBookings: boolean;
  paymentMethods: PaymentMethod[];
  services?: ServiceSummary[];
}

/** The trimmed shape that comes back nested inside a provider profile. */
export interface ServiceSummary {
  id: string;
  title: string;
  slug: string;
  pricingType: PricingType;
  price: Decimal | null;
  priceUnit: string | null;
  categoryId: string;
}

/**
 * A listing as the public /services endpoints return it: the service plus
 * enough of its provider to be worth comparing. A price with no idea who is
 * charging it is not a comparable thing, which is why the provider block is
 * part of the select rather than a second request.
 */
export interface PublicService {
  id: string;
  title: string;
  slug: string;
  description: string;
  pricingType: PricingType;
  price: Decimal | null;
  priceUnit: string | null;
  minPrice: Decimal | null;
  maxPrice: Decimal | null;
  currency: string;
  durationMinutes: number | null;
  status: ServiceStatus;
  createdAt: string;
  category: { id: string; name: string; slug: string };
  provider: {
    id: string;
    slug: string;
    businessName: string;
    baseCity: string;
    baseBarangay: string | null;
    ratingAvg: Decimal;
    ratingCount: number;
    verificationStatus: VerificationStatus;
    verification: VerificationSummary;
  };
  /** Only on the detail read. */
  images?: {
    id: string;
    altText: string | null;
    position: number;
    width: number | null;
    height: number | null;
  }[];
}

/**
 * The full public profile, as GET /providers/:idOrSlug returns it. Wider than
 * a search result: it carries the listings, coverage, working hours and past
 * work that a customer decides on.
 */
export interface ProviderProfile {
  id: string;
  slug: string;
  providerType: ProviderType;
  businessName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  verification: VerificationSummary;
  headline: string | null;
  bio: string | null;
  yearsExperience: number | null;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  baseCity: string;
  baseBarangay: string | null;
  serviceRadiusKm: number | null;
  ratingAvg: Decimal;
  ratingCount: number;
  completedJobsCount: number;
  responseTimeMinutes: number | null;
  acceptsEmergency: boolean;
  isAcceptingBookings: boolean;
  paymentMethods: PaymentMethod[];
  createdAt: string;
  services?: {
    id: string;
    title: string;
    slug: string;
    description: string;
    pricingType: PricingType;
    price: Decimal | null;
    priceUnit: string | null;
    minPrice: Decimal | null;
    maxPrice: Decimal | null;
    durationMinutes: number | null;
    category: { id: string; name: string; slug: string };
    images: { id: string; position: number }[];
  }[];
  serviceAreas?: {
    id: string;
    areaType: string;
    city: string | null;
    barangay: string | null;
    radiusKm: number | null;
  }[];
  availability?: {
    dayOfWeek: string;
    startTime: string | null;
    endTime: string | null;
    isClosed: boolean;
  }[];
  portfolioItems?: {
    id: string;
    title: string;
    description: string | null;
    completedAt: string | null;
  }[];
}

export interface CategoryNode {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  position?: number;
  isActive?: boolean;
  children: CategoryNode[];
  _count: { services: number };
}

/** A provider's own listing. Carries status, which the public shape does not. */
export interface OwnService {
  id: string;
  title: string;
  slug: string;
  description: string;
  pricingType: PricingType;
  price: Decimal | null;
  priceUnit: string | null;
  minPrice: Decimal | null;
  maxPrice: Decimal | null;
  currency: string;
  durationMinutes: number | null;
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; slug: string };
  _count: { bookings: number; serviceRequests: number };
}

export interface BookingSummary {
  id: string;
  status: BookingStatus;
  scheduledStart: string;
  scheduledEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  totalAmount: Decimal;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  contactReleasedAt: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  quoteId: string | null;
  serviceRequestId: string | null;
  customerId: string;
  providerId: string;
  provider: {
    id: string;
    businessName: string;
    slug: string;
    ratingAvg: Decimal;
    ratingCount: number;
  };
  service: { id: string; title: string; slug: string } | null;
  serviceRequest: {
    id: string;
    title: string;
    city: string;
    barangay: string | null;
    categoryId: string;
  } | null;
  /**
   * Present once the customer has reviewed this booking. Carried on the list
   * so "Leave a review" is not offered twice — the unique index on
   * booking_id would refuse the second attempt.
   */
  review: { id: string; rating: number } | null;
}

export interface BookingDetail extends Omit<BookingSummary, "review"> {
  statusHistory: {
    fromStatus: BookingStatus | null;
    toStatus: BookingStatus;
    reason: string | null;
    createdAt: string;
  }[];
  review: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  } | null;
  /**
   * Present only when the caller is the provider. The exact address is
   * withheld until the booking is confirmed; `released` says which it is.
   */
  customerContact?: {
    city: string | null;
    barangay: string | null;
    name: string | null;
    phone: string | null;
    addressLine1: string | null;
    latitude: string | null;
    longitude: string | null;
    released: boolean;
  } | null;
}

export interface RequestSummary {
  id: string;
  title: string;
  status: RequestStatus;
  urgency: RequestUrgency;
  city: string;
  barangay: string | null;
  budgetMin: Decimal | null;
  budgetMax: Decimal | null;
  preferredAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  category: { id: string; name: string; slug: string };
  provider: { id: string; businessName: string; slug: string } | null;
  _count: { quotes: number };
}

export interface Quote {
  id: string;
  amount: Decimal;
  currency: string;
  status: QuoteStatus;
  notes: string | null;
  laborCost?: Decimal | null;
  partsCost?: Decimal | null;
  estimatedDurationMinutes?: number | null;
  validUntil: string | null;
  createdAt?: string;
  provider?: {
    id: string;
    businessName: string;
    slug: string;
    ratingAvg: Decimal;
    ratingCount: number;
  };
}

export interface RequestDetail extends RequestSummary {
  description: string;
  addressLine1: string | null;
  latitude: string | null;
  longitude: string | null;
  serviceId: string | null;
  customerId: string;
  quotes: Quote[];
}

/**
 * A row from the broadcast feed. Served by a view that deliberately omits the
 * customer's identity, street address and coordinates, and uses snake_case
 * because it comes straight out of raw SQL.
 */
export interface FeedRequest {
  id: string;
  category_id: string;
  title: string;
  description_preview: string;
  urgency: RequestUrgency;
  city: string;
  barangay: string | null;
  budget_min: Decimal | null;
  budget_max: Decimal | null;
  preferred_at: string | null;
  expires_at: string | null;
  created_at: string;
  pending_quote_count: number;
}

export interface FavoriteRow {
  createdAt: string;
  provider: {
    id: string;
    slug: string;
    businessName: string;
    headline: string | null;
    baseCity: string;
    baseBarangay: string | null;
    ratingAvg: Decimal;
    ratingCount: number;
    verificationStatus: VerificationStatus;
    isAcceptingBookings: boolean;
  };
}

/**
 * One message in a thread. A message hangs off exactly one anchor — a booking
 * or a service request, never both and never neither — which is a CHECK
 * constraint as well as an API rule, and is what the RLS policy uses to
 * decide who may read it.
 */
export interface MessageRow {
  id: string;
  bookingId: string | null;
  serviceRequestId: string | null;
  senderId: string;
  recipientId: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  body: string;
  readAt: string | null;
  createdAt: string;
  attachments: {
    id: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    /**
     * A link that works for a few minutes. Signed when the thread is read,
     * never a storage key — and null if the object could not be reached, so
     * one unavailable image cannot take the thread down with it.
     */
    url: string | null;
  }[];
}

/** One conversation, as the list of them reports it. */
export interface MessageThreadRow {
  bookingId: string | null;
  serviceRequestId: string | null;
  /** The short booking reference the booking screens print. */
  reference: string | null;
  title: string;
  counterpartyName: string;
  area: string | null;
  status: BookingStatus | null;
  scheduledStart: string | null;
  unread: number;
  lastMessage: {
    body: string;
    messageType: MessageRow['messageType'];
    createdAt: string;
    /** Whether the caller sent it, for the "You: " prefix. */
    mine: boolean;
  };
}

export interface NotificationRow {
  id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  data: unknown;
  readAt: string | null;
  createdAt: string;
}

export interface ReviewRow {
  id: string;
  rating: number;
  punctualityRating: number | null;
  qualityRating: number | null;
  valueRating: number | null;
  comment: string | null;
  providerResponse: string | null;
  createdAt: string;
  /**
   * Nested under profile, which is how the API selects it. The flat shape
   * this used to declare meant the reader's name never resolved and every
   * public review was attributed to "A customer".
   */
  author?: {
    profile: { displayName: string | null; firstName: string } | null;
  } | null;
}

export interface DisputeRow {
  id: string;
  bookingId: string;
  reason: string;
  details: string;
  status: DisputeStatus;
  resolution: string | null;
  refundAmount: Decimal | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface ReportRow {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolvedAt: string | null;
  createdAt: string;
}

// -- admin shapes -----------------------------------------------------------

export interface PlatformStats {
  users: Record<string, number>;
  providers: Record<string, number>;
  bookings: Record<string, number>;
  queue: {
    pendingVerifications: number;
    openDisputes: number;
    openReports: number;
    disputedBookings: number;
  };
  catalog: { activeServices: number; categories: number };
}

export interface AdminUser {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  failedLoginCount: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  deletedAt: string | null;
  profile: { firstName: string; lastName: string; city: string | null } | null;
  provider: {
    id: string;
    businessName: string;
    verificationStatus: VerificationStatus;
  } | null;
}

export interface PendingVerification {
  id: string;
  businessName: string;
  slug: string;
  baseCity: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
  user: { id: string; email: string; phone: string | null };
  documents: {
    id: string;
    documentType: DocumentType;
    status: VerificationStatus;
    originalFilename: string;
    createdAt: string;
  }[];
}

export interface AdminServiceRow {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: ServiceStatus;
  pricingType: PricingType;
  price: Decimal | null;
  priceUnit: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  category: { id: string; name: string };
  provider: {
    id: string;
    businessName: string;
    slug: string;
    baseCity: string;
    verificationStatus: VerificationStatus;
    suspendedAt: string | null;
    user: { id: string; email: string };
  };
  _count: { bookings: number };
}

export interface AdminReviewRow {
  id: string;
  bookingId: string;
  rating: number;
  comment: string | null;
  providerResponse: string | null;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  openReports: number;
  author: {
    id: string;
    email: string;
    profile: { firstName: string; lastName: string } | null;
  };
  provider: { id: string; businessName: string; slug: string };
}

export interface AdminDisputeRow {
  id: string;
  bookingId: string;
  reason: string;
  details: string;
  status: DisputeStatus;
  resolution: string | null;
  refundAmount: Decimal | null;
  resolvedAt: string | null;
  createdAt: string;
  raisedBy: {
    id: string;
    email: string;
    role: UserRole;
    profile: { firstName: string; lastName: string } | null;
  };
  booking: {
    id: string;
    status: BookingStatus;
    totalAmount: Decimal;
    currency: string;
    scheduledStart: string;
    completedAt: string | null;
    customerId: string;
    provider: { id: string; businessName: string; slug: string };
    service: { id: string; title: string } | null;
  };
}

export interface AdminReportRow {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reporter: {
    id: string;
    email: string;
    role: UserRole;
    profile: { firstName: string; lastName: string } | null;
  };
  resolvedBy: { id: string; email: string } | null;
  target: {
    kind: ReportTargetType;
    label: string;
    detail: string;
  } | null;
}

export interface AuditEntry {
  id: string;
  actionType: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  createdAt: string;
  admin: { id: string; email: string };
}

export type SettingValueType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';

export interface SettingRow {
  key: string;
  value: unknown;
  valueType: SettingValueType;
  label: string;
  description: string | null;
  group: string;
  position: number;
  isPublic: boolean;
  isEditable: boolean;
  updatedAt: string;
  updatedBy: { id: string; email: string } | null;
}

export type ProviderSearchParams = {
  q?: string;
  categoryId?: string;
  city?: string;
  barangay?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  acceptsEmergency?: boolean;
  availableNow?: boolean;
  sort?: 'relevance' | 'rating' | 'jobs' | 'newest' | 'response';
  page?: number;
  limit?: number;
};

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export const auth = {
  async login(email: string, password: string) {
    const data = await api.post<{ accessToken: string; expiresIn: number }>(
      '/auth/login',
      { email, password },
      { retryOnUnauthenticated: false, retryOnRateLimit: 0 },
    );
    setAccessToken(data.accessToken);
    return data;
  },

  async register(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    city?: string;
    barangay?: string;
    role?: 'CUSTOMER' | 'PROVIDER';
  }) {
    const data = await api.post<{
      userId: string;
      accessToken: string;
      expiresIn: number;
    }>('/auth/register', input, { retryOnUnauthenticated: false, retryOnRateLimit: 0 });
    setAccessToken(data.accessToken);
    return data;
  },

  async logout() {
    try {
      await api.post('/auth/logout', {});
    } finally {
      setAccessToken(null);
    }
  },

  me: () => api.get<Me>('/auth/me'),

  /**
   * Where "Continue with Google" sends the browser.
   *
   * A URL rather than a request: the flow is a top-level navigation through
   * Google's consent screen, and the API sets the session cookie on the way
   * back. Nothing is returned to script, so there is nothing here to await.
   */
  googleUrl: () => `${API_URL}/auth/google`,

  /**
   * Email verification: send a code, then confirm it.
   *
   * Unlike the reset flow below, both calls need a session — you are proving
   * your own address — so the responses can say plainly what went wrong
   * instead of being vague to avoid telling a stranger who has an account.
   *
   * Neither retries on a rate limit. A second send would mail a second code,
   * and a silent retry of a wrong code would spend two of the five tries.
   */
  emailStatus: () => api.get<EmailVerificationStatus>('/auth/email/status'),

  sendEmailCode: () =>
    api.post<{ message: string; codeTtlMinutes: number; devCode?: string }>(
      '/auth/email/send-code',
      {},
      { retryOnRateLimit: 0 },
    ),

  confirmEmail: (code: string) =>
    api.post<{ verifiedAt: string }>(
      '/auth/email/confirm',
      { code },
      { retryOnRateLimit: 0 },
    ),

  /**
   * Password reset, in three steps. The emailed code is short enough to retype,
   * so it is never the thing that authorises the change: verifying it returns a
   * separate high-entropy token, and that is what resetPassword spends.
   */
  forgotPassword: (email: string) =>
    api.post<{ message: string; codeTtlMinutes: number; devCode?: string }>(
      '/auth/forgot-password',
      { email },
      { retryOnUnauthenticated: false, retryOnRateLimit: 0 },
    ),

  verifyResetCode: (email: string, code: string) =>
    api.post<{ resetToken: string; expiresInSeconds: number }>(
      '/auth/verify-reset-code',
      { email, code },
      { retryOnUnauthenticated: false, retryOnRateLimit: 0 },
    ),

  resetPassword: (resetToken: string, password: string) =>
    api.post<{ message: string }>(
      '/auth/reset-password',
      { resetToken, password },
      { retryOnUnauthenticated: false, retryOnRateLimit: 0 },
    ),
};

export const users = {
  myProfile: () =>
    api.get<{
      firstName: string;
      lastName: string;
      displayName: string | null;
      bio: string | null;
      addressLine1: string | null;
      barangay: string | null;
      city: string | null;
      province: string | null;
      postalCode: string | null;
      updatedAt: string;
    }>('/users/me/profile'),

  updateMyProfile: (input: Record<string, unknown>) =>
    api.patch('/users/me/profile', input),
};

export const providers = {
  search: (params: ProviderSearchParams = {}) =>
    api.get<Paginated<ProviderSummary>>('/providers', { query: params }),

  /** Accepts a uuid or a slug. Public profiles are linked by slug. */
  profile: (idOrSlug: string) =>
    api.get<ProviderProfile>(`/providers/${idOrSlug}`),

  byId: (id: string) => api.get<ProviderProfile>(`/providers/${id}`),

  reviews: (
    id: string,
    params: { page?: number; limit?: number; sort?: 'recent' | 'rating' } = {},
  ) =>
    api.get<
      Paginated<ReviewRow> & { breakdown: { stars: number; count: number }[] }
    >(`/providers/${id}/reviews`, { query: params }),

  create: (input: ProviderInput) =>
    api.post<ProviderProfile>('/providers', input),

  /** Null clears an optional field; undefined leaves it alone. */
  update: (id: string, input: Partial<ProviderInput>) =>
    api.patch<ProviderProfile>(`/providers/${id}`, input),

  // -- the caller's own profile, scoped by token rather than by id ---------

  availability: () => api.get<AvailabilityDay[]>('/providers/me/availability'),

  /** Replaces the whole week: a schedule is edited and saved as one thing. */
  setAvailability: (days: Omit<AvailabilityDay, 'id'>[]) =>
    api.put<AvailabilityDay[]>('/providers/me/availability', { days }),

  portfolio: () => api.get<PortfolioItem[]>('/providers/me/portfolio'),

  addPortfolioItem: (input: {
    title: string;
    description?: string;
    completedAt?: string;
  }) => api.post<PortfolioItem>('/providers/me/portfolio', input),

  updatePortfolioItem: (
    id: string,
    input: { title?: string; description?: string | null; completedAt?: string | null },
  ) => api.patch<PortfolioItem>(`/providers/me/portfolio/${id}`, input),

  removePortfolioItem: (id: string) =>
    api.delete<{ id: string }>(`/providers/me/portfolio/${id}`),

  myVerification: () => api.get<MyVerification>('/providers/me/verification'),

  /**
   * Profile photo or cover. Multipart, so it bypasses the JSON helpers — the
   * browser has to set its own boundary on the Content-Type header.
   */
  /**
   * A verification document. Multipart, and the type travels in the query
   * string because the body is the file.
   */
  uploadDocument: (documentType: DocumentType, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ id: string; documentType: DocumentType; status: string }>(
      '/uploads/provider-documents',
      form,
      { query: { documentType } },
    );
  },

  uploadImage: (kind: 'avatar' | 'cover', file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{
      id: string;
      avatarUrl: string | null;
      coverUrl: string | null;
    }>(`/uploads/provider-images/${kind}`, form);
  },
};

export interface AvailabilityDay {
  id?: string;
  dayOfWeek: DayOfWeek;
  /** HH:MM, 24-hour. A weekly pattern has no date and no timezone. */
  startTime: string;
  endTime: string;
  isClosed: boolean;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  completedAt: string | null;
  position: number;
  storageKey?: string;
}

/** The provider's own view: richer than the public badges. */
export interface MyVerification extends VerificationSummary {
  providerType: ProviderType;
  overallStatus: VerificationStatus;
  verifiedAt: string | null;
  /** Checks still outstanding for this trading type. */
  outstanding: { badge: VerificationBadge; label: string; means: string }[];
  documents: {
    id: string;
    documentType: DocumentType;
    status: VerificationStatus;
    originalFilename: string;
    rejectionReason: string | null;
    reviewedAt: string | null;
    expiresAt: string | null;
    createdAt: string;
  }[];
}

export interface ProviderInput {
  providerType?: ProviderType;
  businessName: string;
  headline?: string | null;
  bio?: string | null;
  yearsExperience?: number | null;
  baseCity: string;
  baseBarangay?: string | null;
  serviceRadiusKm?: number | null;
  acceptsEmergency?: boolean;
  /** Editable only once the profile exists; a new one is open by default. */
  isAcceptingBookings?: boolean;
  paymentMethods?: PaymentMethod[];
}

export interface ServiceInput {
  categoryId: string;
  title: string;
  description: string;
  pricingType: PricingType;
  /**
   * Explicit null clears it, which is how a priced listing becomes
   * quote-only. Omitting it leaves the stored price in place.
   */
  price?: number | null;
  priceUnit?: string;
  minPrice?: number;
  maxPrice?: number;
  durationMinutes?: number;
  status?: ServiceStatus;
}

export const services = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api.get<Paginated<PublicService>>('/services', { query: params }),

  byId: (id: string) => api.get<PublicService>(`/services/${id}`),

  /** Provider-only. Includes drafts, paused and archived listings. */
  mine: (
    params: {
      status?: ServiceStatus;
      categoryId?: string;
      q?: string;
      page?: number;
      limit?: number;
    } = {},
  ) =>
    api.get<
      Paginated<OwnService> & { counts: Record<ServiceStatus, number> }
    >('/services/mine', { query: params }),

  /**
   * One of the provider's own listings, drafts included. Filters the
   * provider-scoped list server-side by id, so it does not depend on the
   * listing being on the first page.
   */
  mineById: async (id: string): Promise<OwnService | null> => {
    const result = await api.get<Paginated<OwnService>>('/services/mine', {
      query: { limit: 50 },
    });
    return result.items.find((item) => item.id === id) ?? null;
  },

  create: (input: ServiceInput) => api.post<OwnService>('/services', input),

  update: (id: string, input: Partial<ServiceInput>) =>
    api.patch<OwnService>(`/services/${id}`, input),

  /** Soft delete: the listing is archived, because bookings reference it. */
  remove: (id: string) =>
    api.delete<{ id: string; deletedAt: string }>(`/services/${id}`),
};

export const categories = {
  tree: () => api.get<CategoryNode[]>('/categories'),
  byIdOrSlug: (idOrSlug: string) => api.get<CategoryNode>(`/categories/${idOrSlug}`),
};

export const serviceRequests = {
  create: (input: {
    categoryId: string;
    title: string;
    description: string;
    urgency: RequestUrgency;
    city: string;
    providerId?: string;
    serviceId?: string;
    barangay?: string;
    addressLine1?: string;
    budgetMin?: number;
    budgetMax?: number;
    preferredAt?: string;
  }) => api.post<RequestDetail>('/service-requests', input),

  list: (
    params: {
      status?: RequestStatus;
      categoryId?: string;
      city?: string;
      page?: number;
      limit?: number;
    } = {},
  ) => api.get<Paginated<RequestSummary>>('/service-requests', { query: params }),

  byId: (id: string) => api.get<RequestDetail>(`/service-requests/${id}`),

  updateStatus: (id: string, status: RequestStatus, reason?: string) =>
    api.patch<RequestSummary>(`/service-requests/${id}/status`, {
      status,
      reason,
    }),

  /** Provider-only feed of broadcast requests. Carries no customer PII. */
  feed: (
    params: { city?: string; categoryId?: string; page?: number; limit?: number } = {},
  ) => api.get<Paginated<FeedRequest>>('/service-requests/feed', { query: params }),
};

export const quotes = {
  create: (input: {
    serviceRequestId: string;
    amount: number;
    notes?: string;
    laborCost?: number;
    partsCost?: number;
    estimatedDurationMinutes?: number;
    validUntil?: string;
  }) => api.post<Quote>('/quotes', input),

  byId: (id: string) => api.get<Quote>(`/quotes/${id}`),

  update: (
    id: string,
    input: {
      amount?: number;
      notes?: string;
      estimatedDurationMinutes?: number;
      validUntil?: string;
      status?: 'WITHDRAWN';
    },
  ) => api.patch<Quote>(`/quotes/${id}`, input),

  /**
   * Accepting a quote is what creates the booking. The response carries both
   * ids, because the caller usually wants to navigate to the new booking and
   * the quote it came from is what they were looking at.
   */
  accept: (
    id: string,
    input: { scheduledStart: string; paymentMethod: PaymentMethod },
  ) =>
    api.post<{ quoteId: string; booking: BookingSummary }>(
      `/quotes/${id}/accept`,
      input,
    ),

  reject: (id: string, reason?: string) =>
    api.post<Quote>(`/quotes/${id}/reject`, { reason }),
};

export const bookings = {
  list: (
    params: {
      status?: BookingStatus;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    } = {},
  ) => api.get<Paginated<BookingSummary>>('/bookings', { query: params }),

  byId: (id: string) => api.get<BookingDetail>(`/bookings/${id}`),

  update: (
    id: string,
    input: {
      scheduledStart?: string;
      scheduledEnd?: string;
      paymentMethod?: PaymentMethod;
    },
  ) => api.patch<BookingSummary>(`/bookings/${id}`, input),

  confirm: (id: string) => api.post<BookingSummary>(`/bookings/${id}/confirm`),

  start: (id: string) => api.post<BookingSummary>(`/bookings/${id}/start`),

  cancel: (id: string, reason: string) =>
    api.post<BookingSummary>(`/bookings/${id}/cancel`, { reason }),

  complete: (
    id: string,
    input: { finalAmount?: number; notes?: string } = {},
  ) => api.post<BookingSummary>(`/bookings/${id}/complete`, input),
};

export const reviews = {
  create: (input: {
    bookingId: string;
    rating: number;
    comment?: string;
    punctualityRating?: number;
    qualityRating?: number;
    valueRating?: number;
  }) => api.post<ReviewRow>('/reviews', input),

  update: (
    id: string,
    input: { rating?: number; comment?: string; providerResponse?: string },
  ) => api.patch<ReviewRow>(`/reviews/${id}`, input),

  report: (id: string, input: { reason: string; details?: string }) =>
    api.post(`/reviews/${id}/report`, input),
};

export const favorites = {
  list: (params: { page?: number; limit?: number } = {}) =>
    api.get<Paginated<FavoriteRow>>('/favorites', { query: params }),
  add: (providerId: string) => api.post(`/favorites/${providerId}`),
  remove: (providerId: string) => api.delete(`/favorites/${providerId}`),
};

export const disputes = {
  list: (params: { page?: number; limit?: number } = {}) =>
    api.get<Paginated<DisputeRow>>('/disputes', { query: params }),
  byId: (id: string) => api.get<DisputeRow>(`/disputes/${id}`),
  create: (input: { bookingId: string; reason: string; details: string }) =>
    api.post<DisputeRow>('/disputes', input),
};

export const reports = {
  list: (params: { page?: number; limit?: number } = {}) =>
    api.get<Paginated<ReportRow>>('/reports', { query: params }),
  create: (input: {
    targetType: ReportTargetType;
    targetId: string;
    reason: ReportReason;
    details?: string;
  }) => api.post<ReportRow>('/reports', input),
};

export const messages = {
  send: (input: {
    bookingId?: string;
    serviceRequestId?: string;
    body: string;
  }) => api.post<MessageRow>('/messages', input),

  /** Oldest first. Reading a thread marks the caller's inbound messages read. */
  thread: (params: {
    bookingId?: string;
    serviceRequestId?: string;
    page?: number;
    limit?: number;
  }) => api.get<Paginated<MessageRow>>('/messages', { query: params }),

  /**
   * A photo and the message carrying it, in one request.
   *
   * FormData rather than JSON, and the client leaves it alone — the browser
   * has to set the multipart boundary itself.
   */
  sendImage: (input: {
    file: File;
    bookingId?: string;
    serviceRequestId?: string;
    body?: string;
  }) => {
    const form = new FormData();
    form.append('file', input.file);
    if (input.bookingId) form.append('bookingId', input.bookingId);
    if (input.serviceRequestId)
      form.append('serviceRequestId', input.serviceRequestId);
    if (input.body?.trim()) form.append('body', input.body.trim());
    return api.post<MessageRow>('/messages/attachment', form);
  },

  /** Every conversation the caller is in, newest first. */
  threads: () => api.get<MessageThreadRow[]>('/messages/threads'),

  unreadCount: () => api.get<{ unread: number }>('/messages/unread-count'),
};

export const notifications = {
  list: (params: { unreadOnly?: boolean; page?: number; limit?: number } = {}) =>
    api.get<Paginated<NotificationRow> & { unread: number }>('/notifications', {
      query: params,
    }),
  markRead: (ids?: string[]) =>
    api.patch<{ updated: number }>('/notifications/read', { ids }),
};

/** Settings the unauthenticated site may read, as a flat key/value map. */
export const settings = {
  public: () => api.get<Record<string, unknown>>('/settings'),
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const admin = {
  stats: () => api.get<PlatformStats>('/admin/stats'),

  // -- users
  users: (
    params: {
      role?: UserRole;
      status?: UserStatus;
      q?: string;
      page?: number;
      limit?: number;
    } = {},
  ) => api.get<Paginated<AdminUser>>('/admin/users', { query: params }),

  suspendUser: (id: string, reason: string) =>
    api.post<AdminUser>(`/admin/users/${id}/suspend`, { reason }),

  reinstateUser: (id: string, reason: string) =>
    api.post<AdminUser>(`/admin/users/${id}/reinstate`, { reason }),

  // -- provider verification
  pendingVerifications: (params: { page?: number; limit?: number } = {}) =>
    api.get<Paginated<PendingVerification>>('/admin/verification/pending', {
      query: params,
    }),

  verifyProvider: (
    id: string,
    input: { decision: 'APPROVE' | 'REJECT'; reason?: string },
  ) => api.post(`/admin/providers/${id}/verification`, input),

  reviewDocument: (
    id: string,
    input: { decision: 'APPROVE' | 'REJECT'; reason?: string },
  ) => api.post(`/admin/documents/${id}/review`, input),

  // -- listing moderation
  services: (
    params: {
      status?: ServiceStatus;
      providerId?: string;
      categoryId?: string;
      q?: string;
      page?: number;
      limit?: number;
    } = {},
  ) => api.get<Paginated<AdminServiceRow>>('/admin/services', { query: params }),

  moderateService: (
    id: string,
    input: { action: 'TAKE_DOWN' | 'PAUSE' | 'REINSTATE'; reason: string },
  ) => api.post<AdminServiceRow>(`/admin/services/${id}/moderate`, input),

  // -- review moderation
  reviews: (
    params: {
      providerId?: string;
      filter?: 'hidden' | 'visible' | 'reported';
      maxRating?: number;
      page?: number;
      limit?: number;
    } = {},
  ) => api.get<Paginated<AdminReviewRow>>('/admin/reviews', { query: params }),

  setReviewVisibility: (id: string, input: { hidden: boolean; reason: string }) =>
    api.post<AdminReviewRow>(`/admin/reviews/${id}/visibility`, input),

  // -- disputes and reports
  disputes: (
    params: {
      status?: DisputeStatus;
      openOnly?: boolean;
      page?: number;
      limit?: number;
    } = {},
  ) => api.get<Paginated<AdminDisputeRow>>('/admin/disputes', { query: params }),

  resolveDispute: (
    id: string,
    input: {
      status:
        | 'RESOLVED_REFUND'
        | 'RESOLVED_PARTIAL_REFUND'
        | 'RESOLVED_NO_ACTION';
      resolution: string;
      refundAmount?: number;
    },
  ) => api.post(`/admin/disputes/${id}/resolve`, input),

  reports: (
    params: {
      status?: ReportStatus;
      targetType?: ReportTargetType;
      openOnly?: boolean;
      page?: number;
      limit?: number;
    } = {},
  ) => api.get<Paginated<AdminReportRow>>('/admin/reports', { query: params }),

  resolveReport: (
    id: string,
    input: {
      notes: string;
      status?: 'RESOLVED' | 'DISMISSED' | 'UNDER_REVIEW';
      hideReview?: boolean;
    },
  ) => api.post(`/admin/reports/${id}/resolve`, input),

  // -- categories
  /**
   * The full tree including hidden categories. The public tree filters them
   * out and does not even return isActive, so an admin using it could not
   * see — let alone restore — a category they had hidden.
   */
  categories: () => api.get<CategoryNode[]>('/admin/categories'),

  createCategory: (input: {
    name: string;
    parentId?: string;
    description?: string;
    icon?: string;
    position?: number;
    isActive?: boolean;
  }) => api.post<CategoryNode>('/admin/categories', input),

  /**
   * Undefined leaves a field alone; null clears it. That distinction is what
   * lets a subcategory be moved to the top level, or a description removed.
   */
  updateCategory: (
    id: string,
    input: {
      name?: string;
      parentId?: string | null;
      description?: string | null;
      icon?: string | null;
      position?: number;
      isActive?: boolean;
    },
  ) => api.patch<CategoryNode>(`/admin/categories/${id}`, input),

  // -- settings
  settings: () => api.get<{ items: SettingRow[] }>('/admin/settings'),

  updateSettings: (changes: { key: string; value: unknown }[]) =>
    api.patch<{ updated: { key: string; value: unknown }[] }>(
      '/admin/settings',
      { changes },
    ),

  // -- audit
  auditLog: (params: { page?: number; limit?: number } = {}) =>
    api.get<Paginated<AuditEntry>>('/admin/audit-log', { query: params }),
};

/**
 * The live change feed.
 *
 * The ticket is bought with the ordinary access token and is good for about a
 * minute: EventSource takes a URL and nothing else, so something has to go in
 * the query string, and a token with that lifetime and no other power is a
 * far better thing to put there than the session.
 */
export const events = {
  ticket: () =>
    api.post<{ ticket: string; expiresIn: number }>(
      '/events/ticket',
      {},
      { retryOnRateLimit: 0 },
    ),

  streamUrl: (ticket: string) =>
    `${API_URL}/events/stream?ticket=${encodeURIComponent(ticket)}`,
};
