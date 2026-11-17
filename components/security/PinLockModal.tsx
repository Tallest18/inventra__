// components/security/PinLockModal.tsx
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { PinPad } from "@/components/auth/PinPad";
import { clearTokens, getLastPhone, pinLogin } from "@/src/api";
import {
  getBiometricType,
  getCachedPin,
  isBiometricsEnabled,
  saveCachedPin,
} from "@/utils/securityStorage";
import { moderateScale, scale, verticalScale } from "@/utils/scaling";
import { FaceVerificationModal } from "./FaceVerificationModal";

interface PinLockModalProps {
  visible: boolean;
  onUnlock: () => void;
}

const PIN_LENGTH = 4;

export const PinLockModal: React.FC<PinLockModalProps> = ({ visible, onUnlock }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<"face" | "fingerprint" | null>(null);
  const [showFaceModal, setShowFaceModal] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPin("");
      setError(null);
      setVerifying(false);
      return;
    }

    let isMounted = true;
    (async () => {
      const enabled = await isBiometricsEnabled();
      const type = await getBiometricType();
      if (!isMounted) return;
      setBiometricEnabled(enabled);
      setBiometricType(type);

      // Auto-trigger fingerprint prompt if fingerprint is the chosen biometric
      if (enabled && type === "fingerprint" && Platform.OS !== "web") {
        try {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: "Unlock Inventra",
            fallbackLabel: "Use PIN",
          });
          if (result.success && isMounted) {
            onUnlock();
          }
        } catch {
          // Fall back gracefully to PIN pad
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [visible, onUnlock]);

  const verifyPin = async (inputPin: string) => {
    setVerifying(true);
    setError(null);

    try {
      // 1. Try local cached PIN first for fast offline unlock
      const cached = await getCachedPin();
      if (cached && cached === inputPin) {
        setVerifying(false);
        setPin("");
        onUnlock();
        return;
      }

      // 2. Fall back to backend verification
      const phone = await getLastPhone();
      if (phone) {
        const res = await pinLogin(phone, inputPin);
        if (res?.tokens) {
          await saveCachedPin(inputPin);
          setVerifying(false);
          setPin("");
          onUnlock();
          return;
        }
      }

      // If we had a cached PIN and input didn't match
      if (cached && cached !== inputPin) {
        throw new Error("Incorrect PIN");
      }

      throw new Error("Invalid PIN. Please try again.");
    } catch {
      setError("Incorrect PIN. Please try again.");
      setPin("");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (pin.length === PIN_LENGTH && !verifying) {
      const timer = setTimeout(() => {
        verifyPin(pin);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pin]);

  const handleFingerprintPress = async () => {
    try {
      if (Platform.OS === "web") {
        onUnlock();
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Inventra",
        fallbackLabel: "Use PIN",
      });
      if (result.success) {
        onUnlock();
      }
    } catch {
      // Ignore
    }
  };

  const handleSignOut = async () => {
    await clearTokens();
    onUnlock();
    router.replace("/(Auth)/WelcomeScreen");
  };

  return (
    <>
      <Modal visible={visible && !showFaceModal} animationType="fade" transparent={false}>
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            {/* Lock Header */}
            <View style={styles.headerBox}>
              <View style={styles.iconCircle}>
                <Ionicons name="lock-closed" size={32} color="#1155CC" />
              </View>
              <Text style={styles.title}>App Locked</Text>
              <Text style={styles.subtitle}>Enter your 4-digit PIN to continue</Text>
            </View>

            {/* PIN Pad */}
            <View style={styles.pinPadContainer}>
              <PinPad
                value={pin}
                onChange={(next) => {
                  setPin(next);
                  if (error) setError(null);
                }}
                label=""
                error={error}
                disabled={verifying}
              />
            </View>

            {/* Biometric Unlock Action */}
            {biometricEnabled && (
              <View style={styles.biometricRow}>
                {biometricType === "face" ? (
                  <TouchableOpacity
                    style={styles.biometricBtn}
                    onPress={() => setShowFaceModal(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="scan-outline" size={22} color="#1155CC" />
                    <Text style={styles.biometricBtnText}>Unlock with Face</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.biometricBtn}
                    onPress={handleFingerprintPress}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="finger-print-outline" size={22} color="#1155CC" />
                    <Text style={styles.biometricBtnText}>Unlock with Fingerprint</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
              <TouchableOpacity onPress={handleSignOut}>
                <Text style={styles.signOutText}>Forgot PIN? Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <FaceVerificationModal
        visible={visible && showFaceModal}
        onClose={() => setShowFaceModal(false)}
        onSuccess={() => {
          setShowFaceModal(false);
          onUnlock();
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: verticalScale(24),
  },
  headerBox: {
    alignItems: "center",
    marginTop: verticalScale(16),
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: moderateScale(22),
    fontFamily: "DMSans_700Bold",
    color: "#0F172A",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: moderateScale(14),
    fontFamily: "DMSans_400Regular",
    color: "#64748B",
  },
  pinPadContainer: {
    width: "100%",
    alignItems: "center",
  },
  biometricRow: {
    marginTop: 8,
    marginBottom: 12,
  },
  biometricBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#EEF4FF",
  },
  biometricBtnText: {
    color: "#1155CC",
    fontSize: moderateScale(14),
    fontFamily: "DMSans_600SemiBold",
  },
  bottomActions: {
    alignItems: "center",
    marginBottom: verticalScale(10),
  },
  signOutText: {
    color: "#64748B",
    fontSize: moderateScale(13.5),
    fontFamily: "DMSans_500Medium",
  },
});

