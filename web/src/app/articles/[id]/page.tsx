import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { getSimpleArticleById } from "@/lib/library-data";

export const dynamic = "force-dynamic";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const article = await getSimpleArticleById(id);

  if (!article) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">
          {article.domain} / {article.area} / {article.category}
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{article.title}</h1>
        {article.slug ? <p className="text-muted-foreground text-xs">{article.slug}</p> : null}
      </div>
      <Card className="p-6">
        <article className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground dark:prose-invert">
          {article.content}
        </article>
      </Card>
      <div>
        <a href="/library" className="text-primary text-sm font-medium hover:underline">
          Back to Library
        </a>
      </div>
    </div>
  );
}
