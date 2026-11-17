import React from "react";
import { StyleSheet, View } from "react-native";
import { Skeleton } from "../ui/Skeleton";
import { H_PAD, moderateScale, scale, verticalScale } from "../../utils/scaling";

export const HomeSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Sales Summary Banner Skeleton */}
      <View style={styles.bannerContainer}>
        <View style={styles.bannerCard}>
          <Skeleton width="40%" height={14} style={{ marginBottom: verticalScale(10) }} />
          <Skeleton width="65%" height={30} style={{ marginBottom: verticalScale(12) }} />
          <View style={styles.bannerFooter}>
            <Skeleton width="35%" height={14} />
            <Skeleton width="25%" height={14} />
          </View>
        </View>
      </View>

      {/* Quick Action Buttons Skeleton */}
      <View style={styles.actionsContainer}>
        <Skeleton width="48%" height={56} borderRadius={12} />
        <Skeleton width="48%" height={56} borderRadius={12} />
      </View>

      {/* Stat Cards 2x2 Grid Skeleton */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Skeleton width="50%" height={12} style={{ marginBottom: verticalScale(8) }} />
          <Skeleton width="70%" height={20} />
        </View>
        <View style={styles.statCard}>
          <Skeleton width="50%" height={12} style={{ marginBottom: verticalScale(8) }} />
          <Skeleton width="70%" height={20} />
        </View>
      </View>

      {/* Feed Header */}
      <View style={styles.feedHeader}>
        <Skeleton width={140} height={20} />
        <Skeleton width={60} height={14} />
      </View>

      {/* Feed Items */}
      <View style={styles.feedContainer}>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.feedCard}>
            <Skeleton width={38} height={38} borderRadius={19} style={{ marginRight: scale(12) }} />
            <View style={{ flex: 1 }}>
              <Skeleton width="70%" height={14} style={{ marginBottom: verticalScale(6) }} />
              <Skeleton width="90%" height={12} />
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
  },
  bannerContainer: {
    paddingHorizontal: H_PAD,
    paddingTop: verticalScale(8),
    marginBottom: verticalScale(14),
  },
  bannerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(16),
    padding: scale(18),
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bannerFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: H_PAD,
    marginBottom: verticalScale(16),
  },
  statsGrid: {
    flexDirection: "row",
    gap: scale(12),
    paddingHorizontal: H_PAD,
    marginBottom: verticalScale(20),
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(12),
    padding: scale(14),
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  feedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: H_PAD,
    marginBottom: verticalScale(12),
  },
  feedContainer: {
    paddingHorizontal: H_PAD,
  },
  feedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(12),
    padding: scale(12),
    marginBottom: verticalScale(10),
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
});

export default HomeSkeleton;

