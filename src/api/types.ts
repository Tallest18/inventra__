export interface TokenPair {
  access: string;
  refresh: string;
}

/** Where the user is in onboarding. The app routes on this — it covers every case. */
export type OnboardingStatus =
  | "verify_number"
  | "start_trial"
  | "active"
  | "expired";

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "expired"
  | "cancelled";

export interface UserProfile {
  id: number;
  phone: string;
  name: string;
  business_name?: string | null;
  business_type?: string | null;
  profile_image?: string | null;
  has_pin: boolean;
  onboarding_status: OnboardingStatus;
  subscription_status: SubscriptionStatus;
  access_active: boolean;
  is_paid: boolean;
}

export interface BusinessTypeOption {
  value: string;
  display: string;
}

export interface CheckPhoneResponse {
  exists: boolean;
  has_pin: boolean;
  masked_phone: string;
  name?: string;
  profile_image?: string | null;
}

export interface OtpRequestResponse {
  verification_id: string;
  expires_in: number;
  message: string;
  /** MOCK MODE only — the backend echoes the OTP when OTP_MOCK_MODE is on. */
  code?: string;
}

export interface OtpVerifyResponse {
  user: UserProfile;
  tokens: TokenPair;
  is_new_user: boolean;
  has_pin: boolean;
  needs_onboarding: boolean;
  verification_id: string;
}

export interface TrialOffer {
  title: string;
  subtitle: string;
  body: string;
  note: string;
  features: string[];
  cta: string;
  dismiss: string;
}

export interface CompleteRegistrationRequest {
  business_type: string;
  pin: string;
  confirm_pin: string;
  business_name?: string;
}

export interface CompleteRegistrationResponse {
  success: boolean;
  message: string;
  user: UserProfile;
  trial_required: boolean;
  trial_offer: TrialOffer;
}

/** One countdown milestone, e.g. "1 minute" / "2 weeks" left. */
export interface SubscriptionReminder {
  index: number;
  value: number;
  unit: string;
  label: string;
  seconds: number;
  reached?: boolean;
  is_current?: boolean;
}

/**
 * `ending_soon_notice` / `expired_notice`. The server may supply full modal
 * copy here; every field is optional so the client can fall back to text built
 * from the numeric fields instead.
 */
export interface SubscriptionNotice {
  reminder?: SubscriptionReminder;
  title?: string;
  subtitle?: string;
  /** e.g. "Free Trial Ending Soon — 7 days left". */
  banner?: string;
  body?: string;
  note?: string;
  features?: string[];
  renewal_label?: string;
  renewal_amount_naira?: number;
  /** e.g. "₦1,000". */
  renewal_amount_display?: string;
  interval?: string;
  /** e.g. "/ Month". */
  interval_display?: string;
  cta?: string;
  dismiss?: string;
}

/** The shape the trial modal renders — `TrialOffer` satisfies it. */
export interface OfferContent {
  title: string;
  subtitle: string;
  body: string;
  note?: string;
  features?: string[];
  cta: string;
  dismiss: string;
}

export interface Subscription {
  status: SubscriptionStatus;
  access_active: boolean;
  trial_started: boolean;
  expired?: boolean;
  expired_at?: string | null;
  expired_label?: string;
  days_since_expiry?: number;
  seconds_remaining?: number;
  days_remaining?: number;
  time_left_label?: string;
  ending_soon?: boolean;
  reminder_stage?: number | null;
  reminders?: SubscriptionReminder[];
  trial_started_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  amount_kobo?: number;
  amount_naira?: number;
  interval?: string;
  last_payment_reference?: string | null;
  trial_offer?: TrialOffer;
  ending_soon_notice?: SubscriptionNotice | null;
  expired_notice?: SubscriptionNotice | null;
}

export interface StartTrialResponse {
  success: boolean;
  message: string;
  subscription: Subscription;
}

export interface AuthSessionResponse {
  user: UserProfile;
  tokens: TokenPair;
}

export type TransferStatus = "pending" | "success" | "expired" | "failed";

/**
 * A one-time Paystack account number for paying the subscription by bank
 * transfer. `message` and `subscription` only come back from the status check;
 * `subscription` only once `paid` is true.
 */
export interface TransferPayment {
  reference: string;
  status: TransferStatus;
  paid: boolean;
  amount_naira: number;
  /** e.g. "₦1,000". */
  amount_display: string;
  account_number: string;
  account_name: string;
  bank_name: string;
  bank_slug: string;
  expires_at: string;
  seconds_until_expiry: number;
  instructions: string;
  message?: string;
  subscription?: Subscription;
}

export interface PaystackInitializeResponse {
  reference: string;
  amount_naira: number;
  interval: string;
  authorization_url: string;
  access_code: string;
}

export interface LogoutRequest {
  refresh: string;
}

export interface RefreshTokenRequest {
  refresh: string;
}

export interface RefreshTokenResponse {
  access: string;
  refresh: string;
}
