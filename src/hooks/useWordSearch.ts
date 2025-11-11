import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWRInfinite from "swr/infinite";

import type { Word, WordSearchResponse } from "@/interfaces/word";

const SEARCH_ENDPOINT = "/api/words/search";
const DEFAULT_PAGE_SIZE = 25;
const INPUT_DEBOUNCE_MS = 300;

const fetcher = async (url: string): Promise<WordSearchResponse> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch words. Received ${response.status}`);
  }

  return (await response.json()) as WordSearchResponse;
};

const getTotalPages = (
  data: WordSearchResponse,
  fallbackLimit: number
): number | undefined => {
  if (typeof data.totalPages === "number") {
    return data.totalPages;
  }

  if (typeof data.total === "number") {
    const limit = data.limit ?? fallbackLimit;

    if (limit > 0) {
      return Math.ceil(data.total / limit);
    }
  }

  return undefined;
};

const getIsReachingEnd = (
  data: WordSearchResponse | undefined,
  pageSize: number
): boolean => {
  if (!data) {
    return false;
  }

  if (data.docs.length === 0) {
    return true;
  }

  if (data.hasNextPage === false) {
    return true;
  }

  const totalPages = getTotalPages(data, pageSize);

  if (typeof totalPages === "number" && data.page >= totalPages) {
    return true;
  }

  const limit = data.limit ?? pageSize;
  return data.docs.length < limit;
};

export type UseWordSearchResult = {
  query: string;
  debouncedQuery: string;
  words: Word[];
  total: number;
  size: number;
  error: Error | undefined;
  isLoadingInitialData: boolean;
  isLoadingMore: boolean;
  isEmpty: boolean;
  isReachingEnd: boolean;
  setSize: (size: number | ((_size: number) => number)) => Promise<WordSearchResponse[] | undefined>;
  loadMore: () => void;
  reset: () => void;
};

export const useWordSearch = (
  query: string,
  pageSize: number = DEFAULT_PAGE_SIZE
): UseWordSearchResult => {
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const previousQueryRef = useRef<string>(query);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, INPUT_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const shouldFetch = debouncedQuery.trim().length > 0;

  const getKey = useCallback(
    (pageIndex: number, previousPageData: WordSearchResponse | null) => {
      if (!shouldFetch) {
        return null;
      }

      if (previousPageData && getIsReachingEnd(previousPageData, pageSize)) {
        return null;
      }

      const nextPage = pageIndex + 1;
      const searchParams = new URLSearchParams({
        page: String(nextPage),
        limit: String(pageSize),
      });

      if (debouncedQuery.trim()) {
        searchParams.set("q", debouncedQuery.trim());
      }

      return `${SEARCH_ENDPOINT}?${searchParams.toString()}`;
    },
    [debouncedQuery, pageSize, shouldFetch]
  );

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    setSize,
    size,
  } = useSWRInfinite<WordSearchResponse>(getKey, fetcher, {
    revalidateFirstPage: false,
    keepPreviousData: true,
  });

  useEffect(() => {
    const previousQuery = previousQueryRef.current;

    if (previousQuery === debouncedQuery) {
      return;
    }

    previousQueryRef.current = debouncedQuery;

    if (!shouldFetch) {
      void mutate(undefined, { revalidate: false });
      return;
    }

    if (size !== 1) {
      void setSize(1);
    }
  }, [debouncedQuery, mutate, setSize, shouldFetch, size]);

  const words = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.flatMap((page) => page.docs);
  }, [data]);

  const total = data?.[0]?.total ?? 0;
  const lastPage = data ? data[data.length - 1] : undefined;
  const isReachingEnd = !shouldFetch || getIsReachingEnd(lastPage, pageSize);
  const isLoadingInitialData = shouldFetch && isLoading;
  const isLoadingMore =
    shouldFetch &&
    !isReachingEnd &&
    (isLoadingInitialData || (isValidating && !!data && data.length === size));
  const isEmpty = shouldFetch && !isLoadingInitialData && words.length === 0;

  const loadMore = useCallback(() => {
    if (isReachingEnd || !shouldFetch) {
      return;
    }

    void setSize((currentSize) => currentSize + 1);
  }, [isReachingEnd, setSize, shouldFetch]);

  const reset = useCallback(() => {
    previousQueryRef.current = "";
    setDebouncedQuery("");
    void mutate(undefined, { revalidate: false });
    void setSize(1);
  }, [mutate, setSize]);

  return {
    query,
    debouncedQuery,
    words,
    total,
    size,
    error,
    isLoadingInitialData,
    isLoadingMore,
    isEmpty,
    isReachingEnd,
    setSize,
    loadMore,
    reset,
  };
};
