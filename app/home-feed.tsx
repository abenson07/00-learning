import Link from "next/link";

import { ArticlesBrowser } from "@/components/home/articles-browser";
import { Button } from "@/components/ui/button";
import { fetchArticles } from "@/lib/articles/load-articles";

export async function HomeFeed() {
  const { articles, loadError } = await fetchArticles();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl gap-4 p-4 md:p-6">
      <aside className="hidden w-64 rounded-lg border bg-card/40 p-4 md:block">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sidebar
        </h2>
      </aside>

      <section className="min-w-0 flex-1 rounded-lg border p-4 md:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Articles</h1>
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
  );
}
