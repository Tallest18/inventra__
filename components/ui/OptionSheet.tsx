// components/ui/OptionSheet.tsx
//
// Mobile-style picker: instead of a dropdown expanding inline, a bottom sheet
// rises with the options (BottomSheet: up to 92% of the screen, scrolls when
// there are many).
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { BottomSheet } from "./BottomSheet";

export interface OptionItem {
  label: string;
  value: string;
}

interface Props {
  visible: boolean;
  title: string;
  options: OptionItem[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  emptyText?: string;
}

export const OptionSheet: React.FC<Props> = ({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  emptyText = "No options available",
}) => (
  <BottomSheet visible={visible} title={title} onClose={onClose}>
    {options.length === 0 ? (
      <Text style={styles.empty}>{emptyText}</Text>
    ) : (
      options.map((option, index) => {
        const selected = option.value === selectedValue;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.row, index === options.length - 1 && { borderBottomWidth: 0 }]}
            onPress={() => {
              onSelect(option.value);
              onClose(); // the sheet slides away (AnimatedModal exit)
            }}
            activeOpacity={0.6}
          >
            <Text style={[styles.rowText, selected && styles.rowTextSelected]}>
              {option.label}
            </Text>
            {selected && <Ionicons name="checkmark" size={20} color="#1155CC" />}
          </TouchableOpacity>
        );
      })
    )}
  </BottomSheet>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F2F4",
  },
  rowText: {
    fontSize: 15,
    color: "#2D3748",
    fontFamily: "DMSans_400Regular",
    flex: 1,
    marginRight: 12,
  },
  rowTextSelected: { color: "#1155CC", fontFamily: "DMSans_500Medium" },
  empty: {
    padding: 24,
    textAlign: "center",
    color: "#718096",
    fontFamily: "DMSans_400Regular",
  },
});
