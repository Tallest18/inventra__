// app/(Routes)/NotificationsScreen.tsx
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { ListFooterLoader } from "@/components/ui";
import { NotificationsSkeleton } from "@/components/skeletons";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useMarkNotificationRead } from "@/hooks/useNotifications";
import { listNotifications, type ApiNotification } from "@/src/api";
import { getFontSize } from "../../utils/scaling";

const { width, height } = Dimensions.get("window");

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);
const scale = (size: number) =>
  clamp((width / 375) * size, size * 0.76, size * 1.3);
const verticalScale = (size: number) =>
  clamp((height / 812) * size, size * 0.62, size * 1.2);
const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

interface Notification {
  id: string;
  type:
    | "low_stock"
    | "out_of_stock"
    | "high_selling"
    | "zero_sales"
    | "daily_summary"
    | "weekly_summary"
    | "expense"
    | "expiry"
    | "backup"
    | "app_update"
    | "sale"
    | "product_added";
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  productId?: string;
  productName?: string;
  dateAdded: number;
  userId?: string;
}

const groupNotificationsByDate = (notifications: Notification[]) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: { [key: string]: Notification[] } = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Older: [],
  };

  notifications.forEach((notification) => {
    const notifDate = new Date(notification.dateAdded);
    const isToday = notifDate.toDateString() === today.toDateString();
    const isYesterday = notifDate.toDateString() === yesterday.toDateString();
    const isThisWeek = notifDate > weekAgo && !isToday && !isYesterday;

    if (isToday) groups.Today.push(notification);
    else if (isYesterday) groups.Yesterday.push(notification);
    else if (isThisWeek) groups["This Week"].push(notification);
    else groups["Older"].push(notification);
  });

  Object.keys(groups).forEach((key) => {
    if (groups[key].length === 0) delete groups[key];
  });

  return groups;
};

