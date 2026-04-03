import type { HomeArticle } from "./types";

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/** Substring match on title, description, category, and domain (same style as curriculum search index). */
export function filterHomeArticlesByQuery(
  articles: HomeArticle[],
  query: string,
  limit = 20,
): HomeArticle[] {
  const q = normalize(query);
  if (!q) return [];

  return articles
    .filter((a) => {
      const text = normalize(
        [a.title, a.description ?? "", a.category, a.domain].join(" "),
      );
      return text.includes(q);
    })
    .slice(0, limit);
}
