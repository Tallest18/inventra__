// components/auth/AuthButton.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

import { moderateScale, scale } from "@/utils/scaling";
import { AUTH_COLORS, AUTH_FONTS, AUTH_METRICS } from "./authTheme";

interface AuthButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** The design puts a trailing arrow on "Continue" but not on "Verify Code". */
  withArrow?: boolean;
  variant?: "primary" | "ghost";
  style?: ViewStyle;
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  withArrow = false,
  variant = "primary",
  style,
}) => {
  const inactive = disabled || loading;
  const ghost = variant === "ghost";

  return (
    <TouchableOpacity
      style={[
        styles.button,
        ghost ? styles.ghost : styles.primary,
        inactive && styles.inactive,
        style,
      ]}
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator
          color={ghost ? AUTH_COLORS.brand : AUTH_COLORS.onBrand}
          size="small"
        />
      ) : (
        <>
          <Text style={[styles.label, ghost && styles.ghostLabel]}>{label}</Text>
          {withArrow && (
            <Ionicons
              name="arrow-forward"
              size={moderateScale(17)}
              color={ghost ? AUTH_COLORS.brand : AUTH_COLORS.onBrand}
              style={styles.arrow}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: AUTH_METRICS.buttonHeight,
    borderRadius: AUTH_METRICS.buttonRadius,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: AUTH_COLORS.brand },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: AUTH_COLORS.brand,
  },
  inactive: { opacity: 0.5 },
  label: {
    color: AUTH_COLORS.onBrand,
    fontSize: moderateScale(16),
    fontFamily: AUTH_FONTS.semibold,
  },
  ghostLabel: { color: AUTH_COLORS.brand },
  arrow: { marginLeft: scale(8) },
});
