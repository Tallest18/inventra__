// components/auth/SubscriptionWatcher.tsx
import { AnimatedModal } from "@/components/ui/AnimatedModal";
import { useQueryClient } from "@tanstack/react-query";
import { useSegments } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Modal } from "react-native";

import { CheckingPaymentScreen } from "@/components/subscription/CheckingPaymentScreen";
import { EMAIL_PATTERN } from "@/components/subscription/paywallParts";
import { RenewalReminderSheet } from "@/components/subscription/RenewalReminderSheet";
import { RenewSubscriptionScreen } from "@/components/subscription/RenewSubscriptionScreen";
import { SubscriptionExpiredScreen } from "@/components/subscription/SubscriptionExpiredScreen";
import { SubscriptionRenewedScreen } from "@/components/subscription/SubscriptionRenewedScreen";
import {
  getAccessToken,
  getSubscription,
  getTransferStatus,
  initializePaystack,
  initializeTransfer,
  onTokensChanged,
  parseApiError,
  setAccessGated,
  startTrial,
  verifyPaystack,
} from "@/src/api";
import type { Subscription, TransferPayment } from "@/src/api/types";
import * as WebBrowser from "expo-web-browser";
import { TrialModal } from "./TrialModal";

/**
 * How long to wait before re-checking, derived from what the backend says is
 * left rather than from any fixed assumption in the app. A five-minute trial
 * needs a tight loop to catch each reminder step; a three-month subscription
 * very much does not. Nothing here encodes how long a trial or plan lasts 
 * that is entirely the server's business.
 */
const pollDelayFor = (
  subscription: Subscription | null,
  hasSession: boolean,
): number => {
  // Signed out we make no network call at all  it is just a storage read  so
  // keep it tight and pick up a fresh login almost the moment it happens.
  if (!hasSession) return 1_000;

  const seconds = subscription?.seconds_remaining;

  if (seconds == null) return 60_000; // unknown  check once a minute
  if (seconds <= 0) return 30_000; // already expired
  if (seconds <= 120) return 5_000; // final couple of minutes
  if (seconds <= 900) return 15_000; // within a quarter hour
  if (seconds <= 86_400) return 60_000; // within a day
  return 300_000; // days or months out
};

/** "I've Made Payment" re-checks this many times before handing back. */
const CHECK_ATTEMPTS = 5;
const CHECK_INTERVAL_MS = 3_000;
/** Quiet re-check while the account details are on screen. */
const BACKGROUND_CHECK_MS = 10_000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Mode = "hidden" | "onboarding" | "reminder" | "expired";

/** The payment screens, which sit above whatever `mode` says. */
type PayStep = "renew" | "checking" | "renewed";

interface HeldTransfer {
  payment: TransferPayment;
  /** When it was fetched, so the expiry countdown stays honest. */
  receivedAt: number;
}

/** Identifies a reminder step so each one is announced exactly once. */
const reminderKey = (subscription: Subscription): string | null => {
  const reminder = subscription.ending_soon_notice?.reminder;
  if (!reminder) return null;
  return `${reminder.value}-${reminder.unit}`;
};

const isExpired = (subscription: Subscription): boolean =>
  subscription.expired === true ||
  subscription.status === "expired" ||
  (subscription.trial_started && !subscription.access_active);

/**
 * Watches /api/auth/subscription/ for the whole app, so the trial sheet can
 * surface on whatever screen the user happens to be on.
 *
 * Deliberately self-gating on the stored token rather than on the root layout's
 * session state: that state is resolved once at boot, so straight after a fresh
 * registration it still reads "signed out" and this would never start polling.
 */
