import { LessonPlanOverview } from "@/components/lesson-plan/lesson-plan-overview";
import { MainAppShell } from "@/components/layout/main-app-shell";

export default function LessonPlanPage() {
  return (
    <MainAppShell>
      <LessonPlanOverview />
    </MainAppShell>
  );
}
