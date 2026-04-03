import { Suspense } from "react";

import { LessonView } from "./lesson-view";

type PageProps = {
  params: Promise<{ lessonId: string }>;
};

function LessonFallback() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col p-4 md:p-6">
      <section className="min-h-[12rem] animate-pulse rounded-lg border border-border bg-muted/30 p-6" />
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
