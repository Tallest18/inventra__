import { AnimatedModal, MODAL_CONTENT_RESET } from "@/components/ui/AnimatedModal";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("screen"); // use "screen" not "window"
const isSmall = width < 360;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSearchClick: () => void;
  onAddManually: () => void;
}

const InitialChoiceSheet: React.FC<Props> = ({
  visible,
  onClose,
  onSearchClick,
  onAddManually,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <AnimatedModal
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true} // covers status bar on Android
    >
      <TouchableOpacity
        style={[styles.modalBackdrop, MODAL_CONTENT_RESET]}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.bottomSheetContainer}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.bottomSheetContent,
              { paddingBottom: insets.bottom + 34 },
            ]}
          >
            <View style={styles.handleBar} />

            <Text style={styles.bottomSheetHeader}>Add Product</Text>

            <Text style={styles.initialChoiceTitle}>
              How would you like to{"\n"}add a product?
            </Text>
            <Text style={styles.initialChoiceSubtitle}>
              You can search from existing products or{"\n"}add a new one
              manually.
            </Text>

            <TouchableOpacity
              style={styles.searchButtonInitial}
              onPress={onSearchClick}
            >
              <Ionicons
                name="search-outline"
                size={22}
                color="#1C1C1C"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.searchButtonInitialText}>Search</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addManuallyButton}
              onPress={onAddManually}
            >
              <Ionicons
                name="add"
                size={24}
                color="#FFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.addManuallyButtonText}>Add Manually</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </AnimatedModal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    height: height, // force full screen height
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  bottomSheetContainer: {
    justifyContent: "flex-end",
  },
  bottomSheetContent: {
    backgroundColor: "#FFF",
    // Deep curve on the top corners, matching the design (and Summary sheet).
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  handleBar: {
    width: 90,
    height: 4,
    backgroundColor: "#1C1C1C",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 28,
  },
  bottomSheetHeader: {
    fontSize: isSmall ? 13 : 14,
    color: "#1155CC",
    textAlign: "center",
    marginBottom: 24,
    fontFamily: "DMSans_400Regular",
  },
  initialChoiceTitle: {
    fontSize: isSmall ? 19 : 21,
    lineHeight: isSmall ? 25 : 27,
    color: "#000000",
    textAlign: "center",
    marginBottom: 6,
    fontFamily: "DMSans_700Bold",
  },
  initialChoiceSubtitle: {
    fontSize: isSmall ? 12 : 13.5,
    color: "#BDBDBD",
    textAlign: "center",
    marginBottom: isSmall ? 22 : 26,
    lineHeight: 19,
    fontFamily: "DMSans_400Regular",
  },
  searchButtonInitial: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 50,
    paddingVertical: isSmall ? 13 : 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1155CC",
  },
  searchButtonInitialText: {
    fontSize: isSmall ? 13 : 14.5,
    color: "#1C1C1C",
    fontFamily: "DMSans_400Regular",
  },
  addManuallyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    backgroundColor: "#1155CC",
    borderRadius: 50,
    paddingVertical: isSmall ? 13 : 15,
  },
  addManuallyButtonText: {
    fontSize: isSmall ? 13 : 14.5,
    color: "#FFF",
    fontFamily: "DMSans_500Medium",
  },
});

export default InitialChoiceSheet;
