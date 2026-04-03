import Link from "next/link";

import { ArticlesBrowser } from "@/components/home/articles-browser";
import { MainAppShell } from "@/components/layout/main-app-shell";
import { Button } from "@/components/ui/button";
import { fetchArticles } from "@/lib/articles/load-articles";

export async function LibraryFeed() {
  const { articles, loadError } = await fetchArticles();

  const sidebarRecentItems = articles.slice(0, 5).map((a) => ({
    href: `/articles/${a.id}`,
    title: a.title,
  }));

  return (
    <MainAppShell sidebarRecentItems={sidebarRecentItems}>
      <main className="mx-auto min-h-svh w-full max-w-7xl p-4 md:p-6">
        <section className="rounded-lg border bg-background p-4 md:p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-semibold">Library</h1>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/lesson-plan">Lesson Plan</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/lessons/1">Lesson</Link>
              </Button>
            </div>
          </div>
          <ArticlesBrowser articles={articles} loadError={loadError} />
        </section>
      </main>
    </MainAppShell>
  );
}
