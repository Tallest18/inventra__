// components/auth/SubscriptionWatcher.tsx
import { useQueryClient } from "@tanstack/react-query";
import { useSegments } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking } from "react-native";

import {
  getAccessToken,
  getSubscription,
  initializePaystack,
  onTokensChanged,
  parseApiError,
  setAccessGated,
  startTrial,
} from "@/src/api";
import type { OfferContent, Subscription } from "@/src/api/types";
import { TrialModal } from "./TrialModal";

/**
 * How long to wait before re-checking, derived from what the backend says is
 * left rather than from any fixed assumption in the app. A five-minute trial
 * needs a tight loop to catch each reminder step; a three-month subscription
 * very much does not. Nothing here encodes how long a trial or plan lasts —
 * that is entirely the server's business.
 */
const pollDelayFor = (
  subscription: Subscription | null,
  hasSession: boolean,
): number => {
  // Signed out we make no network call at all — it is just a storage read — so
  // keep it tight and pick up a fresh login almost the moment it happens.
  if (!hasSession) return 1_000;

  const seconds = subscription?.seconds_remaining;

  if (seconds == null) return 60_000; // unknown — check once a minute
  if (seconds <= 0) return 30_000; // already expired
  if (seconds <= 120) return 5_000; // final couple of minutes
  if (seconds <= 900) return 15_000; // within a quarter hour
  if (seconds <= 86_400) return 60_000; // within a day
  return 300_000; // days or months out
};

type Mode = "hidden" | "onboarding" | "reminder" | "expired";

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

const expiredContent = (subscription: Subscription): OfferContent => {
  const notice = subscription.expired_notice ?? {};
  const wasPaid = subscription.status === "active";
  const naira = subscription.amount_naira ?? 1000;
  // Billing period comes from the server ("monthly" -> "month"); never assume
  // it. These strings only ever show if expired_notice omits them.
  const per = (subscription.interval ?? "").replace(/ly$/, "") || "period";

  return {
    title: notice.title ?? "Your access has ended",
    subtitle:
      notice.subtitle ??
      (subscription.expired_label
        ? `Expired ${subscription.expired_label}`
        : wasPaid
          ? "Subscription expired"
          : "Free trial expired"),
    body:
      notice.body ??
      `Your ${wasPaid ? "subscription" : "free trial"} has ended. Subscribe for ₦${naira} per ${per} to keep using Inventra.`,
    note: notice.note ?? "Your data is safe and waiting for you.",
    features: notice.features ?? [],
    cta: notice.cta ?? `Subscribe — ₦${naira}/${per}`,
    dismiss: notice.dismiss ?? "Not Now",
  };
};

const reminderContent = (subscription: Subscription): OfferContent => {
  const notice = subscription.ending_soon_notice ?? {};
  const label = notice.reminder?.label ?? subscription.time_left_label ?? "";
  const wasPaid = subscription.status === "active";

  return {
    title: notice.title ?? "Heads up",
    subtitle:
      notice.subtitle ??
      (label ? `${label} left` : "Your access is ending soon"),
    body:
      notice.body ??
      `You have ${label || "a little time"} left on your ${wasPaid ? "subscription" : "free trial"}. Renew before it ends to keep everything running.`,
    note: notice.note,
    features: notice.features ?? [],
    cta: notice.cta ?? "Got it",
    dismiss: notice.dismiss ?? "Close",
  };
};

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

  // Last reminder step seen, and the one the user closed, so a dismissed
  // reminder does not immediately reappear on the next poll.
  const segments = useSegments();

  // Tokens are stored back at verify-otp, so a session exists while the user is
  // still choosing a business type and setting a PIN. Without this the sheet
  // could surface in the middle of onboarding.
  const inAuthFlow = segments[0] === "(Auth)" || segments[0] === "(Onboarding)";

  const seenReminder = useRef<string | null>(null);
  const dismissedReminder = useRef<string | null>(null);
  const hasSession = useRef(false);

  // Re-polls immediately AND recomputes the next delay. Anything that changes
  // the subscription (starting a trial, returning from the background) must go
  // through this rather than a bare check, or the loop keeps running on a
  // cadence derived from stale data and can skip a reminder step entirely.
  const refresh = useRef<() => void>(() => {});

  const evaluate = useCallback((next: Subscription) => {
    setSubscription(next);

    // The authoritative gate signal. Background pollers read this to avoid
    // hammering endpoints that can only answer 403.
    setAccessGated(!next.access_active);

    // Registered but never started the trial — a forced choice.
    if (!next.trial_started) {
      if (next.trial_offer) setMode("onboarding");
      return;
    }

    if (isExpired(next)) {
      setMode("expired");
      return;
    }

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
  }, [evaluate]);

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

  const handleStart = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      if (mode === "onboarding") {
        await startTrial();
        setMode("hidden");
        await queryClient.invalidateQueries();
        // The trial now has a real countdown, so re-derive the poll cadence
        // immediately instead of coasting on the pre-trial schedule.
        refresh.current();
        return;
      }

      if (mode === "expired") {
        const { authorization_url } = await initializePaystack({});
        await Linking.openURL(authorization_url);
        return;
      }

      // A reminder is informational — acknowledging it just closes the sheet.
      dismissedReminder.current = seenReminder.current;
      setMode("hidden");
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
      setError(
        info.fields.email
          ? "Add an email address to your profile before paying."
          : info.message,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = () => {
    dismissedReminder.current = seenReminder.current;
    setError(null);
    setMode("hidden");
  };

  // Never interrupt the auth flow itself.
  if (inAuthFlow || mode === "hidden" || !subscription) return null;

  const content =
    mode === "onboarding"
      ? (subscription.trial_offer ?? null)
      : mode === "expired"
        ? expiredContent(subscription)
        : reminderContent(subscription);

  return (
    <TrialModal
      visible
      offer={content}
      loading={busy}
      error={error}
      onStart={handleStart}
      // Only a live subscription may be closed. A trial that was never started
      // and an expired one are both forced.
      dismissible={mode === "reminder"}
      onDismiss={handleDismiss}
    />
  );
};
