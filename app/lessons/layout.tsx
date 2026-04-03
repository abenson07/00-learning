import { Suspense } from "react";

import { LessonPlanSidebar } from "@/components/layout/lesson-plan-sidebar";
import { MainAppShell } from "@/components/layout/main-app-shell";

function LessonSidebarFallback() {
  return (
    <aside
      className="sticky top-0 hidden h-svh w-[min(100%,280px)] shrink-0 animate-pulse bg-muted/40 md:flex"
      aria-hidden
    />
  );
}

export default function LessonsLayout({ children }: { children: React.ReactNode }) {
  return (
    <MainAppShell
      mainSurface="lesson"
      sidebar={
        <Suspense fallback={<LessonSidebarFallback />}>
          <LessonPlanSidebar />
        </Suspense>
      }
    >
      {children}
    </MainAppShell>
  );
}
