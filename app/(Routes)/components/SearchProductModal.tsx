import { ListFooterLoader } from "@/components/ui";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { isNearBottom, useInfiniteList } from "@/hooks/useInfiniteList";
import { searchCatalog, type CatalogProduct } from "@/src/api/catalog";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const { width } = Dimensions.get("window");
const isSmall = width < 360;

const RECENT_KEY = "inventra_recent_product_searches";
const RECENT_MAX = 6;

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectProduct: (product: CatalogProduct) => void;
}

const SearchProductModal: React.FC<Props> = ({
  visible,
  onClose,
  onSelectProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Recent searches live on the device, newest first.
  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem(RECENT_KEY)
      .then((raw) => setRecentSearches(raw ? JSON.parse(raw) : []))
      .catch(() => setRecentSearches([]));
  }, [visible]);

  const rememberSearch = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setRecentSearches((prev) => {
      const next = [
        clean,
        ...prev.filter((t) => t.toLowerCase() !== clean.toLowerCase()),
      ].slice(0, RECENT_MAX);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };
  // Debounce typing so the server isn't hit on every keystroke.
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Shared catalog search, 20 results at a time, more on scroll.
  const results = useInfiniteList<CatalogProduct>({
    queryKey: ["catalog-search", debounced],
    fetchPage: (page, page_size) =>
      searchCatalog({ search: debounced, page, page_size }),
    getId: (p) => p.id,
    enabled: visible && debounced.length > 0,
  });
  const searchResults = debounced ? results.items : [];
  const isSearching =
    debounced.length > 0 && (results.isLoading || results.isSwitching);
  // Remount the ScrollView once the sheet finishes sliding up so it measures
  // against the settled height and scrolls on first drag (see ProductFormModal).
  const [layoutKey, setLayoutKey] = useState(0);

  const { isListening, toggleListening, stopListening } = useVoiceSearch({
    onTranscript: (text) => {
      setSearchQuery(text);
    },
  });

  const handleSearch = (text: string) => setSearchQuery(text);

  const handleClose = () => {
    stopListening();
    setSearchQuery("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      onShow={() => setLayoutKey((k) => k + 1)}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Search Product</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={26} color="#000" />
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.searchInputContainer,
            isListening && styles.searchInputContainerListening,
          ]}
        >
          <Ionicons
            name="search"
            size={22}
            color="#3A3A3A"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={isListening ? "Listening... Speak now" : "Search for anything"}
            placeholderTextColor={isListening ? "#1155CC" : "#B8B8B8"}
            value={searchQuery}
            onChangeText={handleSearch}
            onSubmitEditing={() => rememberSearch(searchQuery)}
            returnKeyType="search"
            autoFocus
          />
          {searchQuery.length > 0 ? (
            <View style={styles.rightActions}>
              <TouchableOpacity
                onPress={() => {
                  stopListening();
                  setSearchQuery("");
                }}
                style={styles.clearButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleListening}
                style={[styles.micButton, isListening && styles.micButtonListening]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={isListening ? "mic" : "mic-outline"}
                  size={22}
                  color={isListening ? "#1155CC" : "#3A3A3A"}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={toggleListening}
              style={[styles.micButton, isListening && styles.micButtonListening]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isListening ? "mic" : "mic-outline"}
                size={22}
                color={isListening ? "#1155CC" : "#3A3A3A"}
              />
            </TouchableOpacity>
          )}
        </View>

        {isListening && (
          <View style={styles.listeningBadge}>
            <View style={styles.listeningDot} />
            <Text style={styles.listeningBadgeText}>Listening... Speak clearly</Text>
          </View>
        )}

        <ScrollView
          key={layoutKey}
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            if (debounced && isNearBottom(e)) results.loadMore();
          }}
          scrollEventThrottle={200}
        >
          {searchQuery.length === 0 && recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.recentHeader}>Recent</Text>
              {recentSearches.map((item, index) => (
                <TouchableOpacity
                  key={`${item}-${index}`}
                  style={styles.recentItem}
                  onPress={() => {
                    handleSearch(item);
                    rememberSearch(item);
                  }}
                >
                  <Ionicons name="search" size={22} color="#1155CC" />
                  <Text style={styles.recentText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {searchQuery.length > 0 && (
            <View style={styles.resultsSection}>
              <Text style={styles.resultsHeader}>
                {results.total > 0 && !isSearching
                  ? `${results.total} result${results.total === 1 ? "" : "s"} for `
                  : "Showing results for "}
                &quot;<Text style={styles.queryText}>{searchQuery}</Text>&quot;
              </Text>

              {isSearching ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#1155CC" />
                </View>
              ) : searchResults.length > 0 ? (
                <>
                  {searchResults.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.resultItem}
                      activeOpacity={product.in_inventory ? 1 : 0.7}
                      disabled={product.in_inventory}
                      onPress={() => {
                        rememberSearch(searchQuery);
                        onSelectProduct(product);
                      }}
                    >
                      <View style={styles.resultImageTile}>
                        {product.image_url ? (
                          <Image
                            source={{ uri: product.image_url }}
                            style={styles.resultImage}
                            resizeMode="contain"
                          />
                        ) : (
                          <Ionicons name="image-outline" size={22} color="#A0AEC0" />
                        )}
                      </View>
                      <View style={styles.resultInfo}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text style={styles.resultName} numberOfLines={2}>
                            {product.name}
                          </Text>
                          <Text style={styles.resultMeta} numberOfLines={1}>
                            {product.in_inventory
                              ? `In your inventory as ${product.inventory_name}`
                              : product.matched_alias
                                ? `Also known as ${product.matched_alias}`
                                : product.category?.name ?? ""}
                          </Text>
                        </View>
                        {product.in_inventory ? (
                          <Text style={styles.resultOwned}>Added</Text>
                        ) : (
                          <Text style={styles.resultAction}>Add Product</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                  <ListFooterLoader loading={results.isFetchingMore} />
                </>
              ) : (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>
                    No products found for &quot;{searchQuery}&quot;
                  </Text>
                  <Text style={[styles.noResultsText, { marginTop: 6 }]}>
                    Close this and choose Add Manually to add it yourself.
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E7EEFA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: isSmall ? 16 : 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: isSmall ? 21 : 24,
    color: "#1C1C1C",
    fontFamily: "DMSans_700Bold",
  },
  closeButton: {
    width: 48,
    height: 40,
    borderRadius: 6,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: isSmall ? 16 : 20,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 50,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  searchInputContainerListening: {
    borderColor: "#1155CC",
    backgroundColor: "#F8FAFF",
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  micButton: {
    padding: 6,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonListening: {
    backgroundColor: "#EEF4FF",
  },
  listeningBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#EEF4FF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
    gap: 8,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1155CC",
  },
  listeningBadgeText: {
    fontSize: 12.5,
    fontFamily: "DMSans_500Medium",
    color: "#1155CC",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    // Browsers draw a black focus ring around inputs; the white box is the design.
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
    fontSize: isSmall ? 14 : 15.5,
    color: "#1C1C1C",
    fontFamily: "DMSans_400Regular",
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  recentSection: {
    paddingHorizontal: isSmall ? 16 : 20,
  },
  recentHeader: {
    fontSize: isSmall ? 12 : 13,
    color: "#1155CC",
    marginBottom: 4,
    fontFamily: "DMSans_400Regular",
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
    paddingHorizontal: 2,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#D4DCEA",
  },
  recentText: {
    fontSize: isSmall ? 14 : 15.5,
    color: "#4A4A4A",
    marginLeft: 20,
    letterSpacing: 0.3,
    fontFamily: "DMSans_400Regular",
  },
  resultsSection: {
    flex: 1,
  },
  resultsHeader: {
    fontSize: isSmall ? 11 : 12,
    color: "#718096",
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontFamily: "DMSans_400Regular",
  },
  queryText: {
    color: "#1155CC",
    fontFamily: "DMSans_600SemiBold",
  },
  loadingContainer: {
    padding: 36,
    alignItems: "center",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: isSmall ? 16 : 20,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resultImageTile: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: "#F4F6FA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  resultImage: {
    width: "100%",
    height: "100%",
  },
  resultMeta: {
    fontSize: isSmall ? 11 : 12,
    color: "#8A94A6",
    marginTop: 2,
    fontFamily: "DMSans_400Regular",
  },
  resultOwned: {
    fontSize: isSmall ? 11 : 12,
    color: "#1BC47D",
    fontFamily: "DMSans_500Medium",
  },
  resultImagePlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 6,
    backgroundColor: "#EDF2F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultName: {
    fontSize: isSmall ? 12 : 13,
    color: "#2D3748",
    flex: 1,
    fontFamily: "DMSans_500Medium",
  },
  resultAction: {
    fontSize: isSmall ? 11 : 12,
    color: "#1155CC",
    fontFamily: "DMSans_500Medium",
  },
  noResultsContainer: {
    padding: 36,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: isSmall ? 12 : 13,
    color: "#718096",
    textAlign: "center",
    fontFamily: "DMSans_400Regular",
  },
});

export default SearchProductModal;
