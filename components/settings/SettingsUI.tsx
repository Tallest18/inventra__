// components/settings/SettingsUI.tsx
// Shared building blocks for the Settings and Security screens (one look).
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

export const BLUE = "#1155CC";
export const PAGE_BG = "#E7EEFA";

export const TONES = {
  blue: { bg: "#E7EEFA", fg: BLUE },
  amber: { bg: "#FEF3D7", fg: "#1C1C1C" },
  grey: { bg: "#EEF0F4", fg: "#6B7280" },
  purple: { bg: "#F5E8FD", fg: "#9E2AB8" },
  red: { bg: "#FDE7EA", fg: "#D92D20" },
} as const;
export type Tone = keyof typeof TONES;

export const ScreenHeader: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <View style={s.header}>
    <View style={{ flex: 1 }}>
      <Text style={s.title}>{title}</Text>
      <Text style={s.subtitle}>{subtitle}</Text>
    </View>
    <TouchableOpacity
      style={s.back}
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/(Main)/More"))}
      accessibilityLabel="Go back"
    >
      <Ionicons name="arrow-back" size={24} color="#1C1C1C" />
    </TouchableOpacity>
  </View>
);

export const SectionLabel: React.FC<{ children: string }> = ({ children }) => (
  <Text style={s.section}>{children}</Text>
);

export const Card: React.FC<{ children: React.ReactNode; muted?: boolean }> = ({ children, muted }) => {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[s.card, muted && s.cardMuted]}>
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={s.divider} />}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
};

interface RowProps {
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  /** Right side: chevron (default when tappable), a switch, or a pill. */
  toggle?: { value: boolean; onChange?: (v: boolean) => void; disabled?: boolean };
  pill?: string;
  danger?: boolean;
}

export const Row: React.FC<RowProps> = ({ icon, tone = "blue", title, subtitle, onPress, toggle, pill, danger }) => {
  const t = TONES[tone];
  const body = (
    <View style={s.row}>
      <View style={[s.iconTile, { backgroundColor: t.bg }]}>
        <Ionicons name={icon} size={22} color={t.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowTitle, danger && { color: "#B42318" }]}>{title}</Text>
        {!!subtitle && <Text style={s.rowSubtitle}>{subtitle}</Text>}
      </View>
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          disabled={toggle.disabled}
          trackColor={{ false: "#D0D5DD", true: BLUE }}
          thumbColor="#FFFFFF"
          {...(Platform.OS === "web" ? ({ activeThumbColor: "#FFFFFF" } as any) : null)}
        />
      ) : pill ? (
        <View style={s.pill}>
          <Text style={s.pillText}>{pill}</Text>
        </View>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={20} color="#4B5563" />
      ) : null}
    </View>
  );
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {body}
    </TouchableOpacity>
  ) : (
    body
  );
};

export const InfoNote: React.FC<{ children: string }> = ({ children }) => (
  <View style={s.note}>
    <Text style={s.noteText}>{children}</Text>
  </View>
);

const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 28, color: "#1C1C1C", fontFamily: "DMSans_700Bold" },
  subtitle: { fontSize: 14, color: "#6B7280", fontFamily: "DMSans_400Regular", marginTop: 2 },
  back: { width: 52, height: 44, borderRadius: 8, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  section: {
    fontSize: 13,
    letterSpacing: 0.4,
    color: "#667085",
    fontFamily: "DMSans_500Medium",
    marginTop: 18,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: { backgroundColor: "#FFFFFF", borderRadius: 18, overflow: "hidden" },
  cardMuted: { backgroundColor: "#F7F8FA" },
  divider: { height: 1, backgroundColor: "#E4E7EC" },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 16 },
  iconTile: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 16, color: "#1C1C1C", fontFamily: "DMSans_500Medium" },
  rowSubtitle: { fontSize: 13, color: "#6B7280", fontFamily: "DMSans_400Regular", marginTop: 2 },
  pill: { backgroundColor: "#EEF0F4", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11.5, color: "#667085", fontFamily: "DMSans_500Medium" },
  note: { marginTop: 22, backgroundColor: "rgba(255,255,255,0.45)", borderRadius: 14, padding: 16 },
  noteText: { textAlign: "center", fontSize: 13, lineHeight: 19, color: "#6B7280", fontFamily: "DMSans_400Regular" },
});
