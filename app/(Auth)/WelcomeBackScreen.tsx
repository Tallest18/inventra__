// app/(Auth)/WelcomeBackScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthScaffold } from "@/components/auth/AuthScaffold";
import { AUTH_COLORS, AUTH_FONTS } from "@/components/auth/authTheme";
import { PIN_LENGTH, PinPad } from "@/components/auth/PinPad";
import { FaceVerificationModal } from "@/components/security/FaceVerificationModal";
import {
  checkPhone,
  clearLastPhone,
  forgotPin,
  getLastPhone,
  maskPhone,
  parseApiError,
  pinLogin,
  saveAuthTokens,
  saveLastPhone,
} from "@/src/api";
import {
  getBiometricType,
  getCachedPin,
  isBiometricsEnabled,
  saveCachedPin,
} from "@/utils/securityStorage";
import { moderateScale, scale, verticalScale } from "@/utils/scaling";

const WelcomeBackScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    phone: string;
    maskedPhone?: string;
    name?: string;
    avatar?: string;
  }>();

  // Opened from the phone screen, the number arrives as a param. Opened after
  // logout or on app start, it comes from the number this device remembers.
  const [phone, setPhone] = useState(params.phone ?? "");
  const [avatar, setAvatar] = useState(params.avatar ?? "");
  const [maskedFromApi, setMaskedFromApi] = useState(params.maskedPhone ?? "");
  const maskedPhone = maskedFromApi || maskPhone(phone);

  useEffect(() => {
    if (params.phone) return;
    let cancelled = false;

    (async () => {
      const saved = await getLastPhone();
      if (!saved) {
        if (!cancelled) router.replace("/(Auth)/WelcomeScreen");
        return;
      }
      if (cancelled) return;
      setPhone(saved);

      try {
        const account = await checkPhone(saved);
        if (cancelled) return;
        // Remembered number no longer has a usable account: start sign-up.
        if (!account.exists || !account.has_pin) {
          await clearLastPhone();
          router.replace("/(Auth)/WelcomeScreen");
          return;
        }
        setAvatar(account.profile_image ?? "");
        if (account.masked_phone) setMaskedFromApi(account.masked_phone);
      } catch {
        // Offline or server hiccup: the PIN pad still works with the saved
        // number, the avatar is just missing.
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<"face" | "fingerprint" | null>(null);
  const [cachedPin, setCachedPin] = useState<string | null>(null);
  const [showFaceModal, setShowFaceModal] = useState(false);

  useEffect(() => {
    (async () => {
      const bio = await isBiometricsEnabled();
      const type = await getBiometricType();
      const saved = await getCachedPin();
      setBiometricEnabled(bio);
      setBiometricType(type);
      setCachedPin(saved);
    })();
  }, []);

  const signIn = async (value: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await pinLogin(phone, value);
      await saveAuthTokens(result.tokens);
      await saveLastPhone(phone);
      await saveCachedPin(value);

      // Login succeeds even on an expired trial  onboarding_status decides
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

  const handleBiometricAuth = async () => {
    if (!cachedPin) return;

    if (biometricType === "face") {
      setShowFaceModal(true);
      return;
    }

    try {
      if (Platform.OS === "web") {
        await signIn(cachedPin);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Sign in with Fingerprint",
        fallbackLabel: "Use PIN",
      });
      if (result.success) {
        await signIn(cachedPin);
      }
    } catch {
      // Fallback to PIN pad
    }
  };

  useEffect(() => {
    if (pin.length !== PIN_LENGTH || loading || !phone) return;
    const timer = setTimeout(() => signIn(pin), 140);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const handleForgotPin = async () => {
    if (sendingOtp || !phone) return;
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
      avatarUri={avatar || null}
      icon="person-outline"
      title="Welcome Back"
      // Back always means "use a different number". router.back() could land
      // on a signed-in screen still in the stack from before logout.
      onBack={() => router.replace("/(Auth)/WelcomeScreen")}
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
          <View style={styles.footerCol}>
            {biometricEnabled && cachedPin && (
              <TouchableOpacity
                style={styles.biometricBtn}
                onPress={handleBiometricAuth}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={biometricType === "face" ? "scan-outline" : "finger-print-outline"}
                  size={moderateScale(20)}
                  color={AUTH_COLORS.brand}
                />
                <Text style={styles.biometricText}>
                  {biometricType === "face" ? "Log in with Face ID" : "Log in with Fingerprint"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleForgotPin} disabled={sendingOtp}>
              <Text style={styles.link}>
                {sendingOtp ? "Sending code…" : "Forgot PIN?"}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <FaceVerificationModal
        visible={showFaceModal}
        onClose={() => setShowFaceModal(false)}
        onSuccess={() => {
          setShowFaceModal(false);
          if (cachedPin) {
            signIn(cachedPin);
          }
        }}
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
  footerCol: {
    alignItems: "center",
    gap: verticalScale(14),
  },
  biometricBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
    backgroundColor: "#EEF4FF",
  },
  biometricText: {
    fontSize: moderateScale(14),
    fontFamily: AUTH_FONTS.semibold,
    color: AUTH_COLORS.brand,
  },
});

export default WelcomeBackScreen;
