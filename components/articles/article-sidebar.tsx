import Link from "next/link";

import { buildArticleNavGroups } from "@/lib/articles/nav";
import type { HomeArticle } from "@/lib/articles/types";
import { cn } from "@/lib/utils";

type ArticleSidebarProps = {
  articles: HomeArticle[];
  currentArticleId: string;
};

export function ArticleSidebar({ articles, currentArticleId }: ArticleSidebarProps) {
  const groups = buildArticleNavGroups(articles);

  if (groups.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No articles to list yet.
      </p>
    );
  }

  return (
    <nav aria-label="Articles in this collection" className="flex flex-col gap-6">
      {groups.map((domain) => (
        <div key={domain.domainKey}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {domain.domainLabel}
          </h2>
          <div className="flex flex-col gap-4">
            {domain.categories.map((category) => (
              <div key={category.name}>
                <h3 className="mb-1.5 text-sm font-medium text-foreground">
                  {category.name}
                </h3>
                <ul className="space-y-0.5 border-l border-border pl-3">
                  {category.items.map((item) => {
                    const isActive = item.id === currentArticleId;
                    return (
                      <li key={item.id}>
                        <Link
                          href={`/articles/${item.id}`}
                          className={cn(
                            "block rounded-md py-1 pl-2 pr-1 text-sm transition-colors",
                            isActive
                              ? "bg-accent font-medium text-accent-foreground"
                              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                          )}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {item.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
