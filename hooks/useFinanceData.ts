import { DateRange, toYMD } from "@/utils/periodRange";
import { apiClient } from "@/src/api/client";
import * as endpoints from "@/src/api/endpoints";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ChartData, Period } from "../app/types/finance.types";

const DEFAULT_CHART_DATA: ChartData = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  datasets: [
    {
      data: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
      color: (opacity = 1) => `rgba(32, 70, 174, ${opacity})`,
      strokeWidth: 3,
    },
    {
      data: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
      color: (opacity = 1) => `rgba(251, 191, 36, ${opacity})`,
      strokeWidth: 3,
    },
  ],
};

/**
 * These finance endpoints moved to the paginated shape ({ count, results }).
 * Reading only the old keys made every list empty, and each Finance section
 * hides itself when empty, so the sections silently disappeared.
 */
const listFrom = (raw: any, legacyKey: string): any[] =>
  Array.isArray(raw?.results)
    ? raw.results
    : Array.isArray(raw?.[legacyKey])
      ? raw[legacyKey]
      : Array.isArray(raw)
        ? raw
        : [];

export const useFinanceData = (
  selectedPeriod: Period,
  summaryRange: DateRange,
  reportMonth: DateRange,
) => {
  // Map UI period to API period
  const period = useMemo(() => {
    if (selectedPeriod === "Today") return "today";
    if (selectedPeriod === "Week") return "week";
    return "month";
  }, [selectedPeriod]);

  // Daily summary (with ?date=YYYY-MM-DD)

  // One day, a Mon–Sun week or a month (?start&end, local dates).
  const startYMD = toYMD(summaryRange.start);
  const endYMD = toYMD(summaryRange.end);
  const { data: dailySummaryRaw, isLoading: loadingDaily } = useQuery({
    queryKey: ["finance-daily-summary", startYMD, endYMD],
    queryFn: async () => {
      const res = await apiClient.get(
        endpoints.PRODUCTS_FINANCE_DAILY_SUMMARY,
        { params: { start: startYMD, end: endYMD } },
      );
      return res.data;
    },
  });

  // The API returns { sales_amount, profit, transactions, items_sold }
  const dailySummary = dailySummaryRaw
    ? {
        salesAmount: dailySummaryRaw.sales_amount ?? 0,
        profit: dailySummaryRaw.profit ?? 0,
        transactions: dailySummaryRaw.transactions ?? 0,
        itemsSold: dailySummaryRaw.items_sold ?? 0,
      }
    : {
        salesAmount: 0,
        profit: 0,
        transactions: 0,
        itemsSold: 0,
      };

  // Finance summary (with ?period=)

  const { data: financialSummaryRaw, isLoading: loadingSummary } = useQuery({
    queryKey: ["finance-summary", period],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.PRODUCTS_FINANCE_SUMMARY, {
        params: { period },
      });
      return res.data;
    },
  });

  // The API returns { period, summary: { ... } }
  const financialSummary =
    financialSummaryRaw && financialSummaryRaw.summary
      ? {
          totalSales: financialSummaryRaw.summary.total_sales ?? 0,
          totalCost: financialSummaryRaw.summary.total_cost ?? 0,
          totalProfit: financialSummaryRaw.summary.total_profit ?? 0,
          // null = no previous period to compare with (shown as neutral).
          totalSalesChange: financialSummaryRaw.summary.total_sales_change ?? null,
          totalCostChange: financialSummaryRaw.summary.total_cost_change ?? null,
          totalProfitChange: financialSummaryRaw.summary.total_profit_change ?? null,
        }
      : {
          totalSales: 0,
          totalCost: 0,
          totalProfit: 0,
          totalSalesChange: null,
          totalCostChange: null,
          totalProfitChange: null,
        };

  // Top products
  const { data: topProductsRaw, isLoading: loadingTop } = useQuery({
    queryKey: ["finance-top-products", period],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.PRODUCTS_FINANCE_TOP_PRODUCTS, {
        params: { period },
      });
      return res.data;
    },
  });

  // The API is paginated: { count, results: [...] } (older builds: top_products).
  const topProducts = listFrom(topProductsRaw, "top_products");

  // Slow moving stock

  const { data: slowMovingStockRaw, isLoading: loadingSlow } = useQuery({
    queryKey: ["finance-slow-moving", period],
    queryFn: async () => {
      const res = await apiClient.get(
        endpoints.PRODUCTS_FINANCE_SLOW_MOVING_STOCK,
        { params: { period } },
      );
      return res.data;
    },
  });

  // Paginated { results } (older builds: slow_moving_stock).
  const slowMovingStock = listFrom(slowMovingStockRaw, "slow_moving_stock");

  // Stock recommendations
  const { data: stockRecommendationsRaw, isLoading: loadingRecs } = useQuery({
    queryKey: ["finance-stock-recommendations", period],
    queryFn: async () => {
      const res = await apiClient.get(
        endpoints.PRODUCTS_FINANCE_STOCK_RECOMMENDATIONS,
        { params: { period } },
      );
      return res.data;
    },
  });

  // Paginated { results } (older builds: recommendations).
  const stockRecommendations = listFrom(stockRecommendationsRaw, "recommendations");

  // Seasonal insights

  const { data: seasonalInsightsRaw, isLoading: loadingInsights } = useQuery({
    queryKey: ["finance-seasonal-insights", period],
    queryFn: async () => {
      const res = await apiClient.get(
        endpoints.PRODUCTS_FINANCE_SEASONAL_INSIGHTS,
        { params: { period } },
      );
      return res.data;
    },
  });

  // Paginated { results } (older builds: insights).
  const seasonalInsights = listFrom(seasonalInsightsRaw, "insights");

  // Trends (for chart)

  const { data: chartDataRaw, isLoading: loadingTrends } = useQuery({
    queryKey: ["finance-trends", period],
    queryFn: async () => {
      const res = await apiClient.get(endpoints.PRODUCTS_FINANCE_TRENDS, {
        params: { period },
      });
      return res.data;
    },
  });

  // The API returns { labels, sales, profit }
  const chartData =
    chartDataRaw &&
    Array.isArray(chartDataRaw.labels) &&
    Array.isArray(chartDataRaw.sales) &&
    Array.isArray(chartDataRaw.profit)
      ? {
          labels: chartDataRaw.labels,
          datasets: [
            {
              data: chartDataRaw.sales,
              color: () => "#2046AE",
              strokeWidth: 3,
            },
            {
              data: chartDataRaw.profit,
              color: () => "#FBBF24",
              strokeWidth: 3,
            },
          ],
        }
      : {
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
        };

  // Monthly report

  const { data: monthlyReportRaw, isLoading: loadingMonthly } = useQuery({
    queryKey: [
      "finance-monthly-report",
      reportMonth.start.getFullYear(),
      reportMonth.start.getMonth(),
    ],
    queryFn: async () => {
      // The API takes a 1-based month.
      const res = await apiClient.get(
        endpoints.PRODUCTS_FINANCE_MONTHLY_REPORT,
        {
          params: {
            month: reportMonth.start.getMonth() + 1,
            year: reportMonth.start.getFullYear(),
          },
        },
      );
      return res.data;
    },
  });

  // The API returns { month, status, total_sales, total_cost, total_profit, pdf_url }
  const monthlyReport = monthlyReportRaw
    ? {
        month: monthlyReportRaw.month ?? "-",
        status: monthlyReportRaw.status ?? "-",
        totalSales: monthlyReportRaw.total_sales ?? 0,
        totalCost: monthlyReportRaw.total_cost ?? 0,
        totalProfit: monthlyReportRaw.total_profit ?? 0,
        pdfUrl: monthlyReportRaw.pdf_url ?? "",
      }
    : {
        month: "-",
        status: "-",
        totalSales: 0,
        totalCost: 0,
        totalProfit: 0,
        pdfUrl: "",
      };

  // Aggregate loading state
  const dataLoading =
    loadingDaily ||
    loadingSummary ||
    loadingTop ||
    loadingSlow ||
    loadingRecs ||
    loadingInsights ||
    loadingTrends ||
    loadingMonthly;

  return {
    dataLoading,
    financialSummary,
    dailySummary,
    topProducts,
    slowMovingStock,
    stockRecommendations,
    seasonalInsights,
    chartData,
    monthlyReport,
  };
};
