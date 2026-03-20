import Link from "next/link";

import MockUserSwitcher from "@/components/mock-user-switcher";
import { Card } from "@/components/ui/card";
import { listLessonPlansForLessonsPage } from "@/lib/lesson-data";

import StartLessonButton from "./start-lesson-button";

export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  const plans = await listLessonPlansForLessonsPage();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Lessons</h1>
        <p className="text-muted-foreground">
          Mock user ids stand in for real accounts until Supabase Auth is wired
          up. Starting a lesson creates{" "}
          <code className="text-foreground">learner_progress</code> and per-step
          rows in Supabase.
        </p>
      </div>

      <MockUserSwitcher />

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Available lesson plans</h2>
        {plans.length === 0 ? (
          <Card className="p-4">
            <p className="text-muted-foreground text-sm">
              No active lesson plans found. Run the learn-001 schema + seed SQL
              in Supabase, then refresh.
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-4">
            {plans.map((plan) => (
              <li key={plan.versionId}>
                <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex flex-col gap-1">
                    <h3 className="font-medium">{plan.title}</h3>
                    <p className="text-muted-foreground text-sm">
                      {plan.domainName}
                      {plan.description ? ` · ${plan.description}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <StartLessonButton versionId={plan.versionId} />
                    <Link
                      href={`/lessons/${plan.versionId}`}
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      Open without starting
                    </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
