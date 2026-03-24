import Link from "next/link";

import { Card } from "@/components/ui/card";
import {
  groupArticlesByDomainAreaCategory,
  listSimpleArticles,
} from "@/lib/library-data";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const articles = await listSimpleArticles();
  const grouped = groupArticlesByDomainAreaCategory(articles);
  const domains = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Library</h1>
        <p className="text-muted-foreground text-sm">
          Articles grouped by domain, area, and category.
        </p>
      </div>

      {articles.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No articles found in the Supabase <code>articles</code> table yet.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {domains.map((domain) => {
            const areas = grouped[domain];
            const areaNames = Object.keys(areas).sort((a, b) => a.localeCompare(b));
            return (
              <section key={domain} className="space-y-3">
                <h2 className="text-xl font-semibold">{domain}</h2>
                {areaNames.map((area) => {
                  const categories = areas[area];
                  const categoryNames = Object.keys(categories).sort((a, b) =>
                    a.localeCompare(b),
                  );
                  return (
                    <div key={`${domain}-${area}`} className="space-y-3">
                      <h3 className="text-base font-medium text-muted-foreground">{area}</h3>
                      {categoryNames.map((category) => (
                        <div key={`${domain}-${area}-${category}`} className="space-y-2">
                          <p className="text-sm font-medium">{category}</p>
                          <ul className="grid gap-2 sm:grid-cols-2">
                            {categories[category].map((article) => (
                              <li key={article.id}>
                                <Link href={`/articles/${article.id}`}>
                                  <Card className="p-4 transition-colors hover:bg-muted/40">
                                    <p className="font-medium">{article.title}</p>
                                    {article.slug ? (
                                      <p className="text-muted-foreground mt-1 text-xs">
                                        {article.slug}
                                      </p>
                                    ) : null}
                                  </Card>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
