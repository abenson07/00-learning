"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type HomeArticle = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  domain: string;
};

type DomainOption = {
  key: string;
  label: string;
};

const DOMAIN_OPTIONS: DomainOption[] = [
  { key: "app-and-development", label: "App & Development" },
  { key: "ai-and-development", label: "AI & Development" },
];

function toAnchorId(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Match `article_domain` / UI labels without naive `.includes("ai")` (breaks on e.g. "training"). */
function normalizeDomain(domain: string) {
  const value = domain.trim().toLowerCase().replace(/\s+/g, " ");
  if (
    value === "ai & development" ||
    value === "ai and development" ||
    value === "ai" ||
    value.startsWith("ai &") ||
    value.startsWith("ai and")
  ) {
    return "ai-and-development";
  }
  return "app-and-development";
}

type ArticlesBrowserProps = {
  articles: HomeArticle[];
  loadError?: string | null;
};

export function ArticlesBrowser({ articles, loadError }: ArticlesBrowserProps) {
  const [selectedDomain, setSelectedDomain] = useState<string>(
    DOMAIN_OPTIONS[0].key,
  );

  const groupedByCategory = useMemo(() => {
    const onlySelected = articles.filter(
      (article) => normalizeDomain(article.domain) === selectedDomain,
    );

    return onlySelected.reduce<Record<string, HomeArticle[]>>((acc, article) => {
      const category = article.category || "Uncategorized";
      if (!acc[category]) acc[category] = [];
      acc[category].push(article);
      return acc;
    }, {});
  }, [articles, selectedDomain]);

  const categories = Object.keys(groupedByCategory).sort((a, b) =>
    a.localeCompare(b),
  );

  if (loadError) {
    return (
      <div
        className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        role="alert"
      >
        <p className="font-medium text-destructive">Could not load articles</p>
        <p className="mt-2 text-muted-foreground">{loadError}</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No rows returned from <code className="rounded bg-muted px-1">public.article</code>.
        Add rows or check{" "}
        <strong className="font-medium text-foreground">Row Level Security</strong> allows{" "}
        <code className="rounded bg-muted px-1">SELECT</code> for the anon /
        authenticated role you use with this app.
      </p>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="sticky top-0 z-10 flex flex-col gap-3 border-b bg-background pb-4 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {DOMAIN_OPTIONS.map((option) => (
              <Button
                key={option.key}
                variant={selectedDomain === option.key ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDomain(option.key)}
                type="button"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          No articles for this domain. Try the other tab, or set{" "}
          <code className="rounded bg-muted px-1">article_domain</code> to labels like{" "}
          <code className="rounded bg-muted px-1">App &amp; Development</code> /{" "}
          <code className="rounded bg-muted px-1">AI &amp; Development</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 flex flex-col gap-3 border-b bg-background pb-4 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {DOMAIN_OPTIONS.map((option) => (
            <Button
              key={option.key}
              variant={selectedDomain === option.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDomain(option.key)}
              type="button"
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <a
              key={category}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              )}
              href={`#${toAnchorId(category)}`}
            >
              {category}
            </a>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {categories.map((category) => (
          <section key={category} id={toAnchorId(category)} className="scroll-mt-28">
            <h2 className="mb-3 text-lg font-semibold">{category}</h2>
            <div className="grid gap-3">
              {groupedByCategory[category].map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.id}`}
                  className="rounded-lg border p-4 transition-colors hover:bg-accent/40"
                >
                  <h3 className="font-medium">{article.title}</h3>
                  {article.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {article.description}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
