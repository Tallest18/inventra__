// app/(Auth)/WelcomeBackScreen.tsx
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthScaffold } from "@/components/auth/AuthScaffold";
import { AUTH_COLORS, AUTH_FONTS } from "@/components/auth/authTheme";
import { PIN_LENGTH, PinPad } from "@/components/auth/PinPad";
import {
  forgotPin,
  maskPhone,
  parseApiError,
  pinLogin,
  saveAuthTokens,
  saveLastPhone,
} from "@/src/api";
import { moderateScale, verticalScale } from "@/utils/scaling";

const WelcomeBackScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    phone: string;
    maskedPhone?: string;
    name?: string;
    avatar?: string;
  }>();

  const phone = params.phone ?? "";
  const maskedPhone = params.maskedPhone || maskPhone(phone);

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (value: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await pinLogin(phone, value);
      await saveAuthTokens(result.tokens);
      await saveLastPhone(phone);

      // Login succeeds even on an expired trial — onboarding_status decides
      // whether the app opens or the paywall does.
      switch (result.user.onboarding_status) {
        case "active":
          router.replace("/(Main)/Home");
          break;
        case "verify_number":
          router.replace({
            pathname: "/(Auth)/BusinessSelectionScreen",
            params: { phone },
          });
          break;
        default:
          router.replace("/(Main)/Home");
      }
    } catch (err: any) {
      setError(parseApiError(err, "Invalid PIN. Please try again.").message);
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pin.length !== PIN_LENGTH || loading) return;
    const timer = setTimeout(() => signIn(pin), 140);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const handleForgotPin = async () => {
    if (sendingOtp) return;
    setSendingOtp(true);
    setError(null);

    try {
      const otp = await forgotPin(phone);
      router.push({
        pathname: "/(Auth)/VerificationScreen",
        params: {
          phone,
          maskedPhone,
          verificationId: otp.verification_id,
          mockCode: otp.code ?? "",
          mode: "reset",
        },
      });
    } catch (err: any) {
      setError(parseApiError(err, "Couldn't send a reset code.").message);
    } finally {
      setSendingOtp(false);
    }
  };

  const subtitle = (
    <Text style={styles.subtitle}>
      Enter your PIN to continue as{" "}
      <Text style={styles.subtitleStrong}>{maskedPhone}</Text>.
    </Text>
  );

  return (
    <AuthScaffold
      avatarUri={params.avatar || null}
      icon="person-outline"
      title="Welcome Back"
      subtitle={subtitle}
      sheetStyle={{ paddingBottom: insets.bottom + verticalScale(16) }}
    >
      <PinPad
        value={pin}
        onChange={(next) => {
          setPin(next);
          if (error) setError(null);
        }}
        label="ENTER PIN"
        error={error}
        disabled={loading}
        footer={
          <TouchableOpacity onPress={handleForgotPin} disabled={sendingOtp}>
            <Text style={styles.link}>
              {sendingOtp ? "Sending code…" : "Forgot PIN?"}
            </Text>
          </TouchableOpacity>
        }
      />
    </AuthScaffold>
  );
};

const styles = StyleSheet.create({
  subtitle: {
    fontSize: moderateScale(14),
    lineHeight: moderateScale(21),
    fontFamily: AUTH_FONTS.regular,
    color: AUTH_COLORS.onBrandMuted,
    marginTop: verticalScale(6),
  },
  subtitleStrong: {
    fontFamily: AUTH_FONTS.bold,
    color: AUTH_COLORS.onBrand,
  },
  link: {
    fontSize: moderateScale(13.5),
    fontFamily: AUTH_FONTS.semibold,
    color: AUTH_COLORS.brand,
  },
});

export default WelcomeBackScreen;
