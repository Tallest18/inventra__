// app/(Auth)/CreatePinScreen.tsx
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthScaffold } from "@/components/auth/AuthScaffold";
import { AUTH_COLORS, AUTH_FONTS } from "@/components/auth/authTheme";
import { PIN_LENGTH, PinPad } from "@/components/auth/PinPad";
import {
  completeRegistration,
  parseApiError,
  resetPin,
  saveAuthTokens,
  saveLastPhone,
} from "@/src/api";
import { moderateScale, verticalScale } from "@/utils/scaling";

type PinMode = "create" | "reset";
type Stage = "enter" | "confirm";

const CreatePinScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    mode?: PinMode;
    businessType?: string;
    verificationId?: string;
    phone?: string;
  }>();

  const mode: PinMode = params.mode === "reset" ? "reset" : "create";

  const [stage, setStage] = useState<Stage>("enter");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = stage === "enter" ? pin : confirm;
  const setValue = stage === "enter" ? setPin : setConfirm;

  const startOver = () => {
    setPin("");
    setConfirm("");
    setStage("enter");
    setError(null);
  };

  const submit = async (finalPin: string) => {
    setSubmitting(true);
    setError(null);

    try {
      if (mode === "reset") {
        const result = await resetPin({
          pin: finalPin,
          confirm_pin: finalPin,
          // Present for the forgot-PIN path; when absent the Bearer token from
          // verify-otp authorises the reset instead.
          ...(params.verificationId
            ? { verification_id: params.verificationId }
            : {}),
        });
        await saveAuthTokens(result.tokens);
        if (params.phone) await saveLastPhone(params.phone);

        router.replace("/(Main)/Home");
        return;
      }

      await completeRegistration({
        business_type: params.businessType ?? "",
        pin: finalPin,
        confirm_pin: finalPin,
      });
      if (params.phone) await saveLastPhone(params.phone);

      // complete-registration issues no tokens  the ones from verify-otp hold.
      // The trial offer is presented on the dashboard, where the user actually
      // lands, rather than lingering on a screen they have finished with.
      router.replace("/(Main)/Home");
    } catch (err: any) {
      const info = parseApiError(err, "We couldn't save your PIN.");
      setError(
        info.fields.pin ??
          info.fields.confirm_pin ??
          info.fields.business_type ??
          info.message,
      );
      setPin("");
      setConfirm("");
      setStage("enter");
    } finally {
      setSubmitting(false);
    }
  };

  // Advance as soon as the fourth digit lands  the design has no submit button.
  useEffect(() => {
    if (submitting) return;

    if (stage === "enter" && pin.length === PIN_LENGTH) {
      const timer = setTimeout(() => {
        setStage("confirm");
        setError(null);
      }, 140);
      return () => clearTimeout(timer);
    }

    if (stage === "confirm" && confirm.length === PIN_LENGTH) {
      if (confirm !== pin) {
        setError("Those PINs don't match. Let's try again.");
        setPin("");
        setConfirm("");
        setStage("enter");
        return;
      }
      const timer = setTimeout(() => submit(confirm), 140);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, confirm, stage, submitting]);

  const handleBack = () => {
    if (stage === "confirm") {
      setConfirm("");
      setStage("enter");
      setError(null);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace("/(Auth)/WelcomeScreen");
  };

  const title = mode === "reset" ? "Reset Your PIN" : "Create Your PIN";
  const subtitle =
    stage === "confirm"
      ? "Enter your PIN again to confirm it."
      : mode === "reset"
        ? "Choose a new 4-digit PIN for signing in to Inventra."
        : "Create a 4-digit PIN that you'll use to sign in to Inventra. You'll only need your PIN for future logins.";

  return (
    <AuthScaffold
      icon="lock-closed-outline"
      title={title}
      subtitle={subtitle}
      onBack={handleBack}
      sheetStyle={{ paddingBottom: insets.bottom + verticalScale(16) }}
    >
      <PinPad
        value={value}
        onChange={(next) => {
          setValue(next);
          if (error) setError(null);
        }}
        label={stage === "confirm" ? "CONFIRM PIN" : "ENTER PIN"}
        progress={{ step: stage === "confirm" ? 2 : 1, total: 2 }}
        error={error}
        disabled={submitting}
        footer={
          stage === "confirm" ? (
            <TouchableOpacity onPress={startOver} disabled={submitting}>
              <Text style={styles.link}>Start over</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </AuthScaffold>
  );
};

const styles = StyleSheet.create({
  link: {
    fontSize: moderateScale(13.5),
    fontFamily: AUTH_FONTS.semibold,
    color: AUTH_COLORS.brand,
  },
});

export default CreatePinScreen;
