// components/subscription/SubscriptionExpiredScreen.tsx
import { LockKeyhole } from "lucide-react-native";
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
  PLAN_NAME,
  PrimaryButton,
  contactSupport,
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
  onPayOnline?: () => void;
}

/** The paywall once access has lapsed. There is no way past it but paying. */
export const SubscriptionExpiredScreen: React.FC<Props> = ({
  subscription,
  loading,
  error,
  emailPrompt,
  email,
  onEmailChange,
  onPay,
  onPayOnline,
}) => {
  const insets = useSafeAreaInsets();
  const notice = subscription.expired_notice ?? {};
  const noun = intervalNoun(subscription.interval);

  const title = notice.title ?? "Your Subscription Has Expired";
  const body =
    notice.body ??
    "Renew your subscription to continue managing your inventory, sales and business insights.";
  const amount =
    notice.renewal_amount_display ??
    formatCurrency(notice.renewal_amount_naira ?? subscription.amount_naira, 0);
  const per =
    notice.interval_display ??
    `/ ${noun.charAt(0).toUpperCase()}${noun.slice(1)}`;

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + verticalScale(24),
            paddingBottom: insets.bottom + verticalScale(24),
          },
        ]}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrap}>
          <View style={styles.iconCircle}>
            <LockKeyhole
              size={moderateScale(40)}
              color={PAYWALL_COLORS.brand}
              strokeWidth={1.8}
            />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>!</Text>
          </View>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>

        <View style={styles.planCard}>
          <Text style={styles.cardLabel}>Subscription Plan</Text>
          <Text style={styles.planName}>{PLAN_NAME}</Text>
          <View style={styles.divider} />
          <Text style={styles.cardLabel}>Renewal Amount</Text>
          <Text style={styles.amountLine}>
            <Text style={styles.amount}>{amount}</Text>
            <Text style={styles.per}> {per}</Text>
          </Text>
        </View>

        {emailPrompt !== null ? (
          <View style={styles.fullWidth}>
            <EmailField
              value={email}
              onChange={onEmailChange}
              onSubmit={onPay}
              hint={emailPrompt}
              editable={!loading}
            />
          </View>
        ) : null}
        <ErrorText message={error} />

        <PrimaryButton
          label="Pay via Bank Transfer"
          onPress={onPay}
          loading={loading}
          style={styles.cta}
        />
        {onPayOnline && (
          <TouchableOpacity
            style={styles.onlinePayBtn}
            onPress={onPayOnline}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.onlinePayText}>Pay with Card / Online</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.support}
          onPress={() => contactSupport()}
          disabled={loading}
        >
          <Text style={styles.supportText}>Contact Support</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAYWALL_COLORS.page },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scale(28),
  },
  fullWidth: { alignSelf: "stretch" },
  iconWrap: { width: scale(92), height: scale(92) },
  iconCircle: {
    flex: 1,
    borderRadius: scale(46),
    backgroundColor: PAYWALL_COLORS.lockBg,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -scale(2),
    right: -scale(2),
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    backgroundColor: PAYWALL_COLORS.badge,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: PAYWALL_COLORS.onBrand,
    fontSize: moderateScale(12),
    fontFamily: AUTH_FONTS.bold,
  },
  title: {
    fontSize: moderateScale(24),
    fontFamily: AUTH_FONTS.bold,
    color: PAYWALL_COLORS.text,
    textAlign: "center",
    marginTop: verticalScale(28),
  },
  body: {
    fontSize: moderateScale(15.5),
    lineHeight: moderateScale(24),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.textMuted,
    textAlign: "center",
    marginTop: verticalScale(12),
  },
  planCard: {
    alignSelf: "stretch",
    alignItems: "center",
    backgroundColor: PAYWALL_COLORS.planCard,
    borderWidth: 1,
    borderColor: PAYWALL_COLORS.planBorder,
    borderRadius: moderateScale(20),
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(20),
    marginTop: verticalScale(28),
  },
  cardLabel: {
    fontSize: moderateScale(13),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.textMuted,
  },
  planName: {
    fontSize: moderateScale(17),
    fontFamily: AUTH_FONTS.semibold,
    color: PAYWALL_COLORS.text,
    marginTop: verticalScale(4),
  },
  divider: {
    alignSelf: "stretch",
    height: 1,
    backgroundColor: PAYWALL_COLORS.planBorder,
    marginVertical: verticalScale(14),
  },
  amountLine: { marginTop: verticalScale(4) },
  amount: {
    fontSize: moderateScale(30),
    fontFamily: AUTH_FONTS.bold,
    color: PAYWALL_COLORS.brand,
  },
  per: {
    fontSize: moderateScale(16),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.textMuted,
  },
  cta: { alignSelf: "stretch", marginTop: verticalScale(28) },
  onlinePayBtn: {
    alignSelf: "stretch",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: PAYWALL_COLORS.brand,
    borderRadius: moderateScale(14),
    paddingVertical: verticalScale(14),
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(12),
  },
  onlinePayText: {
    color: PAYWALL_COLORS.brand,
    fontSize: moderateScale(15),
    fontFamily: AUTH_FONTS.semibold,
  },
  support: { paddingVertical: verticalScale(16) },
  supportText: {
    fontSize: moderateScale(15.5),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.textMuted,
  },
});
