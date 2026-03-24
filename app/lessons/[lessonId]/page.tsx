import { Suspense } from "react";

import { LessonView } from "./lesson-view";

type PageProps = {
  params: Promise<{ lessonId: string }>;
};

function LessonFallback() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 p-4 md:flex-row md:p-6">
      <aside className="h-32 w-full animate-pulse rounded-lg border bg-muted/30 md:w-72" />
      <section className="flex-1 animate-pulse rounded-lg border bg-muted/30 p-6" />
    </main>
  );
}

export default function LessonPage({ params }: PageProps) {
  return (
    <Suspense fallback={<LessonFallback />}>
      <LessonView params={params} />
    </Suspense>
  );
}
