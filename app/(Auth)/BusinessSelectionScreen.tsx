// app/(Auth)/BusinessSelectionScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthButton } from "@/components/auth/AuthButton";
import { AuthScaffold } from "@/components/auth/AuthScaffold";
import {
  AUTH_COLORS,
  AUTH_FONTS,
  AUTH_TINTS,
} from "@/components/auth/authTheme";
import { getBusinessTypes, parseApiError } from "@/src/api";
import type { BusinessTypeOption } from "@/src/api/types";
import { moderateScale, scale, verticalScale } from "@/utils/scaling";

/** Icon + one-line blurb per business type, keyed by the backend's `value`. */
const PRESENTATION: Record<
  string,
  { icon: keyof typeof Ionicons.glyphMap; blurb?: string }
> = {
  general_retail: { icon: "bag-handle-outline", blurb: "Groceries, FMCG, provisions" },
  food_drinks: { icon: "restaurant-outline", blurb: "Restaurants, canteens, fast food" },
  pharmacy: { icon: "medkit-outline", blurb: "Medicines, health products" },
  fashion: { icon: "shirt-outline", blurb: "Clothes, shoes, accessories" },
  wholesale: { icon: "cube-outline", blurb: "Bulk goods, B2B supply" },
  others: { icon: "ellipsis-horizontal-circle-outline" },
};

const FALLBACK: BusinessTypeOption[] = [
  { value: "general_retail", display: "General Retail" },
  { value: "food_drinks", display: "Food & Drinks" },
  { value: "pharmacy", display: "Pharmacy/Chemist" },
  { value: "fashion", display: "Fashion & Clothing" },
  { value: "wholesale", display: "Wholesale / Distributor" },
  { value: "others", display: "Others" },
];

const BusinessSelectionScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ phone?: string }>();

  const [options, setOptions] = useState<BusinessTypeOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getBusinessTypes()
      .then((types) => {
        if (!cancelled) setOptions(types.length ? types : FALLBACK);
      })
      .catch((err) => {
        // The list is a fixed set on the backend, so a network blip shouldn't
        // block onboarding  fall back to the documented values.
        if (cancelled) return;
        setOptions(FALLBACK);
        setError(parseApiError(err).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleContinue = () => {
    if (!selected) return;
    router.push({
      pathname: "/(Auth)/CreatePinScreen",
      params: { mode: "create", businessType: selected, phone: params.phone },
    });
  };

  return (
    <AuthScaffold
      title="Choose Business Type"
      subtitle="Help us personalise Inventra for your business."
      sheetStyle={{ paddingHorizontal: 0 }}
    >
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={AUTH_COLORS.brand} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {options.map((option, index) => {
            const isSelected = selected === option.value;
            const tint = AUTH_TINTS[index % AUTH_TINTS.length];
            const look = PRESENTATION[option.value];

            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => setSelected(option.value)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={[styles.iconTile, { backgroundColor: tint.bg }]}>
                  <Ionicons
                    name={look?.icon ?? "storefront-outline"}
                    size={moderateScale(20)}
                    color={tint.fg}
                  />
                </View>

                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{option.display}</Text>
                  {look?.blurb ? (
                    <Text style={styles.rowBlurb}>{look.blurb}</Text>
                  ) : null}
                </View>

                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + verticalScale(16) }]}
      >
        <AuthButton
          label="Continue"
          withArrow
          onPress={handleContinue}
          disabled={!selected}
        />
      </View>
    </AuthScaffold>
  );
};

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: {
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(4),
    paddingBottom: verticalScale(12),
  },
  error: {
    fontSize: moderateScale(12.5),
    fontFamily: AUTH_FONTS.medium,
    color: AUTH_COLORS.danger,
    marginBottom: verticalScale(12),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AUTH_COLORS.field,
    borderRadius: moderateScale(16),
    borderWidth: 1.5,
    borderColor: "transparent",
    padding: scale(12),
    marginBottom: verticalScale(12),
  },
  rowSelected: {
    backgroundColor: AUTH_COLORS.fieldActive,
    borderColor: AUTH_COLORS.brand,
  },
  iconTile: {
    width: scale(42),
    height: scale(42),
    borderRadius: moderateScale(12),
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, marginLeft: scale(12) },
  rowTitle: {
    fontSize: moderateScale(14.5),
    fontFamily: AUTH_FONTS.bold,
    color: AUTH_COLORS.text,
  },
  rowBlurb: {
    fontSize: moderateScale(12),
    fontFamily: AUTH_FONTS.regular,
    color: AUTH_COLORS.textMuted,
    marginTop: verticalScale(2),
  },
  radio: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: AUTH_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: AUTH_COLORS.brand },
  radioDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: AUTH_COLORS.brand,
  },
  footer: {
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(12),
    backgroundColor: AUTH_COLORS.sheet,
  },
});

export default BusinessSelectionScreen;
