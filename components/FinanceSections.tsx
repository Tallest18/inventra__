import { Ionicons } from "@expo/vector-icons";
import Octicons from "@expo/vector-icons/Octicons";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import TrendChart from "./charts/TrendChart";
import type { Period } from "../app/types/finance.types";
import { DateRange, rangeLabel, summaryTitle } from "../utils/periodRange";
import {
  ChartData,
  DailySummary,
  FinancialSummary,
  MonthlyReport,
  SeasonalInsight,
  SlowMovingProduct,
  StockRecommendation,
  TopProduct,
} from "../app/types/finance.types";
import { styles } from "../src/styles/FinanceSections.styles";
import { formatCurrency, formatDateLabel } from "../utils/formatters";
import { H_PAD, moderateScale, scale, screenWidth } from "../utils/scaling";
// import { getFontSize } from "./scaling";

// ─── Summary Cards ────────────────────────────────────────────────────────────

interface SummaryCardsProps {
  financialSummary: FinancialSummary;
}

// Change badge colour follows direction: increase = green, decrease = red,
// on every card (including cost). No baseline or 0% -> grey.
const BADGE = {
  good: { bg: "#DCFCE7", fg: "#15803D" },
  bad: { bg: "#FEE2E2", fg: "#B91C1C" },
  neutral: { bg: "#F2F4F7", fg: "#667085" },
} as const;

