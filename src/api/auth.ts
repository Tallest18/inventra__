import { apiClient } from "./client";
import { clearTokens, getRefreshToken, saveTokens } from "./tokenStorage";
import type {
  AuthSessionResponse,
  BusinessTypeOption,
  CheckPhoneResponse,
  CompleteRegistrationRequest,
  CompleteRegistrationResponse,
  LogoutRequest,
  OtpRequestResponse,
  OtpVerifyResponse,
  PaystackInitializeResponse,
  StartTrialResponse,
  Subscription,
  TokenPair,
  UserProfile,
} from "./types";

const resolveImageUrl = (url?: string): string => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${process.env.EXPO_PUBLIC_API_BASE_URL}${url}`;
};

const withResolvedImage = (user: UserProfile): UserProfile => ({
  ...user,
  profile_image: resolveImageUrl(user.profile_image ?? undefined),
});

/**
 * Normalizes a Nigerian number to the `+234XXXXXXXXXX` form the backend stores.
 * The API normalizes too, but sending the canonical form keeps the number we
 * display (and the one we send) identical.
 */
export function normalizePhone(input: string): string {
  const cleaned = input.trim().replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("234")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+234${cleaned.slice(1)}`;
  return `+234${cleaned}`;
}

/** `+2348012345678` -> `0801 *** 5678`, matching the backend's `mask_phone()`. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("234") ? `0${digits.slice(3)}` : digits;
  if (local.length < 7) return phone;
  return `${local.slice(0, 4)} *** ${local.slice(-4)}`;
}

// ── Phone / OTP ───────────────────────────────────────────────────────────────

/** Options for the "Choose Business Type" screen. */
export async function getBusinessTypes(): Promise<BusinessTypeOption[]> {
  const response =
    await apiClient.get<BusinessTypeOption[]>("/auth/business-types/");
  return response.data;
}

/** Decides whether to show Welcome Back (PIN) or the OTP flow. */
export async function checkPhone(phone: string): Promise<CheckPhoneResponse> {
  const response = await apiClient.post<CheckPhoneResponse>(
    "/auth/check-phone/",
    { phone: normalizePhone(phone) },
  );
  return {
    ...response.data,
    profile_image: resolveImageUrl(response.data.profile_image ?? undefined),
  };
}

/** Sends an OTP to a number with **no** account. 409 if it is already taken. */
export async function registerNumber(
  phone: string,
): Promise<OtpRequestResponse> {
  const response = await apiClient.post<OtpRequestResponse>(
    "/auth/register-number/",
    { phone: normalizePhone(phone) },
  );
  return response.data;
}

/** Sends an OTP to a number that **has** an account. 404 if unknown. */
export async function forgotPin(phone: string): Promise<OtpRequestResponse> {
  const response = await apiClient.post<OtpRequestResponse>(
    "/auth/forgot-pin/",
    { phone: normalizePhone(phone) },
  );
  return response.data;
}

/** Checks the OTP. Creates the account when the phone is new. Returns tokens. */
export async function verifyOtp(
  verification_id: string,
  code: string,
): Promise<OtpVerifyResponse> {
  const response = await apiClient.post<OtpVerifyResponse>(
    "/auth/verify-otp/",
    { verification_id, code },
  );
  return { ...response.data, user: withResolvedImage(response.data.user) };
}

/** Burns the current OTP session and sends a new code. Returns a NEW id. */
export async function resendOtp(
  verification_id: string,
): Promise<OtpRequestResponse> {
  const response = await apiClient.post<OtpRequestResponse>(
    "/auth/resend-otp/",
    { verification_id },
  );
  return response.data;
}

// ── Onboarding / PIN ──────────────────────────────────────────────────────────

/**
 * Saves business type and PIN in one call. Works once, while the account has no
 * PIN. Needs the Bearer token from `verifyOtp` — it issues no new tokens.
 */
export async function completeRegistration(
  payload: CompleteRegistrationRequest,
): Promise<CompleteRegistrationResponse> {
  const response = await apiClient.post<CompleteRegistrationResponse>(
    "/auth/complete-registration/",
    payload,
  );
  return { ...response.data, user: withResolvedImage(response.data.user) };
}

/** Login for returning users. */
export async function pinLogin(
  phone: string,
  pin: string,
): Promise<AuthSessionResponse> {
  const response = await apiClient.post<AuthSessionResponse>(
    "/auth/pin-login/",
    { phone: normalizePhone(phone), pin },
  );
  return { ...response.data, user: withResolvedImage(response.data.user) };
}

