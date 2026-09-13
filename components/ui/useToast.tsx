import React, { useCallback, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text } from "react-native";

type ToastType = "success" | "error" | "warning";

/**
 * Lightweight, dependency-free toast. Mirrors the hand-rolled animated toast
 * that already lived in Checkout, extracted so any screen can drop in a
 * non-blocking warning without pulling in a native toast library.
 *
 * Usage:
 *   const { showToast, toastElement } = useToast();
 *   // ...call showToast("Out of stock", "warning") to warn
 *   // ...render {toastElement} once near the root of the screen
 */
export function useToast() {
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ToastType>("success");
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const showToast = useCallback(
    (msg: string, toastType: ToastType = "success") => {
      setMessage(msg);
      setType(toastType);
      setVisible(true);

      anim.setValue(0);
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(1600),
        Animated.timing(anim, {
          toValue: 0,
          duration: 260,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => setVisible(false));
    },
    [anim],
  );

  const toastElement = visible ? (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        type === "error"
          ? styles.error
          : type === "warning"
            ? styles.warning
            : styles.success,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-24, 0],
              }),
            },
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.95, 1],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  ) : null;

  return { showToast, toastElement };
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    zIndex: 1000,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  success: { backgroundColor: "#10B981" },
  error: { backgroundColor: "#EF4444" },
  warning: { backgroundColor: "#F59E0B" },
  text: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    textAlign: "center",
  },
});
