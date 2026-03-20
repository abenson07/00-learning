"use server";

import { revalidatePath } from "next/cache";

import {
  getArticleSnapshotByVersionId,
  getLessonPlanSteps,
  listRelatedForLessonArticle,
  loadLearnerLessonViewModel,
  type ArticleSnapshotRead,
  type LearnerLessonViewModel,
} from "@/lib/lesson-data";
import type { ContentItemListRow } from "@/lib/library-data";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function loadLearnerLessonViewAction(
  userId: string,
  lessonPlanVersionId: string,
): Promise<LearnerLessonViewModel> {
  return loadLearnerLessonViewModel(userId, lessonPlanVersionId);
}

export async function ensureLearnerProgressAction(
  userId: string,
  lessonPlanVersionId: string,
): Promise<LearnerLessonViewModel> {
  const supabase = getSupabaseServerClient();

  const { data: existing, error: findError } = await supabase
    .from("learner_progress")
    .select("id")
    .eq("user_id", userId)
    .eq("lesson_plan_version_id", lessonPlanVersionId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    throw new Error(findError.message);
  }

  if (existing) {
    revalidatePath(`/lessons/${lessonPlanVersionId}`);
    return loadLearnerLessonViewModel(userId, lessonPlanVersionId);
  }

  const { data: inserted, error: insErr } = await supabase
    .from("learner_progress")
    .insert({
      user_id: userId,
      lesson_plan_version_id: lessonPlanVersionId,
      status: "active",
    })
    .select("id")
    .single();

  if (insErr) {
    throw new Error(insErr.message);
  }

  const steps = await getLessonPlanSteps(lessonPlanVersionId);
  if (steps && steps.length > 0) {
    const { error: lipErr } = await supabase.from("lesson_item_progress").insert(
      steps.map((s) => ({
        learner_progress_id: inserted.id,
        lesson_plan_item_id: s.lessonPlanItemId,
        article_status: "pending",
      })),
    );

    if (lipErr) {
      throw new Error(lipErr.message);
    }
  }

  revalidatePath(`/lessons/${lessonPlanVersionId}`);
  return loadLearnerLessonViewModel(userId, lessonPlanVersionId);
}

export async function markArticleCompletedAction(
  userId: string,
  lessonPlanVersionId: string,
  lessonPlanItemId: string,
): Promise<LearnerLessonViewModel> {
  const supabase = getSupabaseServerClient();
  const vm = await loadLearnerLessonViewModel(userId, lessonPlanVersionId);

  if (!vm.learnerProgressId) {
    throw new Error("Start the lesson before marking steps complete.");
  }

  const stepIdx = vm.steps.findIndex(
    (s) => s.lessonPlanItemId === lessonPlanItemId,
  );
  if (stepIdx < 0) {
    throw new Error("Unknown lesson step.");
  }

  if (stepIdx !== vm.activeStepIndex) {
    throw new Error("Finish the current step first.");
  }

  const step = vm.steps[stepIdx];
  if (step.articleStatus === "completed") {
    throw new Error("This article is already marked complete.");
  }

  const { data: itemMeta, error: itemErr } = await supabase
    .from("lesson_plan_item")
    .select("id, lesson_plan_version_id, effective_content_version_id")
    .eq("id", lessonPlanItemId)
    .maybeSingle();

  if (itemErr) {
    throw new Error(itemErr.message);
  }
  if (
    !itemMeta ||
    itemMeta.lesson_plan_version_id !== lessonPlanVersionId
  ) {
    throw new Error("This step does not belong to the current lesson version.");
  }

  const { error: updErr } = await supabase
    .from("lesson_item_progress")
    .update({
      article_status: "completed",
      completed_at: new Date().toISOString(),
      completed_content_version_id: itemMeta.effective_content_version_id,
    })
    .eq("learner_progress_id", vm.learnerProgressId)
    .eq("lesson_plan_item_id", lessonPlanItemId);

  if (updErr) {
    throw new Error(updErr.message);
  }

  const refreshed = await loadLearnerLessonViewModel(
    userId,
    lessonPlanVersionId,
  );
  const allDone =
    refreshed.steps.length > 0 &&
    refreshed.steps.every((s) => s.articleStatus === "completed");

  if (allDone && refreshed.learnerProgressId) {
    const { error: lpErr } = await supabase
      .from("learner_progress")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", refreshed.learnerProgressId);

    if (lpErr) {
      throw new Error(lpErr.message);
    }
  }

  revalidatePath(`/lessons/${lessonPlanVersionId}`);
  return loadLearnerLessonViewModel(userId, lessonPlanVersionId);
}

export type ArticleReadBundle = {
  snapshot: ArticleSnapshotRead;
  related: ContentItemListRow[];
};

export async function getArticleReadBundleAction(
  contentItemId: string,
  effectiveVersionId: string,
): Promise<ArticleReadBundle | null> {
  const snapshot = await getArticleSnapshotByVersionId(
    contentItemId,
    effectiveVersionId,
  );
  if (!snapshot) {
    return null;
  }
  const related = await listRelatedForLessonArticle(
    snapshot.contentItemId,
    snapshot.topicId,
  );
  return { snapshot, related };
}
