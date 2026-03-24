import { notFound } from "next/navigation";

import { hasSupabaseEnvConfigured } from "@/lib/supabase/env";
import { createPublicServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

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

export default async function ArticlePage({ params }: PageProps) {
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

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl p-4 md:p-8">
      <article className="rounded-lg border p-6">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-6 whitespace-pre-wrap text-base leading-7">{content}</p>
      </article>
    </main>
  );
}
