import { LessonPlanSidebar } from "@/components/layout/lesson-plan-sidebar";
import { MainAppShell } from "@/components/layout/main-app-shell";

export default function LessonsLayout({ children }: { children: React.ReactNode }) {
  return (
    <MainAppShell mainSurface="lesson" sidebar={<LessonPlanSidebar />}>
      {children}
    </MainAppShell>
  );
}
