// components/auth/PinPad.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { moderateScale, scale, verticalScale } from "@/utils/scaling";
import { AUTH_COLORS, AUTH_FONTS } from "./authTheme";

export const PIN_LENGTH = 4;

interface PinPadProps {
  /** The digits entered so far. */
  value: string;
  onChange: (next: string) => void;
  /** Label above the dots — "ENTER PIN" / "CONFIRM PIN". */
  label: string;
  /** Two-segment progress bar on the create/confirm screens. */
  progress?: { step: number; total: number };
  error?: string | null;
  disabled?: boolean;
  /** "Start over" / "Forgot PIN?" link under the keypad. */
  footer?: React.ReactNode;
}

const KEYS: (string | null)[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  null,
  "0",
  "delete",
];

export const PinPad: React.FC<PinPadProps> = ({
  value,
  onChange,
  label,
  progress,
  error,
  disabled = false,
  footer,
}) => {
  const shake = useRef(new Animated.Value(0)).current;

  // A wrong PIN clears the dots, so without the shake the screen would simply go
  // blank with no sign anything happened.
  useEffect(() => {
    if (!error) return;
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0.6, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [error, shake]);

  const press = (key: string) => {
    if (disabled) return;
    if (key === "delete") {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length >= PIN_LENGTH) return;
    onChange(value + key);
  };

  const translateX = shake.interpolate({
    inputRange: [-1, 1],
    outputRange: [-scale(10), scale(10)],
  });

  return (
    <View style={styles.container}>
      {progress && (
        <View style={styles.progressTrack}>
          {Array.from({ length: progress.total }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressSegment,
                index < progress.step && styles.progressSegmentActive,
              ]}
            />
          ))}
        </View>
      )}

      <Text style={styles.label}>{label}</Text>

      <Animated.View style={[styles.dotsRow, { transform: [{ translateX }] }]}>
        {Array.from({ length: PIN_LENGTH }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index < value.length && styles.dotFilled,
              !!error && styles.dotError,
            ]}
          />
        ))}
      </Animated.View>

      <Text style={styles.error} numberOfLines={2}>
        {error ?? ""}
      </Text>

      <View style={styles.keypad}>
        {KEYS.map((key, index) =>
          key === null ? (
            <View key={`spacer-${index}`} style={styles.keySpacer} />
          ) : (
            <TouchableOpacity
              key={key}
              style={[styles.key, disabled && styles.keyDisabled]}
              onPress={() => press(key)}
              disabled={disabled}
              activeOpacity={0.6}
            >
              {key === "delete" ? (
                <Ionicons
                  name="backspace-outline"
                  size={moderateScale(22)}
                  color={AUTH_COLORS.text}
                />
              ) : (
                <Text style={styles.keyLabel}>{key}</Text>
              )}
            </TouchableOpacity>
          ),
        )}
      </View>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
};

const KEY_GAP = scale(12);

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressTrack: {
    flexDirection: "row",
    gap: scale(6),
    marginBottom: verticalScale(20),
  },
  progressSegment: {
    flex: 1,
    height: verticalScale(4),
    borderRadius: 2,
    backgroundColor: AUTH_COLORS.border,
  },
  progressSegmentActive: { backgroundColor: AUTH_COLORS.brand },
  label: {
    textAlign: "center",
    fontSize: moderateScale(12),
    letterSpacing: 1.2,
    fontFamily: AUTH_FONTS.medium,
    color: AUTH_COLORS.textMuted,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: scale(14),
    marginTop: verticalScale(16),
  },
  dot: {
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    borderWidth: 1.5,
    borderColor: AUTH_COLORS.border,
  },
  dotFilled: {
    backgroundColor: AUTH_COLORS.brand,
    borderColor: AUTH_COLORS.brand,
  },
  dotError: { borderColor: AUTH_COLORS.danger },
  error: {
    minHeight: verticalScale(34),
    marginTop: verticalScale(10),
    textAlign: "center",
    fontSize: moderateScale(12.5),
    lineHeight: moderateScale(17),
    fontFamily: AUTH_FONTS.medium,
    color: AUTH_COLORS.danger,
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: KEY_GAP,
  },
  key: {
    width: "31.5%",
    height: verticalScale(58),
    borderRadius: moderateScale(14),
    backgroundColor: AUTH_COLORS.field,
    alignItems: "center",
    justifyContent: "center",
  },
  keyDisabled: { opacity: 0.5 },
  keySpacer: { width: "31.5%" },
  keyLabel: {
    fontSize: moderateScale(21),
    fontFamily: AUTH_FONTS.medium,
    color: AUTH_COLORS.text,
  },
  footer: { alignItems: "center", marginTop: verticalScale(18) },
});
