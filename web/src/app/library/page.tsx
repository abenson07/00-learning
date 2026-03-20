import Link from "next/link";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  librarySelectionHref,
  listCategoriesByDomain,
  listContentItemsByTopic,
  listDomains,
  listTopicsByCategory,
  pickById,
} from "@/lib/library-data";

function libraryHrefPartial(
  entry: { domainId: string; categoryId?: string; topicId?: string },
): string {
  const q = new URLSearchParams({ domain: entry.domainId });
  if (entry.categoryId) {
    q.set("category", entry.categoryId);
  }
  if (entry.topicId) {
    q.set("topic", entry.topicId);
  }
  return `/library?${q.toString()}`;
}

export const dynamic = "force-dynamic";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string; category?: string; topic?: string }>;
}) {
  const sp = await searchParams;

  const domains = await listDomains();
  const domain = pickById(domains, sp.domain);

  if (!domain) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Library</h1>
        <p className="text-muted-foreground">
          No domains found. Run the Supabase schema and seed, then reload.
        </p>
      </div>
    );
  }

  const categories = await listCategoriesByDomain(domain.id);
  const category = pickById(categories, sp.category);

  if (!category) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Library</h1>
        <p className="text-muted-foreground">
          No categories for this domain yet.
        </p>
      </div>
    );
  }

  const topics = await listTopicsByCategory(category.id);
  const topic = pickById(topics, sp.topic);

  if (!topic) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Library</h1>
        <p className="text-muted-foreground">
          No topics in this category yet.
        </p>
      </div>
    );
  }

  const items = await listContentItemsByTopic(topic.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Library</h1>
          <p className="text-muted-foreground text-sm">
            Browse by domain, category, then topic.
          </p>
        </div>
        <p className="text-muted-foreground text-xs">
          Mock teacher/student role (for future progress writes) lives on the{" "}
          <Link href="/lessons" className="text-foreground underline">
            Lessons
          </Link>{" "}
          page.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-56">
          <nav className="rounded-lg border border-border bg-card p-3">
            <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Domain
            </div>
            <ul className="flex flex-col gap-0.5">
              {domains.map((d) => (
                <li key={d.id}>
                  <Link
                    href={libraryHrefPartial({ domainId: d.id })}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                      d.id === domain.id &&
                        "bg-muted font-medium text-foreground",
                    )}
                  >
                    {d.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="rounded-lg border border-border bg-card p-3">
            <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Category
            </div>
            <ul className="flex flex-col gap-0.5">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={libraryHrefPartial({
                      domainId: domain.id,
                      categoryId: c.id,
                    })}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                      c.id === category.id &&
                        "bg-muted font-medium text-foreground",
                    )}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="rounded-lg border border-border bg-card p-3">
            <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Topic
            </div>
            <ul className="flex flex-col gap-0.5">
              {topics.map((t) => (
                <li key={t.id}>
                  <Link
                    href={librarySelectionHref({
                      domainId: domain.id,
                      categoryId: category.id,
                      topicId: t.id,
                    })}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                      t.id === topic.id &&
                        "bg-muted font-medium text-foreground",
                    )}
                  >
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-4">
            <h2 className="text-lg font-medium">Articles</h2>
            <p className="text-muted-foreground text-sm">
              {topic.name.replaceAll("_", " ")} · {items.length} item
              {items.length === 1 ? "" : "s"}
            </p>
          </div>

          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No articles for this topic yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li key={item.id}>
                  <Link href={`/articles/${item.id}`}>
                    <Card className="p-4 transition-colors hover:bg-muted/40">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{item.title}</span>
                        <span className="text-muted-foreground text-xs">
                          {item.content_type} · {item.slug}
                        </span>
                      </div>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
