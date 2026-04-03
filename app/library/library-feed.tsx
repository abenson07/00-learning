import { ArticlesBrowser } from "@/components/home/articles-browser";
import { MainAppShell } from "@/components/layout/main-app-shell";
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
          <ArticlesBrowser articles={articles} loadError={loadError} />
        </section>
      </main>
    </MainAppShell>
  );
}
