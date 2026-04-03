import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function LessonNotFound() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col items-start gap-4 px-4 py-16 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Lesson not found</h1>
      <p className="text-muted-foreground">
        There is no lesson matching this link. Pick a lesson from the plan or start
        from the beginning.
      </p>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button asChild>
          <Link href="/lesson-plan">View lesson plan</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </main>
  );
}
