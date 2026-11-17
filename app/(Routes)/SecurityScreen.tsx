// app/(Routes)/SecurityScreen.tsx: "Security · Protect your account" (Figma).
// Opened from Settings → App Lock.
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { BiometricSetupModal } from "@/components/security/BiometricSetupModal";
import {
  BLUE,
  Card,
  InfoNote,
  PAGE_BG,
  Row,
  ScreenHeader,
  SectionLabel,
} from "@/components/settings/SettingsUI";
import { BottomSheet } from "@/components/ui/BottomSheet";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/useToast";
import {
  changePin,
  clearTokens,
  endAllSessions,
  parseApiError,
  signedOutRoute,
} from "@/src/api";
import {
  BiometricType,
  getBiometricType,
  isBiometricsEnabled,
  isPinLockEnabled,
  onSecuritySettingsChanged,
  saveCachedPin,
  setBiometricsEnabled,
  setPinLockEnabled,
} from "@/utils/securityStorage";

const PIN_LENGTH = 4;

const SecurityScreen = () => {
  const { showToast, toastElement } = useToast();
  const [pinSheet, setPinSheet] = useState(false);
  const [biometricSheet, setBiometricSheet] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);

  const [pinEnabled, setPinEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricTypeState] = useState<BiometricType | null>(null);

  const loadSecuritySettings = async () => {
    const pin = await isPinLockEnabled();
    const bio = await isBiometricsEnabled();
    const type = await getBiometricType();
    setPinEnabled(pin);
    setBiometricEnabled(bio);
    setBiometricTypeState(type);
  };

  useEffect(() => {
    loadSecuritySettings();
    const unsubscribe = onSecuritySettingsChanged(() => {
      loadSecuritySettings();
    });
    return unsubscribe;
  }, []);

  const handleTogglePin = async (val: boolean) => {
    setPinEnabled(val);
    await setPinLockEnabled(val);
    showToast(val ? "PIN protection enabled" : "PIN protection disabled", val ? "success" : "warning");
  };

  const handleToggleBiometric = async (val: boolean) => {
    if (val) {
      setBiometricSheet(true);
    } else {
      setBiometricEnabled(false);
      await setBiometricsEnabled(false);
      showToast("Biometric login disabled", "warning");
    }
  };

  const handleBiometricConfigured = (type: BiometricType) => {
    setBiometricSheet(false);
    setBiometricEnabled(true);
    setBiometricTypeState(type);
    showToast(
      type === "face" ? "Face Recognition enabled" : "Fingerprint login enabled",
      "success"
    );
  };

  const handleEndAll = async () => {
    setEnding(true);
    try {
      await endAllSessions();
    } catch (error) {
      setEnding(false);
      setConfirmEnd(false);
      showToast(parseApiError(error, "Couldn't end sessions. Try again.").message, "error");
      return;
    }
    await clearTokens();
    setConfirmEnd(false);
    router.replace(await signedOutRoute());
  };

  const isSecured = pinEnabled || biometricEnabled;
  const bannerSubtitle = isSecured
    ? pinEnabled && biometricEnabled
      ? `PIN and ${biometricType === "face" ? "Face ID" : "Fingerprint"} enabled`
      : pinEnabled
      ? "You have PIN protection enabled"
      : `${biometricType === "face" ? "Face ID" : "Fingerprint"} protection enabled`
    : "Enable PIN or Biometrics to secure your app";

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Security" subtitle="Protect your account" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={[styles.banner, !isSecured && styles.bannerUnsecured]}>
          <View style={[styles.bannerIcon, !isSecured && styles.bannerIconUnsecured]}>
            <Ionicons
              name={isSecured ? "shield-checkmark-outline" : "shield-outline"}
              size={26}
              color={isSecured ? "#15803D" : "#D97706"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>
              {isSecured ? "Account Secured" : "App Lock Disabled"}
            </Text>
            <Text style={styles.bannerText}>{bannerSubtitle}</Text>
          </View>
        </View>

        <SectionLabel>PIN PROTECTION</SectionLabel>
        <Card>
          <Row
            icon="lock-closed-outline"
            title="Enable PIN"
            subtitle="Required to open the app"
            toggle={{
              value: pinEnabled,
              onChange: handleTogglePin,
            }}
          />
          <Row
            icon="key-outline"
            tone="amber"
            title="Change PIN"
            subtitle="Update your security PIN"
            onPress={() => setPinSheet(true)}
          />
        </Card>

        <SectionLabel>BIOMETRIC SECURITY</SectionLabel>
        <Card>
          <Row
            icon="finger-print-outline"
            tone="purple"
            title="Enable Biometric Login"
            subtitle={
              biometricEnabled
                ? biometricType === "face"
                  ? "Face Recognition enabled"
                  : "Fingerprint Scanner enabled"
                : "Use fingerprint or face ID"
            }
            toggle={{
              value: biometricEnabled,
              onChange: handleToggleBiometric,
            }}
            onPress={() => setBiometricSheet(true)}
          />
        </Card>

        <SectionLabel>SESSION</SectionLabel>
        <Card muted>
          <Row
            icon="lock-closed-outline"
            tone="red"
            title="End All Sessions"
            subtitle="Logout from all devices"
            onPress={() => setConfirmEnd(true)}
          />
        </Card>

        <InfoNote>
          These security features help protect your business data. Keep your PIN private and change it if
          you think someone else knows it.
        </InfoNote>
      </ScrollView>

      <ChangePinSheet
        visible={pinSheet}
        onClose={() => setPinSheet(false)}
        onDone={() => {
          setPinSheet(false);
          showToast("PIN changed successfully", "success");
        }}
      />

      <BiometricSetupModal
        visible={biometricSheet}
        activeType={biometricType}
        isEnabled={biometricEnabled}
        onClose={() => setBiometricSheet(false)}
        onConfigured={handleBiometricConfigured}
      />

      <ConfirmModal
        visible={confirmEnd}
        title="End all sessions?"
        subtitle="You'll be signed out on every phone and browser, including this one. Sign in again with your PIN."
        iconName="log-out-outline"
        iconColor="#D92D20"
        confirmText="End sessions"
        loading={ending}
        onCancel={() => setConfirmEnd(false)}
        onConfirm={handleEndAll}
      />
      {toastElement}
    </SafeAreaView>
  );
};

