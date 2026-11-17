// hooks/usePdfReport.ts
//
// "Download Report (PDF)": fetches the full monthly report the backend builds
// (key figures vs last month, plain-English findings, charts with reading
// notes, product breakdown with cost/selling price/profit/margin, credit,
// expenses, every transaction) for the month chosen on the card.
//   web    -> the browser saves inventra-report-YYYY-MM.pdf
//   mobile -> downloaded to the cache, then the share sheet (save / WhatsApp / print)
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useCallback, useState } from "react";
import { Alert, Platform } from "react-native";

import { API_BASE_URL, API_PREFIX, apiClient, getAccessToken } from "@/src/api";
import { PRODUCTS_FINANCE_MONTHLY_REPORT } from "@/src/api/endpoints";
import type { DateRange } from "@/utils/periodRange";
import type { MonthlyReport } from "../app/types/finance.types";

interface UsePdfReportParams {
  monthlyReport: MonthlyReport;
  /** The month picked on the Monthly Report card. */
  reportMonth: DateRange;
}

const apiPath = (p: string) => p.replace(/^\/api(?=\/)/, "");

export const usePdfReport = ({ monthlyReport, reportMonth }: UsePdfReportParams) => {
  const [pdfLoading, setPdfLoading] = useState(false);

  const generatePDFReport = useCallback(async () => {
    if (pdfLoading) return;
    const year = reportMonth.start.getFullYear();
    const month = reportMonth.start.getMonth() + 1;
    const fileName = `inventra-report-${year}-${String(month).padStart(2, "0")}.pdf`;
    const params = { month, year, download: 1 };

    setPdfLoading(true);
    try {
      if (Platform.OS === "web") {
        // Through the API client so auth (and token refresh) apply.
        const res = await apiClient.get(apiPath(PRODUCTS_FINANCE_MONTHLY_REPORT), {
          params,
          responseType: "blob",
        });
        // DOM types aren't in this RN tsconfig; this branch only runs on web.
        const doc = (globalThis as any).document;
        const url = URL.createObjectURL(res.data as Blob);
        const a = doc.createElement("a");
        a.href = url;
        a.download = fileName;
        doc.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
        return;
      }

      // Native: stream the file straight to disk, then hand it to the share sheet.
      const token = await getAccessToken();
      const query = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)]),
      ).toString();
      const target = `${FileSystem.cacheDirectory}${fileName}`;
      const result = await FileSystem.downloadAsync(
        `${API_BASE_URL}${API_PREFIX}${apiPath(PRODUCTS_FINANCE_MONTHLY_REPORT)}?${query}`,
        target,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (result.status !== 200) throw new Error(`HTTP ${result.status}`);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: "application/pdf",
          dialogTitle: `Monthly report · ${monthlyReport.month}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Report saved", `Saved as ${fileName}.`);
      }
    } catch (error) {
      console.error("Monthly report download failed:", error);
      Alert.alert("Couldn't download the report", "Please check your connection and try again.");
    } finally {
      setPdfLoading(false);
    }
  }, [pdfLoading, reportMonth, monthlyReport.month]);

  return { pdfLoading, generatePDFReport };
};
