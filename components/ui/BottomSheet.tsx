// components/ui/BottomSheet.tsx
// The app's bottom sheet: rises from the bottom over a fading backdrop
// (AnimatedModal), rounded top, drag handle, title + close. Height follows the
// content up to 92% of the screen (same as the product Summary sheet); longer
// content scrolls inside.
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedModal } from "./AnimatedModal";

export const SHEET_MAX_HEIGHT_RATIO = 0.92;

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** false when the content manages its own scrolling. */
  scroll?: boolean;
}

export const BottomSheet: React.FC<Props> = ({
  visible,
  title,
  onClose,
  children,
  scroll = true,
}) => {
  const insets = useSafeAreaInsets();
  const maxHeight = Dimensions.get("window").height * SHEET_MAX_HEIGHT_RATIO;

  const handleBackdropPress = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <AnimatedModal visible={visible} onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />
        <View style={[styles.sheet, { maxHeight, paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={handleBackdropPress} hitSlop={12}>
              <Ionicons name="close" size={24} color="#1C1C1C" />
            </TouchableOpacity>
          </View>
          {scroll ? (
            <ScrollView
              style={styles.body}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.body}>{children}</View>
          )}
        </View>
      </KeyboardAvoidingView>
    </AnimatedModal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D9D9D9",
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 18, color: "#1C1C1C", fontFamily: "DMSans_700Bold" },
  body: { flexShrink: 1 },
});
