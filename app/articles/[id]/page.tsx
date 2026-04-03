import { Suspense } from "react";

import { ArticleView } from "./article-view";

type PageProps = {
  params: Promise<{ id: string }>;
};

function ArticleFallback() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col p-4 md:p-6">
      <section className="min-h-[12rem] animate-pulse rounded-xl border border-border/40 bg-muted/30 p-6" />
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
