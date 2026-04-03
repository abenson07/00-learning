import { hasSupabaseEnvConfigured } from "@/lib/supabase/env";
import { createPublicServerClient } from "@/lib/supabase/server";

const TABLE_CANDIDATES = ["article", "articles"] as const;

/** Must match the id fallbacks in `mapArticle` (load-articles.ts) so list/search/lesson links resolve here. */
const ROUTE_ID_COLUMNS = ["id", "article_id", "slug", "article_number"] as const;

export async function fetchArticleByRouteId(
  routeId: string,
): Promise<Record<string, unknown> | null> {
  if (!hasSupabaseEnvConfigured()) return null;

  const supabase = createPublicServerClient();

  for (const tableName of TABLE_CANDIDATES) {
    for (const column of ROUTE_ID_COLUMNS) {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq(column, routeId)
        .maybeSingle();

      if (!error && data) return data as Record<string, unknown>;
    }
  }

  return null;
}
