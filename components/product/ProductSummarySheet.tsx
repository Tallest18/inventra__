// components/product/ProductSummarySheet.tsx
//
// The product "Summary" bottom sheet. It is a Modal over the CURRENT screen
// (not a route), so the screen underneath stays visible on web and native.
//
// Speed: callers pass the row they already have from a list (`initialItem`),
// so the sheet renders instantly and only refreshes in the background.
import { MaterialIcons, Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AddProductFlow from "@/app/(Routes)/AddProductFlow";
import ProductSummaryView from "@/app/(Routes)/components/ProductSummaryView";
import { styles as summaryStyles } from "@/app/(Routes)/ProductDetails.styles";
import { Skeleton } from "@/components/ui";
import { getUserInventoryItem, type ApiUserInventoryItem } from "@/src/api";
import type { Product } from "@/src/api/dummyData/dummyProducts";
import { formatCurrency } from "@/utils/formatters";

const formatExpiryDate = (dateString: string): string => {
  if (!dateString) return "Not specified";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Not specified";
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

export const toProduct = (data: ApiUserInventoryItem): Product => {
  const costPrice = Number(data.cost_price || 0);
  const sellingPrice = Number(data.selling_price || 0);
  return {
    id: String(data.id),
    name: data.name,
    category: data.category || "",
    barcode: String(data.barcode || ""),
    image: data.image_url ? { uri: data.image_url } : null,
    quantityType: data.quantity_type || data.unit_type || "Single Items",
    unitsInStock: Number(data.units_in_stock || 0),
    profitPerUnit: sellingPrice - costPrice,
    costPrice,
    sellingPrice,
    lowStockThreshold: data.low_stock_threshold ?? 0,
    expiryDate: data.expiry_date || "",
    supplier: { name: data.supplier_name || "", phone: data.supplier_phone || "" },
    dateAdded: data.added_at || data.updated_at || new Date().toISOString(),
    userId: "api-user",
  };
};

interface Props {
  visible: boolean;
  /** user-inventory id */
  productId: string | number | null;
  /** The row the caller already has (from a list)  makes opening instant. */
  initialItem?: ApiUserInventoryItem;
  onClose: () => void;
}

const ProductSummarySheet: React.FC<Props> = ({
  visible,
  productId,
  initialItem,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["inventory-item", String(productId)],
    queryFn: () => getUserInventoryItem(productId as string | number),
    enabled: visible && productId != null,
    initialData: initialItem,
    // List rows are fresh enough to show; still refresh once in the background.
    initialDataUpdatedAt: 0,
  });
  const product = data ? toProduct(data) : null;

  // ── Motion: backdrop fades, sheet slides up; reversed before closing ──────
  const screenH = Dimensions.get("window").height;
  const translateY = useRef(new Animated.Value(screenH)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(screenH);
    backdrop.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible, screenH, translateY, backdrop]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: screenH,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose, screenH, translateY, backdrop]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}
    >
      <View style={local.root}>
        <Animated.View style={[local.backdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        <Animated.View
          style={[
            local.sheet,
            { paddingBottom: insets.bottom, transform: [{ translateY }] },
          ]}
        >
          <View style={summaryStyles.handle} />
          <View style={summaryStyles.header}>
            <Text style={summaryStyles.headerTitle}>Summary</Text>
            <TouchableOpacity
              style={summaryStyles.closeButton}
              onPress={close}
              hitSlop={12}
            >
              <MaterialIcons name="close" size={26} color="#000" />
            </TouchableOpacity>
          </View>

          {product ? (
            // flex: 1 inside a fixed-height sheet = all content reachable by scroll.
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 12 }}
              showsVerticalScrollIndicator={false}
            >
              <ProductSummaryView
                imageUri={product.image?.uri}
                sections={[
                  {
                    title: "Product Info",
                    rows: [
                      { label: "Name:", value: product.name },
                      { label: "Category:", value: product.category },
                      { label: "Barcode:", value: product.barcode },
                    ],
                  },
                  {
                    title: "Quantity & Pricing",
                    rows: [
                      { label: "Units in Stock:", value: String(product.unitsInStock) },
                      { label: "Unit Type:", value: product.quantityType },
                      { label: "Cost Price:", value: formatCurrency(product.costPrice ?? 0) },
                      { label: "Selling Price:", value: formatCurrency(product.sellingPrice ?? 0) },
                    ],
                  },
                  {
                    title: "Stock Settings",
                    rows: [
                      { label: "Low Stock Threshold:", value: String(product.lowStockThreshold) },
                      { label: "Expiry Date:", value: formatExpiryDate(product.expiryDate) },
                    ],
                  },
                  {
                    title: "Supplier Info",
                    rows: [
                      { label: "Name:", value: product.supplier.name },
                      { label: "Phone no:", value: product.supplier.phone },
                    ],
                  },
                ]}
                footer={
                  <TouchableOpacity
                    style={summaryStyles.editButton}
                    onPress={() => setShowEdit(true)}
                  >
                    <Feather name="edit-2" size={20} color="#FFFFFF" />
                    <Text style={summaryStyles.editButtonText}>Edit Product</Text>
                  </TouchableOpacity>
                }
              />
            </ScrollView>
          ) : (
            <View style={{ padding: 16 }}>
              {isLoading ? (
                <>
                  <Skeleton width="100%" height={120} borderRadius={12} style={{ marginBottom: 16 }} />
                  <Skeleton width="60%" height={22} style={{ marginBottom: 8 }} />
                  <Skeleton width="35%" height={14} style={{ marginBottom: 20 }} />
                  {[1, 2, 3, 4].map((i) => (
                    <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
                      <Skeleton width="30%" height={14} />
                      <Skeleton width="40%" height={14} />
                    </View>
                  ))}
                  <Skeleton width="100%" height={48} borderRadius={12} style={{ marginTop: 24 }} />
                </>
              ) : (
                <View style={local.state}>
                  <Text style={summaryStyles.errorText}>
                    {isError ? "Couldn't load this product." : "Product not found."}
                  </Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>
      </View>

      {product && (
        <AddProductFlow
          visible={showEdit}
          onClose={() => setShowEdit(false)}
          onSaveProduct={() => {
            setShowEdit(false);
            queryClient.invalidateQueries({ queryKey: ["inventory-item", String(productId)] });
            queryClient.invalidateQueries({ queryKey: ["user-inventory"] });
          }}
          initialProduct={product}
        />
      )}
    </Modal>
  );
};

const local = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sheet: {
    // Fixed height: the same size while loading and loaded, no jump, no clipping.
    height: "92%",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  state: { flex: 1, alignItems: "center", justifyContent: "center" },
});

export default ProductSummarySheet;
