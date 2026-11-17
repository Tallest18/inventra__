// components/security/BiometricSetupModal.tsx
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  BiometricType,
  setBiometricsEnabled,
  setBiometricType,
  setEnrolledFaceUri,
} from "@/utils/securityStorage";
import { moderateScale, scale, verticalScale } from "@/utils/scaling";
import { FaceCaptureModal } from "./FaceCaptureModal";

interface BiometricSetupModalProps {
  visible: boolean;
  activeType: BiometricType | null;
  isEnabled: boolean;
  onClose: () => void;
  onConfigured: (type: BiometricType) => void;
}

export const BiometricSetupModal: React.FC<BiometricSetupModalProps> = ({
  visible,
  activeType,
  isEnabled,
  onClose,
  onConfigured,
}) => {
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [authenticatingFingerprint, setAuthenticatingFingerprint] = useState(false);

  const handleSelectFingerprint = async () => {
    setAuthenticatingFingerprint(true);

    try {
      if (Platform.OS === "web") {
        await setBiometricType("fingerprint");
        await setBiometricsEnabled(true);
        setAuthenticatingFingerprint(false);
        onConfigured("fingerprint");
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        Alert.alert(
          "Fingerprint Not Supported",
          "Your device doesn't have a supported biometric scanner. You can use Face Recognition instead.",
          [{ text: "OK" }]
        );
        setAuthenticatingFingerprint(false);
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        Alert.alert(
          "No Fingerprints Enrolled",
          "Please register a fingerprint in your device Settings first, or choose Face Recognition.",
          [{ text: "OK" }]
        );
        setAuthenticatingFingerprint(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate fingerprint to enable biometric login",
        fallbackLabel: "Use PIN",
      });

      if (result.success) {
        await setBiometricType("fingerprint");
        await setBiometricsEnabled(true);
        onConfigured("fingerprint");
      }
    } catch (err: any) {
      Alert.alert("Authentication Failed", err?.message ?? "Could not verify fingerprint.");
    } finally {
      setAuthenticatingFingerprint(false);
    }
  };

  const handleFaceSuccess = async (uri: string) => {
    setShowFaceModal(false);
    await setEnrolledFaceUri(uri);
    await setBiometricType("face");
    await setBiometricsEnabled(true);
    onConfigured("face");
  };

  return (
    <>
      <BottomSheet visible={visible && !showFaceModal} title="Choose Biometric Login" onClose={onClose}>
        <View style={styles.sheetBody}>
          <Text style={styles.sheetSubtitle}>
            Select your preferred biometric method to quickly and securely unlock Inventra.
          </Text>

          {/* Face Recognition Option */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              isEnabled && activeType === "face" && styles.optionCardActive,
            ]}
            onPress={() => setShowFaceModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: "#EEF2FF" }]}>
              <Ionicons name="scan-outline" size={26} color="#4F46E5" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Face Recognition</Text>
              <Text style={styles.optionDesc}>Capture and recognize your face</Text>
            </View>
            {isEnabled && activeType === "face" ? (
              <View style={styles.activePill}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <Text style={styles.activePillText}>Active</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>

          {/* Fingerprint Option */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              isEnabled && activeType === "fingerprint" && styles.optionCardActive,
            ]}
            onPress={handleSelectFingerprint}
            disabled={authenticatingFingerprint}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: "#FAF5FF" }]}>
              <Ionicons name="finger-print-outline" size={26} color="#9333EA" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Fingerprint Scanner</Text>
              <Text style={styles.optionDesc}>Use your phone's fingerprint sensor</Text>
            </View>
            {authenticatingFingerprint ? (
              <ActivityIndicator size="small" color="#9333EA" />
            ) : isEnabled && activeType === "fingerprint" ? (
              <View style={styles.activePill}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <Text style={styles.activePillText}>Active</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>
        </View>
      </BottomSheet>

      <FaceCaptureModal
        visible={showFaceModal}
        onClose={() => setShowFaceModal(false)}
        onSuccess={handleFaceSuccess}
      />
    </>
  );
};

const styles = StyleSheet.create({
  sheetBody: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sheetSubtitle: {
    fontSize: moderateScale(13.5),
    fontFamily: "DMSans_400Regular",
    color: "#64748B",
    marginBottom: 20,
    lineHeight: 20,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  optionCardActive: {
    borderColor: "#1155CC",
    backgroundColor: "#F0F6FF",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: moderateScale(15),
    fontFamily: "DMSans_600SemiBold",
    color: "#0F172A",
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: moderateScale(12.5),
    fontFamily: "DMSans_400Regular",
    color: "#64748B",
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activePillText: {
    fontSize: moderateScale(12),
    fontFamily: "DMSans_600SemiBold",
    color: "#16A34A",
  },
});

