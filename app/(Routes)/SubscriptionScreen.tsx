// app/(Routes)/SubscriptionScreen.tsx: "Subscription · Manage your Inventra plan" (Figma).
import { Feather, Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BLUE, PAGE_BG, ScreenHeader, SectionLabel } from "@/components/settings/SettingsUI";
import {
  EMAIL_PATTERN,
  copyToClipboard,
} from "@/components/subscription/paywallParts";
import { Skeleton } from "@/components/ui";
import {
  getSubscription,
  getTransferStatus,
  initializePaystack,
  initializeTransfer,
  parseApiError,
  verifyPaystack,
} from "@/src/api";
import type { TransferPayment } from "@/src/api/types";
import { formatCurrency } from "@/utils/formatters";

const STATUS: Record<string, { label: string; bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  active: { label: "Active", bg: "#DCFCE7", fg: "#15803D", icon: "checkmark-circle-outline" },
  trialing: { label: "Free Trial", bg: "#DCFCE7", fg: "#15803D", icon: "checkmark-circle-outline" },
  expired: { label: "Expired", bg: "#FEE2E2", fg: "#B91C1C", icon: "alert-circle-outline" },
  none: { label: "Not started", bg: "#EEF0F4", fg: "#667085", icon: "ellipse-outline" },
};

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

type ModalView = "options" | "transfer" | "checking" | "success";

