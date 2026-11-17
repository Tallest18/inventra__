import React from "react";
import { StyleSheet, View } from "react-native";
import { Skeleton } from "../ui/Skeleton";
import { moderateScale, scale, verticalScale } from "../../utils/scaling";

export const SellSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Search Bar Skeleton */}
      <View style={styles.searchBar}>
        <Skeleton width="100%" height={46} borderRadius={10} />
      </View>

      {/* Tabs Skeleton */}
      <View style={styles.tabsRow}>
        <Skeleton width="48%" height={40} borderRadius={8} />
        <Skeleton width="48%" height={40} borderRadius={8} />
      </View>

      {/* Products Grid / Cards Skeleton */}
      <View style={styles.list}>
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <View key={item} style={styles.card}>
            <Skeleton width={50} height={50} borderRadius={8} />
            <View style={styles.cardInfo}>
              <Skeleton width="70%" height={15} style={{ marginBottom: verticalScale(6) }} />
              <Skeleton width="40%" height={12} style={{ marginBottom: verticalScale(6) }} />
              <Skeleton width="30%" height={14} />
            </View>
            <Skeleton width={38} height={38} borderRadius={19} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: scale(16),
  },
  searchBar: {
    marginVertical: verticalScale(12),
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: verticalScale(16),
  },
  list: {},
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(10),
    padding: scale(12),
    marginBottom: verticalScale(10),
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  cardInfo: {
    flex: 1,
    marginLeft: scale(12),
  },
});

export default SellSkeleton;

