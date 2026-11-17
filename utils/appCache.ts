// utils/appCache.ts
// "Clear Cache" in Settings: cached server data (TanStack Query) plus local
// conveniences (e.g. recent searches). Sign-in tokens and the remembered phone
// number are never touched, so clearing the cache never logs anyone out.
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { QueryClient } from "@tanstack/react-query";

const KEEP = new Set(["inventra_access_token", "inventra_refresh_token", "inventra_last_phone"]);

const byteLength = (text: string) => {
  try {
    return new TextEncoder().encode(text).length;
  } catch {
    return text.length;
  }
};

export async function getCacheSize(queryClient: QueryClient): Promise<number> {
  let bytes = 0;
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => !KEEP.has(k));
    for (const [, value] of await AsyncStorage.multiGet(keys)) bytes += byteLength(value ?? "");
  } catch {
    /* storage unavailable: count query cache only */
  }
  for (const query of queryClient.getQueryCache().getAll()) {
    try {
      bytes += byteLength(JSON.stringify(query.state.data ?? null));
    } catch {
      /* non-serialisable data: skip */
    }
  }
  return bytes;
}

export async function clearAppCache(queryClient: QueryClient): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => !KEEP.has(k));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  } catch {
    /* ignore */
  }
  queryClient.clear(); // screens refetch fresh data when opened
}

export const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : bytes >= 1024
      ? `${Math.round(bytes / 1024)} KB`
      : `${bytes} B`;
