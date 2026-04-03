import { Suspense } from "react";

import { LibraryFeed } from "./library-feed";

function LibraryFallback() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl gap-4 p-4 md:p-6">
      <aside className="hidden w-64 rounded-lg border bg-card/40 p-4 md:block" />
      <section className="min-w-0 flex-1 animate-pulse rounded-lg border bg-muted/20 p-4 md:p-6">
        <div className="mb-6 h-8 w-40 rounded-md bg-muted" />
        <div className="space-y-4">
          <div className="h-24 rounded-lg bg-muted" />
          <div className="h-24 rounded-lg bg-muted" />
        </div>
      </section>
    </main>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<LibraryFallback />}>
      <LibraryFeed />
    </Suspense>
  );
}
