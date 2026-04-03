import { Suspense } from "react";

import { LessonPlanSidebar } from "@/components/layout/lesson-plan-sidebar";
import { MainAppShell } from "@/components/layout/main-app-shell";
import { fetchLessonPlan } from "@/lib/curriculum/fetch-lesson-plan";
import { fetchLessonStepProgress } from "@/lib/curriculum/fetch-lesson-step-progress";
import {
  getAllLessons,
  getLessonPlanMeta,
} from "@/lib/curriculum/lesson-plan-data";

function LessonSidebarFallback() {
  return (
    <aside
      className="sticky top-0 hidden h-svh w-[min(100%,280px)] shrink-0 animate-pulse bg-muted/40 md:flex"
      aria-hidden
    />
  );
}

async function LessonsSidebarWithData() {
  const content = await fetchLessonPlan();
  const plan = getLessonPlanMeta(content);
  const lessons = getAllLessons(content);
  const { userId, steps } = await fetchLessonStepProgress(plan.id);
  return (
    <LessonPlanSidebar
      plan={plan}
      lessons={lessons}
      initialCompletedSteps={steps}
      hasSession={Boolean(userId)}
    />
  );
}

export default function LessonsLayout({ children }: { children: React.ReactNode }) {
  return (
    <MainAppShell
      mainSurface="lesson"
      sidebar={
        <Suspense fallback={<LessonSidebarFallback />}>
          <LessonsSidebarWithData />
        </Suspense>
      }
    >
      {children}
    </MainAppShell>
  );
}
