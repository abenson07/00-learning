import { notFound } from "next/navigation";

import { LessonContent } from "@/components/lesson/lesson-content";
import { fetchLessonPlan } from "@/lib/curriculum/fetch-lesson-plan";
import {
  getAllLessons,
  getLessonByRouteParam,
  getLessonPlanMeta,
} from "@/lib/curriculum/lesson-plan-data";

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
  return <LessonContent plan={plan} lesson={lesson} />;
}
