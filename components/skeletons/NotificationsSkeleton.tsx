import React from "react";
import { StyleSheet, View } from "react-native";
import { Skeleton } from "../ui/Skeleton";
import { moderateScale, scale, verticalScale } from "../../utils/scaling";

export const NotificationsSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Date Header skeleton */}
      <View style={styles.dateHeader}>
        <Skeleton width={80} height={18} borderRadius={4} />
      </View>

      {/* Notification Cards */}
      {[1, 2, 3, 4, 5].map((item) => (
        <View key={item} style={styles.card}>
          <Skeleton width={44} height={44} borderRadius={22} style={styles.iconBox} />
          <View style={styles.content}>
            <View style={styles.topRow}>
              <Skeleton width="45%" height={13} />
              <Skeleton width={50} height={12} />
            </View>
            <Skeleton width="85%" height={15} style={{ marginVertical: verticalScale(8) }} />
            <View style={styles.actionRow}>
              <Skeleton width={80} height={12} />
              <Skeleton width={36} height={16} borderRadius={4} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(10),
  },
  dateHeader: {
    marginBottom: verticalScale(14),
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(12),
    padding: scale(14),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  iconBox: {
    marginRight: scale(12),
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: verticalScale(4),
  },
});

export default NotificationsSkeleton;

