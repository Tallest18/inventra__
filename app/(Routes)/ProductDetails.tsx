// app/(Routes)/ProductDetails.tsx
// Route kept for deep links (and any caller that still navigates here). It
// shows the same Summary bottom sheet the Inventory screen opens in place.
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";

import ProductSummarySheet from "@/components/product/ProductSummarySheet";

const ProductDetails: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ productId?: string | string[] }>();
  const raw = Array.isArray(params.productId) ? params.productId[0] : params.productId;
  const productId = raw?.trim() || null;

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <ProductSummarySheet
        visible
        productId={productId}
        onClose={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/(Main)/Inventory");
        }}
      />
    </View>
  );
};

export default ProductDetails;
