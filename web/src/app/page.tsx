import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Learning Platform Prototype</h1>
      <p className="text-muted-foreground">
        Use the navigation to explore the library and lesson plan UI shells.
      </p>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/library"
          className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Open Library
        </Link>
        <Link
          href="/lessons"
          className="inline-flex h-9 items-center rounded-lg bg-muted px-4 text-sm font-medium text-foreground hover:bg-muted/70"
        >
          Open Lessons
        </Link>
      </div>
    </div>
  );
}
