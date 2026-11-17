import React from "react";
import { StyleSheet, View } from "react-native";
import { Skeleton } from "../ui/Skeleton";
import { moderateScale, scale, verticalScale } from "../../utils/scaling";

export const MoreSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Header Skeleton */}
      <View style={styles.header}>
        <Skeleton width={90} height={26} style={{ marginBottom: verticalScale(6) }} />
        <Skeleton width={160} height={14} />
      </View>

      {/* Profile Card Skeleton */}
      <View style={styles.profileCard}>
        <Skeleton width={50} height={50} borderRadius={25} />
        <View style={styles.profileInfo}>
          <Skeleton width={120} height={16} style={{ marginBottom: verticalScale(8) }} />
          <Skeleton width={90} height={13} />
        </View>
        <Skeleton width={18} height={18} borderRadius={4} />
      </View>

      {/* Settings Section Skeleton */}
      {[1, 2].map((section) => (
        <View key={section} style={styles.section}>
          <Skeleton width={100} height={14} style={{ marginBottom: verticalScale(10) }} />
          <View style={styles.sectionCard}>
            {[1, 2, 3].map((row) => (
              <View key={row} style={styles.optionRow}>
                <Skeleton width={32} height={32} borderRadius={8} />
                <View style={{ flex: 1, marginLeft: scale(12) }}>
                  <Skeleton width="60%" height={14} />
                </View>
                <Skeleton width={16} height={16} borderRadius={4} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: scale(16),
  },
  header: {
    paddingTop: verticalScale(16),
    marginBottom: verticalScale(20),
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(14),
    padding: scale(16),
    marginBottom: verticalScale(20),
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  profileInfo: {
    flex: 1,
    marginLeft: scale(14),
  },
  section: {
    marginBottom: verticalScale(20),
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(14),
    paddingHorizontal: scale(14),
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
});

export default MoreSkeleton;

