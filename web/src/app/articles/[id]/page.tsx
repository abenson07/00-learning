import Link from "next/link";
import { notFound } from "next/navigation";

import ArticleReader from "@/components/article-reader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getContentItemDetails,
  librarySelectionHref,
  listRelatedContentItems,
} from "@/lib/library-data";

export const dynamic = "force-dynamic";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const article = await getContentItemDetails(id);

  if (!article) {
    notFound();
  }

  const libraryBack = librarySelectionHref({
    domainId: article.breadcrumb.domain.id,
    categoryId: article.breadcrumb.category.id,
    topicId: article.breadcrumb.topic.id,
  });

  const topicId = article.breadcrumb.topic.id;
  const related = await listRelatedContentItems(article.id, topicId, 3);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex flex-col gap-2">
          <nav className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Link
              href={libraryBack}
              className="font-medium text-primary hover:text-primary/80"
            >
              Library
            </Link>
            <span aria-hidden>/</span>
            <span>{article.breadcrumb.domain.name}</span>
            <span aria-hidden>/</span>
            <span>{article.breadcrumb.category.name}</span>
            <span aria-hidden>/</span>
            <span className="text-foreground">{article.breadcrumb.topic.name}</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            {article.title}
          </h1>
          <p className="text-muted-foreground text-xs">
            Version {article.version.version_number}
            {article.version.is_latest ? " · latest" : ""}
          </p>
        </div>
        <Link href={libraryBack}>
          <Button type="button" variant="secondary" className="shrink-0">
            Back to library
          </Button>
        </Link>
      </div>

      <Card className="p-5 sm:p-8">
        <ArticleReader
          contentItemId={article.id}
          contentVersionId={article.version.id}
          articleTitle={article.title}
          canonicalPlainText={article.plain_text}
          contentRichJson={article.content_rich_json}
          topicName={article.breadcrumb.topic.name}
          relatedArticles={related}
        />
      </Card>

      {related.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold tracking-tight">Related in this track</h2>
          <ul className="flex flex-col gap-2">
            {related.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/articles/${item.id}`}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