export const SubscriptionWatcher: React.FC = () => {
  const queryClient = useQueryClient();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [mode, setMode] = useState<Mode>("hidden");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment state. Kept apart from `mode`, which the poll loop re-derives on
  // every tick and would otherwise wipe mid-payment.
  const [step, setStep] = useState<PayStep | null>(null);
  const stepRef = useRef<PayStep | null>(null);
  const [transfer, setTransfer] = useState<HeldTransfer | null>(null);
  const [payMessage, setPayMessage] = useState<string | null>(null);
  const [renewed, setRenewed] = useState<Subscription | null>(null);
  const [emailPrompt, setEmailPrompt] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const statusInFlight = useRef(false);

  const segments = useSegments();

  // Tokens are stored back at verify-otp, so a session exists while the user is
  // still choosing a business type and setting a PIN. Without this the sheet
  // could surface in the middle of onboarding.
  const inAuthFlow = segments[0] === "(Auth)" || segments[0] === "(Onboarding)";

  // Last reminder step seen, and the one the user closed, so a dismissed
  // reminder does not immediately reappear on the next poll.
  const seenReminder = useRef<string | null>(null);
  const dismissedReminder = useRef<string | null>(null);
  const hasSession = useRef(false);

  // Re-polls immediately AND recomputes the next delay. Anything that changes
  // the subscription (starting a trial, returning from the background) must go
  // through this rather than a bare check, or the loop keeps running on a
  // cadence derived from stale data and can skip a reminder step entirely.
  const refresh = useRef<() => void>(() => {});

  const goTo = useCallback((next: PayStep | null) => {
    stepRef.current = next;
    setStep(next);
  }, []);

  const resetPayment = useCallback(() => {
    goTo(null);
    setTransfer(null);
    setPayMessage(null);
    setRenewed(null);
    setEmailPrompt(null);
    setEmail("");
  }, [goTo]);

  const evaluate = useCallback((next: Subscription) => {
    setSubscription(next);

    // The authoritative gate signal. Background pollers read this to avoid
    // hammering endpoints that can only answer 403.
    setAccessGated(!next.access_active);

    // Registered but never started the trial  a forced choice.
    if (!next.trial_started) {
      if (next.trial_offer) setMode("onboarding");
      return;
    }

    if (isExpired(next)) {
      setMode("expired");
      return;
    }

    // Access is back (paid, or the Paystack webhook landed first). The paywall
    // has nothing more to say.
    setMode((current) => (current === "expired" ? "hidden" : current));

    const key = reminderKey(next);
    if (key && key !== seenReminder.current) {
      seenReminder.current = key;
      if (dismissedReminder.current !== key) setMode("reminder");
      return;
    }

    // Healthy subscription and nothing new to announce.
    if (!key) seenReminder.current = null;
  }, []);

  const check = useCallback(async (): Promise<Subscription | null> => {
    // No session means the user is on the auth screens; polling there would
    // only produce 401 noise.
    const token = await getAccessToken();
    hasSession.current = !!token;
    if (!token) {
      setMode("hidden");
      // A payment in progress belongs to the account that started it.
      resetPayment();
      return null;
    }

    try {
      const next = await getSubscription();
      evaluate(next);
      return next;
    } catch {
      // A failed probe must never interrupt whatever the user is doing.
      return null;
    }
  }, [evaluate, resetPayment]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Self-scheduling rather than a fixed interval, so each delay is chosen
    // from the subscription the server just returned.
    const loop = async () => {
      const next = await check();
      if (cancelled) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(loop, pollDelayFor(next, hasSession.current));
    };

    // Cancels the pending tick so the next delay is computed from what we are
    // about to learn, not from what we knew before.
    refresh.current = () => {
      if (timer) clearTimeout(timer);
      loop();
    };
    loop();

    // Coming back from the background is the most likely moment for the trial
    // to have lapsed while nothing was polling.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh.current();
    });

    // A session appearing or vanishing is the single most important moment to
    // re-check, and waiting for the next tick is what made the sheet feel slow.
    const unsubscribe = onTokensChanged(() => refresh.current());

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      sub.remove();
      unsubscribe();
    };
  }, [check]);

  // Landing on a real screen after onboarding is the moment to look again.
  useEffect(() => {
    if (!inAuthFlow) refresh.current();
  }, [inAuthFlow]);

  // ── Payment ────────────────────────────────────────────────────────────────

  const markPaid = useCallback(
    (next?: Subscription) => {
      setRenewed(next ?? null);
      if (next) setSubscription(next);
      setAccessGated(false);
      setTransfer(null);
      setPayMessage(null);
      goTo("renewed");
      queryClient.invalidateQueries();
      refresh.current();
    },
    [goTo, queryClient],
  );

  /** One status call. Moves to the success screen when the money is in. */
  const fetchStatus = useCallback(
    async (reference: string): Promise<TransferPayment> => {
      const payment = await getTransferStatus(reference);
      if (payment.paid || payment.status === "success") {
        markPaid(payment.subscription);
      } else {
        setTransfer({ payment, receivedAt: Date.now() });
      }
      return payment;
    },
    [markPaid],
  );

  // While the account details are showing, keep an eye out quietly so a
  // transfer that lands is noticed without the button being pressed.
  const pendingReference =
    step === "renew" && transfer?.payment.status === "pending"
      ? transfer.payment.reference
      : null;

  useEffect(() => {
    if (!pendingReference) return;
    const tick = async () => {
      if (statusInFlight.current || stepRef.current !== "renew") return;
      statusInFlight.current = true;
      try {
        await fetchStatus(pendingReference);
      } catch {
        // Silent: the user can still press "I've Made Payment".
      } finally {
        statusInFlight.current = false;
      }
    };
    const timer = setInterval(tick, BACKGROUND_CHECK_MS);
    // Returning from the bank app is the likeliest moment it has just landed.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [pendingReference, fetchStatus]);

  /** Sends `{}` first, and an email only once the backend has asked for one. */
  const startPayment = async () => {
    if (busy) return;
    const fromRenew = stepRef.current === "renew";
    const showError = fromRenew ? setPayMessage : setError;

    const asksForEmail = emailPrompt !== null;
    const trimmed = email.trim();
    if (asksForEmail && !EMAIL_PATTERN.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setBusy(true);
    setError(null);
    setPayMessage(null);
    try {
      const payment = await initializeTransfer(
        asksForEmail ? { email: trimmed } : {},
      );
      setEmailPrompt(null);
      setEmail("");
      if (payment.paid) {
        markPaid(payment.subscription);
        return;
      }
      setTransfer({ payment, receivedAt: Date.now() });
      goTo("renew");
    } catch (err: any) {
      const info = parseApiError(err, "Something went wrong. Please try again.");

      if (info.code === "already_subscribed") {
        markPaid();
        return;
      }

      if (!fromRenew && (info.code === "email_required" || info.fields.email)) {
        // First time: reveal the field with the server's reason as its hint.
        // After that: the server rejected what was typed, so say why.
        if (emailPrompt === null) {
          setEmailPrompt(info.fields.email ?? info.message);
        } else {
          setError(info.fields.email ?? info.message);
        }
        return;
      }

      showError(info.message);
    } finally {
      setBusy(false);
    }
  };

  /** Starts Paystack Online / Card Checkout in an in-app browser session. */
  const startOnlinePayment = async () => {
    if (busy) return;
    const asksForEmail = emailPrompt !== null;
    const trimmed = email.trim();
    if (asksForEmail && !EMAIL_PATTERN.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setBusy(true);
    setError(null);
    setPayMessage(null);
    try {
      const res = await initializePaystack(
        asksForEmail ? { email: trimmed } : {},
      );
      setEmailPrompt(null);
      setEmail("");
      await WebBrowser.openBrowserAsync(res.authorization_url);
      goTo("checking");
      try {
        const verified = await verifyPaystack(res.reference);
        markPaid(verified.subscription);
      } catch (verifyErr: any) {
        goTo(null);
        setError("Payment was not completed or cancelled.");
      }
    } catch (err: any) {
      const info = parseApiError(err, "Failed to connect to Paystack.");
      if (info.code === "email_required" || info.fields.email) {
        if (emailPrompt === null) {
          setEmailPrompt(info.fields.email ?? info.message);
        } else {
          setError(info.fields.email ?? info.message);
        }
      } else {
        setError(info.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleMadePayment = async () => {
    const reference = transfer?.payment.reference;
    if (!reference) return;

    setPayMessage(null);
    goTo("checking");

    let latest: TransferPayment | null = null;
    let failure: string | null = null;

    for (let attempt = 0; attempt < CHECK_ATTEMPTS; attempt++) {
      if (attempt > 0) await wait(CHECK_INTERVAL_MS);
      // The quiet background check may have got there first.
      if (stepRef.current !== "checking") return;
      try {
        latest = await fetchStatus(reference);
        failure = null;
      } catch (err) {
        failure = parseApiError(err, "We couldn't check your payment. Please try again.").message;
      }
      if (latest?.paid || latest?.status === "success") return;
      // Expired or rejected won't change by waiting.
      if (latest && latest.status !== "pending") break;
    }

    if (stepRef.current !== "checking") return;
    setPayMessage(
      failure ??
        (latest?.status === "pending"
          ? "We haven't received your transfer yet. It can take a few minutes to arrive  we'll keep checking."
          : null),
    );
    goTo("renew");
  };

  const handleBackFromRenew = () => {
    setTransfer(null);
    setPayMessage(null);
    goTo(null);
  };

  const handleContinue = () => {
    dismissedReminder.current = seenReminder.current;
    resetPayment();
    setMode("hidden");
    refresh.current();
  };

  // ── Trial / reminder ───────────────────────────────────────────────────────

  const handleStartTrial = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await startTrial();
      setMode("hidden");
      await queryClient.invalidateQueries();
      // The trial now has a real countdown, so re-derive the poll cadence
      // immediately instead of coasting on the pre-trial schedule.
      refresh.current();
    } catch (err: any) {
      const info = parseApiError(err, "Something went wrong. Please try again.");
      if (
        info.code === "trial_already_active" ||
        info.code === "already_subscribed"
      ) {
        setMode("hidden");
        await queryClient.invalidateQueries();
        return;
      }
      setError(info.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDismissReminder = () => {
    dismissedReminder.current = seenReminder.current;
    setError(null);
    setEmailPrompt(null);
    setEmail("");
    setMode("hidden");
  };

  // Never interrupt the auth flow itself.
  if (inAuthFlow || !subscription) return null;

  if (!step && mode === "onboarding") {
    return (
      <TrialModal
        visible
        offer={subscription.trial_offer ?? null}
        loading={busy}
        error={error}
        onStart={handleStartTrial}
      />
    );
  }

  let content: React.ReactNode = null;
  let onBackButton: (() => void) | undefined;

  if (step === "renew" && transfer) {
    content = (
      <RenewSubscriptionScreen
        transfer={transfer.payment}
        receivedAt={transfer.receivedAt}
        interval={subscription.interval}
        loading={busy}
        message={payMessage}
        onBack={handleBackFromRenew}
        onMadePayment={handleMadePayment}
        onNewAccount={startPayment}
      />
    );
    onBackButton = handleBackFromRenew;
  } else if (step === "checking") {
    content = <CheckingPaymentScreen />;
  } else if (step === "renewed") {
    content = (
      <SubscriptionRenewedScreen
        subscription={renewed ?? subscription}
        onContinue={handleContinue}
      />
    );
  } else if (mode === "expired") {
    content = (
      <SubscriptionExpiredScreen
        subscription={subscription}
        loading={busy}
        error={error}
        emailPrompt={emailPrompt}
        email={email}
        onEmailChange={setEmail}
        onPay={startPayment}
        onPayOnline={startOnlinePayment}
      />
    );
  } else if (mode === "reminder") {
    content = (
      <RenewalReminderSheet
        subscription={subscription}
        loading={busy}
        error={error}
        emailPrompt={emailPrompt}
        email={email}
        onEmailChange={setEmail}
        onPay={startPayment}
        onDismiss={handleDismissReminder}
      />
    );
    onBackButton = handleDismissReminder;
  }

  if (!content) return null;

  // One modal for every step, so moving between the sheet and the full-screen
  // pages swaps its contents instead of stacking modals (which iOS refuses to
  // present while another is still dismissing).
  return (
    <AnimatedModal backdrop={false}
      visible
      statusBarTranslucent
      onRequestClose={() => onBackButton?.()}
    >
      {content}
    </AnimatedModal>
  );
};
