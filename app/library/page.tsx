import { Suspense } from "react";

import { MainAppShell } from "@/components/layout/main-app-shell";

import { LibraryFeed } from "./library-feed";

function LibraryFallback() {
  return (
    <MainAppShell>
      <main className="mx-auto min-h-svh w-full max-w-7xl p-4 md:p-6">
        <section className="animate-pulse rounded-lg border bg-muted/20 p-4 md:p-6">
          <div className="mb-6 h-8 w-40 rounded-md bg-muted" />
          <div className="space-y-4">
            <div className="h-24 rounded-lg bg-muted" />
            <div className="h-24 rounded-lg bg-muted" />
          </div>
        </section>
      </main>
    </MainAppShell>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<LibraryFallback />}>
      <LibraryFeed />
    </Suspense>
  );
}
