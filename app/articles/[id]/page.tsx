import { Suspense } from "react";

import { ArticleView } from "./article-view";

type PageProps = {
  params: Promise<{ id: string }>;
};

function ArticleFallback() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 p-4 md:p-8">
      <aside className="hidden w-64 shrink-0 md:block lg:w-72">
        <div className="animate-pulse rounded-lg border bg-card/40 p-4">
          <div className="mb-4 h-5 w-24 rounded bg-muted" />
          <div className="space-y-3">
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-3 w-5/6 rounded bg-muted" />
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <article className="mx-auto max-w-3xl animate-pulse rounded-lg border p-6">
          <div className="h-9 w-2/3 rounded-md bg-muted" />
          <div className="mt-8 space-y-3">
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-4/5 rounded bg-muted" />
          </div>
        </article>
      </div>
    </main>
  );
}

export default function ArticlePage({ params }: PageProps) {
  return (
    <Suspense fallback={<ArticleFallback />}>
      <ArticleView params={params} />
    </Suspense>
  );
}
