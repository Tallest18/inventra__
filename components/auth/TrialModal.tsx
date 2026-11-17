// components/auth/TrialModal.tsx
import { AnimatedModal, MODAL_CONTENT_RESET } from "@/components/ui/AnimatedModal";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { OfferContent } from "@/src/api/types";
import { moderateScale, scale, verticalScale } from "@/utils/scaling";
import { AUTH_COLORS, AUTH_FONTS } from "./authTheme";

interface TrialModalProps {
  visible: boolean;
  offer: OfferContent | null;
  loading?: boolean;
  error?: string | null;
  onStart: () => void;
  /**
   * A live subscription may be dismissed; a trial that was never started and an
   * expired one may not  those are forced choices, and the dismiss label is
   * greyed out instead of removed.
   */
  dismissible?: boolean;
  onDismiss?: () => void;
}

/** The decorative dot row above the emoji in the design. */
const DOTS = [
  AUTH_COLORS.brand,
  "#F5A623",
  AUTH_COLORS.brand,
  "#F5A623",
  AUTH_COLORS.brand,
];

const HIGHLIGHT = "No payment is required today.";

/**
 * The trial offer, presented as a bottom sheet that cannot be dismissed by
 * tapping away or by the Android back button  the user has to choose before
 * the app will let them through.
 */
export const TrialModal: React.FC<TrialModalProps> = ({
  visible,
  offer,
  loading = false,
  error,
  onStart,
  dismissible = false,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  if (!offer) return null;

  // The API puts the emphasised sentence at the end of `body`; splitting on it
  // keeps the two-tone styling without hardcoding the trial length.
  const [bodyLead, bodyRest] = offer.body.includes(HIGHLIGHT)
    ? [offer.body.slice(0, offer.body.indexOf(HIGHLIGHT)).trim(), HIGHLIGHT]
    : [offer.body, ""];

  return (
    <AnimatedModal
      visible={visible}
      statusBarTranslucent
      // Only a dismissible sheet may be closed with the Android back button.
      onRequestClose={() => {
        if (dismissible) onDismiss?.();
      }}
    >
      <View style={[styles.backdrop, MODAL_CONTENT_RESET]}>
        <View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + verticalScale(16) },
          ]}
        >
          <View style={styles.handle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            bounces={false}
          >
            <View style={styles.dotsRow}>
              {DOTS.map((color, index) => (
                <View
                  key={index}
                  style={[styles.dot, { backgroundColor: color }]}
                />
              ))}
            </View>

            <Text style={styles.emoji}>🎉</Text>
            <Text style={styles.title}>{offer.title}</Text>
            <Text style={styles.subtitle}>{offer.subtitle}</Text>

            <View style={styles.infoBox}>
              <Text style={styles.body}>
                {bodyLead}
                {bodyRest ? " " : ""}
                {bodyRest ? (
                  <Text style={styles.bodyHighlight}>{bodyRest}</Text>
                ) : null}
              </Text>
              {offer.note ? <Text style={styles.note}>{offer.note}</Text> : null}
            </View>

            <View style={styles.features}>
              {(offer.features ?? []).map((feature) => (
                <View key={feature} style={styles.featureRow}>
                  <View style={styles.check}>
                    <Ionicons
                      name="checkmark"
                      size={moderateScale(13)}
                      color="#079455"
                    />
                  </View>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

          <TouchableOpacity
            style={[styles.cta, loading && styles.ctaDisabled]}
            onPress={onStart}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={AUTH_COLORS.onBrand} size="small" />
            ) : (
              <Text style={styles.ctaText}>{offer.cta}</Text>
            )}
          </TouchableOpacity>

          {dismissible ? (
            <TouchableOpacity
              style={styles.dismiss}
              onPress={onDismiss}
              disabled={loading}
            >
              <Text style={[styles.dismissText, styles.dismissActive]}>
                {offer.dismiss}
              </Text>
            </TouchableOpacity>
          ) : (
            // Forced: no press handler and pointer events off, so the label is
            // visibly greyed rather than a disabled button that eats taps.
            <View style={[styles.dismiss, styles.dismissInert]} pointerEvents="none">
              <Text style={styles.dismissText}>{offer.dismiss}</Text>
            </View>
          )}
        </View>
      </View>
    </AnimatedModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(16,24,40,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: AUTH_COLORS.sheet,
    borderTopLeftRadius: moderateScale(28),
    borderTopRightRadius: moderateScale(28),
    paddingHorizontal: scale(22),
    paddingTop: verticalScale(10),
    maxHeight: "92%",
  },
  handle: {
    width: scale(40),
    height: verticalScale(4),
    borderRadius: 2,
    backgroundColor: AUTH_COLORS.border,
    alignSelf: "center",
    marginBottom: verticalScale(14),
  },
  content: { paddingBottom: verticalScale(8) },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: scale(8),
    marginBottom: verticalScale(14),
  },
  dot: { width: scale(8), height: scale(8), borderRadius: scale(4) },
  emoji: {
    fontSize: moderateScale(30),
    textAlign: "center",
    marginBottom: verticalScale(8),
  },
  title: {
    fontSize: moderateScale(22),
    fontFamily: AUTH_FONTS.bold,
    color: AUTH_COLORS.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: moderateScale(18),
    fontFamily: AUTH_FONTS.bold,
    color: AUTH_COLORS.brand,
    textAlign: "center",
    marginTop: verticalScale(6),
    marginBottom: verticalScale(16),
  },
  infoBox: {
    backgroundColor: "#EAF0FB",
    borderRadius: moderateScale(16),
    padding: scale(16),
  },
  body: {
    fontSize: moderateScale(14.5),
    lineHeight: moderateScale(22),
    fontFamily: AUTH_FONTS.regular,
    color: AUTH_COLORS.text,
    textAlign: "center",
  },
  bodyHighlight: {
    fontFamily: AUTH_FONTS.bold,
    color: AUTH_COLORS.brand,
  },
  note: {
    fontSize: moderateScale(13),
    lineHeight: moderateScale(19),
    fontFamily: AUTH_FONTS.regular,
    color: AUTH_COLORS.textMuted,
    textAlign: "center",
    marginTop: verticalScale(10),
  },
  features: { marginTop: verticalScale(18) },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(12),
  },
  check: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: "#E3F7EC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(10),
  },
  featureText: {
    flex: 1,
    fontSize: moderateScale(14.5),
    fontFamily: AUTH_FONTS.regular,
    color: AUTH_COLORS.text,
  },
  error: {
    marginTop: verticalScale(12),
    fontSize: moderateScale(12.5),
    lineHeight: moderateScale(18),
    fontFamily: AUTH_FONTS.medium,
    color: AUTH_COLORS.danger,
    textAlign: "center",
  },
  cta: {
    height: moderateScale(52),
    borderRadius: moderateScale(12),
    backgroundColor: AUTH_COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(16),
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    color: AUTH_COLORS.onBrand,
    fontSize: moderateScale(16.5),
    fontFamily: AUTH_FONTS.semibold,
  },
  dismiss: { alignItems: "center", paddingVertical: verticalScale(14) },
  dismissInert: { opacity: 0.45 },
  dismissText: {
    fontSize: moderateScale(14.5),
    fontFamily: AUTH_FONTS.regular,
    color: AUTH_COLORS.textFaint,
  },
  dismissActive: { color: AUTH_COLORS.textMuted },
});
