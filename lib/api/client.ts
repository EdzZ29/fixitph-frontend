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
}

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
  const { body, query, retryOnUnauthenticated = true, headers, ...rest } = options;

  const send = async (): Promise<Response> =>
    fetch(buildUrl(path, query), {
      ...rest,
      // Needed for the httpOnly refresh cookie. The API's CORS allow-list is
      // what keeps this from being usable by other origins.
      credentials: 'include',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

  let res = await send();

  if (res.status === 401 && retryOnUnauthenticated) {
    const refreshed = await refreshAccessToken();
    if (refreshed) res = await send();
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

  delete: <T>(path: string, options?: Omit<RequestOptions, 'body' | 'method'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Domain types (mirror the API selects, not the database tables)
// ---------------------------------------------------------------------------

export type UserRole = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
export type PricingType = 'FIXED' | 'HOURLY' | 'PER_UNIT' | 'QUOTE_REQUIRED';
export type RequestUrgency = 'FLEXIBLE' | 'WITHIN_WEEK' | 'WITHIN_48H' | 'EMERGENCY';
export type PaymentMethod = 'CASH' | 'GCASH' | 'MAYA' | 'BANK_TRANSFER';
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

export interface Me {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: string;
  profile: { firstName: string; lastName: string; displayName: string | null; city: string | null } | null;
  provider: { id: string; slug: string; businessName: string; verificationStatus: VerificationStatus } | null;
}

export interface ProviderSummary {
  id: string;
  slug: string;
  businessName: string;
  headline: string | null;
  baseCity: string;
  baseBarangay: string | null;
  ratingAvg: string;
  ratingCount: number;
  completedJobsCount: number;
  verificationStatus: VerificationStatus;
  isAcceptingBookings: boolean;
  paymentMethods: PaymentMethod[];
  services?: ServiceSummary[];
}

export interface ServiceSummary {
  id: string;
  title: string;
  slug: string;
  pricingType: PricingType;
  price: string | null;
  priceUnit: string | null;
  categoryId: string;
}

export interface CategoryNode {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  children: CategoryNode[];
  _count: { services: number };
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
      { retryOnUnauthenticated: false },
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
    const data = await api.post<{ userId: string; accessToken: string; expiresIn: number }>(
      '/auth/register',
      input,
      { retryOnUnauthenticated: false },
    );
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

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }, { retryOnUnauthenticated: false }),

  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, password }, { retryOnUnauthenticated: false }),
};

export const providers = {
  search: (params: ProviderSearchParams = {}) =>
    api.get<Paginated<ProviderSummary>>('/providers', { query: params }),

  byId: (id: string) => api.get<ProviderSummary>(`/providers/${id}`),

  reviews: (id: string, params: { page?: number; limit?: number; sort?: 'recent' | 'rating' } = {}) =>
    api.get<Paginated<unknown> & { breakdown: { stars: number; count: number }[] }>(
      `/providers/${id}/reviews`,
      { query: params },
    ),
};

export const services = {
  list: (params: Record<string, string | number | undefined> = {}) =>
    api.get<Paginated<ServiceSummary>>('/services', { query: params }),
  byId: (id: string) => api.get<ServiceSummary>(`/services/${id}`),
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
  }) => api.post('/service-requests', input),

  list: (params: { status?: string; page?: number; limit?: number } = {}) =>
    api.get<Paginated<unknown>>('/service-requests', { query: params }),

  byId: (id: string) => api.get(`/service-requests/${id}`),

  /** Provider-only feed of broadcast requests. Carries no customer PII. */
  feed: (params: { city?: string; categoryId?: string; page?: number } = {}) =>
    api.get<Paginated<unknown>>('/service-requests/feed', { query: params }),
};

export const quotes = {
  create: (input: { serviceRequestId: string; amount: number; notes?: string }) =>
    api.post('/quotes', input),
  byId: (id: string) => api.get(`/quotes/${id}`),
  accept: (id: string, input: { scheduledStart: string; paymentMethod: PaymentMethod }) =>
    api.post(`/quotes/${id}/accept`, input),
  reject: (id: string, reason?: string) => api.post(`/quotes/${id}/reject`, { reason }),
};

export const bookings = {
  list: (params: { status?: BookingStatus; page?: number } = {}) =>
    api.get<Paginated<unknown>>('/bookings', { query: params }),
  byId: (id: string) => api.get(`/bookings/${id}`),
  confirm: (id: string) => api.post(`/bookings/${id}/confirm`),
  cancel: (id: string, reason: string) => api.post(`/bookings/${id}/cancel`, { reason }),
  complete: (id: string, input: { finalAmount?: number; notes?: string } = {}) =>
    api.post(`/bookings/${id}/complete`, input),
};

export const reviews = {
  create: (input: { bookingId: string; rating: number; comment?: string }) =>
    api.post('/reviews', input),
  update: (id: string, input: { rating?: number; comment?: string; providerResponse?: string }) =>
    api.patch(`/reviews/${id}`, input),
  report: (id: string, input: { reason: string; details?: string }) =>
    api.post(`/reviews/${id}/report`, input),
};

export const favorites = {
  list: (params: { page?: number } = {}) => api.get<Paginated<unknown>>('/favorites', { query: params }),
  add: (providerId: string) => api.post(`/favorites/${providerId}`),
  remove: (providerId: string) => api.delete(`/favorites/${providerId}`),
};

export const messages = {
  send: (input: { bookingId?: string; serviceRequestId?: string; body: string }) =>
    api.post('/messages', input),
  thread: (params: { bookingId?: string; serviceRequestId?: string; page?: number }) =>
    api.get<Paginated<unknown>>('/messages', { query: params }),
  unreadCount: () => api.get<{ unread: number }>('/messages/unread-count'),
};

export const notifications = {
  list: (params: { unreadOnly?: boolean; page?: number } = {}) =>
    api.get<Paginated<unknown> & { unread: number }>('/notifications', { query: params }),
  markRead: (ids?: string[]) => api.patch<{ updated: number }>('/notifications/read', { ids }),
};
