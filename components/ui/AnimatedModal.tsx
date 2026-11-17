// components/ui/AnimatedModal.tsx
//
// The app's one modal motion: the dark backdrop FADES in while the content
// RISES from the bottom of the screen; closing reverses it. Drop-in for
// <Modal transparent>: callers just toggle `visible` and the exit animation
// runs before the modal unmounts.
//
// Content should not paint its own dark overlay (that would slide up with it);
// spread `MODAL_CONTENT_RESET` onto an existing overlay view instead.
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  StyleSheet,
  View,
  type ModalProps,
} from "react-native";

export const MODAL_ENTER_MS = 300;
export const MODAL_EXIT_MS = 220;

/** Put on a modal's own full-screen overlay so only AnimatedModal's backdrop shows. */
export const MODAL_CONTENT_RESET = { backgroundColor: "transparent" } as const;

interface Props extends Omit<ModalProps, "animationType" | "transparent"> {
  visible: boolean;
  /** Dim layer behind the content. false for full-screen content. */
  backdrop?: boolean;
  backdropColor?: string;
  children: React.ReactNode;
}

export const AnimatedModal: React.FC<Props> = ({
  visible,
  backdrop = true,
  backdropColor = "rgba(0, 0, 0, 0.5)",
  children,
  ...modalProps
}) => {
  const screenH = Dimensions.get("window").height;
  const translateY = useRef(new Animated.Value(screenH)).current;
  const fade = useRef(new Animated.Value(0)).current;
  // Stays true through the exit animation so the content can slide away.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(screenH);
      fade.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: MODAL_ENTER_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: screenH,
          duration: MODAL_EXIT_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, { toValue: 0, duration: MODAL_EXIT_MS, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  return (
    <Modal {...modalProps} visible transparent animationType="none">
      <View style={styles.root} pointerEvents={visible ? "auto" : "none"}>
        {backdrop && (
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: backdropColor, opacity: fade }]}
          />
        )}
        <Animated.View style={[styles.root, { transform: [{ translateY }] }]}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});
