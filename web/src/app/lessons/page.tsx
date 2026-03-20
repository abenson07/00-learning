import Link from "next/link";

import { Card } from "@/components/ui/card";
import { getAuthUser, getUserProfileForUser } from "@/lib/auth/server";
import { listLessonPlansForLessonsPage } from "@/lib/lesson-data";

import StartLessonButton from "./start-lesson-button";

export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  const auth = await getAuthUser();
  const [plans, profile] = await Promise.all([
    listLessonPlansForLessonsPage(),
    auth ? getUserProfileForUser(auth.userId) : Promise.resolve(null),
  ]);

  const profileLine =
    profile?.occupation || profile?.context
      ? [profile?.occupation, profile?.context?.slice(0, 100)]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Lessons</h1>
        <p className="text-muted-foreground text-sm">
          Browse lesson plans below. You can tune your learning profile in{" "}
          <Link href="/settings" className="text-primary font-medium hover:underline">
            Settings
          </Link>{" "}
          when available.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {profile?.role === "teacher" ? (
          <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-medium text-violet-800 dark:text-violet-200">
            Teacher mode
          </span>
        ) : null}
        {profileLine ? (
          <span className="text-muted-foreground rounded-full border border-border bg-muted/40 px-3 py-1 text-xs">
            Profile: {profileLine}
            {profile?.context && profile.context.length > 100 ? "…" : ""}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">
            No occupation set — add one in Settings for better AI examples.
          </span>
        )}
      </div>

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
