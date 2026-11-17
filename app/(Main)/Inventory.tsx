import { isNearBottom, useInfiniteList } from "@/hooks/useInfiniteList";
import { getUserInventoryItem, listUserInventory } from "@/src/api";
import { Product as UIProduct } from "@/src/api/dummyData/dummyProducts";
import type { ApiUserInventoryItem } from "@/src/api/products";
import { AntDesign, Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { formatCurrency } from "@/utils/formatters";
import { ListFooterLoader, Spinner } from "@/components/ui";
import { InventorySkeleton } from "@/components/skeletons";
import ProductSummarySheet from "@/components/product/ProductSummarySheet";
import AddProductFlow from "../(Routes)/AddProductFlow";
import { styles } from "../../src/styles/Inventory.styles";

type FilterType = "all" | "inStock" | "outOfStock" | "expiring";

interface FilterItem {
  key: string;
  label: string;
  count: number;
}

const { width } = Dimensions.get("window");
const isSmallDevice = width < 375;
const isTablet = width >= 768;
const scale = (size: number) => {
  const baseWidth = 375;
  const ratio = width / baseWidth;
  if (isTablet) return size * Math.min(ratio, 1.4);
  return size * ratio;
};
const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

const H_PAD = isTablet ? scale(32) : isSmallDevice ? scale(14) : scale(20);

const Inventory: React.FC = () => {
  const params = useLocalSearchParams<{ focusProductId?: string }>();
  const focusProductId = Array.isArray(params.focusProductId)
    ? params.focusProductId[0]
    : params.focusProductId;

  const scrollViewRef = useRef<ScrollView>(null);
  const itemPositions = useRef<Record<string, number>>({});
  const hasScrolledRef = useRef(false);

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"recent" | "name" | "name_desc">("recent");
  const [showAddProduct, setShowAddProduct] = useState<boolean>(false);
  // Product whose Summary sheet is open (opens over this screen, not a page).
  const [summaryItem, setSummaryItem] = useState<ApiUserInventoryItem | null>(null);
  const [extraFocusItem, setExtraFocusItem] = useState<ApiUserInventoryItem | null>(null);

  // When deep-linked to a specific product, ensure it's visible in the list and reset scroll lock.
  useEffect(() => {
    if (focusProductId) {
      setActiveFilter("all");
      setSearchQuery("");
      hasScrolledRef.current = false;
    }
  }, [focusProductId]);

  // Debounced so each keystroke doesn't start a new paginated query.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const toggleSortOrder = () => {
    setSortOrder((prev) => {
      if (prev === "recent") return "name";
      if (prev === "name") return "name_desc";
      return "recent";
    });
  };

  // Paginated inventory: search, tab filter and sort all run on the server,
  // 20 rows at a time, with the next page fetched as the user nears the end.
  const serverFilter = activeFilter === "all" ? undefined : activeFilter;
  const {
    items: inventoryItems,
    isLoading: loading,
    isSwitching: searching,
    isFetchingMore,
    loadMore,
  } = useInfiniteList<ApiUserInventoryItem>({
    queryKey: ["user-inventory", "infinite", debouncedSearch, serverFilter, sortOrder],
    fetchPage: (page, page_size) =>
      listUserInventory({
        search: debouncedSearch || undefined,
        filter: serverFilter,
        sort: sortOrder,
        page,
        page_size,
      }),
    getId: (p) => p.id,
  });

  // If focusProductId is not in the currently loaded page, fetch it directly so it renders
  useEffect(() => {
    if (!focusProductId) {
      setExtraFocusItem(null);
      return;
    }
    const exists = inventoryItems.some((i) => String(i.id) === String(focusProductId));
    if (!exists) {
      getUserInventoryItem(focusProductId)
        .then((item) => setExtraFocusItem(item))
        .catch((err) => console.warn("Could not fetch focus product:", err));
    } else {
      setExtraFocusItem(null);
    }
  }, [focusProductId, inventoryItems]);

  // Map API product to UI Product type
  function mapApiProductToUI(p: ApiUserInventoryItem): UIProduct {
    if (typeof p.barcode !== "string") {
      console.warn("API barcode is not string, got:", p.barcode);
    }

    const costPrice = Number(p.cost_price || 0);
    const sellingPrice = Number(p.selling_price || 0);

    return {
      id: String(p.id),
      name: p.name,
      category: p.category || "",
      barcode: String(p.barcode),
      image: p.image_url ? { uri: p.image_url } : null,
      quantityType: p.quantity_type || p.unit_type || "Single Items",
      unitsInStock: Number(p.units_in_stock || 0),
      profitPerUnit: sellingPrice - costPrice,
      costPrice,
      sellingPrice,
      lowStockThreshold: p.low_stock_threshold ?? 0,
      expiryDate: p.expiry_date || "",
      supplier: { name: p.supplier_name || "", phone: p.supplier_phone || "" },
      dateAdded: p.added_at || p.updated_at || new Date().toISOString(),
      userId: "api-user",
    };
  }

  // Preserve natural order; append extra focus item if needed.
  const filteredProducts = useMemo<UIProduct[]>(() => {
    const list = [...inventoryItems];
    if (
      extraFocusItem &&
      !list.some((i) => String(i.id) === String(extraFocusItem.id))
    ) {
      list.push(extraFocusItem);
    }
    return list.map(mapApiProductToUI);
  }, [inventoryItems, extraFocusItem]);

  const scrollToFocusedItem = useCallback(
    (targetY?: number) => {
      if (!focusProductId) return;
      const y =
        typeof targetY === "number"
          ? targetY
          : itemPositions.current[String(focusProductId)];
      if (typeof y === "number" && scrollViewRef.current) {
        hasScrolledRef.current = true;
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, y - 20),
            animated: true,
          });
        }, 120);
      }
    },
    [focusProductId],
  );

  useEffect(() => {
    if (focusProductId && !hasScrolledRef.current) {
      scrollToFocusedItem();
    }
  }, [focusProductId, filteredProducts, scrollToFocusedItem]);

  // A genuinely empty shop: no rows with no search and no tab filter applied.
  const inventoryEmpty =
    !loading && !searching && filteredProducts.length === 0 &&
    activeFilter === "all" && !debouncedSearch;

  const handleSearchChange = (text: string): void => setSearchQuery(text);
  const clearSearch = (): void => setSearchQuery("");

  const handleAddProduct = async (): Promise<void> => {
    Alert.alert("Success", "Product added to inventory!");
  };

  const renderFilterTabs = (): React.ReactElement => {
    const filters: Omit<FilterItem, "count">[] = [
      { key: "all", label: "All Products" },
      { key: "inStock", label: "In Stock" },
      { key: "outOfStock", label: "Out of Stock" },
      { key: "expiring", label: "Expiring" },
    ];

    return (
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContentContainer}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                activeFilter === filter.key && styles.activeFilterTab,
              ]}
              onPress={() => setActiveFilter(filter.key as FilterType)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter.key && styles.activeFilterText,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const cardWidth = isTablet ? (width - H_PAD * 2 - scale(16)) / 2 : "100%";

  const renderProductCard = (product: UIProduct): React.ReactElement => {
    const isFocused = Boolean(
      focusProductId && String(product.id) === String(focusProductId),
    );

    return (
      <TouchableOpacity
        key={product.id}
        onLayout={(e) => {
          const y = e.nativeEvent.layout.y;
          itemPositions.current[String(product.id)] = y;
          if (isFocused && !hasScrolledRef.current) {
            scrollToFocusedItem(y);
          }
        }}
        style={[
          styles.productCard,
          { width: cardWidth as any },
          isFocused && styles.focusedProductCard,
        ]}
        onPress={() =>
          setSummaryItem(
            inventoryItems.find((i) => String(i.id) === product.id) ??
              (extraFocusItem && String(extraFocusItem.id) === product.id
                ? extraFocusItem
                : null),
          )
        }
        activeOpacity={0.8}
      >
        <View style={styles.cardContent}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>

          <View style={styles.imageAndInfoRow}>
            <Image
              source={
                product.image?.uri
                  ? { uri: product.image.uri }
                  : require("../../assets/images/noImg.jpg")
              }
              style={styles.productImage}
            />

            <View style={styles.infoBoxesContainer}>
              <View style={styles.unitPriceBox}>
                <Text style={styles.boxLabel}>Unit Price</Text>
                <Text
                  style={styles.largePrice}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatCurrency(product.sellingPrice ?? 0)}
                </Text>
              </View>

              <View style={styles.bottomBoxesRow}>
                <View style={styles.smallInfoBox}>
                  <Text style={styles.boxLabel}>In Stock</Text>
                  <Text style={styles.infoBoxValue} numberOfLines={1}>
                    {product.unitsInStock}
                  </Text>
                </View>
                <View style={styles.smallInfoBox}>
                  <Text style={styles.boxLabel}>Profit/Unit</Text>
                  <Text
                    style={styles.infoBoxValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {formatCurrency(product?.profitPerUnit ?? 0)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (): React.ReactElement => (
    <View style={styles.emptyState}>
      <Feather name="package" size={moderateScale(80)} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>No Products Yet</Text>
      <Text style={styles.emptyDescription}>
        Start building your inventory by adding your first product
      </Text>
      <TouchableOpacity
        style={styles.addFirstProductButton}
        onPress={() => setShowAddProduct(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.addFirstProductButtonText}>
          Add Your First Product
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchEmptyState = (): React.ReactElement => (
    <View style={styles.emptyState}>
      <Feather name="search" size={moderateScale(80)} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>No Products Found</Text>
      <Text style={styles.emptyDescription}>
        Try adjusting your search or filter criteria
      </Text>
      <TouchableOpacity
        style={styles.clearSearchButton}
        onPress={clearSearch}
        activeOpacity={0.8}
      >
        <Text style={styles.clearSearchText}>Clear Search</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFilterEmptyState = (): React.ReactElement => (
    <View style={styles.emptyState}>
      <Feather name="sliders" size={moderateScale(80)} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>No Products In This Filter</Text>
      <Text style={styles.emptyDescription}>
        Try another filter to see other products
      </Text>
      <TouchableOpacity
        style={styles.clearSearchButton}
        onPress={() => setActiveFilter("all")}
        activeOpacity={0.8}
      >
        <Text style={styles.clearSearchText}>Show All Products</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <InventorySkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
          Inventory
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Feather name="search" size={moderateScale(18)} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, or category"
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholderTextColor="#999"
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          activeOpacity={0.7}
          onPress={toggleSortOrder}
        >
          <AntDesign
            name={sortOrder === "name" ? "sort-ascending" : "sort-descending"}
            size={moderateScale(20)}
            color={sortOrder === "recent" ? "#888" : "#1155CC"}
          />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      {!inventoryEmpty && renderFilterTabs()}

      {/* Products Grid  replaced by a spinner while (re)loading, so only this
          area shows the loading state; the search bar, filters and tabs stay. */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.productsContainer}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        onScroll={(e) => {
          if (isNearBottom(e)) loadMore();
        }}
        scrollEventThrottle={200}
      >
        {searching ? (
          <View style={styles.listLoading}>
            <Spinner size={40} color="#1155CC" />
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {inventoryEmpty
              ? renderEmptyState()
              : filteredProducts.length === 0 && debouncedSearch.length > 0
                ? renderSearchEmptyState()
                : filteredProducts.length === 0 && activeFilter !== "all"
                  ? renderFilterEmptyState()
                  : filteredProducts.map((product) => renderProductCard(product))}
          </View>
        )}
        <ListFooterLoader loading={isFetchingMore} />
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Floating Add Product Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddProduct(true)}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={moderateScale(28)} color="white" />
      </TouchableOpacity>

      <ProductSummarySheet
        visible={!!summaryItem}
        productId={summaryItem?.id ?? null}
        initialItem={summaryItem ?? undefined}
        onClose={() => setSummaryItem(null)}
      />

      <AddProductFlow
        visible={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        onSaveProduct={() => {}}
      />
    </SafeAreaView>
  );
};

export default Inventory;
