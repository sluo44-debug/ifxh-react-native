import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { logApiFail, logApiOk, logApiStart } from "../debug/logger";
import { getRefreshToken, setRefreshToken } from "../auth/tokenStore";

/**
 * API client wrapper for IFXH mobile.
 * - Base URL: EXPO_PUBLIC_API_BASE_URL or https://webportal.ifse.ca
 * - Auth: Bearer token (JWT access token)
 * - Refresh: refresh token stored on device, rotated by server
 */

const DEFAULT_API_BASE_URL = "https://webportal.ifse.ca";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiErrorPayload {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
  url?: string;
  method?: HttpMethod;
}

export class ApiError extends Error {
  public readonly status?: number;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly url?: string;
  public readonly method?: HttpMethod;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiError";
    this.status = payload.status;
    this.code = payload.code;
    this.details = payload.details;
    this.url = payload.url;
    this.method = payload.method;
  }
}

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

export function setApiBaseUrl(baseUrl: string) {
  api.defaults.baseURL = baseUrl;
}

export function getApiBaseUrl(): string {
  return api.defaults.baseURL ?? DEFAULT_API_BASE_URL;
}

export const api: AxiosInstance = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
  withCredentials: true,
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  if (authToken) {
    // Axios v1: config.headers may be AxiosHeaders (preferred)
    if (config.headers && typeof (config.headers as any).set === "function") {
      (config.headers as any).set("Authorization", `Bearer ${authToken}`);
    } else {
      // fallback for older axios or plain object headers
      config.headers = {
        ...(config.headers as any),
        Authorization: `Bearer ${authToken}`,
      } as any;
    }
  }

  return config;
});

function isAuthEndpoint(url?: string): boolean {
  const u = String(url || "");
  return u.includes("/api/auth/login") || u.includes("/api/auth/refresh") || u.includes("/api/auth/logout");
}

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Step 2 (mobile): refresh access token using stored refresh token.
 * - Sends refresh token in body (no cookies)
 * - Updates in-memory access token and persisted refresh token (rotation)
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const rt = await getRefreshToken();
      if (!rt) return null;

      // Access token may be expired; refresh does not require [Authorize]
      const res = await api.post("/api/auth/refresh", { refreshToken: rt });
      const data = res?.data as any;

      const newAccessRaw = data?.token ?? data?.Token ?? null;
      const newRefreshRaw = data?.refreshToken ?? data?.RefreshToken ?? null;

      const newAccess = newAccessRaw ? String(newAccessRaw) : null;
      const newRefresh = newRefreshRaw ? String(newRefreshRaw) : null;

      if (newAccess) setAuthToken(newAccess);
      if (newRefresh) await setRefreshToken(newRefresh);

      return newAccess;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// 401 -> refresh once -> retry once
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status;
    const original = err?.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (status === 401 && original && !original._retry && !isAuthEndpoint(original.url)) {
      original._retry = true;

      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers = {
          ...(original.headers || {}),
          Authorization: `Bearer ${newToken}`,
        };
        return api.request(original);
      }

      // refresh failed -> sign out if wired
      if (unauthorizedHandler) unauthorizedHandler();
    }

    throw err;
  }
);

function extractMessageFromResponseData(data: any): string | null {
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.title === "string") return data.title;
  return null;
}

function normalizeAxiosError(err: unknown, method?: HttpMethod, url?: string): ApiError {
  if (!axios.isAxiosError(err)) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return new ApiError({ message: msg, method, url });
  }

  const ax = err as AxiosError<any>;
  const status = ax.response?.status;
  const msgFromData = extractMessageFromResponseData(ax.response?.data);
  const message =
    msgFromData ??
    ax.message ??
    (status ? `Request failed with status ${status}` : "Network error");

  return new ApiError({
    message,
    status,
    details: ax.response?.data,
    url,
    method,
  });
}

export async function request<T>(
  method: HttpMethod,
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const hasData = (config as any)?.data !== undefined;
  const dataPreview =
    hasData && typeof (config as any).data === "object"
      ? { bodyKeys: Object.keys((config as any).data ?? {}) }
      : undefined;

  logApiStart(method, url, dataPreview);

  try {
    const res = await api.request<T>({ method, url, ...config });
    logApiOk(method, url, res.status);
    return res.data;
  } catch (err) {
    const ax = err as any;
    const status = ax?.response?.status;
    const message = ax?.message ?? "Request failed";
    logApiFail(method, url, status, message);
    throw normalizeAxiosError(err, method, url);
  }
}