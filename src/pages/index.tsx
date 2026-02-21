import Head from "next/head";
import { Geist, Geist_Mono } from "next/font/google";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VariableSizeList, type ListChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

import type { Word } from "@/interfaces/word";
import { useWordSearch } from "@/hooks/useWordSearch";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DEFAULT_SITE_URL = "https://uig.me";
const sanitizeBaseUrl = (rawUrl: string) => {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return DEFAULT_SITE_URL;
  }

  const normalize = (value: string) => {
    const withoutTrailingSlash = value.endsWith("/") ? value.slice(0, -1) : value;

    try {
      const url = new URL(withoutTrailingSlash);
      return url.origin;
    } catch {
      return undefined;
    }
  };

  const normalized = normalize(trimmed) ?? normalize(`https://${trimmed}`);

  if (normalized) {
    return normalized;
  }

  const fallback = trimmed.replace(/\/$/, "");
  return fallback.length > 0 ? fallback : DEFAULT_SITE_URL;
};

const SITE_URL = sanitizeBaseUrl(
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? DEFAULT_SITE_URL
);
const CANONICAL_URL = `${SITE_URL}/`;
const OG_IMAGE_URL = `${SITE_URL}/og-uyghur-dictionary.png`;
const SITE_NAME = "UIG Uyghur Dictionary";
const SEO_TITLE = "Uyghur Dictionary | Uyghur-English-Turkish Word Finder";
const SEO_DESCRIPTION =
  "Discover Uyghur vocabulary with fast bilingual search, trusted translations, and high-quality pronunciations in this Uyghur-English-Turkish dictionary.";
const SEO_KEYWORDS = [
  "Uyghur dictionary",
  "Uyghur English dictionary",
  "Uyghur Turkish dictionary",
  "Uyghur pronunciation",
  "Uyghur vocabulary",
  "Turkic language learning",
].join(", ");

const DEFAULT_CMS_BASE_URL = "https://admin.uig.me";
const CMS_BASE_URL = (() => {
  const envUrl =
    process.env.NEXT_PUBLIC_CMS_BASE_URL ??
    process.env.CMS_BASE_URL ??
    DEFAULT_CMS_BASE_URL;

  const sanitizedUrl = envUrl.trim().replace(/\/$/, "");
  return sanitizedUrl.length > 0 ? sanitizedUrl : DEFAULT_CMS_BASE_URL;
})();

const DEFAULT_WORD_ROW_HEIGHT = 152;
const LOAD_MORE_ROW_HEIGHT = 84;

const resolvePronunciationUrl = (
  pronunciation: Word["pronunciation"]
): string | undefined => {
  if (!pronunciation) {
    return undefined;
  }

  const normalizeUrl = (path: string) => {
    if (!path) {
      return undefined;
    }

    if (path.startsWith("http")) {
      return path;
    }

    const normalizedPath = path.startsWith("/")
      ? path
      : path.startsWith("media/")
        ? `/${path}`
        : `/media/${path}`;
    return `${CMS_BASE_URL}${normalizedPath}`;
  };

  if (typeof pronunciation === "string") {
    return normalizeUrl(pronunciation);
  }

  if (pronunciation.url) {
    return normalizeUrl(pronunciation.url);
  }

  if (pronunciation.filename) {
    return normalizeUrl(pronunciation.filename);
  }

  return undefined;
};

type WordListItemData = {
  words: Word[];
  activeAudioId: string | null;
  onTogglePronunciation: (wordId: string, audioUrl: string) => void;
  isLoadingMore: boolean;
  isReachingEnd: boolean;
  loadMore: () => void;
  setRowHeight: (index: number, height: number) => void;
};

