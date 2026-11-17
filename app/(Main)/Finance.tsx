import React, { useCallback, useEffect, useRef, useState } from "react";
import PeriodPickerSheet from "@/components/finance/PeriodPickerSheet";
import { DateRange, defaultRange } from "@/utils/periodRange";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { styles } from "../../src/styles/Finance.styles";

import { FinanceSkeleton } from "@/components/skeletons";
import {
  DailySummaryCard,
  MonthlyReportCard,
  SalesTrendChart,
  SeasonalInsightsSection,
  SlowMovingStockSection,
  StockRecommendationsSection,
  SummaryCards,
  TopProductsSection,
} from "../../components/FinanceSections";
import { useFinanceData } from "../../hooks/useFinanceData";
import { usePdfReport } from "../../hooks/usePdfReport";
import { verticalScale } from "../../utils/scaling";
import { Period } from "../types/finance.types";

const Finance = () => {
  const params = useLocalSearchParams<{ scrollTo?: string; targetProduct?: string }>();
  const scrollTo = params.scrollTo;
  const targetProduct = params.targetProduct;

  const scrollViewRef = useRef<ScrollView>(null);
  const topProductsY = useRef<number | null>(null);
  const hasScrolledRef = useRef(false);

  const [selectedPeriod, setSelectedPeriod] = useState<Period>("Week");
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  // The summary card's day / week / month; resets to the current one whenever
  // the filter changes.
  const [summaryRange, setSummaryRange] = useState<DateRange>(() => defaultRange("Week"));

  // Month shown in the Monthly Report card (independent of the filter).
  const [reportMonth, setReportMonth] = useState<DateRange>(() => defaultRange("Month"));
  const [isReportPickerVisible, setIsReportPickerVisible] = useState(false);

  const showPicker = useCallback(() => setIsPickerVisible(true), []);
  const hidePicker = useCallback(() => setIsPickerVisible(false), []);
  const selectPeriod = useCallback((p: typeof selectedPeriod) => {
    setSelectedPeriod(p);
    setSummaryRange(defaultRange(p));
  }, []);

  const {
    dataLoading,
    financialSummary,
    dailySummary,
    topProducts,
    slowMovingStock,
    stockRecommendations,
    seasonalInsights,
    chartData,
    monthlyReport,
  } = useFinanceData(selectedPeriod, summaryRange, reportMonth);

  // Scroll to Top Performing Products section when deep-linked
  useEffect(() => {
    hasScrolledRef.current = false;
  }, [scrollTo, targetProduct]);

  const doScrollToTopProducts = useCallback(
    (yOffset?: number) => {
      if (hasScrolledRef.current || scrollTo !== "topProducts") return;
      const y = typeof yOffset === "number" ? yOffset : topProductsY.current;
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
    [scrollTo],
  );

  useEffect(() => {
    if (scrollTo === "topProducts" && !hasScrolledRef.current && topProductsY.current !== null) {
      doScrollToTopProducts();
    }
  }, [scrollTo, topProducts, doScrollToTopProducts]);

  // Downloads the full backend report for the month chosen on the card.
  const { pdfLoading, generatePDFReport } = usePdfReport({
    monthlyReport,
    reportMonth,
  });

  return (
    // FIX: Plain View as root so we control stacking ourselves.
    // SafeAreaView moves inside  it only wraps content, not the picker.
    <View style={styles.root}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {dataLoading && !financialSummary ? (
            <FinanceSkeleton />
          ) : (
            <>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Financial Central</Text>
                <Text style={styles.headerSubtitle}>
                  See how your business is performing
                </Text>
              </View>

              {/* Period Selector */}
              <View style={styles.periodSelector}>
                {(["Today", "Week", "Month"] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.periodButton,
                      selectedPeriod === p && styles.periodButtonActive,
                    ]}
                    onPress={() => selectPeriod(p)}
                  >
                    <Text
                      style={[
                        styles.periodText,
                        selectedPeriod === p && styles.periodTextActive,
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <SummaryCards
                financialSummary={
                  financialSummary || {
                    totalProfit: 0,
                    totalRevenue: 0,
                    totalExpenses: 0,
                  }
                }
              />

              <DailySummaryCard
                dailySummary={
                  dailySummary || {
                    revenue: 0,
                    profit: 0,
                    sales: 0,
                    orders: 0,
                    date: "-",
                  }
                }
                period={selectedPeriod}
                range={summaryRange}
                onOpenDatePicker={showPicker}
              />

              <TopProductsSection
                topProducts={topProducts || []}
                targetProduct={targetProduct}
                onLayout={(e) => {
                  topProductsY.current = e.nativeEvent.layout.y;
                  if (scrollTo === "topProducts" && !hasScrolledRef.current) {
                    doScrollToTopProducts(e.nativeEvent.layout.y);
                  }
                }}
              />

              <SlowMovingStockSection slowMovingStock={slowMovingStock || []} />

              <StockRecommendationsSection
                stockRecommendations={stockRecommendations || []}
              />

              <SalesTrendChart
                chartData={
                  chartData || {
                    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                    datasets: [
                      {
                        data: [0, 0, 0, 0, 0, 0, 0],
                        color: () => "#2046AE",
                        strokeWidth: 3,
                      },
                      {
                        data: [0, 0, 0, 0, 0, 0, 0],
                        color: () => "#FBBF24",
                        strokeWidth: 3,
                      },
                    ],
                  }
                }
              />

              <SeasonalInsightsSection seasonalInsights={seasonalInsights || []} />

              <MonthlyReportCard
                monthlyReport={
                  monthlyReport || {
                    month: "-",
                    totalSales: 0,
                    totalCost: 0,
                    totalProfit: 0,
                  }
                }
                reportMonth={reportMonth}
                onOpenMonthPicker={() => setIsReportPickerVisible(true)}
                pdfLoading={pdfLoading}
                onDownload={generatePDFReport}
              />
            </>
          )}

          <View style={{ height: verticalScale(40) }} />
        </ScrollView>
      </SafeAreaView>

      {/* Day / week / month picker, as a bottom sheet (depends on the filter). */}
      <PeriodPickerSheet
        visible={isPickerVisible}
        period={selectedPeriod}
        value={summaryRange}
        onSelect={setSummaryRange}
        onClose={hidePicker}
      />

      {/* Monthly Report month: same month-grid sheet. */}
      <PeriodPickerSheet
        visible={isReportPickerVisible}
        period="Month"
        value={reportMonth}
        onSelect={setReportMonth}
        onClose={() => setIsReportPickerVisible(false)}
      />
    </View>
  );
};

export default Finance;
