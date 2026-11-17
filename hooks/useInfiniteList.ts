// hooks/useInfiniteList.ts
//
// One infinite-scroll pattern for every paginated list in the app.
//
// The backend paginates with ZERO-based pages (`?page=0&page_size=20`) and
// answers with { results, count, current_page, total_pages, has_next }.
// Asking for a page past the end does NOT return an empty list  it returns
// the last page again  so `has_next` is the only safe stop signal.
import {
  keepPreviousData,
  useInfiniteQuery,
  type QueryKey,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

/** How many rows each scroll-triggered request fetches. */
export const PAGE_SIZE = 20;

export interface PageResponse<T> {
  results: T[];
  count?: number;
  current_page?: number;
  total_pages?: number;
  has_next?: boolean;
  /** DRF's default paginator shape, kept for safety. */
  next?: string | null;
}

/** Zero-based number of the page after `last`, or undefined when done. */
export function nextPageParam<T>(
  last: PageResponse<T>,
  lastParam: number,
): number | undefined {
  if (typeof last.has_next === "boolean") {
    return last.has_next ? lastParam + 1 : undefined;
  }
  if (typeof last.total_pages === "number") {
    return lastParam + 1 < last.total_pages ? lastParam + 1 : undefined;
  }
  if (last.next !== undefined) return last.next ? lastParam + 1 : undefined;
  // Unpaginated (plain array) responses come back as a single page.
  return undefined;
}

interface Options<T> {
  queryKey: QueryKey;
  fetchPage: (page: number, pageSize: number) => Promise<PageResponse<T>>;
  pageSize?: number;
  enabled?: boolean;
  /** Used to drop rows repeated across pages if the data shifts mid-scroll. */
  getId?: (item: T) => string | number;
  /** Poll the loaded pages every N ms (e.g. a live notifications feed). */
  refetchInterval?: number;
}

export function useInfiniteList<T>({
  queryKey,
  fetchPage,
  pageSize = PAGE_SIZE,
  enabled = true,
  getId,
  refetchInterval,
}: Options<T>) {
  const query = useInfiniteQuery({
    queryKey: [...queryKey, { pageSize }],
    queryFn: ({ pageParam }) => fetchPage(pageParam, pageSize),
    initialPageParam: 0,
    getNextPageParam: (last, _all, lastParam) => nextPageParam(last, lastParam),
    // Keep showing the old list while a new search/filter loads.
    placeholderData: keepPreviousData,
    enabled,
    refetchInterval,
  });

  const items = useMemo(() => {
    const all = (query.data?.pages ?? []).flatMap((p) => p.results ?? []);
    if (!getId) return all;
    const seen = new Set<string | number>();
    return all.filter((item) => {
      const id = getId(item);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    // getId is expected to be stable (a module-level or inline pure fn).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    items,
    /** Total rows on the server for this query (not just the loaded ones). */
    total: query.data?.pages[0]?.count ?? items.length,
    loadMore,
    hasMore: !!hasNextPage,
    /** First load with nothing cached yet. */
    isLoading: query.isLoading,
    /** A new search/filter/sort is loading (old rows may still be shown). */
    isSwitching: query.isFetching && query.isPlaceholderData,
    isFetchingMore: isFetchingNextPage,
    isRefreshing: query.isRefetching && !isFetchingNextPage,
    refresh: query.refetch,
    error: query.error,
  };
}

/**
 * For lists rendered inside a ScrollView (grids, grouped sections) rather than
 * a FlatList: call from `onScroll` to load the next page near the bottom.
 */
export function isNearBottom(
  e: {
    nativeEvent: {
      layoutMeasurement: { height: number };
      contentOffset: { y: number };
      contentSize: { height: number };
    };
  },
  threshold = 400,
): boolean {
  const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
  return layoutMeasurement.height + contentOffset.y >= contentSize.height - threshold;
}
