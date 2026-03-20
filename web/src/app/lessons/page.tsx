import MockUserSwitcher from "@/components/mock-user-switcher";

export default function LessonsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Lessons</h1>
        <p className="text-muted-foreground">
          This phase uses mock user/role so you can test the DB-driven flows
          later.
        </p>
      </div>

      <MockUserSwitcher />

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-lg font-medium">Lesson plan shell</h2>
        <p className="mt-1 text-muted-foreground">
          Next phase will connect this UI to `learner_progress` /
          `lesson_plan_version` and implement step progression.
        </p>
      </div>
    </div>
  );
}

