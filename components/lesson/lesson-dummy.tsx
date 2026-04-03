import Link from "next/link";

import { Button } from "@/components/ui/button";

type LessonDummyProps = {
  lessonId: string;
};

export function LessonDummy({ lessonId }: LessonDummyProps) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col p-4 md:p-6">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Lesson {lessonId}</h1>
        <p className="mt-2 text-muted-foreground">
          Dummy lesson view. Replace with dynamic content when ready.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/library">Library</Link>
          </Button>
          <Button asChild>
            <Link href="/lesson-plan">Lesson plan</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
