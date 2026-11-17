// components/subscription/RenewalReminderSheet.tsx
import { Clock, X } from "lucide-react-native";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AUTH_FONTS } from "@/components/auth/authTheme";
import type { Subscription } from "@/src/api/types";
import { formatCurrency } from "@/utils/formatters";
import { moderateScale, scale, verticalScale } from "@/utils/scaling";
import {
  EmailField,
  ErrorText,
  PAYWALL_COLORS,
  PrimaryButton,
  intervalNoun,
} from "./paywallParts";

interface Props {
  subscription: Subscription;
  loading: boolean;
  error: string | null;
  emailPrompt: string | null;
  email: string;
  onEmailChange: (value: string) => void;
  onPay: () => void;
  onDismiss: () => void;
}

/** "Free Trial Ending Soon": a dismissible sheet with a way to pay early. */
export const RenewalReminderSheet: React.FC<Props> = ({
  subscription,
  loading,
  error,
  emailPrompt,
  email,
  onEmailChange,
  onPay,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const notice = subscription.ending_soon_notice ?? {};
  const label = notice.reminder?.label ?? subscription.time_left_label ?? "";
  const isTrial = subscription.status === "trialing";

  const title =
    notice.title ?? (isTrial ? "Free Trial Ending Soon" : "Subscription Ending Soon");
  const banner = notice.banner ?? (label ? `${title} - ${label} left` : title);
  const body =
    notice.body ??
    `Your ${isTrial ? "free trial" : "subscription"} ends in ${label}. Continue using Inventra without interruption by renewing your subscription before it expires.`;
  const amount =
    notice.renewal_amount_display ??
    formatCurrency(notice.renewal_amount_naira ?? subscription.amount_naira, 0);
  const per =
    notice.interval_display ?? `/ ${intervalNoun(subscription.interval)}`;

  // The time left is the emphasised part of the sentence in the design.
  const at = label ? body.indexOf(label) : -1;
  const bodyParts =
    at >= 0
      ? [body.slice(0, at), label, body.slice(at + label.length)]
      : [body, "", ""];

  return (
    <KeyboardAvoidingView
      style={styles.backdrop}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[styles.sheet, { paddingBottom: insets.bottom + verticalScale(12) }]}
      >
        <View style={styles.handle} />
        <TouchableOpacity
          style={styles.close}
          onPress={onDismiss}
          disabled={loading}
          hitSlop={10}
          accessibilityLabel="Close"
        >
          <X size={moderateScale(20)} color={PAYWALL_COLORS.textMuted} />
        </TouchableOpacity>

        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.banner}>
            <Clock size={moderateScale(22)} color={PAYWALL_COLORS.warning} />
            <Text style={styles.bannerText}>{banner}</Text>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>
            {bodyParts[0]}
            {bodyParts[1] ? (
              <Text style={styles.bodyHighlight}>{bodyParts[1]}</Text>
            ) : null}
            {bodyParts[2]}
          </Text>

          <View style={styles.amountCard}>
            <View style={styles.amountCopy}>
              <Text style={styles.amountLabel}>Renewal amount</Text>
              <Text style={styles.amountLine}>
                <Text style={styles.amount}>{amount}</Text>
                <Text style={styles.per}> {per}</Text>
              </Text>
            </View>
            <View style={styles.nairaTile}>
              <Text style={styles.nairaGlyph}>₦</Text>
            </View>
          </View>

          {emailPrompt !== null ? (
            <EmailField
              value={email}
              onChange={onEmailChange}
              onSubmit={onPay}
              hint={emailPrompt}
              editable={!loading}
            />
          ) : null}
          <ErrorText message={error} />
        </ScrollView>

        <PrimaryButton
          label="Pay Now"
          onPress={onPay}
          loading={loading}
          style={styles.cta}
        />
        <TouchableOpacity style={styles.later} onPress={onDismiss} disabled={loading}>
          <Text style={styles.laterText}>Later</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(16,24,40,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: PAYWALL_COLORS.page,
    borderTopLeftRadius: moderateScale(32),
    borderTopRightRadius: moderateScale(32),
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(12),
    maxHeight: "92%",
  },
  handle: {
    width: scale(40),
    height: verticalScale(5),
    borderRadius: 3,
    backgroundColor: "#E4E7EC",
    alignSelf: "center",
    marginBottom: verticalScale(22),
  },
  close: {
    position: "absolute",
    top: verticalScale(20),
    right: scale(20),
    width: scale(34),
    height: scale(34),
    borderRadius: scale(17),
    backgroundColor: "#EDEEF1",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    backgroundColor: PAYWALL_COLORS.warningSoft,
    borderRadius: moderateScale(18),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    marginTop: verticalScale(14),
  },
  bannerText: {
    flex: 1,
    fontSize: moderateScale(16),
    fontFamily: AUTH_FONTS.semibold,
    color: PAYWALL_COLORS.warning,
  },
  title: {
    fontSize: moderateScale(22),
    fontFamily: AUTH_FONTS.bold,
    color: PAYWALL_COLORS.text,
    marginTop: verticalScale(24),
  },
  body: {
    fontSize: moderateScale(16),
    lineHeight: moderateScale(25),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.textMuted,
    marginTop: verticalScale(12),
  },
  bodyHighlight: {
    fontFamily: AUTH_FONTS.bold,
    color: PAYWALL_COLORS.warning,
  },
  amountCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F2F4",
    borderRadius: moderateScale(18),
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(18),
    marginTop: verticalScale(24),
  },
  amountCopy: { flex: 1 },
  amountLabel: {
    fontSize: moderateScale(14),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.textMuted,
  },
  amountLine: { marginTop: verticalScale(2) },
  amount: {
    fontSize: moderateScale(26),
    fontFamily: AUTH_FONTS.bold,
    color: PAYWALL_COLORS.text,
  },
  per: {
    fontSize: moderateScale(17),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.textMuted,
  },
  nairaTile: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: PAYWALL_COLORS.nairaTile,
    alignItems: "center",
    justifyContent: "center",
  },
  nairaGlyph: {
    fontSize: moderateScale(20),
    fontFamily: AUTH_FONTS.semibold,
    color: PAYWALL_COLORS.text,
  },
  cta: { marginTop: verticalScale(24) },
  later: { alignItems: "center", paddingVertical: verticalScale(16) },
  laterText: {
    fontSize: moderateScale(16),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.textMuted,
  },
});
