import { Suspense } from "react";

import { ArticlePlanSidebar } from "@/components/layout/article-plan-sidebar";
import { MainAppShell } from "@/components/layout/main-app-shell";
import { fetchArticles } from "@/lib/articles/load-articles";

function ArticleLayoutFallback() {
  return (
    <MainAppShell
      mainSurface="lesson"
      sidebar={
        <aside
          className="sticky top-0 hidden h-svh w-[min(100%,280px)] shrink-0 animate-pulse bg-lesson-plan md:flex"
          aria-hidden
        />
      }
    >
      <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col p-4 md:p-6">
        <section className="min-h-[12rem] animate-pulse rounded-xl border border-border/40 bg-muted/30 p-6" />
      </main>
    </MainAppShell>
  );
}

async function ArticleLayoutBody({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { articles } = await fetchArticles();

  return (
    <MainAppShell
      mainSurface="lesson"
      sidebar={<ArticlePlanSidebar articles={articles} currentArticleId={id} />}
    >
      {children}
    </MainAppShell>
  );
}

export default function ArticleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ArticleLayoutFallback />}>
      <ArticleLayoutBody params={params}>{children}</ArticleLayoutBody>
    </Suspense>
  );
}
