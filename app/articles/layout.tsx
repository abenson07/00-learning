import { Suspense } from "react";

import { ArticlePlanSidebar } from "@/components/layout/article-plan-sidebar";
import { MainAppShell } from "@/components/layout/main-app-shell";
import { fetchArticles } from "@/lib/articles/load-articles";

function ArticlesLayoutFallback() {
  return (
    <MainAppShell
      mainSurface="lesson"
      sidebar={
        <aside
          className="sticky top-0 hidden h-svh w-[min(100%,280px)] shrink-0 animate-pulse bg-muted/40 md:flex"
          aria-hidden
        />
      }
    >
      <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col p-4 md:p-6">
        <section className="min-h-[12rem] animate-pulse rounded-lg border border-border bg-muted/30 p-6" />
      </main>
    </MainAppShell>
  );
}

async function ArticlesLayoutBody({ children }: { children: React.ReactNode }) {
  const { articles } = await fetchArticles();

  return (
    <MainAppShell mainSurface="lesson" sidebar={<ArticlePlanSidebar articles={articles} />}>
      {children}
    </MainAppShell>
  );
}

export default function ArticlesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ArticlesLayoutFallback />}>
      <ArticlesLayoutBody>{children}</ArticlesLayoutBody>
    </Suspense>
  );
}
