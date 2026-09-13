// app/(Auth)/VerificationScreen.tsx
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthButton } from "@/components/auth/AuthButton";
import { AuthScaffold } from "@/components/auth/AuthScaffold";
import { AUTH_COLORS, AUTH_FONTS } from "@/components/auth/authTheme";
import {
  parseApiError,
  resendOtp,
  saveAuthTokens,
  verifyOtp,
} from "@/src/api";
import { moderateScale, scale, verticalScale } from "@/utils/scaling";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

/**
 * `register` — new account or an account that never finished onboarding.
 * `reset`    — forgot-PIN, so the verified session is carried to reset-pin.
 */
type VerificationMode = "register" | "reset";

const VerificationScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    phone: string;
    maskedPhone: string;
    verificationId: string;
    mode?: VerificationMode;
  }>();

  const phone = params.phone ?? "";
  const maskedPhone = params.maskedPhone ?? phone;
  const mode: VerificationMode = params.mode === "reset" ? "reset" : "register";

  const [verificationId, setVerificationId] = useState(
    params.verificationId ?? "",
  );
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [error, setError] = useState<string | null>(null);

  const inputs = useRef<(TextInput | null)[]>([]);
  const code = digits.join("");

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleChange = (value: string, index: number) => {
    const clean = value.replace(/\D/g, "");
    if (error) setError(null);

    // Pasting the whole code lands in one box — spread it across the row.
    if (clean.length > 1) {
      const next = Array(CODE_LENGTH).fill("");
      clean
        .slice(0, CODE_LENGTH)
        .split("")
        .forEach((digit, i) => {
          next[i] = digit;
        });
      setDigits(next);
      inputs.current[Math.min(clean.length, CODE_LENGTH - 1)]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < CODE_LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key !== "Backspace") return;
    if (digits[index]) return; // the change handler already clears it
    if (index > 0) {
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (code.length !== CODE_LENGTH || loading || !verificationId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await verifyOtp(verificationId, code);
      await saveAuthTokens(result.tokens);

      if (mode === "reset") {
        // verify-otp signs us in, but the PIN still has to be replaced.
        router.replace({
          pathname: "/(Auth)/CreatePinScreen",
          params: { mode: "reset", verificationId, phone },
        });
        return;
      }

      if (result.needs_onboarding) {
        router.replace({
          pathname: "/(Auth)/BusinessSelectionScreen",
          params: { phone },
        });
        return;
      }

      // Already onboarded (re-verified an existing account).
      router.replace("/(Main)/Home");
    } catch (err: any) {
      setError(parseApiError(err, "Invalid code. Please try again.").message);
      setDigits(Array(CODE_LENGTH).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || resending || !verificationId) return;

    setResending(true);
    setError(null);

    try {
      const result = await resendOtp(verificationId);
      // The old id is burned by the resend — everything from here uses the new one.
      setVerificationId(result.verification_id);
      setDigits(Array(CODE_LENGTH).fill(""));
      setSecondsLeft(RESEND_SECONDS);
      inputs.current[0]?.focus();
    } catch (err: any) {
      setError(parseApiError(err, "Couldn't resend the code.").message);
    } finally {
      setResending(false);
    }
  };

  const timer = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <AuthScaffold
      icon="chatbubble-outline"
      title="Verify your number"
      subtitle={`Enter the 6-digit code sent to ${maskedPhone}.`}
      sheetStyle={{ paddingHorizontal: 0 }}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + verticalScale(24) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.caption}>
          Code sent to <Text style={styles.captionStrong}>{maskedPhone}</Text> ·
          Type in the code sent to your inbox.
        </Text>

        <View style={styles.codeRow}>
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputs.current[index] = ref;
              }}
              style={[
                styles.codeBox,
                !!digit && styles.codeBoxFilled,
                !!error && styles.codeBoxError,
              ]}
              value={digit}
              onChangeText={(value) => handleChange(value, index)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(nativeEvent.key, index)
              }
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              selectTextOnFocus
              editable={!loading}
              autoFocus={index === 0}
              textAlign="center"
            />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.resend}
          onPress={handleResend}
          disabled={secondsLeft > 0 || resending}
          activeOpacity={0.7}
        >
          {resending ? (
            <Text style={styles.resendText}>Sending a new code…</Text>
          ) : secondsLeft > 0 ? (
            <Text style={styles.resendText}>
              Resend code in <Text style={styles.resendTimer}>{timer}</Text>
            </Text>
          ) : (
            <Text style={[styles.resendText, styles.resendActive]}>
              Resend code
            </Text>
          )}
        </TouchableOpacity>

        <AuthButton
          label="Verify Code"
          onPress={handleVerify}
          loading={loading}
          disabled={code.length !== CODE_LENGTH}
        />
      </ScrollView>
    </AuthScaffold>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(4),
    flexGrow: 1,
  },
  caption: {
    fontSize: moderateScale(13),
    lineHeight: moderateScale(20),
    fontFamily: AUTH_FONTS.regular,
    color: AUTH_COLORS.textMuted,
  },
  captionStrong: {
    fontFamily: AUTH_FONTS.bold,
    color: AUTH_COLORS.text,
  },
  codeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: verticalScale(22),
  },
  codeBox: {
    width: "14.5%",
    height: verticalScale(54),
    borderRadius: moderateScale(12),
    backgroundColor: AUTH_COLORS.field,
    borderWidth: 1.5,
    borderColor: "transparent",
    fontSize: moderateScale(20),
    fontFamily: AUTH_FONTS.bold,
    color: AUTH_COLORS.text,
    padding: 0,
    // Android ignores the textAlign *prop* on a TextInput often enough that the
    // digits render flush left; setting it in the style is what actually sticks,
    // and includeFontPadding is what centres them vertically.
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
  codeBoxFilled: {
    backgroundColor: AUTH_COLORS.fieldActive,
    borderColor: AUTH_COLORS.brand,
  },
  codeBoxError: { borderColor: AUTH_COLORS.danger },
  error: {
    marginTop: verticalScale(12),
    textAlign: "center",
    fontSize: moderateScale(12.5),
    lineHeight: moderateScale(18),
    fontFamily: AUTH_FONTS.medium,
    color: AUTH_COLORS.danger,
  },
  resend: {
    alignSelf: "center",
    paddingVertical: verticalScale(16),
  },
  resendText: {
    fontSize: moderateScale(13.5),
    fontFamily: AUTH_FONTS.regular,
    color: AUTH_COLORS.textMuted,
  },
  resendTimer: {
    color: AUTH_COLORS.brand,
    fontFamily: AUTH_FONTS.bold,
  },
  resendActive: {
    color: AUTH_COLORS.brand,
    fontFamily: AUTH_FONTS.semibold,
  },
});

export default VerificationScreen;
