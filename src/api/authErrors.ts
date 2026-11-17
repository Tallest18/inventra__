/**
 * The API answers with three different error shapes:
 *   serializer  -> { "<field>": ["message", ...] }
 *   view logic  -> { "error": "message", "code"?: "machine_code" }
 *   DRF / JWT   -> { "detail": "message", "code"?: "..." }
 * These helpers flatten all three so screens can show one message and branch on
 * one machine-readable code.
 */

export interface ApiErrorInfo {
  status?: number;
  /** Machine code such as `account_exists`, `trial_required`. */
  code?: string;
  message: string;
  /** Per-field messages from serializer errors, e.g. `{ pin: "..." }`. */
  fields: Record<string, string>;
}

const FALLBACK = "Something went wrong. Please try again.";

const flatten = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === "string");
    return typeof first === "string" ? first : null;
  }
  return null;
};

export function parseApiError(error: any, fallback = FALLBACK): ApiErrorInfo {
  const status: number | undefined = error?.response?.status;
  const data = error?.response?.data;

  if (!data || typeof data !== "object") {
    // No response body at all  almost always a dropped connection.
    const message = error?.request
      ? "No internet connection. Please check your network and try again."
      : fallback;
    return { status, message, fields: {} };
  }

  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "error" || key === "detail" || key === "code") continue;
    const text = flatten(value);
    if (text) fields[key] = text;
  }

  const message =
    flatten(data.error) ??
    flatten(data.detail) ??
    Object.values(fields)[0] ??
    fallback;

  // `code` is only an error code on a failing status  on a 200 OTP response in
  // mock mode the same key carries the OTP itself.
  const code =
    typeof data.code === "string" && status && status >= 400
      ? data.code
      : undefined;

  return { status, code, message, fields };
}

/** Convenience for the common "just show me a message" case. */
export function apiErrorMessage(error: any, fallback = FALLBACK): string {
  return parseApiError(error, fallback).message;
}
