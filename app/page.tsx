import { Suspense } from "react";

import { ArticlesBrowser } from "@/components/home/articles-browser";
import {
  DashboardLessonPreview,
  DashboardLessonPreviewFallback,
} from "@/components/home/dashboard-lesson-preview";
import { MainAppShell } from "@/components/layout/main-app-shell";
import { fetchArticles } from "@/lib/articles/load-articles";

function HomePageShellFallback() {
  return (
    <MainAppShell sidebarRecentItems={null}>
      <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-8 p-4 md:p-6">
        <DashboardLessonPreviewFallback />
        <section className="rounded-lg border bg-background p-4 md:p-6">
          <div className="h-48 animate-pulse rounded-md bg-muted" />
        </section>
      </main>
    </MainAppShell>
  );
}

async function HomePageContent() {
  const { articles, loadError } = await fetchArticles();

  const sidebarRecentItems = articles.slice(0, 5).map((a) => ({
    href: `/articles/${a.id}`,
    title: a.title,
  }));

  return (
    <MainAppShell sidebarRecentItems={sidebarRecentItems}>
      <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-8 p-4 md:p-6">
        <Suspense fallback={<DashboardLessonPreviewFallback />}>
          <DashboardLessonPreview />
        </Suspense>
        <section className="rounded-lg border bg-background p-4 md:p-6">
          <ArticlesBrowser articles={articles} loadError={loadError} />
        </section>
      </main>
    </MainAppShell>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomePageShellFallback />}>
      <HomePageContent />
    </Suspense>
  );
}
