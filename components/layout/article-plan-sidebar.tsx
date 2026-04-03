"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ArticleSidebar } from "@/components/articles/article-sidebar";
import type { HomeArticle } from "@/lib/articles/types";
import { cn } from "@/lib/utils";

type ArticlePlanSidebarProps = {
  articles: HomeArticle[];
  className?: string;
};

export function ArticlePlanSidebar({ articles, className }: ArticlePlanSidebarProps) {
  const params = useParams();
  const currentArticleId = typeof params?.id === "string" ? params.id : "";

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh w-[min(100%,280px)] shrink-0 flex-col overflow-hidden py-6 pl-5 pr-4 text-foreground md:flex md:flex-col",
        className,
      )}
    >
      <div className="min-w-0 pl-0.5">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Back to dashboard
        </Link>
        <p className="text-[13px] font-medium leading-snug text-foreground">Articles</p>
        <p className="mt-1 text-[11px] text-muted-foreground">From your library</p>
      </div>

      <nav
        className="mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto border-t border-border/60 pt-6 pr-1 pb-4"
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
