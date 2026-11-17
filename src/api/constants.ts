import { Platform } from "react-native";

// Set EXPO_PUBLIC_API_BASE_URL in .env to switch between local and online.
function resolveBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!envUrl) {
    return "https://cyberiah.pythonanywhere.com";
  }

  // When running in a browser on localhost / 127.0.0.1, requests to a LAN IP
  // (like 192.168.x.x) often time out if Django was started on 127.0.0.1 or firewall blocks loopback.
  const win = typeof globalThis !== "undefined" ? (globalThis as any).window : undefined;
  if (Platform.OS === "web" && win && win.location) {
    if (
      (win.location.hostname === "localhost" || win.location.hostname === "127.0.0.1") &&
      (envUrl.includes("192.168.") || envUrl.includes("10.") || envUrl.includes("172."))
    ) {
      try {
        const parsed = new URL(envUrl);
        return `http://${win.location.hostname}:${parsed.port || "8000"}`;
      } catch {
        return "http://localhost:8000";
      }
    }
  }

  return envUrl;
}

export const API_BASE_URL = resolveBaseUrl();
export const API_PREFIX = "/api";
