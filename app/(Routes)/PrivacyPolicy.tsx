// app/(Routes)/PrivacyPolicy.tsx: "Privacy Policy" (Figma).
// Text comes from the admin panel (Django admin → App content → Privacy policy).
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  ActivityIndicator,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { BLUE, PAGE_BG, ScreenHeader } from "@/components/settings/SettingsUI";
import { Skeleton } from "@/components/ui";
import { getPrivacyPolicy, whatsappLink } from "@/src/api";

/** Body text: lines starting with "• " or "- " are bullets, others paragraphs. */
const Body: React.FC<{ text: string }> = ({ text }) => (
  <View style={{ gap: 6 }}>
    {text.split("\n").filter((l) => l.trim()).map((line, i) => {
      const bullet = /^\s*(•|-)\s+/.test(line);
      return bullet ? (
        <View key={i} style={styles.bulletRow}>
          <Text style={styles.body}>•</Text>
          <Text style={[styles.body, { flex: 1 }]}>{line.replace(/^\s*(•|-)\s+/, "")}</Text>
        </View>
      ) : (
        <Text key={i} style={styles.body}>{line.trim()}</Text>
      );
    })}
  </View>
);

const PrivacyPolicy = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["content-privacy"],
    queryFn: getPrivacyPolicy,
  });
  const updated = data?.last_updated_label ? `Last updated: ${data.last_updated_label}` : "Privacy Policy";
  const year = data?.last_updated ? new Date(data.last_updated).getFullYear() : new Date().getFullYear();
  // The last section is the contact one: its buttons follow it.
  const sections = data?.sections ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Privacy Policy" subtitle={updated} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={{ gap: 14 }}>
            <Skeleton width="100%" height={16} />
            <Skeleton width="90%" height={16} />
            <Skeleton width="75%" height={16} />
            <View style={{ marginVertical: 12, height: 1, backgroundColor: "#E5E7EB" }} />
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ gap: 8, marginBottom: 16 }}>
                <Skeleton width="45%" height={18} />
                <Skeleton width="100%" height={14} />
                <Skeleton width="95%" height={14} />
                <Skeleton width="80%" height={14} />
              </View>
            ))}
          </View>
        ) : isError || !data ? (
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 40, alignItems: "center" }}>
            <Text style={{ color: BLUE, fontFamily: "DMSans_500Medium" }}>
              Couldn't load the policy. Tap to try again.
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.intro}>{data.intro}</Text>
            <View style={styles.divider} />

            {sections.map((s) => (
              <View key={s.number} style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {s.number}. {s.title}
                </Text>
                <Body text={s.body} />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.channel, { backgroundColor: "#EAFBF0" }]}
              onPress={() => Linking.openURL(whatsappLink(data.contact))}
            >
              <View style={[styles.channelIcon, { backgroundColor: "#D1F5DE" }]}>
                <Ionicons name="chatbubble-outline" size={20} color="#15803D" />
              </View>
              <View>
                <Text style={styles.channelTitle}>Chat on WhatsApp</Text>
                <Text style={styles.channelSub}>Quick support from our team</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.channel, { backgroundColor: "#DCE5F5" }]}
              onPress={() => Linking.openURL(`mailto:${data.contact.email}?subject=${encodeURIComponent("Privacy question")}`)}
            >
              <View style={[styles.channelIcon, { backgroundColor: "#C9D7F0" }]}>
                <Ionicons name="mail-outline" size={20} color={BLUE} />
              </View>
              <View>
                <Text style={styles.channelTitle}>Email Support</Text>
                <Text style={styles.channelSub}>{data.contact.email}</Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, { marginTop: 26 }]} />
            <Text style={styles.footer}>{updated}</Text>
            <Text style={styles.footer}>© {year} Inventra. All rights reserved.</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  scroll: { flex: 1, minHeight: 0 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  intro: { fontSize: 16, lineHeight: 25, color: "#4B5563", fontFamily: "DMSans_400Regular", marginTop: 4 },
  divider: { height: 1, backgroundColor: "#D0D7E3", marginTop: 16 },
  section: { marginTop: 26 },
  sectionTitle: { fontSize: 16.5, color: "#1C1C1C", fontFamily: "DMSans_700Bold", marginBottom: 10 },
  body: { fontSize: 15.5, lineHeight: 25, color: "#6B7280", fontFamily: "DMSans_400Regular" },
  bulletRow: { flexDirection: "row", gap: 8, paddingLeft: 4 },
  channel: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 18, padding: 16, marginTop: 14 },
  channelIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  channelTitle: { fontSize: 16, color: "#1C1C1C", fontFamily: "DMSans_600SemiBold" },
  channelSub: { fontSize: 13, color: "#6B7280", fontFamily: "DMSans_400Regular", marginTop: 2 },
  footer: { textAlign: "center", marginTop: 10, fontSize: 13, color: "#98A2B3", fontFamily: "DMSans_400Regular" },
});

export default PrivacyPolicy;
