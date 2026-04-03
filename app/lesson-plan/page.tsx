import { Suspense } from "react";

import { LessonPlanOverview } from "@/components/lesson-plan/lesson-plan-overview";
import { MainAppShell } from "@/components/layout/main-app-shell";

function LessonPlanOverviewFallback() {
  return (
    <div className="mx-auto min-h-svh w-full max-w-6xl animate-pulse px-4 py-8 md:px-6 md:py-12">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="mt-4 h-4 max-w-xl rounded bg-muted/80" />
      <div className="mt-10 flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-lg border border-border bg-muted/30" />
        ))}
      </div>
    </div>
  );
}

export default function LessonPlanPage() {
  return (
    <MainAppShell>
      <Suspense fallback={<LessonPlanOverviewFallback />}>
        <LessonPlanOverview />
      </Suspense>
    </MainAppShell>
  );
}
