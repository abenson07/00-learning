import { LessonPlanDummy } from "@/components/lesson-plan/lesson-plan-dummy";
import { MainAppShell } from "@/components/layout/main-app-shell";

export default function LessonPlanPage() {
  return (
    <MainAppShell>
      <main className="mx-auto min-h-svh w-full max-w-4xl p-4 md:p-8">
        <LessonPlanDummy />
      </main>
    </MainAppShell>
  );
}