const getTimeAgo = (dateString?: string): string => {
  if (!dateString) return "Just now";
  const date = new Date(dateString).getTime();
  const diff = Math.max(0, Date.now() - date);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}min Ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h Ago`;
  if (diff < 7 * day)
    return `${Math.floor(diff / day)} Day${Math.floor(diff / day) > 1 ? "s" : ""} Ago`;
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const TYPE_LABEL: Record<string, string> = {
  low_stock: "Low Stock Alert",
  out_of_stock: "Out of Stock Alert",
  high_selling: "High-Selling Item Alert",
  zero_sales: "Zero Sales Alert",
  daily_summary: "Daily Summary Report",
  weekly_summary: "Weekly Summary Report",
  expense: "Expense Reminder",
  expense_exceeded: "Expense Alert",
  expiry: "Stock Expiry Alert",
  backup: "Backup Reminder",
  app_update: "App Update",
  sale: "Sale Completed",
  product_added: "Product Added",
  pending_payments: "Pending Payments",
  restock_recommendation: "Restock Suggestion",
  unusual_sales: "Unusual Sales",
  new_feature_tip: "Tip",
  device_storage: "Storage Warning",
  subscription_reminder: "Subscription Reminder",
  catalog_update: "Catalog Update",
};

const toNotification = (n: ApiNotification): Notification => ({
  id: String(n.id),
  type: (n.type as Notification["type"]) || "daily_summary",
  title: n.title,
  message: n.description || n.message || "",
  time: getTimeAgo(n.created_at),
  isRead:
    typeof n.is_read === "boolean"
      ? n.is_read
      : String(n.status || "").toLowerCase() === "read",
  productId:
    n.inventoryId != null
      ? String(n.inventoryId)
      : n.product != null
        ? String(n.product)
        : undefined,
  productName: n.inventory_name || undefined,
  dateAdded: n.created_at ? new Date(n.created_at).getTime() : Date.now(),
  userId: "api-user",
});

const NotificationsScreen = () => {
  const markRead = useMarkNotificationRead();
  // Opened items show as read immediately, before the next poll confirms it.
  const [readLocally, setReadLocally] = useState<Set<string>>(new Set());

  // 20 at a time, next page on scroll; loaded pages refresh every 15s.
  const feed = useInfiniteList<ApiNotification>({
    queryKey: ["notifications", "infinite"],
    fetchPage: (page, page_size) => listNotifications({ page, page_size }),
    getId: (n) => n.id,
    refetchInterval: 15000,
  });
  const loading = feed.isLoading;
  const notifications = useMemo(
    () =>
      feed.items.map((n) => {
        const mapped = toNotification(n);
        return readLocally.has(mapped.id) ? { ...mapped, isRead: true } : mapped;
      }),
    [feed.items, readLocally],
  );

  const openNotification = (item: Notification) => {
    if (!item.isRead) {
      markRead.mutate(item.id);
      setReadLocally((prev) => new Set(prev).add(item.id));
    }
    if (item.type === "high_selling") {
      const target =
        item.productName ||
        (item.message.includes(" has sold")
          ? item.message.split(" has sold")[0].trim()
          : item.productId || "");
      router.push({
        pathname: "/(Main)/Finance",
        params: { scrollTo: "topProducts", targetProduct: target },
      });
      return;
    }
    router.push({
      pathname: "/(Routes)/RestockDetails",
      params: { notificationId: item.id },
    });
  };

  const handleViewProductPage = (item: Notification) => {
    if (!item.isRead) {
      markRead.mutate(item.id);
      setReadLocally((prev) => new Set(prev).add(item.id));
    }
    const targetId = item.productId;
    if (targetId) {
      router.push({
        pathname: "/(Main)/Inventory",
        params: { focusProductId: String(targetId) },
      });
    } else {
      openNotification(item);
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "low_stock":
      case "out_of_stock":
      case "expiry":
        return (
          <Ionicons
            name="folder-open-outline"
            size={moderateScale(28)}
            color="#1155CC"
          />
        );
      case "high_selling":
      case "zero_sales":
      case "sale":
        return (
          <Ionicons
            name="cart-outline"
            size={moderateScale(28)}
            color="#1155CC"
          />
        );
      case "daily_summary":
      case "weekly_summary":
      case "expense":
        return (
          <Ionicons
            name="bar-chart-outline"
            size={moderateScale(28)}
            color="#1155CC"
          />
        );
      default:
        return (
          <Ionicons
            name="notifications-outline"
            size={moderateScale(28)}
            color="#1155CC"
          />
        );
    }
  };

  const getActionText = (type: Notification["type"]) => {
    switch (type) {
      case "low_stock":
      case "out_of_stock":
        return { primary: "Tap to restock", secondary: "View product page" };
      case "high_selling":
        return { primary: "Tap to see product trend", secondary: "" };
      case "zero_sales":
        return { primary: "Tap to open sales page", secondary: "" };
      case "daily_summary":
        return { primary: "Tap to open Daily Sales Summary", secondary: "" };
      case "weekly_summary":
        return {
          primary: "Tap to view weekly performance graph",
          secondary: "",
        };
      case "expense":
        return { primary: "Add Expense", secondary: "" };
      case "expiry":
        return { primary: "Tap to discount item", secondary: "" };
      case "backup":
        return { primary: "Tap to sync", secondary: "" };
      case "app_update":
        return { primary: "Tap to update", secondary: "" };
      default:
        return { primary: "", secondary: "" };
    }
  };

  const renderNotificationItem = (item: Notification) => {
    const actions = getActionText(item.type);

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.notificationCard}
        onPress={() => openNotification(item)}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View style={styles.iconBox}>{getNotificationIcon(item.type)}</View>

        {/* Content */}
        <View style={styles.cardContent}>
          {/* Top row: small title + time */}
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {TYPE_LABEL[item.type] ?? item.title}
            </Text>
            <Text style={styles.cardTime}>{item.time}</Text>
          </View>

          {/* Bold message */}
          <Text style={styles.cardMessage} numberOfLines={1}>
            {item.message || item.title}
          </Text>

          {/* Action row: link(s) + New badge */}
          <View style={styles.cardActionRow}>
            <View style={styles.actionLinks}>
              {actions.primary ? (
                <TouchableOpacity
                  onPress={() => openNotification(item)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Text style={styles.actionLink} numberOfLines={1}>
                    {actions.primary}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {actions.secondary ? (
                <>
                  <Text style={styles.actionSeparator}> | </Text>
                  <TouchableOpacity
                    onPress={() => handleViewProductPage(item)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <Text style={styles.actionLink} numberOfLines={1}>
                      {actions.secondary}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
            {!item.isRead && <Text style={styles.newText}>New</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      {/* Sleeping bell illustration */}
      <View style={styles.bellCircle}>
        <Text style={styles.zText}> Z</Text>
        <Text style={styles.zText}> Z</Text>
        <Text style={styles.zText}> z</Text>
        <Ionicons
          name="notifications"
          size={moderateScale(64)}
          color="#FACC15"
        />
      </View>

      <Text style={styles.emptyTitle}>All caught up!</Text>
      <Text style={styles.emptySubtitle}>
        You have no new notifications right now.
      </Text>
      <Text style={styles.emptyTip}>✅ Tips:</Text>
      <Text style={styles.emptyTipText}>
        You'll get low-stock alerts here, daily reports, payment reminders and
        expense tips show up too
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="notifications" size={32} color="#FACC15" />
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
            <View style={styles.closeButton}>
              <Ionicons name="arrow-back" size={24} color="#1C1C1C" />
            </View>
          </TouchableOpacity>
        </View>
        <NotificationsSkeleton />
      </SafeAreaView>
    );
  }

  const groupedNotifications = groupNotificationsByDate(notifications);
  const sections = Object.keys(groupedNotifications);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="notifications" size={32} color="#FACC15" />
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
          <View style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color="#1C1C1C" />
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item}
        renderItem={({ item: sectionTitle }) => (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>{sectionTitle}</Text>
            {groupedNotifications[sectionTitle].map((n) =>
              renderNotificationItem(n),
            )}
          </View>
        )}
        contentContainerStyle={[
          styles.listContent,
          sections.length === 0 && { flex: 1 },
        ]}
        ListEmptyComponent={renderEmptyState()}
        ListFooterComponent={<ListFooterLoader loading={feed.isFetchingMore} />}
        onEndReached={feed.loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E7EEFA",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    backgroundColor: "#E7EEFA",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
  },
  headerTitle: {
    fontSize: getFontSize(moderateScale(28)),
    fontFamily: "DMSans_700Bold",
    color: "#1C1C1C",
  },
  closeButton: {
    backgroundColor: "#fff",
    width: scale(52),
    height: scale(44),
    borderRadius: moderateScale(8),
    alignItems: "center",
    justifyContent: "center",
  },

  // List
  listContent: {
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(24),
  },
  section: {
    marginBottom: verticalScale(8),
  },
  sectionHeader: {
    fontSize: getFontSize(moderateScale(14)),
    color: "#6B7280",
    fontFamily: "DMSans_400Regular",
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
  },

  // Notification card  matches the UI screenshot
  notificationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(16),
    paddingVertical: scale(16),
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(12),
    gap: scale(14),
  },
  // Plain outlined icon, no tile behind it (design).
  iconBox: {
    justifyContent: "center",
    alignItems: "center",
    width: scale(36),
    height: scale(40),
  },
  cardContent: {
    flex: 1,
    gap: verticalScale(3),
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: getFontSize(moderateScale(13)),
    color: "#6B7280",
    fontFamily: "DMSans_400Regular",
    flex: 1,
  },
  cardTime: {
    fontSize: getFontSize(moderateScale(10)),
    color: "#6B7280",
    fontFamily: "DMSans_400Regular",
    marginLeft: scale(8),
  },
  cardMessage: {
    fontSize: getFontSize(moderateScale(17)),
    fontFamily: "DMSans_400Regular",
    color: "#1C1C1C",
    lineHeight: getFontSize(moderateScale(24)),
  },
  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: verticalScale(4),
  },
  actionLinks: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexWrap: "nowrap",
  },
  actionLink: {
    fontSize: getFontSize(moderateScale(12.5)),
    color: "#1155CC",
    fontFamily: "DMSans_500Medium",
  },
  actionSeparator: {
    fontSize: getFontSize(moderateScale(12.5)),
    color: "#9CA3AF",
    marginHorizontal: scale(4),
  },
  newText: {
    fontSize: getFontSize(moderateScale(10)),
    color: "#F5B400",
    fontFamily: "DMSans_500Medium",
    marginLeft: scale(6),
    flexShrink: 0,
  },
  newBadge: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(24),
    paddingHorizontal: scale(10),
    paddingVertical: scale(3),
    borderWidth: 1,
    borderColor: "#FACC15",
  },
  newBadgeText: {
    fontSize: getFontSize(moderateScale(10)),
    color: "#FACC15",
    fontFamily: "DMSans_700Bold",
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(32),
    paddingTop: verticalScale(60),
  },
  bellCircle: {
    width: scale(160),
    height: scale(160),
    borderRadius: scale(80),
    backgroundColor: "#DDE6F5",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: scale(20),
    marginBottom: verticalScale(24),
    overflow: "hidden",
  },
  zText: {
    fontSize: getFontSize(moderateScale(20)),
    fontFamily: "DMSans_700Bold",
    color: "#111",
    lineHeight: getFontSize(moderateScale(24)),
  },
  emptyTitle: {
    fontSize: getFontSize(moderateScale(20)),
    fontFamily: "DMSans_700Bold",
    color: "#111",
    marginBottom: verticalScale(8),
  },
  emptySubtitle: {
    fontSize: getFontSize(moderateScale(14)),
    fontFamily: "DMSans_400Regular",
    color: "#555",
    textAlign: "center",
    marginBottom: verticalScale(12),
  },
  emptyTip: {
    fontSize: getFontSize(moderateScale(14)),
    fontFamily: "DMSans_700Bold",
    color: "#111",
    marginBottom: verticalScale(6),
  },
  emptyTipText: {
    fontSize: getFontSize(moderateScale(13)),
    fontFamily: "DMSans_400Regular",
    color: "#555",
    textAlign: "center",
    lineHeight: getFontSize(moderateScale(20)),
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: verticalScale(12),
    fontSize: getFontSize(moderateScale(16)),
    color: "#666",
    fontFamily: "DMSans_400Regular",
  },

  // Retry
  retryButton: {
    marginTop: verticalScale(20),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(32),
    backgroundColor: "#0056D2",
    borderRadius: moderateScale(8),
  },
  retryButtonText: {
    color: "#fff",
    fontSize: getFontSize(moderateScale(16)),
    fontFamily: "DMSans_700Bold",
  },
});

export default NotificationsScreen;
