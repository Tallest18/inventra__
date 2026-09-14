// components/subscription/paywallParts.tsx
// Pieces shared by the renewal sheet and the full-screen payment steps.
import React, { useState } from "react";
import {
  ActivityIndicator,
  Clipboard,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { AUTH_COLORS, AUTH_FONTS } from "@/components/auth/authTheme";
import { moderateScale, scale, verticalScale } from "@/utils/scaling";

export const PAYWALL_COLORS = {
  ...AUTH_COLORS,
  page: "#F8F9FA",
  renewPage: "#E7EDF8",
  warning: "#E8730C",
  warningSoft: "#FEF7E1",
  warningText: "#B54708",
  warningIconBg: "#F9D56B",
  success: "#16A34A",
  successSoft: "#E3F8EA",
  successCard: "#EEFBF2",
  successText: "#15803D",
  planCard: "#ECF1F9",
  planBorder: "#C9D6EE",
  lockBg: "#E3E9F4",
  badge: "#E0294A",
  nairaTile: "#F3E6C6",
} as const;

/** No plan name comes from the backend yet; the designs call it this. */
export const PLAN_NAME = "Inventra Standard";

const SUPPORT_EMAIL = "support@inventra.app";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "monthly" -> "month", so copy can read "per month". */
export const intervalNoun = (interval?: string): string =>
  (interval ?? "").replace(/ly$/, "") || "month";

export const contactSupport = (reference?: string) => {
  const subject = reference
    ? `Subscription payment ${reference}`
    : "Subscription help";
  Linking.openURL(
    `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`,
  ).catch(() => {});
};

/**
 * Core Clipboard is deprecated in favour of expo-clipboard, but it still works
 * on native and web and avoids adding a native dependency for one button.
 */
export const copyToClipboard = async (text: string) => {
  const nav = (globalThis as any).navigator;
  if (Platform.OS === "web" && nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(text);
      return;
    } catch {
      // Refused (no permission / insecure origin): fall through.
    }
  }
  Clipboard.setString(text);
};

export const PrimaryButton: React.FC<{
  label: string;
  onPress: () => void;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}> = ({ label, onPress, loading = false, style }) => (
  <TouchableOpacity
    style={[styles.button, loading && styles.buttonBusy, style]}
    onPress={onPress}
    disabled={loading}
    activeOpacity={0.85}
  >
    {loading ? (
      <ActivityIndicator color={PAYWALL_COLORS.onBrand} size="small" />
    ) : (
      <Text style={styles.buttonText}>{label}</Text>
    )}
  </TouchableOpacity>
);

/** Shown only after the backend answers `email_required`. */
export const EmailField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  hint?: string;
  editable?: boolean;
  align?: "left" | "center";
}> = ({ value, onChange, onSubmit, hint, editable = true, align = "left" }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.emailBlock}>
      <Text style={[styles.emailLabel, { textAlign: align }]}>Email address</Text>
      {hint ? (
        <Text style={[styles.emailHint, { textAlign: align }]}>{hint}</Text>
      ) : null}
      <TextInput
        style={[styles.emailInput, focused && styles.emailInputActive]}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="you@example.com"
        placeholderTextColor={PAYWALL_COLORS.textFaint}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
        editable={editable}
        autoFocus
      />
    </View>
  );
};

export const ErrorText: React.FC<{ message?: string | null; align?: "left" | "center" }> = ({
  message,
  align = "center",
}) =>
  message ? <Text style={[styles.error, { textAlign: align }]}>{message}</Text> : null;

const styles = StyleSheet.create({
  // Height and radius scale together (not verticalScale for one and
  // moderateScale for the other), so short screens don't squash the button
  // into a pill.
  button: {
    height: moderateScale(52),
    borderRadius: moderateScale(12),
    backgroundColor: PAYWALL_COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    // Web only: the modal auto-focuses its first button, and the browser's
    // focus ring would otherwise outline it in black.
    ...(Platform.OS === "web" ? { outlineWidth: 0 } : null),
  },
  buttonBusy: { opacity: 0.7 },
  buttonText: {
    color: PAYWALL_COLORS.onBrand,
    fontSize: moderateScale(16.5),
    fontFamily: AUTH_FONTS.semibold,
  },
  emailBlock: { marginTop: verticalScale(18) },
  emailLabel: {
    fontSize: moderateScale(14),
    fontFamily: AUTH_FONTS.semibold,
    color: PAYWALL_COLORS.text,
  },
  emailHint: {
    fontSize: moderateScale(13),
    lineHeight: moderateScale(19),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.textMuted,
    marginTop: verticalScale(4),
  },
  // Same shape as the button below it; focus shows as the brand border, not
  // the browser's black ring.
  emailInput: {
    height: moderateScale(52),
    borderRadius: moderateScale(12),
    ...(Platform.OS === "web" ? { outlineWidth: 0 } : null),
    backgroundColor: PAYWALL_COLORS.fieldActive,
    borderWidth: 1,
    borderColor: PAYWALL_COLORS.border,
    paddingHorizontal: scale(14),
    marginTop: verticalScale(10),
    fontSize: moderateScale(15),
    fontFamily: AUTH_FONTS.regular,
    color: PAYWALL_COLORS.text,
  },
  emailInputActive: { borderColor: PAYWALL_COLORS.brand },
  error: {
    marginTop: verticalScale(12),
    fontSize: moderateScale(13),
    lineHeight: moderateScale(19),
    fontFamily: AUTH_FONTS.medium,
    color: PAYWALL_COLORS.danger,
  },
});
