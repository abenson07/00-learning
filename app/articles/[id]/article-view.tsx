import DOMPurify from "isomorphic-dompurify";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { hasSupabaseEnvConfigured } from "@/lib/supabase/env";
import { createPublicServerClient } from "@/lib/supabase/server";

async function fetchArticleById(id: string) {
  if (!hasSupabaseEnvConfigured()) return null;

  const supabase = createPublicServerClient();
  const tableCandidates = ["article", "articles"];

  for (const tableName of tableCandidates) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) return data as Record<string, unknown>;
  }

  return null;
}

type ArticleViewProps = {
  params: Promise<{ id: string }>;
};

export async function ArticleView({ params }: ArticleViewProps) {
  const { id } = await params;
  const article = await fetchArticleById(id);
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
      <article className="rounded-xl border border-border/60 bg-background/50 p-6">
        <p className="mb-4">
          <Link
            href="/library"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            Back to library
          </Link>
        </p>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <div
          className="article-body prose prose-neutral mt-6 max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </article>
    </main>
  );
}