const WordRow = ({
  index,
  style,
  data,
}: ListChildComponentProps<WordListItemData>) => {
  const {
    words,
    activeAudioId,
    onTogglePronunciation,
    isLoadingMore,
    isReachingEnd,
    loadMore,
    setRowHeight,
  } = data;
  const rowRef = useRef<HTMLDivElement | null>(null);

  const word = index < words.length ? words[index] : undefined;
  const pronunciationUrl = word ? resolvePronunciationUrl(word.pronunciation) : undefined;

  useEffect(() => {
    const rowElement = rowRef.current;

    if (!rowElement) {
      return;
    }

    const measure = () => {
      const rowHeight = Math.ceil(rowElement.getBoundingClientRect().height);
      setRowHeight(index, rowHeight);
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      measure();
    });

    resizeObserver.observe(rowElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    index,
    isLoadingMore,
    isReachingEnd,
    pronunciationUrl,
    setRowHeight,
    word?.id,
    word?.word_english,
    word?.word_turkish,
    word?.word_uyghur,
  ]);

  if (!word) {
    return (
      <div style={style}>
        <div ref={rowRef} className="flex items-center justify-center px-6 py-4">
          {isReachingEnd ? (
            <p className="text-sm text-zinc-400">No more results.</p>
          ) : (
            <button
              type="button"
              onClick={loadMore}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={style}>
      <div ref={rowRef} className="border-b border-zinc-100 px-4 py-4 sm:px-6" id={`word-${word.id}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-xl font-semibold leading-tight text-zinc-900 break-words sm:text-2xl">
            {word.word_uyghur}
          </p>
          {pronunciationUrl && (
            <button
              type="button"
              onClick={() => onTogglePronunciation(word.id, pronunciationUrl)}
              aria-label={
                activeAudioId === word.id ? "Stop pronunciation" : "Play pronunciation"
              }
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
                activeAudioId === word.id
                  ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                  : "border-emerald-100 text-emerald-600 hover:bg-emerald-50"
              }`}
            >
              <span className="sr-only">
                {activeAudioId === word.id ? "Stop pronunciation" : "Play pronunciation"}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M3 9.75a.75.75 0 0 1 .75-.75h2.69l2.87-2.869A1.5 1.5 0 0 1 11.379 7.5v9a1.5 1.5 0 0 1-2.07 1.389L6.44 15H3.75A.75.75 0 0 1 3 14.25zm13.58-3.583a.75.75 0 0 1 1.06 0A7.47 7.47 0 0 1 20.25 12a7.47 7.47 0 0 1-2.61 5.833.75.75 0 0 1-1.02-1.097A5.97 5.97 0 0 0 18.75 12a5.97 5.97 0 0 0-2.13-4.736.75.75 0 0 1-.037-1.097m-2.12 2.12a.75.75 0 0 1 1.06 0A4.47 4.47 0 0 1 17.25 12a4.47 4.47 0 0 1-1.73 3.713.75.75 0 0 1-1.02-1.097A2.97 2.97 0 0 0 15.75 12a2.97 2.97 0 0 0-1.25-2.463.75.75 0 0 1-.037-1.25z" />
              </svg>
            </button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
              English
            </p>
            <p className="mt-1 text-base font-medium leading-snug text-emerald-700 break-words">
              {word.word_english}
            </p>
          </div>
          {word.word_turkish && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                Turkish
              </p>
              <p className="mt-1 text-base font-medium leading-snug text-zinc-700 break-words">
                {word.word_turkish}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listRef = useRef<VariableSizeList<WordListItemData> | null>(null);
  const rowHeightsRef = useRef<Record<number, number>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);

  const {
    words,
    total,
    error,
    isEmpty,
    isLoadingInitialData,
    isLoadingMore,
    isReachingEnd,
    loadMore,
    debouncedQuery,
  } = useWordSearch(searchTerm);

  useEffect(() => {
    if (typeof Audio === "undefined") {
      return;
    }

    const audioElement = new Audio();
    const handleEnded = () => setActiveAudioId(null);

    audioElement.addEventListener("ended", handleEnded);
    audioRef.current = audioElement;

    return () => {
      audioElement.removeEventListener("ended", handleEnded);
      audioElement.pause();
      audioRef.current = null;
    };
  }, []);

  const handlePronunciationToggle = useCallback((wordId: string, audioUrl: string) => {
    const audioElement = audioRef.current;

    if (!audioElement) {
      return;
    }

    if (activeAudioId) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    if (activeAudioId === wordId) {
      setActiveAudioId(null);
      return;
    }

    audioElement.src = audioUrl;

    void audioElement
      .play()
      .then(() => setActiveAudioId(wordId))
      .catch((playError) => {
        console.error("Unable to play pronunciation audio", playError);
        setActiveAudioId(null);
      });
  }, [activeAudioId]);

  const hasSearchTerm = searchTerm.trim().length > 0;
  const normalizedSearchTerm = searchTerm.trim();

  const structuredData = useMemo(() => {
    const topWords = words.slice(0, 5);

    return [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        url: CANONICAL_URL,
        name: SITE_NAME,
        inLanguage: ["ug", "en", "tr"],
        potentialAction: {
          "@type": "SearchAction",
          target: `${CANONICAL_URL}?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "DefinedTermSet",
        name: SITE_NAME,
        description: SEO_DESCRIPTION,
        url: CANONICAL_URL,
        hasDefinedTerm: topWords.map((word) => {
          const description: string[] = [`English: ${word.word_english}`];

          if (word.word_turkish) {
            description.push(`Turkish: ${word.word_turkish}`);
          }

          return {
            "@type": "DefinedTerm",
            name: word.word_uyghur,
            inLanguage: "ug",
            description: description.join(". "),
            url: `${CANONICAL_URL}#word-${word.id}`,
          };
        }),
      },
    ];
  }, [words]);

  const handleItemsRendered = useCallback(
    ({ visibleStopIndex }: { visibleStopIndex: number }) => {
      if (!hasSearchTerm || isReachingEnd || isLoadingMore) {
        return;
      }

      if (visibleStopIndex >= Math.max(0, words.length - 1)) {
        loadMore();
      }
    },
    [hasSearchTerm, isReachingEnd, isLoadingMore, loadMore, words.length]
  );

  const itemCount = useMemo(() => {
    if (!hasSearchTerm) {
      return 0;
    }

    return words.length + (isReachingEnd ? 0 : 1);
  }, [hasSearchTerm, isReachingEnd, words.length]);

  const setRowHeight = useCallback((index: number, height: number) => {
    if (!Number.isFinite(height) || height <= 0) {
      return;
    }

    if (rowHeightsRef.current[index] === height) {
      return;
    }

    rowHeightsRef.current[index] = height;
    listRef.current?.resetAfterIndex(index);
  }, []);

  const getItemSize = useCallback(
    (index: number) => rowHeightsRef.current[index] ?? (index < words.length ? DEFAULT_WORD_ROW_HEIGHT : LOAD_MORE_ROW_HEIGHT),
    [words.length]
  );

  useEffect(() => {
    rowHeightsRef.current = {};
    listRef.current?.resetAfterIndex(0, true);
    listRef.current?.scrollTo(0);
  }, [debouncedQuery]);

  const itemData = useMemo<WordListItemData>(() => ({
    words,
    activeAudioId,
    onTogglePronunciation: handlePronunciationToggle,
    isLoadingMore,
    isReachingEnd,
    loadMore,
    setRowHeight,
  }), [
    words,
    activeAudioId,
    handlePronunciationToggle,
    isLoadingMore,
    isReachingEnd,
    loadMore,
    setRowHeight,
  ]);

  const resultLabel = `${total.toLocaleString()} result${total === 1 ? "" : "s"}`;

  return (
    <>
      <Head>
        <title>{SEO_TITLE}</title>
        <meta name="description" content={SEO_DESCRIPTION} />
        <meta name="keywords" content={SEO_KEYWORDS} />
        <meta name="application-name" content={SITE_NAME} />
        <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
        <meta name="theme-color" content="#10b981" />
        <link rel="canonical" href={CANONICAL_URL} />
        <link rel="alternate" hrefLang="en" href={CANONICAL_URL} />
        <link rel="alternate" hrefLang="ug" href={CANONICAL_URL} />
        <link rel="alternate" hrefLang="tr" href={CANONICAL_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={SEO_TITLE} />
        <meta property="og:description" content={SEO_DESCRIPTION} />
        <meta property="og:url" content={CANONICAL_URL} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:image" content={OG_IMAGE_URL} />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SEO_TITLE} />
        <meta name="twitter:description" content={SEO_DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE_URL} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>
      <main
        className={`${geistSans.className} ${geistMono.className} flex min-h-screen items-start justify-center bg-zinc-50 px-4 py-10 text-zinc-900 sm:px-6 sm:py-12`}
      >
        <section className="w-full max-w-2xl space-y-6">
          <label htmlFor="word-search" className="sr-only">
            Search Uyghur dictionary entries
          </label>
          <input
            id="word-search"
            type="text"
            placeholder="Search in Uyghur or English..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-2xl border border-zinc-200 bg-white px-6 py-4 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
          />

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-600">
              Failed to load words. Please try again later.
            </div>
          )}

          {hasSearchTerm && (
            <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
              <div className="border-b border-zinc-100 px-4 py-3 sm:px-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Search Results
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  {isLoadingInitialData
                    ? `Searching for \"${normalizedSearchTerm}\"...`
                    : `${resultLabel} for \"${normalizedSearchTerm}\"`}
                </p>
              </div>
              {isLoadingInitialData ? (
                <div className="flex h-64 items-center justify-center">
                  <p className="text-sm text-zinc-500">Searching…</p>
                </div>
              ) : isEmpty ? (
                <div className="flex h-64 items-center justify-center px-6 py-10 text-center text-sm text-zinc-500">
                  No matching words found.
                </div>
              ) : (
                <div className="h-[clamp(18rem,62vh,34rem)] min-h-[18rem]">
                  <AutoSizer>
                    {({ height, width }) => (
                      <VariableSizeList
                        ref={listRef}
                        height={height}
                        width={width}
                        itemCount={itemCount}
                        itemSize={getItemSize}
                        itemData={itemData}
                        estimatedItemSize={DEFAULT_WORD_ROW_HEIGHT}
                        onItemsRendered={({ visibleStopIndex }) =>
                          handleItemsRendered({ visibleStopIndex })
                        }
                      >
                        {WordRow}
                      </VariableSizeList>
                    )}
                  </AutoSizer>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
