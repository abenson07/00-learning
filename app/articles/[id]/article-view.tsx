import DOMPurify from "isomorphic-dompurify";
import { notFound } from "next/navigation";

import { fetchArticleByRouteId } from "@/lib/articles/fetch-article-by-route-id";

type ArticleViewProps = {
  params: Promise<{ id: string }>;
};

export async function ArticleView({ params }: ArticleViewProps) {
  const { id } = await params;
  const article = await fetchArticleByRouteId(id);
  if (!article) notFound();

  const title =
    typeof article.title === "string"
      ? article.title
      : typeof article.article_name === "string"
        ? article.article_name
        : "Untitled article";

  const content =
    typeof article.content === "string"
      ? article.content
      : typeof article.article_content === "string"
        ? article.article_content
        : "No article content available yet.";

  const safeHtml = DOMPurify.sanitize(content, { USE_PROFILES: { html: true } });

  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col p-4 md:p-6">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div
          className="article-body prose prose-neutral mt-2 max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </section>
    </main>
  );
}
