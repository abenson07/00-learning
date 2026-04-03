import { notFound } from "next/navigation";

import { LessonContent } from "@/components/lesson/lesson-content";
import { fetchLessonPlan } from "@/lib/curriculum/fetch-lesson-plan";
import { fetchLessonStepProgress } from "@/lib/curriculum/fetch-lesson-step-progress";
import {
  getAllLessons,
  getLessonByRouteParam,
  getLessonPlanMeta,
} from "@/lib/curriculum/lesson-plan-data";
import { completedStepKey } from "@/lib/curriculum/lesson-step-local";

type LessonViewProps = {
  params: Promise<{ lessonId: string }>;
};

export async function LessonView({ params }: LessonViewProps) {
  const { lessonId } = await params;
  const content = await fetchLessonPlan();
  const lessons = getAllLessons(content);
  const lesson = getLessonByRouteParam(lessonId, lessons);
  if (!lesson) {
    notFound();
  }
  const plan = getLessonPlanMeta(content);
  const { userId, steps } = await fetchLessonStepProgress(plan.id);
  const completedStepKeys = steps.map((s) =>
    completedStepKey(s.lessonId, s.stepNumber),
  );
  return (
    <LessonContent
      key={lesson.id}
      plan={plan}
      lesson={lesson}
      useServerStepProgress={Boolean(userId)}
      completedStepKeys={completedStepKeys}
    />
  );
}
