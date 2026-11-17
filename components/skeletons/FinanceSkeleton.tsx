import React from "react";
import { StyleSheet, View } from "react-native";
import { Skeleton } from "../ui/Skeleton";
import { H_PAD, moderateScale, scale, verticalScale } from "../../utils/scaling";

export const FinanceSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Header skeleton */}
      <View style={styles.header}>
        <Skeleton width={140} height={28} borderRadius={6} />
      </View>

      {/* Period Selector Pills */}
      <View style={styles.periodSelector}>
        <Skeleton width="31%" height={36} borderRadius={20} />
        <Skeleton width="31%" height={36} borderRadius={20} />
        <Skeleton width="31%" height={36} borderRadius={20} />
      </View>

      {/* 3 Summary Cards */}
      <View style={styles.summaryRow}>
        {[
          styles.blueCard,
          styles.redCard,
          styles.yellowCard,
        ].map((accentStyle, index) => (
          <View key={index} style={[styles.summaryCard, accentStyle]}>
            <Skeleton width="70%" height={12} style={{ marginBottom: verticalScale(10) }} />
            <Skeleton width="90%" height={18} style={{ marginBottom: verticalScale(10) }} />
            <Skeleton width="60%" height={16} borderRadius={10} />
          </View>
        ))}
      </View>

      {/* Daily / Period Summary Card */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <Skeleton width={130} height={18} />
          <Skeleton width={110} height={28} borderRadius={14} />
        </View>

        <View style={styles.dailyGrid}>
          {[1, 2, 3, 4].map((item) => (
            <View key={item} style={styles.gridItem}>
              <Skeleton width="70%" height={12} style={{ marginBottom: verticalScale(6) }} />
              <Skeleton width="85%" height={18} />
            </View>
          ))}
        </View>
      </View>

      {/* Sales Trend Chart Skeleton */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <Skeleton width={120} height={18} />
          <View style={{ flexDirection: "row", gap: scale(8) }}>
            <Skeleton width={50} height={14} borderRadius={4} />
            <Skeleton width={50} height={14} borderRadius={4} />
          </View>
        </View>
        <Skeleton width="100%" height={160} borderRadius={8} style={{ marginTop: verticalScale(10) }} />
      </View>

      {/* Top Products Section Skeleton */}
      <View style={styles.sectionCard}>
        <Skeleton width={140} height={18} style={{ marginBottom: verticalScale(14) }} />
        {[1, 2, 3].map((row) => (
          <View key={row} style={styles.productRow}>
            <Skeleton width={40} height={40} borderRadius={8} />
            <View style={{ flex: 1, marginLeft: scale(10) }}>
              <Skeleton width="60%" height={14} style={{ marginBottom: verticalScale(6) }} />
              <Skeleton width="40%" height={11} />
            </View>
            <Skeleton width={60} height={16} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: H_PAD,
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(10),
  },
  periodSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: H_PAD,
    marginBottom: verticalScale(14),
  },
  summaryRow: {
    flexDirection: "row",
    gap: scale(8),
    paddingHorizontal: H_PAD,
    marginBottom: verticalScale(14),
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(16),
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  blueCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#1155CC",
  },
  redCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#D4183D",
  },
  yellowCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#FFBA00",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: scale(15),
    marginBottom: verticalScale(14),
    padding: scale(16),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(14),
  },
  dailyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(12),
  },
  gridItem: {
    width: "47%",
    paddingVertical: verticalScale(6),
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(8),
  },
});

export default FinanceSkeleton;

