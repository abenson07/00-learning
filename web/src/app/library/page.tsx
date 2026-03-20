import Link from "next/link";

export default function LibraryPage() {
  // Prototype UI shell (real data fetching comes in learn-002).
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Library</h1>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-muted-foreground">
          This is the library UI shell. Next phase will populate domains /
          categories / topics and render article cards.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/articles/demo-article-1"
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Open Demo Article
          </Link>
        </div>
      </div>
    </div>
  );
}

