/**
 * Typed fetch client for the Vaka REST API. Keeps the access token in memory (never localStorage —
 * see react/security.md) and transparently retries once via /auth/refresh on a 401 before giving up.
 */
import type {
  AuditDto,
  BookInspectionPayload,
  CertificateVerifyDto,
  CreatePermitPayload,
  DashboardOverviewDto,
  InitiatePaymentPayload,
  InitiatePaymentResponse,
  InspectionJobDto,
  LoginResponse,
  PaymentStatusDto,
  PermitDto,
  ReconciliationRowDto,
  RegistryEntryDto,
  RegisterPayload,
  SignOffPayload,
  SignOffResponse,
  AuthUser,
} from './api-types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  skipAuthRetry?: boolean;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message: unknown }).message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.join(', ');
    }
  } catch {
    // body wasn't JSON — fall through to the generic message
  }
  return `Request failed with status ${response.status}`;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!response.ok) return null;
        const data = (await response.json()) as LoginResponse;
        accessToken = data.accessToken;
        return data.accessToken;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuthRetry = false } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && !skipAuthRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, { ...options, skipAuthRetry: true });
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response));
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  auth: {
    login: (email: string, password: string): Promise<LoginResponse> =>
      request('/auth/login', { method: 'POST', body: { email, password } }),
    register: (payload: RegisterPayload): Promise<LoginResponse> =>
      request('/auth/register', { method: 'POST', body: payload }),
    refresh: (): Promise<LoginResponse> => request('/auth/refresh', { method: 'POST' }),
    logout: (): Promise<{ ok: boolean }> => request('/auth/logout', { method: 'POST' }),
    me: (): Promise<AuthUser> => request('/auth/me'),
  },
  permits: {
    list: (): Promise<PermitDto[]> => request('/permits'),
    get: (ref: string): Promise<PermitDto> => request(`/permits/${ref}`),
    create: (payload: CreatePermitPayload): Promise<PermitDto> =>
      request('/permits', { method: 'POST', body: payload }),
  },
  payments: {
    initiate: (payload: InitiatePaymentPayload): Promise<InitiatePaymentResponse> =>
      request('/payments/initiate', { method: 'POST', body: payload }),
    get: (id: string): Promise<PaymentStatusDto> => request(`/payments/${id}`),
    confirm: (id: string): Promise<PaymentStatusDto> =>
      request(`/payments/${id}/confirm`, { method: 'POST' }),
  },
  inspections: {
    queue: (): Promise<InspectionJobDto[]> => request('/inspections/queue'),
    book: (payload: BookInspectionPayload): Promise<PermitDto['stages'][number]> =>
      request('/inspections/book', { method: 'POST', body: payload }),
    signOff: (payload: SignOffPayload): Promise<SignOffResponse> =>
      request('/inspections/sign-off', { method: 'POST', body: payload }),
    reRequest: (stageId: string): Promise<PermitDto['stages'][number]> =>
      request(`/inspections/${stageId}/re-request`, { method: 'POST' }),
  },
  registry: {
    verify: (regNumber: string): Promise<RegistryEntryDto> =>
      request(`/registry/verify/${encodeURIComponent(regNumber)}`),
    list: (): Promise<RegistryEntryDto[]> => request('/registry'),
  },
  dashboard: {
    overview: (): Promise<DashboardOverviewDto> => request('/dashboard/overview'),
    reconciliation: (): Promise<ReconciliationRowDto[]> => request('/dashboard/reconciliation'),
  },
  audit: {
    list: (): Promise<AuditDto[]> => request('/audit'),
  },
  certificates: {
    verify: (qrToken: string): Promise<CertificateVerifyDto> =>
      request(`/certificates/verify/${encodeURIComponent(qrToken)}`),
  },
};
