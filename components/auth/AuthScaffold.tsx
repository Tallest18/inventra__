// components/auth/AuthScaffold.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { moderateScale, scale, verticalScale } from "@/utils/scaling";
import { AUTH_COLORS, AUTH_FONTS, AUTH_METRICS } from "./authTheme";

interface AuthScaffoldProps {
  /** Icon shown in the rounded chip above the title. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Avatar shown instead of the icon chip (Welcome Back). */
  avatarUri?: string | null;
  title: string;
  subtitle?: React.ReactNode;
  /** Centers the header text and hides the chip  used by the Hello screen. */
  centered?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
  sheetStyle?: ViewStyle;
}

/**
 * The blue header + white sheet every auth screen is built on. Keeping it in one
 * place is what makes the seven screens in the design read as one flow.
 */
export const AuthScaffold: React.FC<AuthScaffoldProps> = ({
  icon,
  avatarUri,
  title,
  subtitle,
  centered = false,
  showBack = true,
  onBack,
  children,
  sheetStyle,
}) => {
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace("/(Auth)/WelcomeScreen");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={AUTH_COLORS.brand} />

      <View style={[styles.header, { paddingTop: insets.top + verticalScale(16) }]}>
        {showBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="arrow-back"
              size={moderateScale(20)}
              color={AUTH_COLORS.onBrand}
            />
          </TouchableOpacity>
        )}

        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : icon && !centered ? (
          <View style={styles.iconChip}>
            <Ionicons
              name={icon}
              size={moderateScale(22)}
              color={AUTH_COLORS.onBrand}
            />
          </View>
        ) : null}

        <Text style={[styles.title, centered && styles.centerText]}>{title}</Text>

        {typeof subtitle === "string" ? (
          <Text style={[styles.subtitle, centered && styles.centerText]}>
            {subtitle}
          </Text>
        ) : (
          subtitle
        )}
      </View>

      <View style={[styles.sheet, sheetStyle]}>{children}</View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AUTH_COLORS.brand },
  header: {
    paddingHorizontal: AUTH_METRICS.gutter,
    paddingBottom: verticalScale(24),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: AUTH_COLORS.chip,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(18),
  },
  iconChip: {
    width: scale(44),
    height: scale(44),
    borderRadius: moderateScale(14),
    backgroundColor: AUTH_COLORS.chip,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(18),
  },
  avatar: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    marginBottom: verticalScale(14),
    backgroundColor: AUTH_COLORS.chip,
  },
  title: {
    fontSize: moderateScale(27),
    lineHeight: moderateScale(34),
    fontFamily: AUTH_FONTS.bold,
    color: AUTH_COLORS.onBrand,
  },
  subtitle: {
    fontSize: moderateScale(14),
    lineHeight: moderateScale(21),
    fontFamily: AUTH_FONTS.regular,
    color: AUTH_COLORS.onBrandMuted,
    marginTop: verticalScale(6),
  },
  centerText: { textAlign: "center" },
  sheet: {
    flex: 1,
    backgroundColor: AUTH_COLORS.sheet,
    borderTopLeftRadius: AUTH_METRICS.sheetRadius,
    borderTopRightRadius: AUTH_METRICS.sheetRadius,
    paddingHorizontal: AUTH_METRICS.gutter,
    paddingTop: verticalScale(22),
  },
});
