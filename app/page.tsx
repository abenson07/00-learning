import { Suspense } from "react";

import { ArticlesBrowser } from "@/components/home/articles-browser";
import {
  DashboardLessonPreview,
  DashboardLessonPreviewFallback,
} from "@/components/home/dashboard-lesson-preview";
import {
  MainAppShell,
  lessonSurfaceCardChrome,
} from "@/components/layout/main-app-shell";
import { cn } from "@/lib/utils";
import { fetchArticles } from "@/lib/articles/load-articles";

/** Column between shell padding and panels: layout only — no extra chrome. */
const homeContentColumnClass =
  "mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 border-0 bg-transparent p-0 shadow-none";

const homeArticlesPanelClass = cn(
  lessonSurfaceCardChrome,
  "min-w-0 p-4 md:p-6",
);

/** Preview panel: matches lesson shell card chrome; no right padding so cards bleed to the edge. */
const homePreviewPanelClass = cn(
  lessonSurfaceCardChrome,
  "min-w-0 pl-4 pt-4 pb-4 pr-0 md:pl-6 md:pt-6 md:pb-6",
);

function HomePageShellFallback() {
  return (
    <MainAppShell
      mainSurface="lesson"
      lessonMainTransparent
      sidebarRecentItems={null}
    >
      <div className={homeContentColumnClass}>
        <main className={homePreviewPanelClass}>
          <DashboardLessonPreviewFallback surface="nested" />
        </main>
        <section aria-label="Articles" className={homeArticlesPanelClass}>
          <div className="h-48 animate-pulse rounded-md bg-muted" />
        </section>
      </div>
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
    <MainAppShell
      mainSurface="lesson"
      lessonMainTransparent
      sidebarRecentItems={sidebarRecentItems}
    >
      <div className={homeContentColumnClass}>
        <Suspense
          fallback={
            <main className={homePreviewPanelClass}>
              <DashboardLessonPreviewFallback surface="nested" />
            </main>
          }
        >
          <main className={homePreviewPanelClass}>
            <DashboardLessonPreview surface="nested" />
          </main>
        </Suspense>
        <section aria-label="Articles" className={homeArticlesPanelClass}>
          <ArticlesBrowser articles={articles} loadError={loadError} />
        </section>
      </div>
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
