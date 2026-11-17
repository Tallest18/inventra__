import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AnimatedModal, MODAL_CONTENT_RESET } from "@/components/ui/AnimatedModal";
import type { ApiNotification } from "@/src/api";
import {
  getFontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/scaling";

interface BroadcastModalProps {
  visible: boolean;
  notification: ApiNotification | null;
  onDismiss: () => void;
}

const formatNotificationTime = (dateStr?: string) => {
  if (!dateStr) return "Just now";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Recently";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  visible,
  notification,
  onDismiss,
}) => {
  if (!notification) return null;

  const isUrgent = notification.urgency === "urgent";
  const title = notification.title || (isUrgent ? "Urgent Notification" : "Announcement");
  const message = notification.description || notification.message || "";
  const time = formatNotificationTime(notification.created_at);

  return (
    <AnimatedModal visible={visible} onRequestClose={onDismiss}>
      <View style={[styles.overlay, MODAL_CONTENT_RESET]}>
        <View style={[styles.sheetContainer, isUrgent && styles.urgentSheetContainer]}>
          {/* Top handle bar */}
          <View style={[styles.handleBar, isUrgent && styles.urgentHandleBar]} />

          {/* Header row */}
          <View style={styles.headerRow}>
            <View style={[styles.badgeContainer, isUrgent && styles.urgentBadgeContainer]}>
              <View style={[styles.iconCircle, isUrgent && styles.urgentIconCircle]}>
                <Ionicons
                  name={isUrgent ? "alert-circle" : "megaphone"}
                  size={moderateScale(18)}
                  color={isUrgent ? "#DC2626" : "#1155CC"}
                />
              </View>
              <Text style={[styles.badgeText, isUrgent && styles.urgentBadgeText]}>
                {isUrgent ? "CRITICAL ALERT" : "Important Notice"}
              </Text>
              {isUrgent && <View style={styles.urgentDot} />}
            </View>

            <TouchableOpacity
              onPress={onDismiss}
              style={[styles.closeButton, isUrgent && styles.urgentCloseButton]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="close"
                size={moderateScale(22)}
                color={isUrgent ? "#DC2626" : "#6B7280"}
              />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text style={[styles.titleText, isUrgent && styles.urgentTitleText]}>
            {title}
          </Text>

          {/* Time with urgency sub-label */}
          <View style={styles.timeRow}>
            <Text style={[styles.timeText, isUrgent && styles.urgentTimeText]}>
              {time}
            </Text>
            {isUrgent && (
              <View style={styles.urgentFlagPill}>
                <Text style={styles.urgentFlagText}>High Priority</Text>
              </View>
            )}
          </View>

          {/* Message Content */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {isUrgent ? (
              <View style={styles.urgentMessageCard}>
                <View style={styles.urgentCardHeader}>
                  <Ionicons name="warning" size={16} color="#DC2626" />
                  <Text style={styles.urgentCardHeaderText}>URGENT MESSAGE</Text>
                </View>
                <Text style={styles.urgentMessageText}>{message}</Text>
              </View>
            ) : (
              <Text style={styles.messageText}>{message}</Text>
            )}
          </ScrollView>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.actionButton, isUrgent && styles.urgentActionButton]}
            onPress={onDismiss}
            activeOpacity={0.85}
          >
            <Text style={styles.actionButtonText}>
              {isUrgent ? "Acknowledge & Dismiss" : "Got it"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(32),
    maxHeight: "82%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 20,
    borderWidth: 1.5,
    borderColor: "transparent",
    borderBottomWidth: 0,
  },
  urgentSheetContainer: {
    borderColor: "#DC2626",
    borderWidth: 2.5,
    borderBottomWidth: 0,
    shadowColor: "#DC2626",
    shadowOpacity: 0.22,
    shadowRadius: 16,
  },
  handleBar: {
    width: scale(40),
    height: verticalScale(4),
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: verticalScale(14),
  },
  urgentHandleBar: {
    backgroundColor: "#FCA5A5",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(12),
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: moderateScale(20),
    gap: scale(6),
  },
  urgentBadgeContainer: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  iconCircle: {
    width: moderateScale(26),
    height: moderateScale(26),
    borderRadius: moderateScale(13),
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  urgentIconCircle: {
    backgroundColor: "#FEE2E2",
  },
  badgeText: {
    fontSize: getFontSize(moderateScale(12)),
    fontFamily: "DMSans_700Bold",
    color: "#1155CC",
  },
  urgentBadgeText: {
    color: "#B91C1C",
    letterSpacing: 0.5,
  },
  urgentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#DC2626",
  },
  closeButton: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  urgentCloseButton: {
    backgroundColor: "#FEF2F2",
  },
  titleText: {
    fontSize: getFontSize(moderateScale(20)),
    fontFamily: "DMSans_700Bold",
    color: "#111827",
    marginBottom: verticalScale(4),
    lineHeight: moderateScale(26),
  },
  urgentTitleText: {
    color: "#0F172A",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    marginBottom: verticalScale(14),
  },
  timeText: {
    fontSize: getFontSize(moderateScale(12)),
    fontFamily: "DMSans_400Regular",
    color: "#9CA3AF",
  },
  urgentTimeText: {
    color: "#DC2626",
    fontFamily: "DMSans_500Medium",
  },
  urgentFlagPill: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: moderateScale(6),
  },
  urgentFlagText: {
    fontSize: getFontSize(moderateScale(11)),
    fontFamily: "DMSans_700Bold",
    color: "#B91C1C",
  },
  scrollArea: {
    maxHeight: verticalScale(260),
    marginVertical: verticalScale(4),
  },
  scrollContent: {
    paddingVertical: verticalScale(4),
  },
  messageText: {
    fontSize: getFontSize(moderateScale(15)),
    fontFamily: "DMSans_400Regular",
    color: "#374151",
    lineHeight: moderateScale(22),
  },
  urgentMessageCard: {
    backgroundColor: "#FEF2F2",
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
    borderRadius: moderateScale(10),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  urgentCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginBottom: verticalScale(6),
  },
  urgentCardHeaderText: {
    fontSize: getFontSize(moderateScale(11.5)),
    fontFamily: "DMSans_700Bold",
    color: "#B91C1C",
    letterSpacing: 0.6,
  },
  urgentMessageText: {
    fontSize: getFontSize(moderateScale(14.5)),
    fontFamily: "DMSans_500Medium",
    color: "#18181B",
    lineHeight: moderateScale(22),
  },
  actionButton: {
    backgroundColor: "#1155CC",
    borderRadius: moderateScale(14),
    paddingVertical: verticalScale(14),
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(16),
    shadowColor: "#1155CC",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  urgentActionButton: {
    backgroundColor: "#DC2626",
    shadowColor: "#DC2626",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: getFontSize(moderateScale(16)),
    fontFamily: "DMSans_700Bold",
  },
});
