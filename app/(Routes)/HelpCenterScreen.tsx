// app/(Routes)/HelpCenterScreen.tsx: "Help & Support" (Figma).
// FAQs and contact details come from the admin panel (Django admin → App content).
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

import { BLUE, PAGE_BG, ScreenHeader, SectionLabel } from "@/components/settings/SettingsUI";
import { Skeleton } from "@/components/ui";
import { getHelpContent, whatsappLink } from "@/src/api";

if (Platform.OS === "android") UIManager.setLayoutAnimationEnabledExperimental?.(true);

const HelpCenterScreen = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["content-help"],
    queryFn: getHelpContent,
  });
  const [open, setOpen] = useState<number | null>(null);

  const toggle = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((cur) => (cur === id ? null : id));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Help & Support" subtitle="Get help with inventra" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={{ gap: 12 }}>
            <Skeleton width="90%" height={16} style={{ marginBottom: 12 }} />
            <Skeleton width="40%" height={14} style={{ marginBottom: 8 }} />
            <View style={styles.faqCard}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F3F4F6",
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Skeleton width="75%" height={16} />
                  <Skeleton width={18} height={18} borderRadius={9} />
                </View>
              ))}
            </View>
          </View>
        ) : isError || !data ? (
          <TouchableOpacity onPress={() => refetch()} style={styles.retry}>
            <Text style={styles.retryText}>Couldn't load help. Tap to try again.</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.intro}>{data.intro}</Text>

            <SectionLabel>FREQUENTLY ASKED QUESTIONS</SectionLabel>
            <View style={styles.faqCard}>
              {data.faqs.map((faq, i) => {
                const expanded = open === faq.id;
                return (
                  <View key={faq.id} style={i > 0 && styles.faqDivider}>
                    <TouchableOpacity
                      style={styles.faqQuestionRow}
                      onPress={() => toggle(faq.id)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                    >
                      <Text style={styles.faqQuestion}>{faq.question}</Text>
                      <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#4B5563" />
                    </TouchableOpacity>
                    {expanded && (
                      <View style={styles.faqAnswerBox}>
                        <Text style={styles.faqAnswer}>{faq.answer}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <SectionLabel>CONTACT SUPPORT</SectionLabel>
            <View style={styles.contactCard}>
              <Text style={styles.contactTitle}>{data.help_title}</Text>
              <Text style={styles.contactText}>{data.help_text}</Text>

              <View style={styles.channel}>
                <View style={styles.channelHead}>
                  <View style={[styles.channelIcon, { backgroundColor: "#DCFCE7" }]}>
                    <Ionicons name="chatbubble-outline" size={20} color="#15803D" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.channelTitle}>Chat with us on WhatsApp</Text>
                    <Text style={styles.channelSub}>Get help from our support team.</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.whatsappBtn}
                  onPress={() => Linking.openURL(whatsappLink(data.contact))}
                >
                  <Text style={styles.whatsappText}>Chat on WhatsApp</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.channel}>
                <View style={styles.channelHead}>
                  <View style={[styles.channelIcon, { backgroundColor: "#E7EEFA" }]}>
                    <Ionicons name="mail-outline" size={20} color={BLUE} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.channelTitle}>Send us an email</Text>
                    <Text style={styles.channelSub}>Send us a message and we'll get back to you.</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.emailBtn}
                  onPress={() =>
                    Linking.openURL(`mailto:${data.contact.email}?subject=${encodeURIComponent("Inventra support")}`)
                  }
                >
                  <Text style={styles.emailText}>Email Support</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.footer}>Inventra</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  scroll: { flex: 1, minHeight: 0 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  intro: { fontSize: 15.5, lineHeight: 23, color: "#4B5563", fontFamily: "DMSans_400Regular", marginTop: 4 },
  faqCard: { backgroundColor: "#FFFFFF", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#E4E7EC" },
  faqDivider: { borderTopWidth: 1, borderTopColor: "#E4E7EC" },
  faqQuestionRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 20 },
  faqQuestion: { flex: 1, fontSize: 16, lineHeight: 22, color: "#1C1C1C", fontFamily: "DMSans_500Medium" },
  faqAnswerBox: { backgroundColor: "#FAFAFA", paddingHorizontal: 20, paddingBottom: 18, paddingTop: 2 },
  faqAnswer: { fontSize: 15, lineHeight: 23, color: "#6B7280", fontFamily: "DMSans_400Regular" },
  contactCard: {
    backgroundColor: "#E3E8F0",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#CFD6E0",
    padding: 20,
    gap: 14,
  },
  contactTitle: { fontSize: 18, color: "#1C1C1C", fontFamily: "DMSans_700Bold" },
  contactText: { fontSize: 15, lineHeight: 22, color: "#6B7280", fontFamily: "DMSans_400Regular", marginBottom: 6 },
  channel: { backgroundColor: "#F7F8FA", borderRadius: 16, padding: 16, gap: 14 },
  channelHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  channelIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  channelTitle: { fontSize: 16, color: "#1C1C1C", fontFamily: "DMSans_600SemiBold" },
  channelSub: { fontSize: 13, color: "#6B7280", fontFamily: "DMSans_400Regular", marginTop: 2 },
  whatsappBtn: { backgroundColor: "#00C853", borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center" },
  whatsappText: { color: "#FFFFFF", fontSize: 16, fontFamily: "DMSans_500Medium" },
  emailBtn: {
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: BLUE,
  },
  emailText: { color: BLUE, fontSize: 16, fontFamily: "DMSans_500Medium" },
  footer: { textAlign: "center", marginTop: 22, color: "#6B7280", fontFamily: "DMSans_500Medium" },
  retry: { marginTop: 40, alignItems: "center" },
  retryText: { color: BLUE, fontFamily: "DMSans_500Medium" },
});

export default HelpCenterScreen;