const ChangeBadge: React.FC<{ change: number | null }> = ({ change }) => {
  const flat = change == null || Math.abs(change) < 0.05;
  const up = !flat && (change as number) > 0;
  const tone = flat ? BADGE.neutral : up ? BADGE.good : BADGE.bad;
  const label = change == null
    ? "No data"
    : flat
      ? "0%"
      : `${up ? "+" : "−"}${Math.abs(change).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
  return (
    <View
      style={[styles.changeIndicator, styles.changeBadge, { backgroundColor: tone.bg }]}
      accessibilityLabel={
        change == null ? "No previous period to compare" : `${label} versus the previous period`
      }
    >
      <Ionicons
        name={flat ? "remove-outline" : up ? "trending-up" : "trending-down"}
        size={moderateScale(11)}
        color={tone.fg}
      />
      <Text style={[styles.changeText, { color: tone.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  financialSummary,
}) => {
  const cards = [
    { label: "Total Sales", value: financialSummary.totalSales, change: financialSummary.totalSalesChange, style: styles.profitCard },
    { label: "Total Cost", value: financialSummary.totalCost, change: financialSummary.totalCostChange, style: styles.revenueCard },
    { label: "Total Profit", value: financialSummary.totalProfit, change: financialSummary.totalProfitChange, style: styles.expenseCard },
  ];
  return (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryRow}>
        {cards.map((card) => (
          <View key={card.label} style={[styles.summaryCard, card.style]}>
            <Text style={styles.summaryLabel}>{card.label}</Text>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(card.value)}
            </Text>
            <ChangeBadge change={card.change} />
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── Daily Summary ────────────────────────────────────────────────────────────

interface DailySummaryCardProps {
  dailySummary: DailySummary;
  /** Today -> Daily, Week -> Weekly, Month -> Monthly Summary. */
  period: Period;
  range: DateRange;
  onOpenDatePicker: () => void;
}

export const DailySummaryCard: React.FC<DailySummaryCardProps> = ({
  dailySummary,
  period,
  range,
  onOpenDatePicker,
}) => (
  <View style={styles.section}>
    <View style={styles.dailySummaryHeader}>
      <Text style={styles.sectionTitle}>{summaryTitle(period)}</Text>
      <TouchableOpacity
        style={styles.dateSelector}
        onPress={onOpenDatePicker}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name="calendar-outline"
          size={moderateScale(13)}
          color="#1155CC"
        />
        <Text style={styles.dateText} numberOfLines={1}>{rangeLabel(period, range)}</Text>
        <Ionicons
          name="chevron-down"
          size={moderateScale(13)}
          color="#1155CC"
        />
      </TouchableOpacity>
    </View>

    <View style={styles.dailySummaryCard}>
      <View style={styles.dailySummaryRow}>
        <View style={styles.dailySummaryItem}>
          <Text style={styles.dailySummaryLabel}>Sales Amount</Text>
          <Text
            style={{ ...styles.dailySummaryValue, color: "#1155CC" }}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatCurrency(dailySummary.salesAmount)}
          </Text>
        </View>
        <View style={styles.dailySummaryItem2}>
          <Text style={styles.dailySummaryLabel}>Profit</Text>
          <Text
            style={styles.dailySummaryValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatCurrency(dailySummary.profit)}
          </Text>
        </View>
      </View>
      <View style={styles.dailySummaryRow}>
        <View style={styles.dailySummaryItem3}>
          <Text style={styles.dailySummaryLabel}>Transactions</Text>
          <Text style={styles.dailySummaryValue}>
            {dailySummary.transactions}
          </Text>
        </View>
        <View style={styles.dailySummaryItem3}>
          <Text style={styles.dailySummaryLabel}>Items Sold</Text>
          <Text style={styles.dailySummaryValue}>{dailySummary.itemsSold}</Text>
        </View>
      </View>
    </View>
  </View>
);

// ─── Top Products ─────────────────────────────────────────────────────────────

interface TopProductsProps {
  topProducts: TopProduct[];
  targetProduct?: string;
  onLayout?: (e: any) => void;
}

export const TopProductsSection: React.FC<TopProductsProps> = ({
  topProducts,
  targetProduct,
  onLayout,
}) => {
  if (topProducts.length === 0) return null;
  return (
    <View style={styles.section} onLayout={onLayout}>
      <Text style={styles.sectionTitle}>Top Performing Products</Text>
      <View style={styles.listContainer}>
        {topProducts.map((product, index) => {
          const isTargeted = Boolean(
            targetProduct &&
              (String(product.product_id) === String(targetProduct) ||
                product.product_name.toLowerCase().includes(targetProduct.toLowerCase()) ||
                targetProduct.toLowerCase().includes(product.product_name.toLowerCase())),
          );

          return (
            <View
              key={index}
              style={[
                styles.productCard,
                isTargeted && styles.focusedProductCard,
              ]}
            >
              <View style={styles.productIcon}>
                {product.image_url ? (
                  <Image
                    source={{ uri: product.image_url }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons
                    name="cube-outline"
                    size={moderateScale(20)}
                    color="#6B7280"
                  />
                )}
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1}>
                  {product.product_name}
                </Text>
                <Text style={styles.productQuantity}>
                  Sold: {product.units_sold} units
                </Text>
              </View>
              <View style={styles.productRevenue}>
                <Text
                  style={styles.productRevenueText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatCurrency(product.profit)}
                </Text>
                <Text style={styles.productRevenueLabel}>Profit</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ─── Slow Moving Stock ────────────────────────────────────────────────────────

const truncateText = (text?: string, maxLength = 20): string => {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
};

interface SlowMovingStockProps {
  slowMovingStock: SlowMovingProduct[];
}

export const SlowMovingStockSection: React.FC<SlowMovingStockProps> = ({
  slowMovingStock,
}) => {
  if (slowMovingStock.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Slow Moving Stock</Text>
      <View style={styles.listContainer}>
        {slowMovingStock.map((item, index) => (
          <View key={index} style={styles.slowStockCard}>
            <View style={styles.slowStockLeft}>
              <View style={styles.slowStockIcon}>
                {item.image_url ? (
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.slowStockImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.slowStockBadge}>
                    <Ionicons
                      name="time-outline"
                      size={moderateScale(18)}
                      color="#FF6900"
                    />
                  </View>
                )}
              </View>
              <View style={styles.slowStockInfo}>
                <Text style={styles.slowStockName} numberOfLines={1} ellipsizeMode="tail">
                  {truncateText(item.product_name, 20)}
                </Text>
                <Text style={styles.slowStockDetail}>
                  {item.units_sold} units sold
                </Text>
              </View>
            </View>
            <View style={styles.slowStockBadge}>
              <Text style={styles.slowStockDays}>
                {item.days_in_stock} days
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── Stock Recommendations ────────────────────────────────────────────────────

interface StockRecommendationsProps {
  stockRecommendations: StockRecommendation[];
}

export const StockRecommendationsSection: React.FC<
  StockRecommendationsProps
> = ({ stockRecommendations }) => {
  if (stockRecommendations.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Stock Recommendations</Text>
      <View style={styles.listContainer}>
        {stockRecommendations.map((rec, index) => (
          <View key={index} style={styles.recommendationCard}>
            <View style={styles.recommendationIcon}>
              {rec.icon === "restock" && (
                <Octicons name="package" size={20} color="#FFB800" />
              )}
              {rec.icon === "insight" && (
                <Octicons name="graph" size={20} color="#FFB800" />
              )}
              {rec.icon === "trend" && (
                <Octicons name="flame" size={20} color="#FFB800" />
              )}
              {!rec.icon && (
                <Octicons name="light-bulb" size={20} color="#FFB800" />
              )}
            </View>
            <View style={styles.recommendationContent}>
              <Text style={styles.recommendationMessage} numberOfLines={2}>
                {rec.message}
              </Text>
              <Text style={styles.recommendationDetail}>{rec.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── Chart ────────────────────────────────────────────────────────────────────

interface SalesTrendChartProps {
  chartData: ChartData;
}

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({
  chartData,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Sales & Profit Trends</Text>
    <View style={styles.chartCard}>
      {/* Responsive SVG chart: fits its card, short labels, tap for values. */}
      <TrendChart
        labels={chartData.labels}
        series={[
          { name: "Sales", color: "#1155CC", data: chartData.datasets[0]?.data ?? [], area: true },
          { name: "Profit", color: "#C27C00", data: chartData.datasets[1]?.data ?? [] },
        ]}
      />
      <Text style={styles.chartHint}>Tap or slide across the chart to see each point.</Text>
    </View>
  </View>
);

// ─── Seasonal Insights ────────────────────────────────────────────────────────

interface SeasonalInsightsProps {
  seasonalInsights: SeasonalInsight[];
}

export const SeasonalInsightsSection: React.FC<SeasonalInsightsProps> = ({
  seasonalInsights,
}) => {
  if (seasonalInsights.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Seasonal Insights</Text>
      <View style={styles.listContainer}>
        {seasonalInsights.map((insight, index) => (
          <View key={index} style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Text style={styles.insightMonth}>{insight.month}</Text>
              {/* Rise green, fall red (e.g. a "Quiet Month" is negative). */}
              <View
                style={[
                  styles.performanceBadge,
                  String(insight.performance).trim().startsWith("-") && {
                    backgroundColor: BADGE.bad.bg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.performanceText,
                    String(insight.performance).trim().startsWith("-") && {
                      color: BADGE.bad.fg,
                    },
                  ]}
                >
                  {insight.performance}
                </Text>
              </View>
            </View>
            <Text style={styles.insightLabel}>{insight.label}</Text>
            <Text style={styles.insightDescription}>{insight.description}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── Monthly Report ───────────────────────────────────────────────────────────

interface MonthlyReportCardProps {
  monthlyReport: MonthlyReport;
  /** Month the report covers; picked from a bottom sheet. */
  reportMonth: DateRange;
  onOpenMonthPicker: () => void;
  pdfLoading: boolean;
  onDownload: () => void;
}

export const MonthlyReportCard: React.FC<MonthlyReportCardProps> = ({
  monthlyReport,
  reportMonth,
  onOpenMonthPicker,
  pdfLoading,
  onDownload,
}) => {
  const empty = monthlyReport.status === "no_data";
  return (
  <View style={styles.section}>
    <View style={styles.dailySummaryHeader}>
      <Text style={styles.sectionTitle}>Monthly Report</Text>
      {/* Month selector: opens the months-of-the-year sheet. */}
      <TouchableOpacity
        style={styles.dateSelector}
        onPress={onOpenMonthPicker}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Choose report month"
      >
        <Ionicons name="calendar-outline" size={moderateScale(13)} color="#1155CC" />
        <Text style={styles.dateText} numberOfLines={1}>
          {rangeLabel("Month", reportMonth)}
        </Text>
        <Ionicons name="chevron-down" size={moderateScale(13)} color="#1155CC" />
      </TouchableOpacity>
    </View>
    <View style={styles.monthlyReportCard}>
      <View style={styles.monthlyReportHeader}>
        <Text style={styles.monthlyReportMonth} numberOfLines={1}>
          {monthlyReport.month}
        </Text>
        <View style={[styles.readyBadge, empty && { backgroundColor: "#F2F4F7" }]}>
          <Text style={[styles.readyBadgeText, empty && { color: "#667085" }]}>
            {empty ? "No sales" : "Ready"}
          </Text>
        </View>
      </View>
      <Text style={styles.monthlyReportSubtitle}>
        {empty
          ? "No sales were recorded in this month"
          : "Your monthly financial report is ready"}
      </Text>
      <View style={styles.monthlyReportStats}>
        {[
          { label: "Total Sales", value: monthlyReport.totalSales },
          { label: "Total Cost", value: monthlyReport.totalCost },
          { label: "Total Profit", value: monthlyReport.totalProfit },
        ].map((row) => (
          <View key={row.label} style={styles.monthlyReportStat}>
            <Text style={styles.monthlyReportStatLabel}>{row.label}</Text>
            <Text
              style={styles.monthlyReportStatValue}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCurrency(row.value)}
            </Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.downloadButton, empty && { opacity: 0.45 }]}
        onPress={onDownload}
        disabled={pdfLoading || empty}
      >
        {pdfLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons
              name="download-outline"
              size={moderateScale(17)}
              color="#FFFFFF"
            />
            <Text style={styles.downloadButtonText}>Download Report (PDF)</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  </View>
  );
};
