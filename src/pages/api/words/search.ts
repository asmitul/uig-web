import type { NextApiRequest, NextApiResponse } from "next";

import type { Word, WordSearchResponse } from "@/interfaces/word";

type PayloadSearchResponse = {
  docs: Word[];
  totalDocs?: number;
  total?: number;
  limit?: number;
  totalPages?: number;
  page?: number;
  hasNextPage?: boolean;
};

type ErrorResponse = { error: string };

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const DEFAULT_CMS_BASE_URL = "https://admin.uig.me";

const getCmsBaseUrl = (): string => {
  const candidate =
    process.env.CMS_BASE_URL ??
    process.env.NEXT_PUBLIC_CMS_BASE_URL ??
    DEFAULT_CMS_BASE_URL;

  const trimmed = candidate.trim();
  if (!trimmed) {
    return DEFAULT_CMS_BASE_URL;
  }

  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

const coercePositiveInt = (
  raw: string | string[] | undefined,
  fallback: number,
  { min = 1, max = Number.MAX_SAFE_INTEGER } = {},
): number => {
  if (typeof raw !== "string") {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
};

const buildCmsSearchUrl = ({
  q,
  page,
  limit,
}: {
  q: string;
  page: number;
  limit: number;
}): string => {
  const url = new URL("/api/words", getCmsBaseUrl());
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const searchableFields = ["word_uyghur", "word_english", "word_turkish"];

  searchableFields.forEach((field, index) => {
    params.set(`where[or][${index}][${field}][contains]`, q);
  });

  url.search = params.toString();
  return url.toString();
};

const normalizeResponse = (payload: PayloadSearchResponse): WordSearchResponse => {
  const docs = Array.isArray(payload.docs) ? payload.docs : [];
  const totalDocs = payload.totalDocs ?? payload.total ?? docs.length;

  return {
    docs,
    total: totalDocs,
    page: payload.page ?? 1,
    limit: payload.limit,
    totalPages: payload.totalPages,
    hasNextPage: payload.hasNextPage,
  };
};

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse<WordSearchResponse | ErrorResponse>,
) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const searchTerm =
    typeof request.query.q === "string" ? request.query.q.trim() : undefined;
  const page = coercePositiveInt(request.query.page, 1);
  const limit = coercePositiveInt(request.query.limit, DEFAULT_PAGE_SIZE, {
    min: 1,
    max: MAX_PAGE_SIZE,
  });

  if (!searchTerm) {
    response.status(400).json({ error: "Missing query `q`" });
    return;
  }

  try {
    const cmsUrl = buildCmsSearchUrl({ q: searchTerm, page, limit });
    const cmsResponse = await fetch(cmsUrl, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!cmsResponse.ok) {
      response
        .status(cmsResponse.status)
        .json({ error: `CMS request failed with ${cmsResponse.status}` });
      return;
    }

    const payload = (await cmsResponse.json()) as PayloadSearchResponse;
    response.status(200).json(normalizeResponse(payload));
  } catch (error) {
    console.error("Failed to fetch words from CMS", error);
    response.status(500).json({ error: "Failed to fetch words from CMS" });
  }
}
