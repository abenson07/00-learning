import Link from "next/link";

import { buildArticleNavGroups } from "@/lib/articles/nav";
import type { HomeArticle } from "@/lib/articles/types";
import { cn } from "@/lib/utils";

type ArticleSidebarProps = {
  articles: HomeArticle[];
  currentArticleId: string;
  /** Matches the lesson content rail (`LessonPlanSidebar` spacing and chrome). */
  variant?: "default" | "lessonRail";
};

export function ArticleSidebar({
  articles,
  currentArticleId,
  variant = "default",
}: ArticleSidebarProps) {
  const rail = variant === "lessonRail";
  const groups = buildArticleNavGroups(articles);

  if (groups.length === 0) {
    return <p className="text-xs text-muted-foreground">No articles to list yet.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
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
                <ul
                  className={cn(
                    "space-y-0.5 border-l pl-3",
                    rail ? "border-border/60" : "border-border",
                  )}
                >
                  {category.items.map((item) => {
                    const isActive = item.id === currentArticleId;
                    return (
                      <li key={item.id}>
                        <Link
                          href={`/articles/${item.id}`}
                          className={cn(
                            "block rounded-md py-1 pl-2 pr-1 text-sm transition-colors",
                            rail
                              ? isActive
                                ? "bg-muted font-medium text-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                              : isActive
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
    </div>
  );
}
