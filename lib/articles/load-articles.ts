import { describeMissingSupabaseEnv, hasSupabaseEnvConfigured } from "@/lib/supabase/env";
import { createPublicServerClient } from "@/lib/supabase/server";

import type { HomeArticle } from "./types";

type RawArticle = Record<string, unknown>;

function getText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export function mapArticle(row: RawArticle): HomeArticle {
  const articleContent = row.article_content;
  const comingSoon = articleContent === null || articleContent === undefined;

  return {
    id: String(row.id ?? row.article_id ?? row.article_number ?? row.slug ?? "unknown"),
    title: getText(row.title ?? row.article_name, "Untitled article"),
    description:
      typeof row.description === "string"
        ? row.description
        : typeof row.article_description === "string"
          ? row.article_description
          : null,
    category: getText(row.category ?? row.article_category, "Uncategorized"),
    domain: getText(row.domain ?? row.article_domain, "App & Development"),
    comingSoon,
  };
}

export async function fetchArticles(): Promise<{
  articles: HomeArticle[];
  loadError: string | null;
}> {
  if (!hasSupabaseEnvConfigured()) {
    return {
      articles: [],
      loadError: describeMissingSupabaseEnv(),
    };
  }

  const supabase = createPublicServerClient();
  const tableCandidates = ["article", "articles"];

  let lastError: string | null = null;

  for (const tableName of tableCandidates) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      lastError = `${tableName}: ${error.message}`;
      continue;
    }

    if (Array.isArray(data)) {
      return {
        articles: data.map((row) => mapArticle(row as RawArticle)),
        loadError: null,
      };
    }
  }

  return { articles: [], loadError: lastError };
}
