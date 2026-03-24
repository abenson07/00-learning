import Link from "next/link";

import { ArticlesBrowser, type HomeArticle } from "@/components/home/articles-browser";
import { Button } from "@/components/ui/button";
import { describeMissingSupabaseEnv, hasSupabaseEnvConfigured } from "@/lib/supabase/env";
import { createPublicServerClient } from "@/lib/supabase/server";

type RawArticle = Record<string, unknown>;

function getText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function mapArticle(row: RawArticle): HomeArticle {
  return {
    id: String(row.id ?? row.article_id ?? row.article_number ?? row.slug ?? "unknown"),
    title: getText(row.title ?? row.article_name, "Untitled article"),
    description:
      typeof row.description === "string"
        ? row.description
        : typeof row.article_description === "string"
          ? row.article_description
          : null,
    category: getText(row.category ?? row.article_category, "Uncategorized"),
    domain: getText(row.domain ?? row.article_domain, "App & Development"),
  };
}

async function fetchArticles(): Promise<{
  articles: HomeArticle[];
  loadError: string | null;
}> {
  if (!hasSupabaseEnvConfigured()) {
    return {
      articles: [],
      loadError: describeMissingSupabaseEnv(),
    };
  }

  const supabase = createPublicServerClient();
  const tableCandidates = ["article", "articles"];

  let lastError: string | null = null;

  for (const tableName of tableCandidates) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      lastError = `${tableName}: ${error.message}`;
      continue;
    }

    if (Array.isArray(data)) {
      return {
        articles: data.map((row) => mapArticle(row as RawArticle)),
        loadError: null,
      };
    }
  }

  return { articles: [], loadError: lastError };
}

export default async function HomePage() {
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
