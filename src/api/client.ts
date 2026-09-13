import axios, {
    AxiosError,
    AxiosHeaders,
    InternalAxiosRequestConfig,
} from "axios";
import { router } from "expo-router";

import { API_BASE_URL, API_PREFIX } from "./constants";
import {
    clearTokens,
    getAccessToken,
    getRefreshToken,
    saveTokens,
} from "./tokenStorage";
import type { RefreshTokenResponse } from "./types";

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  headers: {
    "Content-Type": "application/json",
  },
});

const refreshClient = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Reading the token must never be able to block a request. On web a wedged or
 * blocked storage backend can leave this promise unsettled, and because it runs
 * inside the request interceptor the call is then never dispatched at all — no
 * network entry, no error. Falling back to an anonymous request is always
 * better than hanging: the auth endpoints that matter here are public anyway.
 */
async function readAccessToken(): Promise<string | null> {
  try {
    return await Promise.race([
      getAccessToken(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
    ]);
  } catch {
    return null;
  }
}

let endingSession = false;

/**
 * True while the subscription gate is closed (no trial, or an expired one).
 * Background pollers consult this so they stop hammering endpoints that can
 * only answer 403 — a single reload was otherwise firing 31 of them.
 * Cleared automatically by the next successful response.
 */
let accessGated = false;

export const isAccessGated = (): boolean => accessGated;

/**
 * Set from the subscription payload's `access_active`, which is the only
 * authoritative answer. It cannot be inferred from response status:
 * /auth/subscription/ returns 200 even while access is gated, so clearing the
 * flag on any success just reopened the floodgates on every poll.
 */
export const setAccessGated = (value: boolean): void => {
  accessGated = value;
};

/**
 * Called when the API says the session is gone — a 401 that a token refresh
 * could not rescue ("Authentication credentials were not provided."). Clears
 * the stored session and sends the user back to the login screen.
 *
 * A dead session usually produces a *burst* of parallel 401s (dashboard,
 * profile, inventory and notifications all fail at once), so the flag makes
 * sure that burst causes exactly one navigation instead of a dozen.
 */
async function endSession(): Promise<void> {
  await clearTokens();

  if (endingSession) return;
  endingSession = true;

  try {
    router.replace("/(Auth)/WelcomeScreen");
  } catch {
    // Navigating before the router has mounted is not fatal: the root layout
    // bootstraps from storage, which we just cleared, and lands on auth anyway.
  } finally {
    setTimeout(() => {
      endingSession = false;
    }, 1500);
  }
}

apiClient.interceptors.request.use(async (config) => {
  const accessToken = await readAccessToken();

  // Dev-only request tracing, stripped from production builds. Worth keeping:
  // it is what proved a "missing" request was actually firing correctly.
  if (__DEV__) {
    console.log(
      `[api] -> ${(config.method ?? "get").toUpperCase()} ${config.baseURL ?? ""}${config.url ?? ""}`,
      config.data ?? "",
    );
  }

  const headers =
    config.headers instanceof AxiosHeaders
      ? config.headers
      : new AxiosHeaders(config.headers);

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  // Multipart uploads (FormData): React Native builds the multipart body (and
  // appends the boundary) itself, but we must declare `multipart/form-data` so
  // the native layer doesn't fall back to `application/x-www-form-urlencoded`,
  // which mismatches the body and aborts the request with a network error
  // ("multipart != application/x-www-form-urlencoded").
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    headers.set("Content-Type", "multipart/form-data");
  }

  config.headers = headers;

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[api] <- ${response.status} ${response.config.url ?? ""}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (__DEV__) {
      console.log(
        `[api] FAIL ${error.response?.status ?? "no-response"} ${originalRequest?.url ?? ""}`,
        error.message,
        error.response?.data ?? "",
      );
    }

    const gateCode = (error.response?.data as any)?.code;
    if (
      error.response?.status === 403 &&
      (gateCode === "trial_required" || gateCode === "subscription_expired")
    ) {
      accessGated = true;
    }

    // A token whose user no longer exists — a deleted account, or a database
    // that has been reset underneath us — is just as dead as a rejected one,
    // but the backend reports it with its own code rather than a 401. Match on
    // the code so the status does not matter.
    if ((error.response?.data as any)?.code === "user_not_found") {
      await endSession();
      return Promise.reject(error);
    }

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // A 401 on a request we already retried with a freshly minted token means
    // the session is genuinely dead, not merely stale.
    if (originalRequest._retry) {
      await endSession();
      return Promise.reject(error);
    }

    if ((originalRequest.url || "").includes("/token/refresh/")) {
      await endSession();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshToken = await getRefreshToken();

      if (!refreshToken) {
        await endSession();
        return Promise.reject(error);
      }

      const response = await refreshClient.post<RefreshTokenResponse>(
        "/token/refresh/",
        {
          refresh: refreshToken,
        },
      );

      await saveTokens(response.data.access, response.data.refresh);

      const headers =
        originalRequest.headers instanceof AxiosHeaders
          ? originalRequest.headers
          : new AxiosHeaders(originalRequest.headers);
      headers.set("Authorization", `Bearer ${response.data.access}`);
      originalRequest.headers = headers;

      return apiClient(originalRequest);
    } catch (refreshError) {
      await endSession();
      return Promise.reject(refreshError);
    }
  },
);
