// components/ui/ListFooterLoader.tsx
// Footer for infinite-scroll lists: a spinner while the next page loads.
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export const ListFooterLoader: React.FC<{ loading: boolean }> = ({ loading }) =>
  loading ? (
    <View style={styles.wrap}>
      <ActivityIndicator size="small" color="#1155CC" />
    </View>
  ) : null;

const styles = StyleSheet.create({
  wrap: { paddingVertical: 20, alignItems: "center", width: "100%" },
});
