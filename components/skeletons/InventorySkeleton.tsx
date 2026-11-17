import React from "react";
import { StyleSheet, View } from "react-native";
import { Skeleton } from "../ui/Skeleton";
import { H_PAD, moderateScale, scale, verticalScale } from "../../utils/scaling";

export const InventorySkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Skeleton width={130} height={28} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Skeleton width="100%" height={46} borderRadius={10} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <Skeleton width={70} height={32} borderRadius={16} />
        <Skeleton width={85} height={32} borderRadius={16} />
        <Skeleton width={95} height={32} borderRadius={16} />
        <Skeleton width={80} height={32} borderRadius={16} />
      </View>

      {/* Product Items List */}
      <View style={styles.listContainer}>
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <View key={item} style={styles.productCard}>
            <Skeleton width={52} height={52} borderRadius={8} />
            <View style={styles.productInfo}>
              <Skeleton width="65%" height={15} style={{ marginBottom: verticalScale(6) }} />
              <Skeleton width="40%" height={12} style={{ marginBottom: verticalScale(6) }} />
              <Skeleton width="30%" height={14} />
            </View>
            <View style={styles.productMeta}>
              <Skeleton width={60} height={20} borderRadius={10} style={{ marginBottom: verticalScale(8) }} />
              <Skeleton width={50} height={12} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingHorizontal: H_PAD,
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(12),
  },
  searchContainer: {
    paddingHorizontal: H_PAD,
    marginBottom: verticalScale(12),
  },
  filterRow: {
    flexDirection: "row",
    gap: scale(8),
    paddingHorizontal: H_PAD,
    marginBottom: verticalScale(16),
  },
  listContainer: {
    paddingHorizontal: H_PAD,
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(10),
    padding: scale(12),
    marginBottom: verticalScale(10),
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  productInfo: {
    flex: 1,
    marginLeft: scale(12),
  },
  productMeta: {
    alignItems: "flex-end",
  },
});

export default InventorySkeleton;

