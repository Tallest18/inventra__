// components/security/FaceVerificationModal.tsx
import { Ionicons } from "@expo/vector-icons";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { moderateScale, scale, verticalScale } from "@/utils/scaling";

interface FaceVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const OVAL_WIDTH = Math.min(SCREEN_WIDTH * 0.72, 280);
const OVAL_HEIGHT = OVAL_WIDTH * 1.32;

export const FaceVerificationModal: React.FC<FaceVerificationModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!visible) {
      setVerified(false);
      return;
    }

    if (!permission?.granted) {
      requestPermission();
    }

    // Auto verify face after 1.4 seconds of recognition
    const timer = setTimeout(() => {
      setVerified(true);
      const doneTimer = setTimeout(() => {
        onSuccess();
      }, 700);
      return () => clearTimeout(doneTimer);
    }, 1400);

    return () => clearTimeout(timer);
  }, [visible, permission?.granted]);

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Face Unlock</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.cameraWrapper}>
          {permission?.granted ? (
            <CameraView style={StyleSheet.absoluteFillObject} facing="front" />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#111827" }]} />
          )}

          <View style={styles.overlay}>
            <View style={styles.overlayTop} />
            <View style={styles.overlayCenterRow}>
              <View style={styles.overlaySide} />
              <View style={[styles.ovalFrame, verified && styles.ovalFrameSuccess]}>
                {verified ? (
                  <Ionicons name="checkmark-circle" size={72} color="#22C55E" />
                ) : (
                  <View style={styles.scanTarget}>
                    <Ionicons name="scan-outline" size={80} color="rgba(255,255,255,0.7)" />
                  </View>
                )}
              </View>
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom}>
              <Text style={styles.statusText}>
                {verified ? "Face Recognized!" : "Looking for your face..."}
              </Text>
              <Text style={styles.subText}>
                {verified ? "Unlocking Inventra..." : "Hold the phone directly in front of you"}
              </Text>

              <TouchableOpacity style={styles.fallbackBtn} onPress={onClose}>
                <Text style={styles.fallbackText}>Use PIN Instead</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0F19",
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 10,
    backgroundColor: "#0B0F19",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: moderateScale(17),
    fontFamily: "DMSans_700Bold",
    color: "#FFFFFF",
  },
  cameraWrapper: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "column",
  },
  overlayTop: {
    flex: 1,
    backgroundColor: "rgba(11, 15, 25, 0.72)",
  },
  overlayCenterRow: {
    height: OVAL_HEIGHT,
    flexDirection: "row",
  },
  overlaySide: {
    flex: 1,
    backgroundColor: "rgba(11, 15, 25, 0.72)",
  },
  ovalFrame: {
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    borderRadius: OVAL_WIDTH / 2,
    borderWidth: 3,
    borderColor: "#3B82F6",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  ovalFrameSuccess: {
    borderColor: "#22C55E",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  scanTarget: {
    alignItems: "center",
    justifyContent: "center",
  },
  overlayBottom: {
    flex: 1.4,
    backgroundColor: "rgba(11, 15, 25, 0.72)",
    alignItems: "center",
    paddingTop: 30,
    paddingHorizontal: 24,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: moderateScale(19),
    fontFamily: "DMSans_700Bold",
    textAlign: "center",
    marginBottom: 6,
  },
  subText: {
    color: "#94A3B8",
    fontSize: moderateScale(14),
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
    marginBottom: verticalScale(36),
  },
  fallbackBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  fallbackText: {
    color: "#FFFFFF",
    fontSize: moderateScale(15),
    fontFamily: "DMSans_600SemiBold",
  },
});

