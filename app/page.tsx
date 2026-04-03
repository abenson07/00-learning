import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 p-6 md:p-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Home</h1>
        <p className="mt-2 text-muted-foreground">
          UI overhaul scaffold — pick a section to open.
        </p>
      </div>
      <nav className="flex flex-col gap-3">
        <Button asChild variant="outline" className="justify-start">
          <Link href="/library">Library</Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link href="/lesson-plan">Lesson plan</Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link href="/lessons/1">Lesson (sample)</Link>
        </Button>
      </nav>
    </main>
  );
}
