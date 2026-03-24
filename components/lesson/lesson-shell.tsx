import Link from "next/link";

import { Button } from "@/components/ui/button";

function LessonSidebar() {
  return (
    <aside className="w-full rounded-lg border p-4 md:w-72">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Lesson Sidebar
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Placeholder navigation for lesson steps, progress, and tools.
      </p>
    </aside>
  );
}

function LessonContent({ lessonId }: { lessonId: string }) {
  return (
    <section className="flex-1 rounded-lg border p-6">
      <h1 className="text-2xl font-semibold">Lesson {lessonId}</h1>
      <p className="mt-2 text-muted-foreground">
        This is a prototype lesson page. We can plug in lesson plan item content,
        quiz checkpoints, and completion tracking next.
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild>
          <Link href="/lesson-plan">Go to lesson plan</Link>
        </Button>
      </div>
    </section>
  );
}

export function LessonShell({ lessonId }: { lessonId: string }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 p-4 md:flex-row md:p-6">
      <LessonSidebar />
      <LessonContent lessonId={lessonId} />
    </main>
  );
}
