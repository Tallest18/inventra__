// app/(Routes)/SettingsScreen.tsx: "Settings · App preferences" (Figma).
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet } from "react-native";

import { BiometricSetupModal } from "@/components/security/BiometricSetupModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  Card,
  InfoNote,
  PAGE_BG,
  Row,
  ScreenHeader,
  SectionLabel,
} from "@/components/settings/SettingsUI";
import { useToast } from "@/components/ui/useToast";
import { clearAppCache, formatBytes, getCacheSize } from "@/utils/appCache";
import {
  BiometricType,
  getBiometricType,
  isBiometricsEnabled,
  onSecuritySettingsChanged,
} from "@/utils/securityStorage";

const SettingsScreen = () => {
  const queryClient = useQueryClient();
  const { showToast, toastElement } = useToast();
  const [cacheBytes, setCacheBytes] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [biometricSheet, setBiometricSheet] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricTypeState] = useState<BiometricType | null>(null);

  const loadBiometrics = async () => {
    const bio = await isBiometricsEnabled();
    const type = await getBiometricType();
    setBiometricEnabled(bio);
    setBiometricTypeState(type);
  };

  const measure = useCallback(async () => {
    setCacheBytes(await getCacheSize(queryClient));
  }, [queryClient]);

  useEffect(() => {
    measure();
    loadBiometrics();
    const unsubscribe = onSecuritySettingsChanged(() => {
      loadBiometrics();
    });
    return unsubscribe;
  }, [measure]);

  const handleClear = async () => {
    setClearing(true);
    try {
      await clearAppCache(queryClient);
      await measure();
      showToast("Cache cleared", "success");
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Settings" subtitle="App preferences" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SectionLabel>SECURITY</SectionLabel>
        <Card>
          <Row
            icon="lock-closed-outline"
            title="App Lock"
            subtitle="PIN & Biometric"
            onPress={() => router.push("/(Routes)/SecurityScreen" as any)}
          />
          <Row
            icon="finger-print-outline"
            tone="amber"
            title="Biometric Login"
            subtitle={
              biometricEnabled
                ? biometricType === "face"
                  ? "Face Recognition active"
                  : "Fingerprint Scanner active"
                : "Use fingerprint or face"
            }
            onPress={() => setBiometricSheet(true)}
          />
        </Card>

        <SectionLabel>DATA & STORAGE</SectionLabel>
        <Card>
          <Row
            icon="server-outline"
            tone="grey"
            title="Clear Cache"
            subtitle={cacheBytes == null ? "Checking…" : `${formatBytes(cacheBytes)} stored`}
            onPress={() => setConfirmClear(true)}
          />
          {/* Inventra keeps every record on the server as it happens. */}
          <Row
            icon="cloud-done-outline"
            tone="grey"
            title="Backup Data"
            subtitle="Saved online automatically"
            pill="Automatic"
          />
        </Card>

        <SectionLabel>PREFERENCES</SectionLabel>
        <Card>
          <Row icon="globe-outline" tone="grey" title="Language" subtitle="English" pill="Coming Soon" />
        </Card>

        <InfoNote>
          Some features are limited in the MVP version and will be expanded based on user feedback.
        </InfoNote>
      </ScrollView>

      <ConfirmModal
        visible={confirmClear}
        title="Clear cache?"
        subtitle="This removes saved screens and recent searches from this device. Your sales, products and account are not affected."
        iconName="trash-outline"
        iconColor="#1155CC"
        confirmText="Clear"
        loading={clearing}
        onCancel={() => setConfirmClear(false)}
        onConfirm={handleClear}
      />

      <BiometricSetupModal
        visible={biometricSheet}
        activeType={biometricType}
        isEnabled={biometricEnabled}
        onClose={() => setBiometricSheet(false)}
        onConfigured={(type) => {
          setBiometricSheet(false);
          setBiometricEnabled(true);
          setBiometricTypeState(type);
          showToast(
            type === "face" ? "Face Recognition enabled" : "Fingerprint login enabled",
            "success"
          );
        }}
      />
      {toastElement}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  scroll: { flex: 1, minHeight: 0 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
});

export default SettingsScreen;
