"use client";

import { Code, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ArticleCard } from "@/components/home/article-card";
import { Button } from "@/components/ui/button";
import { DOMAIN_OPTIONS, normalizeDomain } from "@/lib/articles/domain";
import type { HomeArticle } from "@/lib/articles/types";
import { cn } from "@/lib/utils";

export type { HomeArticle };

function toAnchorId(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function scrollToCategorySection(category: string) {
  const el = document.getElementById(toAnchorId(category));
  if (!el) return;
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start",
  });
}

function ArticlesToolbar({
  selectedDomain,
  onDomainChange,
  categories,
}: {
  selectedDomain: string;
  onDomainChange: (key: string) => void;
  categories: string[];
}) {
  return (
    <div className="sticky top-0 z-10 flex min-w-0 items-center gap-3 pb-4 pt-1">
      <div
        className="inline-flex shrink-0 overflow-hidden rounded-lg border border-input bg-background"
        role="group"
        aria-label="Article domain"
      >
        {DOMAIN_OPTIONS.map((option, i) => (
          <Button
            key={option.key}
            variant="ghost"
            size="sm"
            type="button"
            aria-label={option.label}
            aria-pressed={selectedDomain === option.key}
            onClick={() => onDomainChange(option.key)}
            className={cn(
              "h-8 w-8 shrink-0 rounded-none p-0 text-xs shadow-none",
              selectedDomain === option.key
                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              i > 0 && "border-l border-border",
            )}
          >
            {option.key === "ai-and-development" ? (
              <Sparkles className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            ) : option.key === "app-and-development" ? (
              <Code className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            ) : (
              option.label
            )}
          </Button>
        ))}
      </div>
      {categories.length > 0 && (
        <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]">
          <nav
            className="flex w-max gap-2"
            aria-label="Jump to category"
          >
            {categories.map((category) => (
              <a
                key={category}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                )}
                href={`#${toAnchorId(category)}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToCategorySection(category);
                }}
              >
                {category}
              </a>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
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
      <div className="flex min-w-0 flex-col gap-4">
        <ArticlesToolbar
          selectedDomain={selectedDomain}
          onDomainChange={setSelectedDomain}
          categories={[]}
        />
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
    <div className="flex min-w-0 flex-col gap-6">
      <ArticlesToolbar
        selectedDomain={selectedDomain}
        onDomainChange={setSelectedDomain}
        categories={categories}
      />

      <div className="flex flex-col gap-8">
        {categories.map((category) => (
          <section key={category} id={toAnchorId(category)} className="scroll-mt-28">
            <h2 className="mb-3 text-lg font-semibold">{category}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groupedByCategory[category].map((article) => {
                const meta = article.description?.trim() || null;
                const badge = article.comingSoon
                  ? "Coming soon"
                  : article.domain.trim() || article.category;

                if (article.comingSoon) {
                  return (
                    <ArticleCard
                      key={article.id}
                      title={article.title}
                      meta={meta}
                      badge={badge}
                      comingSoon
                    />
                  );
                }

                return (
                  <ArticleCard
                    key={article.id}
                    title={article.title}
                    meta={meta}
                    badge={badge}
                    href={`/articles/${article.id}`}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
