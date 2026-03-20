import Link from "next/link";

export default function ArticlePage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Article reader</h1>
          <p className="text-muted-foreground">Content id: {id}</p>
        </div>
        <Link
          href="/library"
          className="inline-flex h-9 items-center rounded-lg bg-muted px-4 text-sm font-medium hover:bg-muted/70"
        >
          Back to Library
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-muted-foreground">
          Placeholder reader for learn-000. Rich text rendering and
          character-range highlighting come in `learn-004`.
        </p>
      </div>
    </div>
  );
}

