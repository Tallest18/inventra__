// components/subscription/RenewSubscriptionScreen.tsx
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Check, CircleQuestionMark, Copy } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AUTH_FONTS } from "@/components/auth/authTheme";
import type { TransferPayment } from "@/src/api/types";
import { moderateScale, scale, verticalScale } from "@/utils/scaling";
import {
  ErrorText,
  PAYWALL_COLORS,
  PLAN_NAME,
  PrimaryButton,
  contactSupport,
  copyToClipboard,
  intervalNoun,
} from "./paywallParts";

interface Props {
  transfer: TransferPayment;
  /** When `transfer` was fetched, so the countdown tracks `seconds_until_expiry`. */
  receivedAt: number;
  interval?: string;
  loading: boolean;
  /** e.g. "We haven't received your transfer yet." */
  message: string | null;
  onBack: () => void;
  onMadePayment: () => void;
  onNewAccount: () => void;
}

const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

const formatCountdown = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

/** Account details to transfer into, and the button to say it is done. */
export const RenewSubscriptionScreen: React.FC<Props> = ({
  transfer,
  receivedAt,
  interval,
  loading,
  message,
  onBack,
  onMadePayment,
  onNewAccount,
}) => {
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const secondsLeft =
    transfer.seconds_until_expiry - (now - receivedAt) / 1000;
  // A rejected transfer or a lapsed account can't be paid into any more.
  const unusable =
    transfer.status === "failed" ||
    transfer.status === "expired" ||
    (transfer.status === "pending" && secondsLeft <= 0);

  const handleCopy = async () => {
    try {
      await copyToClipboard(transfer.account_number);
      setCopied(true);
    } catch {
      // Copy is a convenience; the number is on screen to type.
    }
  };

  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: "Bank Name", value: transfer.bank_name },
    { label: "Account Name", value: transfer.account_name },
    { label: "Reference", value: transfer.reference, mono: true },
  ];

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + verticalScale(20),
            paddingBottom: insets.bottom + verticalScale(16),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Renew Subscription</Text>
            <Text style={styles.subtitle}>
              Complete your payment to continue using Inventra.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.back}
            onPress={onBack}
            disabled={loading}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={moderateScale(24)} color={PAYWALL_COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Subscription Amount</Text>
          <Text style={styles.amount}>{transfer.amount_display}</Text>
          <Text style={styles.amountMeta}>
            per {intervalNoun(interval)} · {PLAN_NAME}
          </Text>
        </View>

        <Text style={styles.section}>Payment Method</Text>
        <View style={styles.methodCard}>
          <View style={styles.methodIcon}>
            <Text style={styles.methodGlyph}>₦</Text>
          </View>
          <View style={styles.methodCopy}>
            <Text style={styles.methodTitle}>Bank Transfer</Text>
            <Text style={styles.methodSub}>Transfer to the account below</Text>
          </View>
          <View style={styles.radio} />
        </View>

        <Text style={styles.section}>Transfer To</Text>
        <LinearGradient
          colors={["#1155CC", "#2A68D8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.transferCard, unusable && styles.transferCardDim]}
        >
          <View style={[styles.row, styles.rowSplit]}>
            <Text style={styles.rowLabel}>{rows[0].label}</Text>
            <Text style={styles.rowValue}>{rows[0].value}</Text>
          </View>

          <View style={[styles.row, styles.accountRow]}>
            <View style={styles.accountCopy}>
              <Text style={styles.rowLabel}>Account Number</Text>
              <Text style={styles.accountNumber} selectable>
                {transfer.account_number}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.copy}
              onPress={handleCopy}
              disabled={unusable}
              accessibilityLabel="Copy account number"
            >
              {copied ? (
                <Check size={moderateScale(18)} color={PAYWALL_COLORS.onBrand} />
              ) : (
                <Copy size={moderateScale(18)} color={PAYWALL_COLORS.onBrand} />
              )}
              <Text style={styles.copyText}>{copied ? "Copied" : "Copy"}</Text>
            </TouchableOpacity>
          </View>

          {rows.slice(1).map((row, index) => (
            <View
              key={row.label}
              style={[styles.row, styles.rowSplit, index === rows.length - 2 && styles.rowLast]}
            >
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text
                style={[styles.rowValue, row.mono && styles.rowMono]}
                numberOfLines={1}
                adjustsFontSizeToFit
                selectable
              >
                {row.value}
              </Text>
            </View>
          ))}
        </LinearGradient>

        <View style={[styles.note, unusable && styles.noteDanger]}>
          <View style={[styles.noteIcon, unusable && styles.noteIconDanger]}>
            <Text style={[styles.noteIconText, unusable && styles.noteIconTextDanger]}>
              !
            </Text>
          </View>
          <View style={styles.noteCopy}>
            {unusable ? (
              <Text style={[styles.noteText, styles.noteTextDanger]}>
                {transfer.status === "failed"
                  ? (transfer.message ??
                    "The transfer was rejected. Any money sent will be refunded by your bank.")
                  : "This account number has expired. Get a new one to pay."}
              </Text>
            ) : (
              <>
                <Text style={styles.noteText}>{transfer.instructions}</Text>
                <Text style={[styles.noteText, styles.noteExpiry]}>
                  Account expires in {formatCountdown(secondsLeft)}
                </Text>
              </>
            )}
          </View>
        </View>

        <ErrorText message={message} />

        <PrimaryButton
          label={unusable ? "Get New Account Number" : "I've Made Payment"}
          onPress={unusable ? onNewAccount : onMadePayment}
          loading={loading}
          style={styles.cta}
        />

        <TouchableOpacity
          style={styles.help}
          onPress={() => contactSupport(transfer.reference)}
        >
          <CircleQuestionMark
            size={moderateScale(20)}
            color={PAYWALL_COLORS.textMuted}
          />
          <Text style={styles.helpText}>Help</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const label = {
  fontSize: moderateScale(13),
  fontFamily: AUTH_FONTS.medium,
  letterSpacing: 0.8,
  textTransform: "uppercase" as const,
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAYWALL_COLORS.renewPage },
  content: { paddingHorizontal: scale(20) },
  header: { flexDirection: "row", alignItems: "flex-start", gap: scale(12) },
  headerCopy: { flex: 1 },
  title: {
    fontSize: moderateScale(26),
    fontFamily: AUTH_FONTS.bold,
    color: PAYWALL_COLORS.text,
  },
  subtitle: {
    fontSize: moderateScale(14),
    lineHeight: moderateScale(20),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.textMuted,
    marginTop: verticalScale(6),
  },
  back: {
    width: scale(56),
    height: scale(48),
    borderRadius: moderateScale(8),
    backgroundColor: PAYWALL_COLORS.fieldActive,
    alignItems: "center",
    justifyContent: "center",
  },
  amountCard: {
    backgroundColor: "rgba(221,228,238,0.9)",
    borderWidth: 1,
    borderColor: "#CDD5E1",
    borderRadius: moderateScale(18),
    paddingHorizontal: scale(22),
    paddingVertical: verticalScale(22),
    marginTop: verticalScale(28),
  },
  amountLabel: {
    fontSize: moderateScale(14),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.textMuted,
  },
  amount: {
    fontSize: moderateScale(34),
    fontFamily: AUTH_FONTS.bold,
    color: PAYWALL_COLORS.text,
    marginTop: verticalScale(14),
  },
  amountMeta: {
    fontSize: moderateScale(16),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.textMuted,
    marginTop: verticalScale(14),
  },
  section: {
    ...label,
    color: PAYWALL_COLORS.textMuted,
    marginTop: verticalScale(24),
    marginBottom: verticalScale(12),
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PAYWALL_COLORS.fieldActive,
    borderWidth: 1,
    borderColor: "#DCE3EE",
    borderRadius: moderateScale(16),
    padding: scale(16),
  },
  methodIcon: {
    width: scale(46),
    height: scale(46),
    borderRadius: moderateScale(12),
    backgroundColor: "#E8EFFC",
    alignItems: "center",
    justifyContent: "center",
  },
  methodGlyph: {
    fontSize: moderateScale(18),
    fontFamily: AUTH_FONTS.bold,
    color: PAYWALL_COLORS.brand,
  },
  methodCopy: { flex: 1, marginLeft: scale(14) },
  methodTitle: {
    fontSize: moderateScale(16),
    fontFamily: AUTH_FONTS.semibold,
    color: PAYWALL_COLORS.text,
  },
  methodSub: {
    fontSize: moderateScale(13.5),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.textMuted,
    marginTop: verticalScale(2),
  },
  radio: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    borderWidth: scale(6),
    borderColor: PAYWALL_COLORS.brand,
    backgroundColor: PAYWALL_COLORS.fieldActive,
  },
  transferCard: {
    borderRadius: moderateScale(18),
    paddingHorizontal: scale(22),
  },
  transferCardDim: { opacity: 0.55 },
  row: {
    paddingVertical: verticalScale(22),
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: "rgba(255,255,255,0.22)",
  },
  rowLast: { borderBottomWidth: 0 },
  rowSplit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: scale(12),
  },
  rowLabel: { ...label, color: "rgba(255,255,255,0.75)" },
  rowValue: {
    flexShrink: 1,
    textAlign: "right",
    fontSize: moderateScale(16.5),
    fontFamily: AUTH_FONTS.semibold,
    color: PAYWALL_COLORS.onBrand,
  },
  rowMono: {
    fontFamily: MONO,
    fontSize: moderateScale(14),
    fontWeight: "600",
  },
  accountRow: { flexDirection: "row", alignItems: "center" },
  accountCopy: { flex: 1 },
  accountNumber: {
    fontSize: moderateScale(28),
    fontFamily: AUTH_FONTS.bold,
    color: PAYWALL_COLORS.onBrand,
    letterSpacing: 3,
    marginTop: verticalScale(8),
  },
  copy: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: moderateScale(22),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
  },
  copyText: {
    fontSize: moderateScale(15),
    fontFamily: AUTH_FONTS.semibold,
    color: PAYWALL_COLORS.onBrand,
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scale(12),
    backgroundColor: PAYWALL_COLORS.warningSoft,
    borderRadius: moderateScale(16),
    padding: scale(16),
    marginTop: verticalScale(22),
  },
  noteDanger: { backgroundColor: "#FEECEB" },
  noteIcon: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: PAYWALL_COLORS.warningIconBg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(1),
  },
  noteIconDanger: { backgroundColor: PAYWALL_COLORS.danger },
  noteIconText: {
    fontSize: moderateScale(13),
    fontFamily: AUTH_FONTS.bold,
    color: PAYWALL_COLORS.warningText,
  },
  noteIconTextDanger: { color: PAYWALL_COLORS.onBrand },
  noteCopy: { flex: 1 },
  noteText: {
    fontSize: moderateScale(14),
    lineHeight: moderateScale(21),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.warningText,
  },
  noteTextDanger: { color: PAYWALL_COLORS.danger },
  noteExpiry: { fontFamily: AUTH_FONTS.semibold, marginTop: verticalScale(6) },
  cta: { marginTop: verticalScale(24) },
  help: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    paddingVertical: verticalScale(18),
  },
  helpText: {
    fontSize: moderateScale(16),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.textMuted,
  },
});
