import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getContentItemDetails,
  librarySelectionHref,
  listRelatedContentItems,
} from "@/lib/library-data";
import { richJsonToHtml } from "@/lib/rich-text";

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

  const html = richJsonToHtml(article.content_rich_json);
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
            <Link href={libraryBack} className="hover:text-foreground">
              Library
            </Link>
            <span aria-hidden>/</span>
            <span>{article.breadcrumb.domain.name}</span>
            <span aria-hidden>/</span>
            <span>{article.breadcrumb.category.name}</span>
            <span aria-hidden>/</span>
            <span className="text-foreground">{article.breadcrumb.topic.name}</span>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
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

      <Card className="p-4 sm:p-6">
        {html ? (
          <div
            className="article-body max-w-none text-[0.975rem] leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="text-muted-foreground whitespace-pre-wrap">
            {article.plain_text}
          </p>
        )}
      </Card>

      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <Button
          type="button"
          className="w-fit"
          variant="outline"
          disabled
          title="Q&A arrives in learn-004"
        >
          Ask a question
        </Button>
        <p className="text-muted-foreground max-w-md text-xs">
          Highlighting, comments, and AI-assisted answers will plug in here in a
          later phase.
        </p>
      </div>

      {related.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Related in this track</h2>
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