// ─── Change PIN sheet ─────────────────────────────────────────────────────────

const ChangePinSheet: React.FC<{ visible: boolean; onClose: () => void; onDone: () => void }> = ({
  visible,
  onClose,
  onDone,
}) => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const digits = (v: string) => v.replace(/\D/g, "").slice(0, PIN_LENGTH);

  const save = async () => {
    if (current.length !== PIN_LENGTH || next.length !== PIN_LENGTH)
      return setError(`PINs are ${PIN_LENGTH} digits.`);
    if (next !== confirm) return setError("The new PINs don't match.");
    if (next === current) return setError("Choose a PIN different from your current one.");
    setSaving(true);
    setError(null);
    try {
      await changePin({ current_pin: current, pin: next, confirm_pin: confirm });
      await saveCachedPin(next);
      reset();
      onDone();
    } catch (err: any) {
      const data = err?.response?.data;
      setError(
        typeof data?.current_pin === "string"
          ? data.current_pin
          : parseApiError(err, "Couldn't change your PIN.").message,
      );
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, value: string, set: (v: string) => void) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.pinInput}
        value={value}
        onChangeText={(v) => {
          set(digits(v));
          if (error) setError(null);
        }}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={PIN_LENGTH}
        placeholder="••••"
        placeholderTextColor="#B5BCC8"
      />
    </View>
  );

  return (
    <BottomSheet visible={visible} title="Change PIN" onClose={close}>
      <View style={styles.sheetBody}>
        {field("Current PIN", current, setCurrent)}
        {field("New PIN", next, setNext)}
        {field("Confirm new PIN", confirm, setConfirm)}
        {!!error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Update PIN</Text>}
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  scroll: { flex: 1, minHeight: 0 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: BLUE,
    borderRadius: 18,
    padding: 20,
    marginTop: 8,
  },
  bannerUnsecured: {
    backgroundColor: "#FEF3C7",
  },
  bannerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerIconUnsecured: {
    backgroundColor: "#FDE68A",
  },
  bannerTitle: { fontSize: 18, color: "#FFFFFF", fontFamily: "DMSans_700Bold" },
  bannerText: { fontSize: 13.5, color: "#D6E2F7", fontFamily: "DMSans_400Regular", marginTop: 4 },
  sheetBody: { paddingHorizontal: 20, paddingBottom: 8 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 14, color: "#1C1C1C", fontFamily: "DMSans_500Medium", marginBottom: 6 },
  pinInput: {
    backgroundColor: "#F1F2F4",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 20,
    letterSpacing: 8,
    color: "#1C1C1C",
    fontFamily: "DMSans_500Medium",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
  },
  error: { color: "#D92D20", fontSize: 13, fontFamily: "DMSans_500Medium", marginBottom: 10 },
  saveBtn: {
    backgroundColor: BLUE,
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveText: { color: "#FFFFFF", fontSize: 16, fontFamily: "DMSans_600SemiBold" },
});

export default SecurityScreen;
