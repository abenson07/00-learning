import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getLessonPlanLessonByItemId,
  getLessonPlanVersionMeta,
} from "@/lib/lesson-data";

import LessonItemExperience from "./lesson-item-experience";

export const dynamic = "force-dynamic";

export default async function LessonItemPage({
  params,
}: {
  params: Promise<{ lessonPlanVersionId: string; lessonPlanItemId: string }>;
}) {
  const { lessonPlanVersionId, lessonPlanItemId } = await params;
  const [meta, serverLesson] = await Promise.all([
    getLessonPlanVersionMeta(lessonPlanVersionId),
    getLessonPlanLessonByItemId(lessonPlanVersionId, lessonPlanItemId),
  ]);

  if (!meta || !serverLesson) {
    notFound();
  }

  return (
    <div className="w-full">
      <Suspense
        fallback={
          <p className="text-muted-foreground text-sm">Loading lesson…</p>
        }
      >
        <LessonItemExperience
          lessonPlanVersionId={lessonPlanVersionId}
          lessonPlanItemId={lessonPlanItemId}
          planTitle={meta.title}
          domainName={meta.domainName}
          description={meta.description}
          planLearningGoal={meta.learningGoal}
          planTools={meta.planTools}
          serverLesson={serverLesson}
        />
      </Suspense>
      <p className="text-muted-foreground mt-8 text-center text-xs">
        <Link
          href="/lessons"
          className="font-medium text-primary hover:text-primary/80"
        >
          ← All lesson plans
        </Link>
      </p>
    </div>
  );
}
