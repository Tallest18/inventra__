import { useMarkNotificationRead } from "@/hooks/useNotifications";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import ProductSummarySheet from "@/components/product/ProductSummarySheet";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { moderateScale, scale, homeStyles as styles } from "./homeStyles";
import { Notification, Product } from "./homeTypes";

// ─── Icon resolver ────────────────────────────────────────────────────────────

const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "low_stock":
    case "out_of_stock":
      return (
        <Ionicons
          name="folder-open-outline"
          size={moderateScale(24)}
          color="#1155CC"
        />
      );
    case "daily_summary":
    case "weekly_summary":
      return (
        <Ionicons
          name="bar-chart-outline"
          size={moderateScale(24)}
          color="#1155CC"
        />
      );
    case "high_selling":
      return (
        <Feather name="trending-up" size={moderateScale(24)} color="#1155CC" />
      );
    case "expiry":
      return (
        <Feather name="calendar" size={moderateScale(24)} color="#1155CC" />
      );
    default:
      return (
        <Ionicons
          name="notifications-outline"
          size={moderateScale(24)}
          color="#1155CC"
        />
      );
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

interface NotificationFeedProps {
  notifications?: Notification[];
  inventory?: Product[];
  onRestockProduct?: (product: Product) => void;
  onRestockById?: (productId: string) => Promise<void> | void;
}

const NotificationFeed: React.FC<NotificationFeedProps> = ({
  notifications = [],
  inventory = [],
  onRestockProduct,
  onRestockById,
}) => {
  const router = useRouter();
  // Summary sheet opens over Home instead of navigating to a page.
  const [summaryId, setSummaryId] = useState<string | null>(null);
  const markRead = useMarkNotificationRead();

  const openNotification = (id: string) => {
    markRead.mutate(id);
    const item = notifications.find((n) => n.id === id);
    if (item?.type === "high_selling") {
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
      params: { notificationId: id },
    });
  };

  const handleNotificationAction = async (
    action: Exclude<Notification["actions"], undefined>[number],
    notification: Notification,
  ) => {
    switch (action.type) {
      case "restock": {
        markRead.mutate(notification.id);
        router.push({
          pathname: "/(Routes)/RestockDetails",
          params: {
            notificationId: String(notification.id),
            productId: action.productId
              ? String(action.productId)
              : notification.productId
                ? String(notification.productId)
                : undefined,
          },
        });
        break;
      }

      case "view_product": {
        markRead.mutate(notification.id);
        const productId = action.productId ?? notification.productId;
        if (productId) {
          router.push({
            pathname: "/(Main)/Inventory",
            params: { focusProductId: String(productId) },
          });
        } else {
          router.push({
            pathname: "/(Main)/Inventory",
          });
        }
        break;
      }

      case "see_trend": {
        markRead.mutate(notification.id);
        const target =
          notification.productName ||
          (notification.message.includes(" has sold")
            ? notification.message.split(" has sold")[0].trim()
            : notification.productId || "");
        router.push({
          pathname: "/(Main)/Finance",
          params: { scrollTo: "topProducts", targetProduct: target },
        });
        break;
      }

      default:
        break;
    }
  };

  // ─── Item renderer ──────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={styles.notificationCard}
      activeOpacity={0.7}
      onPress={() => openNotification(item.id)}
    >
      <View style={styles.notifLeftSection}>
        <View style={styles.notifIconBox}>
          {getNotificationIcon(item.type)}
        </View>

        <View style={styles.notifContent}>
          <View style={styles.notifTitleRow}>
            <Text style={styles.notifTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.notifTime}>{item.time}</Text>
          </View>

          <Text style={styles.notifMessage} numberOfLines={1}>
            {item.message}
          </Text>

          {item.actions && item.actions.length > 0 && (
            <View style={{ flexDirection: "row", gap: scale(8) }}>
              {item.actions.map((action, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => {
                    void handleNotificationAction(action, item);
                  }}
                  hitSlop={8}
                  style={{
                    paddingHorizontal: scale(8),
                    paddingVertical: scale(3),
                    backgroundColor: "#FFF",
                    borderRadius: 24,
                  }}
                >
                  <Text style={{ color: "#1155CC", fontSize: 12 }}>
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.notificationSection}>
      <View style={styles.notificationHeader}>
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: scale(8) }}
        >
          <Ionicons
            name="notifications"
            size={moderateScale(30)}
            color="#FFBA00"
          />
          <Text style={styles.notificationHeaderTitle}>Notifications</Text>
        </View>
        <TouchableOpacity
          style={styles.arrowIconCircle}
          onPress={() => {
            router.push("/(Routes)/NotificationsScreen");
          }}
          activeOpacity={0.7}
        >
          <Feather
            name="arrow-up-right"
            size={moderateScale(20)}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications.slice(0, 3)}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No recent updates</Text>
        }
        scrollEnabled={false}
      />

      <ProductSummarySheet
        visible={!!summaryId}
        productId={summaryId}
        onClose={() => setSummaryId(null)}
      />
    </View>
  );
};

export default NotificationFeed;
