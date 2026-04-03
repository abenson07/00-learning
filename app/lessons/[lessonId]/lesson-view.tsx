import { notFound } from "next/navigation";

import { LessonContent } from "@/components/lesson/lesson-content";
import {
  getLessonByRouteParam,
  getLessonPlanMeta,
} from "@/lib/curriculum/lesson-plan-data";

type LessonViewProps = {
  params: Promise<{ lessonId: string }>;
};

export async function LessonView({ params }: LessonViewProps) {
  const { lessonId } = await params;
  const lesson = getLessonByRouteParam(lessonId);
  if (!lesson) {
    notFound();
  }
  const plan = getLessonPlanMeta();
  return <LessonContent plan={plan} lesson={lesson} />;
}
