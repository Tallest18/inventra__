// components/subscription/SubscriptionRenewedScreen.tsx
import { CircleCheck } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AUTH_FONTS } from "@/components/auth/authTheme";
import type { Subscription } from "@/src/api/types";
import { moderateScale, scale, verticalScale } from "@/utils/scaling";
import { PAYWALL_COLORS, PrimaryButton } from "./paywallParts";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "01 August 2026" — built by hand so it reads the same on every JS engine. */
const formatLongDate = (iso?: string | null): string => {
  const date = iso ? new Date(iso) : new Date();
  const safe = isNaN(date.getTime()) ? new Date() : date;
  return `${String(safe.getDate()).padStart(2, "0")} ${MONTHS[safe.getMonth()]} ${safe.getFullYear()}`;
};

const nextRenewalLabel = (subscription?: Subscription | null): string | null => {
  if (!subscription) return null;
  if (subscription.time_left_label) return subscription.time_left_label;
  const days = subscription.days_remaining;
  if (days == null) return null;
  return `${days} day${days === 1 ? "" : "s"}`;
};

export const SubscriptionRenewedScreen: React.FC<{
  subscription?: Subscription | null;
  onContinue: () => void;
}> = ({ subscription, onContinue }) => {
  const insets = useSafeAreaInsets();
  const next = nextRenewalLabel(subscription);

  return (
    <View
      style={[
        styles.page,
        { paddingTop: insets.top, paddingBottom: insets.bottom + verticalScale(16) },
      ]}
    >
      <View style={styles.iconCircle}>
        <CircleCheck
          size={moderateScale(58)}
          color={PAYWALL_COLORS.success}
          strokeWidth={2.2}
        />
      </View>

      <Text style={styles.title}>Subscription Renewed</Text>
      <Text style={styles.body}>
        Your subscription has been renewed successfully.
      </Text>
      <Text style={styles.access}>You now have full access to Inventra.</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Renewed on</Text>
        <Text style={styles.cardDate}>
          {formatLongDate(subscription?.current_period_start)}
        </Text>
        {next ? <Text style={styles.cardNext}>Next renewal: in {next}</Text> : null}
      </View>

      <PrimaryButton label="Continue" onPress={onContinue} style={styles.cta} />
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: PAYWALL_COLORS.page,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(24),
  },
  iconCircle: {
    width: scale(104),
    height: scale(104),
    borderRadius: scale(52),
    backgroundColor: PAYWALL_COLORS.successSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: moderateScale(26),
    fontFamily: AUTH_FONTS.bold,
    color: PAYWALL_COLORS.text,
    textAlign: "center",
    marginTop: verticalScale(32),
  },
  body: {
    fontSize: moderateScale(16),
    lineHeight: moderateScale(25),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.textMuted,
    textAlign: "center",
    marginTop: verticalScale(12),
    paddingHorizontal: scale(20),
  },
  access: {
    fontSize: moderateScale(16),
    fontFamily: AUTH_FONTS.semibold,
    color: PAYWALL_COLORS.brand,
    textAlign: "center",
    marginTop: verticalScale(12),
  },
  card: {
    alignSelf: "stretch",
    alignItems: "center",
    backgroundColor: PAYWALL_COLORS.successCard,
    borderRadius: moderateScale(18),
    paddingVertical: verticalScale(20),
    marginTop: verticalScale(36),
  },
  cardLabel: {
    fontSize: moderateScale(14),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.textMuted,
  },
  cardDate: {
    fontSize: moderateScale(19),
    fontFamily: AUTH_FONTS.semibold,
    color: PAYWALL_COLORS.text,
    marginTop: verticalScale(6),
  },
  cardNext: {
    fontSize: moderateScale(14.5),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.successText,
    marginTop: verticalScale(6),
  },
  cta: { alignSelf: "stretch", marginTop: verticalScale(36) },
});
