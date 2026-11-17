// app/(Auth)/WelcomeScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthButton } from "@/components/auth/AuthButton";
import {
  AUTH_COLORS,
  AUTH_FONTS,
  AUTH_METRICS,
} from "@/components/auth/authTheme";
import {
  checkPhone,
  forgotPin,
  maskPhone,
  normalizePhone,
  parseApiError,
  registerNumber,
  saveLastPhone,
} from "@/src/api";
import { moderateScale, scale, verticalScale } from "@/utils/scaling";

/** 8012345678 -> "0801 234 5678", the grouping the design shows. */
const formatLocal = (digits: string): string => {
  const d = digits.slice(0, 11);
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
};

const WelcomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const digits = phone.replace(/\D/g, "");
  // Local numbers are 11 digits with the leading 0, 10 without it.
  const isValid = digits.length >= 10 && digits.length <= 11;

  const handleChange = (text: string) => {
    setPhone(formatLocal(text.replace(/\D/g, "")));
    if (error) setError(null);
  };

  const handleContinue = async () => {
    if (!isValid || loading) return;

    const fullPhone = normalizePhone(digits);
    setLoading(true);
    setError(null);

    try {
      // Step 1: register-number sends the OTP. Its 409 doubles as the signal
      // that this number already has an account, so it is the only call the
      // happy path needs.
      const otp = await registerNumber(fullPhone);

      router.push({
        pathname: "/(Auth)/VerificationScreen",
        params: {
          phone: fullPhone,
          maskedPhone: maskPhone(fullPhone),
          verificationId: otp.verification_id,
          mode: "register",
        },
      });
    } catch (err: any) {
      const info = parseApiError(
        err,
        "We couldn't reach Inventra. Please try again.",
      );

      if (info.code !== "account_exists") {
        setError(info.message);
        return;
      }

      // The number is already registered. check-phone says whether onboarding
      // ever finished, and supplies the name and avatar the Welcome Back
      // screen shows.
      try {
        const account = await checkPhone(fullPhone);
        await saveLastPhone(fullPhone);
        const masked = account.masked_phone || maskPhone(fullPhone);

        if (account.has_pin) {
          router.push({
            pathname: "/(Auth)/WelcomeBackScreen",
            params: {
              phone: fullPhone,
              maskedPhone: masked,
              name: account.name ?? "",
              avatar: account.profile_image ?? "",
            },
          });
          return;
        }

        // Verified the number once but quit before setting a PIN. register-number
        // will keep returning 409, so forgot-pin is the only route to a fresh
        // OTP  then business type and PIN as normal.
        const otp = await forgotPin(fullPhone);
        router.push({
          pathname: "/(Auth)/VerificationScreen",
          params: {
            phone: fullPhone,
            maskedPhone: masked,
            verificationId: otp.verification_id,
            mode: "register",
          },
        });
      } catch (recoveryError: any) {
        setError(
          parseApiError(recoveryError, "We couldn't reach Inventra.").message,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={AUTH_COLORS.brand} />

      <View style={[styles.header, { paddingTop: insets.top + verticalScale(40) }]}>
        <Text style={styles.hello}>Hello</Text>
        <Text style={styles.welcome}>Welcome to inventra</Text>
        <Text style={styles.tagline}>
          No more paper book, your stock is safe here
        </Text>
      </View>

      <View style={styles.sheet}>
        <ScrollView
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: insets.bottom + verticalScale(24) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Enter your phone number</Text>
          <Text style={styles.description}>
            We&apos;ll check if you have an account. No spam, we promise.
          </Text>

          <Text style={styles.fieldLabel}>PHONE NUMBER</Text>

          <TouchableOpacity
            activeOpacity={1}
            // Without these, react-native-web renders this wrapper as a
            // focusable <div tabindex="0"> around the <input> and intercepts
            // pointer/focus handling. Native tap-to-focus still works.
            accessible={false}
            focusable={false}
            onPress={() => inputRef.current?.focus()}
            style={[
              styles.field,
              !!error && styles.fieldError,
              loading && styles.fieldDisabled,
            ]}
          >
            {/* Drawn rather than the 🇳🇬 emoji: Windows has no flag emoji
                glyphs and renders it as the letters "NG". */}
            <View style={styles.flag}>
              <View style={styles.flagGreen} />
              <View style={styles.flagWhite} />
              <View style={styles.flagGreen} />
            </View>
            <Text style={styles.dialCode}>+234</Text>
            <View style={styles.divider} />
            <Ionicons
              name="call-outline"
              size={moderateScale(16)}
              color={AUTH_COLORS.textFaint}
            />
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="0801 234 5678"
              placeholderTextColor={AUTH_COLORS.textFaint}
              value={phone}
              onChangeText={handleChange}
              keyboardType="phone-pad"
              maxLength={13}
              autoComplete="tel"
              textContentType="telephoneNumber"
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </TouchableOpacity>

          <Text style={[styles.hint, !!error && styles.hintError]}>
            {error ?? "New users will receive an OTP to verify their number."}
          </Text>

          <AuthButton
            label="Continue"
            withArrow
            onPress={handleContinue}
            loading={loading}
            disabled={!isValid}
          />

          <Text style={styles.terms}>
            By continuing, you agree to Inventra&apos;s{" "}
            <Text
              style={styles.link}
              onPress={() => router.push("/(Routes)/PrivacyPolicy")}
            >
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text
              style={styles.link}
              onPress={() => router.push("/(Routes)/PrivacyPolicy")}
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AUTH_COLORS.brand },
  header: {
    paddingHorizontal: AUTH_METRICS.gutter,
    paddingBottom: verticalScale(28),
    alignItems: "center",
  },
  hello: {
    fontSize: moderateScale(44),
    lineHeight: moderateScale(52),
    fontFamily: AUTH_FONTS.bold,
    color: AUTH_COLORS.onBrand,
  },
  welcome: {
    fontSize: moderateScale(20),
    fontFamily: AUTH_FONTS.bold,
    color: AUTH_COLORS.onBrand,
    marginTop: verticalScale(6),
  },
  tagline: {
    fontSize: moderateScale(13),
    fontFamily: AUTH_FONTS.regular,
    color: AUTH_COLORS.onBrandMuted,
    marginTop: verticalScale(6),
    textAlign: "center",
  },
  sheet: {
    flex: 1,
    backgroundColor: AUTH_COLORS.sheet,
    borderTopLeftRadius: AUTH_METRICS.sheetRadius,
    borderTopRightRadius: AUTH_METRICS.sheetRadius,
  },
  sheetContent: {
    paddingHorizontal: AUTH_METRICS.gutter,
    paddingTop: verticalScale(26),
    flexGrow: 1,
  },
  title: {
    fontSize: moderateScale(19),
    fontFamily: AUTH_FONTS.bold,
    color: AUTH_COLORS.text,
  },
  description: {
    fontSize: moderateScale(13.5),
    lineHeight: moderateScale(20),
    fontFamily: AUTH_FONTS.regular,
    color: AUTH_COLORS.textMuted,
    marginTop: verticalScale(6),
  },
  fieldLabel: {
    fontSize: moderateScale(11),
    letterSpacing: 0.8,
    fontFamily: AUTH_FONTS.medium,
    color: AUTH_COLORS.textMuted,
    marginTop: verticalScale(22),
    marginBottom: verticalScale(8),
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    height: AUTH_METRICS.fieldHeight,
    borderRadius: AUTH_METRICS.fieldRadius,
    backgroundColor: AUTH_COLORS.field,
    paddingHorizontal: scale(14),
    borderWidth: 1,
    borderColor: "transparent",
  },
  fieldError: { borderColor: AUTH_COLORS.danger },
  fieldDisabled: { opacity: 0.6 },
  flag: {
    flexDirection: "row",
    width: moderateScale(18),
    height: moderateScale(12),
    borderRadius: 2,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AUTH_COLORS.border,
  },
  flagGreen: { flex: 1, backgroundColor: "#008751" },
  flagWhite: { flex: 1, backgroundColor: "#FFFFFF" },
  dialCode: {
    fontSize: moderateScale(15),
    fontFamily: AUTH_FONTS.semibold,
    color: AUTH_COLORS.text,
    marginLeft: scale(10),
  },
  divider: {
    width: 1,
    height: "45%",
    backgroundColor: AUTH_COLORS.border,
    marginHorizontal: scale(12),
  },
  input: {
    flex: 1,
    height: "100%",
    marginLeft: scale(8),
    fontSize: moderateScale(15),
    fontFamily: AUTH_FONTS.regular,
    color: AUTH_COLORS.text,
  },
  hint: {
    fontSize: moderateScale(12),
    lineHeight: moderateScale(17),
    fontFamily: AUTH_FONTS.regular,
    color: AUTH_COLORS.textMuted,
    marginTop: verticalScale(10),
    marginBottom: verticalScale(20),
  },
  hintError: { color: AUTH_COLORS.danger, fontFamily: AUTH_FONTS.medium },
  terms: {
    fontSize: moderateScale(11.5),
    lineHeight: moderateScale(17),
    fontFamily: AUTH_FONTS.regular,
    color: AUTH_COLORS.textMuted,
    textAlign: "center",
    marginTop: verticalScale(16),
  },
  link: { color: AUTH_COLORS.brand, fontFamily: AUTH_FONTS.semibold },
});

export default WelcomeScreen;
