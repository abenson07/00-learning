import { DOMAIN_OPTIONS, normalizeDomain } from "./domain";
import type { HomeArticle } from "./types";

export type ArticleNavCategory = {
  name: string;
  items: { id: string; title: string }[];
};

export type ArticleNavDomain = {
  domainKey: string;
  domainLabel: string;
  categories: ArticleNavCategory[];
};

/** Same domain → category grouping as the home articles browser; sidebar lists published rows only (`article_content` present → !comingSoon). */
export function buildArticleNavGroups(articles: HomeArticle[]): ArticleNavDomain[] {
  const published = articles.filter((a) => !a.comingSoon);
  const byDomain = new Map<string, Map<string, HomeArticle[]>>();

  for (const article of published) {
    const dk = normalizeDomain(article.domain);
    if (!byDomain.has(dk)) byDomain.set(dk, new Map());
    const categoryMap = byDomain.get(dk)!;
    const category = article.category || "Uncategorized";
    if (!categoryMap.has(category)) categoryMap.set(category, []);
    categoryMap.get(category)!.push(article);
  }

  return DOMAIN_OPTIONS.map((option) => {
    const categoryMap = byDomain.get(option.key);
    if (!categoryMap) {
      return { domainKey: option.key, domainLabel: option.label, categories: [] };
    }

    const categories = [...categoryMap.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        name,
        items: categoryMap.get(name)!.map((a) => ({ id: a.id, title: a.title })),
      }))
      .filter((cat) => cat.items.length > 0);

    return {
      domainKey: option.key,
      domainLabel: option.label,
      categories,
    };
  }).filter((group) => group.categories.length > 0);
}