const SubscriptionScreen = () => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: sub, isLoading } = useQuery({ queryKey: ["subscription"], queryFn: getSubscription });

  const [showPayModal, setShowPayModal] = useState(false);
  const [modalView, setModalView] = useState<ModalView>("options");
  const [loadingAction, setLoadingAction] = useState(false);
  const [email, setEmail] = useState("");
  const [emailPrompt, setEmailPrompt] = useState(false);
  const [transferData, setTransferData] = useState<TransferPayment | null>(null);
  const [copied, setCopied] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const status = STATUS[(sub?.access_active === false && sub?.status !== "none" ? "expired" : sub?.status) ?? "none"]
    ?? STATUS.none;
  const amount = sub?.amount_naira ?? (sub?.amount_kobo ? sub.amount_kobo / 100 : 1000);
  const interval = sub?.interval === "yearly" ? "Year" : "Month";
  const timeline = sub?.timeline ?? [];

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = async (text: string) => {
    await copyToClipboard(text);
    setCopied(true);
  };

  const closePayModal = () => {
    setShowPayModal(false);
    setModalView("options");
    setLoadingAction(false);
    setTransferData(null);
    setVerifyMessage(null);
  };

  // ── Paystack Online (Card / USSD / Bank) Checkout ──────────────────────────
  const handlePayOnline = async () => {
    if (loadingAction) return;

    if (emailPrompt) {
      if (!email.trim() || !EMAIL_PATTERN.test(email.trim())) {
        Alert.alert("Invalid Email", "Please enter a valid email address for your payment receipt.");
        return;
      }
    }

    setLoadingAction(true);
    try {
      const payload = emailPrompt && email.trim() ? { email: email.trim() } : {};
      const res = await initializePaystack(payload);

      // Open secure Paystack checkout in browser
      const browserRes = await WebBrowser.openBrowserAsync(res.authorization_url);

      // When browser session closes, verify transaction
      setModalView("checking");
      setVerifyMessage("Verifying your payment with Paystack...");

      try {
        await verifyPaystack(res.reference);
        await queryClient.invalidateQueries({ queryKey: ["subscription"] });
        setModalView("success");
      } catch (verifyErr: any) {
        const info = parseApiError(verifyErr, "Payment was not completed.");
        setVerifyMessage(null);
        setModalView("options");
        Alert.alert("Payment Status", info.message);
      }
    } catch (err: any) {
      const info = parseApiError(err, "Failed to start payment.");
      if (info.code === "email_required" || info.fields?.email) {
        setEmailPrompt(true);
      } else {
        Alert.alert("Payment Error", info.message);
      }
    } finally {
      setLoadingAction(false);
    }
  };

  // ── Paystack Dedicated Bank Transfer ───────────────────────────────────────
  const handlePayTransfer = async () => {
    if (loadingAction) return;

    if (emailPrompt) {
      if (!email.trim() || !EMAIL_PATTERN.test(email.trim())) {
        Alert.alert("Invalid Email", "Please enter a valid email address for your receipt.");
        return;
      }
    }

    setLoadingAction(true);
    try {
      const payload = emailPrompt && email.trim() ? { email: email.trim() } : {};
      const res = await initializeTransfer(payload);

      if (res.paid) {
        await queryClient.invalidateQueries({ queryKey: ["subscription"] });
        setModalView("success");
        return;
      }

      setTransferData(res);
      setModalView("transfer");
    } catch (err: any) {
      const info = parseApiError(err, "Could not generate bank transfer details.");
      if (info.code === "email_required" || info.fields?.email) {
        setEmailPrompt(true);
      } else {
        Alert.alert("Transfer Error", info.message);
      }
    } finally {
      setLoadingAction(false);
    }
  };

  // ── Check Transfer Status ("I've Made Payment") ────────────────────────────
  const handleCheckTransfer = async () => {
    if (!transferData?.reference || loadingAction) return;
    setLoadingAction(true);
    setVerifyMessage("Checking bank transfer confirmation...");
    try {
      const res = await getTransferStatus(transferData.reference);
      if (res.paid || res.status === "success") {
        await queryClient.invalidateQueries({ queryKey: ["subscription"] });
        setModalView("success");
      } else {
        Alert.alert(
          "Payment Pending",
          "We have not received your bank transfer yet. Please allow 1-2 minutes after sending before checking again.",
          [{ text: "OK" }],
        );
      }
    } catch (err: any) {
      const info = parseApiError(err, "Could not verify transfer status.");
      Alert.alert("Status Check", info.message);
    } finally {
      setLoadingAction(false);
      setVerifyMessage(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Subscription" subtitle="Manage your Inventra plan" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 60 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={{ gap: 14 }}>
            <View style={[styles.planCard, { gap: 12 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Skeleton width={48} height={48} borderRadius={12} />
                <Skeleton width={80} height={26} borderRadius={14} />
              </View>
              <Skeleton width="40%" height={14} />
              <Skeleton width="60%" height={24} />
              <Skeleton width="100%" height={1} style={{ marginVertical: 8 }} />
              <Skeleton width="50%" height={14} />
            </View>
            <Skeleton width="100%" height={48} borderRadius={12} />
            <Skeleton width="35%" height={16} style={{ marginTop: 10 }} />
            <Skeleton width="100%" height={80} borderRadius={12} />
          </View>
        ) : (
          <>
            <View style={styles.planCard}>
              <View style={styles.planTop}>
                <View style={styles.planIcon}>
                  <Ionicons name="card-outline" size={26} color="#FFFFFF" />
                </View>
                <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
                  <Ionicons name={status.icon} size={18} color={status.fg} />
                  <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
                </View>
              </View>
              <View style={styles.planRow}>
                <Text style={styles.planLabel}>Current Plan</Text>
                <Text style={styles.planValue}>{sub?.plan_name ?? "Inventra Standard"}</Text>
              </View>
              <View style={styles.planDivider} />
              <View style={styles.planRow}>
                <Text style={styles.planLabel}>Renewal Amount</Text>
                <Text style={styles.planValue}>
                  ₦{amount.toLocaleString("en-NG")} / {interval}
                </Text>
              </View>
              {!!sub?.current_period_end && (
                <>
                  <View style={styles.planDivider} />
                  <View style={styles.planRow}>
                    <Text style={styles.planLabel}>
                      {sub.access_active ? "Renews by" : "Expired on"}
                    </Text>
                    <Text style={styles.planValue}>
                      {fmtDate(sub.current_period_end)}
                      {sub.access_active && sub.time_left_label ? ` · ${sub.time_left_label} left` : ""}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Subscribe / Renew Action Button */}
            <TouchableOpacity
              style={styles.payActionBtn}
              onPress={() => {
                setShowPayModal(true);
                setModalView("options");
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.payActionBtnText}>
                {sub?.access_active ? "Renew / Extend Plan with Paystack" : "Subscribe with Paystack (₦1,000)"}
              </Text>
            </TouchableOpacity>

            <SectionLabel>SUBSCRIPTION TIMELINE</SectionLabel>
            {timeline.length === 0 ? (
              <Text style={styles.empty}>No subscription activity yet.</Text>
            ) : (
              timeline.map((event, i) => {
                const trial = event.kind === "trial";
                return (
                  <View key={`${event.kind}-${event.date}-${i}`} style={styles.timelineRow}>
                    <View style={styles.rail}>
                      <View style={[styles.dot, { backgroundColor: trial ? BLUE : "#12B76A" }]} />
                      {i < timeline.length - 1 && <View style={styles.railLine} />}
                    </View>
                    <View style={styles.eventCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.eventDate}>{fmtDate(event.date)}</Text>
                      </View>
                      <View style={[styles.eventPill, trial ? styles.pillBlue : styles.pillGreen]}>
                        <Text style={[styles.eventPillText, { color: trial ? BLUE : "#15803D" }]}>
                          {trial ? "Activated" : "Paid"}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            <Text style={styles.footer}>
              Protected by Paystack. Card, bank transfer, and USSD supported. No hidden fees.
            </Text>
          </>
        )}
      </ScrollView>

      {/* Paystack Payment Modal */}
      <Modal
        visible={showPayModal}
        transparent
        animationType="slide"
        onRequestClose={closePayModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) + 10 }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Paystack Checkout</Text>
                <Text style={styles.modalSubtitle}>Inventra Standard · ₦1,000 / month</Text>
              </View>
              <TouchableOpacity onPress={closePayModal} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {/* Email Prompt if needed */}
            {emailPrompt && (
              <View style={styles.emailContainer}>
                <Text style={styles.emailLabel}>Email Address (for Paystack receipt)</Text>
                <TextInput
                  style={styles.emailInput}
                  placeholder="e.g. business@example.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* VIEW: Payment Options */}
            {modalView === "options" && (
              <View style={styles.optionsContainer}>
                <Text style={styles.sectionHeader}>Choose how to pay:</Text>

                {/* Option 1: Card / Online */}
                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={handlePayOnline}
                  disabled={loadingAction}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionIconCircle, { backgroundColor: "#E7EEFA" }]}>
                    <Ionicons name="card" size={24} color="#1155CC" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>Pay Online (Card / USSD)</Text>
                    <Text style={styles.optionDesc}>Instant activation via Paystack secure checkout</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Option 2: Bank Transfer */}
                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={handlePayTransfer}
                  disabled={loadingAction}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionIconCircle, { backgroundColor: "#DCFCE7" }]}>
                    <Ionicons name="business" size={24} color="#15803D" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>Pay with Bank Transfer</Text>
                    <Text style={styles.optionDesc}>Get a dedicated virtual account to transfer into</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                {loadingAction && (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#1155CC" />
                    <Text style={styles.loadingText}>Connecting to Paystack...</Text>
                  </View>
                )}
              </View>
            )}

            {/* VIEW: Bank Transfer Details */}
            {modalView === "transfer" && transferData && (
              <View style={styles.transferContainer}>
                <View style={styles.transferAlert}>
                  <Ionicons name="information-circle" size={20} color="#1155CC" />
                  <Text style={styles.transferAlertText}>
                    Transfer exactly ₦{transferData.amount_naira.toLocaleString()} to the account below:
                  </Text>
                </View>

                {/* Bank Details Card */}
                <View style={styles.bankCard}>
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Bank Name</Text>
                    <Text style={styles.bankValue}>{transferData.bank_name}</Text>
                  </View>
                  <View style={styles.bankDivider} />

                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Account Number</Text>
                    <View style={styles.copyRow}>
                      <Text style={styles.accountNumberText}>{transferData.account_number}</Text>
                      <TouchableOpacity
                        style={styles.copyBtn}
                        onPress={() => handleCopy(transferData.account_number)}
                      >
                        <Feather name={copied ? "check" : "copy"} size={16} color="#1155CC" />
                        <Text style={styles.copyBtnText}>{copied ? "Copied" : "Copy"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.bankDivider} />

                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Account Name</Text>
                    <Text style={styles.bankValue}>{transferData.account_name}</Text>
                  </View>
                  <View style={styles.bankDivider} />

                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Reference</Text>
                    <Text style={[styles.bankValue, styles.mono]}>{transferData.reference}</Text>
                  </View>
                </View>

                {/* Action Button: I've Made Payment */}
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleCheckTransfer}
                  disabled={loadingAction}
                >
                  {loadingAction ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.confirmBtnText}>I've Made Payment</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backOptionsBtn}
                  onPress={() => setModalView("options")}
                  disabled={loadingAction}
                >
                  <Text style={styles.backOptionsText}>Choose Another Payment Method</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* VIEW: Checking / Verifying */}
            {modalView === "checking" && (
              <View style={styles.centerStatus}>
                <ActivityIndicator size="large" color="#1155CC" />
                <Text style={styles.statusTitle}>Checking Payment</Text>
                <Text style={styles.statusSubtitle}>{verifyMessage || "Confirming transaction with Paystack..."}</Text>
              </View>
            )}

            {/* VIEW: Success */}
            {modalView === "success" && (
              <View style={styles.centerStatus}>
                <View style={styles.successCircle}>
                  <Ionicons name="checkmark" size={38} color="#FFFFFF" />
                </View>
                <Text style={styles.statusTitle}>Payment Successful!</Text>
                <Text style={styles.statusSubtitle}>
                  Your Inventra subscription is now active. Thank you!
                </Text>
                <TouchableOpacity
                  style={[styles.confirmBtn, { marginTop: 24, width: "100%" }]}
                  onPress={closePayModal}
                >
                  <Text style={styles.confirmBtnText}>Continue to App</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  scroll: { flex: 1, minHeight: 0 },
  content: { paddingHorizontal: 16, paddingTop: 10 },
  planCard: { backgroundColor: BLUE, borderRadius: 20, padding: 20, marginTop: 8 },
  planTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  planIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  statusText: { fontSize: 15, fontFamily: "DMSans_600SemiBold" },
  planRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, gap: 12 },
  planLabel: { fontSize: 15, color: "#D6E2F7", fontFamily: "DMSans_400Regular" },
  planValue: { fontSize: 16, color: "#FFFFFF", fontFamily: "DMSans_700Bold", flexShrink: 1, textAlign: "right" },
  planDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.18)" },

  payActionBtn: {
    backgroundColor: "#1155CC",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
    shadowColor: "#1155CC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  payActionBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
  },

  timelineRow: { flexDirection: "row", alignItems: "stretch" },
  rail: { width: 26, alignItems: "flex-start", paddingTop: 12 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  railLine: { width: 2, flex: 1, backgroundColor: "#D0D5DD", marginLeft: 6, marginTop: 6, marginBottom: 6 },
  eventCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  eventTitle: { fontSize: 17, color: "#1C1C1C", fontFamily: "DMSans_600SemiBold" },
  eventDate: { fontSize: 14, color: "#6B7280", fontFamily: "DMSans_400Regular", marginTop: 4 },
  eventPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  pillBlue: { backgroundColor: "#E7EEFA" },
  pillGreen: { backgroundColor: "#DCFCE7" },
  eventPillText: { fontSize: 13, fontFamily: "DMSans_500Medium" },
  empty: { color: "#6B7280", fontFamily: "DMSans_400Regular", marginLeft: 4 },
  footer: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    color: "#6B7280",
    fontFamily: "DMSans_400Regular",
    paddingHorizontal: 24,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: "#6B7280",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },

  emailContainer: {
    marginBottom: 16,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emailLabel: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: "#374151",
    marginBottom: 6,
  },
  emailInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
    color: "#111827",
  },

  optionsContainer: {
    gap: 12,
    paddingVertical: 8,
  },
  sectionHeader: {
    fontSize: 14,
    fontFamily: "DMSans_500Medium",
    color: "#4B5563",
    marginBottom: 4,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 14,
  },
  optionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: "#111827",
  },
  optionDesc: {
    fontSize: 12.5,
    fontFamily: "DMSans_400Regular",
    color: "#6B7280",
    marginTop: 2,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 12,
  },
  loadingText: {
    fontSize: 13,
    color: "#6B7280",
    fontFamily: "DMSans_400Regular",
  },

  transferContainer: {
    gap: 14,
    paddingVertical: 6,
  },
  transferAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  transferAlertText: {
    fontSize: 13,
    color: "#1E40AF",
    fontFamily: "DMSans_500Medium",
    flex: 1,
  },
  bankCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  bankLabel: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: "#6B7280",
  },
  bankValue: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    color: "#111827",
  },
  accountNumberText: {
    fontSize: 17,
    fontFamily: "DMSans_700Bold",
    color: "#1155CC",
    letterSpacing: 0.8,
  },
  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E7EEFA",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyBtnText: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: "#1155CC",
  },
  mono: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 12,
  },
  bankDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  confirmBtn: {
    backgroundColor: "#1155CC",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
  },
  backOptionsBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  backOptionsText: {
    fontSize: 13,
    color: "#6B7280",
    fontFamily: "DMSans_500Medium",
  },

  centerStatus: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
    color: "#111827",
    marginTop: 8,
  },
  statusSubtitle: {
    fontSize: 13.5,
    fontFamily: "DMSans_400Regular",
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default SubscriptionScreen;
