import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ArticleSidebar } from "@/components/articles/article-sidebar";
import type { HomeArticle } from "@/lib/articles/types";
import { cn } from "@/lib/utils";

type ArticlePlanSidebarProps = {
  articles: HomeArticle[];
  currentArticleId: string;
  className?: string;
};

export function ArticlePlanSidebar({
  articles,
  currentArticleId,
  className,
}: ArticlePlanSidebarProps) {
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh w-[min(100%,280px)] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-lesson-plan py-6 pl-5 pr-4 text-lesson-plan-foreground md:flex md:flex-col",
        className,
      )}
    >
      <div className="mb-6 flex items-center gap-2 pl-0.5">
        <Link
          href="/"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-lesson-plan-foreground transition-colors hover:bg-white/10"
          aria-label="Back to home"
        >
          <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />
        </Link>
      </div>

      <div className="min-w-0 pl-0.5">
        <p className="text-[13px] font-medium leading-snug text-lesson-plan-foreground">
          Articles
        </p>
        <p className="mt-1 text-[11px] text-lesson-plan-muted">From your library</p>
      </div>

      <nav
        className="mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto border-t border-white/10 pt-6 pr-1 pb-4"
        aria-label="Articles in this collection"
      >
        <ArticleSidebar
          articles={articles}
          currentArticleId={currentArticleId}
          variant="lessonRail"
        />
      </nav>
    </aside>
  );
}
