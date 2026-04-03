import Link from "next/link";
import { Suspense } from "react";

import { ArticlesBrowser } from "@/components/home/articles-browser";
import {
  DashboardLessonPreview,
  DashboardLessonPreviewFallback,
} from "@/components/home/dashboard-lesson-preview";
import { MainAppShell } from "@/components/layout/main-app-shell";
import { Button } from "@/components/ui/button";
import { fetchArticles } from "@/lib/articles/load-articles";

function HomePageShellFallback() {
  return (
    <MainAppShell sidebarRecentItems={null}>
      <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-8 p-4 md:p-6">
        <DashboardLessonPreviewFallback />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
            <div className="h-5 w-72 max-w-full animate-pulse rounded-md bg-muted" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
            <div className="h-9 w-28 animate-pulse rounded-md bg-muted" />
            <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Home</h1>
            <p className="mt-2 text-muted-foreground">
              Articles and quick links — same cards as the library.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/library">Library</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/lesson-plan">Lesson plan</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/lessons/1">Lesson (sample)</Link>
            </Button>
          </nav>
        </div>
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