/**
 * Sets a new PIN. Pass `verification_id` from a verified forgot-PIN session,
 * or omit it and rely on the Bearer token when already signed in.
 */
export async function resetPin(payload: {
  pin: string;
  confirm_pin: string;
  verification_id?: string;
}): Promise<AuthSessionResponse & { success: boolean; message: string }> {
  const response = await apiClient.post("/auth/reset-pin/", payload);
  return { ...response.data, user: withResolvedImage(response.data.user) };
}

/** Changes the PIN while signed in. Requires the current PIN. */
export async function changePin(payload: {
  current_pin: string;
  pin: string;
  confirm_pin: string;
}): Promise<{ success: boolean; message: string; user: UserProfile }> {
  const response = await apiClient.post("/auth/change-pin/", payload);
  return { ...response.data, user: withResolvedImage(response.data.user) };
}

// ── Trial / subscription ──────────────────────────────────────────────────────

/** The one-time free trial behind the "Start Free Trial" button. */
export async function startTrial(): Promise<StartTrialResponse> {
  const response = await apiClient.post<StartTrialResponse>(
    "/auth/start-trial/",
  );
  return response.data;
}

export async function getSubscription(): Promise<Subscription> {
  const response = await apiClient.get<Subscription>("/auth/subscription/");
  return response.data;
}

export async function initializePaystack(payload: {
  email?: string;
  callback_url?: string;
}): Promise<PaystackInitializeResponse> {
  const response = await apiClient.post<PaystackInitializeResponse>(
    "/auth/subscription/paystack/initialize/",
    payload,
  );
  return response.data;
}

export async function verifyPaystack(
  reference: string,
): Promise<StartTrialResponse> {
  const response = await apiClient.post<StartTrialResponse>(
    "/auth/subscription/paystack/verify/",
    { reference },
  );
  return response.data;
}

// ── Session ───────────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  const refresh = await getRefreshToken();
  if (!refresh) return;

  const payload: LogoutRequest = { refresh };
  try {
    await apiClient.post("/auth/logout/", payload);
  } finally {
    // The refresh token is single-use once blacklisted, so drop the local copy
    // whether or not the server accepted it.
    await clearTokens();
  }
}

export async function getProfile(): Promise<UserProfile> {
  const response = await apiClient.get<UserProfile>("/auth/profile/");
  return withResolvedImage(response.data);
}

export interface UpdateProfilePayload {
  name?: string;
  business_name?: string;
  business_type?: string;
  // NOTE: profile_image must NEVER be added here as a string.
  // Images are always uploaded via the second argument as a file.
}

export interface UploadableProfileImage {
  uri: string;
  fileName?: string;
  mimeType?: string;
  type?: string;
  file?: File;
}

export async function updateProfile(
  payload: UpdateProfilePayload,
  profileImage?: UploadableProfileImage,
): Promise<UserProfile> {
  if (profileImage) {
    const formData = new FormData();

    // Append only text fields — never append profile_image as a string
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    // Web: File object directly (e.g. from <input type="file">)
    if (profileImage.file instanceof File) {
      formData.append("profile_image", profileImage.file);

      // Web: blob: or data: URI — convert to File first
    } else if (
      profileImage.uri.startsWith("blob:") ||
      profileImage.uri.startsWith("data:")
    ) {
      const blobResponse = await fetch(profileImage.uri);
      const blob = await blobResponse.blob();
      const fallbackName = profileImage.fileName || `profile-${Date.now()}.jpg`;
      const file = new File([blob], fallbackName, {
        type:
          profileImage.mimeType ||
          profileImage.type ||
          blob.type ||
          "image/jpeg",
      });
      formData.append("profile_image", file);

      // Native (iOS/Android): local file:// URI
    } else {
      const uri = profileImage.uri;
      const fileName =
        profileImage.fileName ||
        uri.split("/").pop() ||
        `profile-${Date.now()}.jpg`;
      const mimeType =
        profileImage.mimeType || profileImage.type || "image/jpeg";

      formData.append("profile_image", {
        uri,
        name: fileName,
        type: mimeType,
      } as any);
    }

    const response = await apiClient.patch<UserProfile>(
      "/auth/profile/",
      formData,
      {
        headers: { "Content-Type": undefined },
        transformRequest: [(data: any) => data],
      },
    );
    return withResolvedImage(response.data);
  }

  // No new image — plain JSON, text fields only
  const response = await apiClient.patch<UserProfile>("/auth/profile/", payload);
  return withResolvedImage(response.data);
}

export async function saveAuthTokens(tokens: TokenPair): Promise<void> {
  await saveTokens(tokens.access, tokens.refresh);
}
