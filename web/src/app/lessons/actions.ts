"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getArticleSnapshotByVersionId,
  getLessonPlanSteps,
  listQuizQuestionsPublicForLessonPlanItem,
  listRelatedForLessonArticle,
  loadLearnerLessonViewModel,
  loadQuizQuestionsForScoring,
  type ArticleSnapshotRead,
  type LearnerLessonViewModel,
  type LessonStepState,
  type QuizQuestionPublic,
} from "@/lib/lesson-data";
import type { ContentItemListRow } from "@/lib/library-data";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const QUIZ_PASS_RATIO = 0.7;

async function syncLearnerProgressCompletedIfAllStepsDone(
  supabase: SupabaseClient,
  userId: string,
  lessonPlanVersionId: string,
): Promise<void> {
  const refreshed = await loadLearnerLessonViewModel(
    userId,
    lessonPlanVersionId,
  );
  if (!refreshed.learnerProgressId) {
    return;
  }
  const allDone =
    refreshed.steps.length > 0 &&
    refreshed.steps.every((s) => s.articleStatus === "completed");
  if (!allDone) {
    return;
  }
  const { error } = await supabase
    .from("learner_progress")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", refreshed.learnerProgressId);
  if (error) {
    throw new Error(error.message);
  }
}

async function assertActiveStepContext(
  userId: string,
  lessonPlanVersionId: string,
  lessonPlanItemId: string,
): Promise<{ vm: LearnerLessonViewModel; step: LessonStepState }> {
  const vm = await loadLearnerLessonViewModel(userId, lessonPlanVersionId);
  if (!vm.learnerProgressId) {
    throw new Error("Start the lesson before updating this step.");
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
  if (!step.itemProgressId) {
    throw new Error("Missing progress row for this step.");
  }
  return { vm, step };
}

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
  const { vm, step } = await assertActiveStepContext(
    userId,
    lessonPlanVersionId,
    lessonPlanItemId,
  );

  if (step.requiresQuiz) {
    throw new Error("Complete the quiz for this step to continue.");
  }

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

  await syncLearnerProgressCompletedIfAllStepsDone(
    supabase,
    userId,
    lessonPlanVersionId,
  );

  revalidatePath(`/lessons/${lessonPlanVersionId}`);
  return loadLearnerLessonViewModel(userId, lessonPlanVersionId);
}

export type QuizSessionPayload = {
  questions: QuizQuestionPublic[];
  inProgressAttemptId: string | null;
  lastSubmitted: {
    status: string;
    score: number;
    maxScore: number;
    submittedAt: string;
  } | null;
};

export async function loadQuizSessionAction(
  userId: string,
  lessonPlanVersionId: string,
  lessonPlanItemId: string,
): Promise<QuizSessionPayload> {
  const { step } = await assertActiveStepContext(
    userId,
    lessonPlanVersionId,
    lessonPlanItemId,
  );

  const questions =
    await listQuizQuestionsPublicForLessonPlanItem(lessonPlanItemId);

  const lipId = step.itemProgressId;
  if (!lipId) {
    throw new Error("Missing progress row for this step.");
  }

  const supabase = getSupabaseServerClient();

  const { data: inProg, error: e1 } = await supabase
    .from("quiz_attempt")
    .select("id")
    .eq("lesson_item_progress_id", lipId)
    .eq("status", "in_progress")
    .maybeSingle();

  if (e1) {
    throw new Error(e1.message);
  }

  const { data: lastRows, error: e2 } = await supabase
    .from("quiz_attempt")
    .select("status, score, max_score, submitted_at")
    .eq("lesson_item_progress_id", lipId)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(1);

  if (e2) {
    throw new Error(e2.message);
  }

  const last = lastRows?.[0];

  return {
    questions,
    inProgressAttemptId: inProg?.id ?? null,
    lastSubmitted: last
      ? {
          status: String(last.status),
          score: Number(last.score),
          maxScore: Number(last.max_score),
          submittedAt: String(last.submitted_at),
        }
      : null,
  };
}

export async function startQuizAttemptAction(
  userId: string,
  lessonPlanVersionId: string,
  lessonPlanItemId: string,
): Promise<{ attemptId: string }> {
  const { step } = await assertActiveStepContext(
    userId,
    lessonPlanVersionId,
    lessonPlanItemId,
  );

  if (!step.requiresQuiz) {
    throw new Error("This step does not use a quiz.");
  }

  if (step.articleStatus === "completed") {
    throw new Error("This step is already completed.");
  }

  const lipId = step.itemProgressId;
  if (!lipId) {
    throw new Error("Missing progress row for this step.");
  }

  const supabase = getSupabaseServerClient();

  const { data: existing, error: e1 } = await supabase
    .from("quiz_attempt")
    .select("id")
    .eq("lesson_item_progress_id", lipId)
    .eq("status", "in_progress")
    .maybeSingle();

  if (e1) {
    throw new Error(e1.message);
  }

  if (existing?.id) {
    return { attemptId: existing.id };
  }

  const { data: inserted, error: ins } = await supabase
    .from("quiz_attempt")
    .insert({
      lesson_item_progress_id: lipId,
      status: "in_progress",
      score: 0,
      max_score: 0,
      answers: {},
    })
    .select("id")
    .single();

  if (ins) {
    throw new Error(ins.message);
  }

  revalidatePath(`/lessons/${lessonPlanVersionId}`);
  return { attemptId: inserted.id };
}

export async function submitQuizAttemptAction(
  userId: string,
  lessonPlanVersionId: string,
  lessonPlanItemId: string,
  attemptId: string,
  answers: Record<string, string>,
): Promise<LearnerLessonViewModel> {
  const { step } = await assertActiveStepContext(
    userId,
    lessonPlanVersionId,
    lessonPlanItemId,
  );

  if (!step.requiresQuiz) {
    throw new Error("This step does not use a quiz.");
  }

  if (step.articleStatus === "completed") {
    throw new Error("This step is already completed.");
  }

  const lipId = step.itemProgressId;
  if (!lipId) {
    throw new Error("Missing progress row for this step.");
  }

  const supabase = getSupabaseServerClient();

  const { data: attempt, error: attErr } = await supabase
    .from("quiz_attempt")
    .select("id, lesson_item_progress_id, status")
    .eq("id", attemptId)
    .maybeSingle();

  if (attErr) {
    throw new Error(attErr.message);
  }

  if (
    !attempt ||
    attempt.lesson_item_progress_id !== lipId ||
    attempt.status !== "in_progress"
  ) {
    throw new Error("Invalid or expired quiz attempt. Start the quiz again.");
  }

  const scoreRows = await loadQuizQuestionsForScoring(lessonPlanItemId);
  if (scoreRows.length === 0) {
    throw new Error("No quiz questions configured for this step.");
  }

  let score = 0;
  let maxScore = 0;
  for (const q of scoreRows) {
    maxScore += q.maxPoints;
    const sel = answers[q.id];
    if (sel === q.correctChoiceId) {
      score += q.maxPoints;
    }
  }

  const ratio = maxScore > 0 ? score / maxScore : 0;
  const passed = ratio >= QUIZ_PASS_RATIO;
  const status = passed ? "passed" : "failed";

  const { error: upAtt } = await supabase
    .from("quiz_attempt")
    .update({
      score,
      max_score: maxScore,
      status,
      submitted_at: new Date().toISOString(),
      answers,
    })
    .eq("id", attemptId);

  if (upAtt) {
    throw new Error(upAtt.message);
  }

  if (!passed) {
    revalidatePath(`/lessons/${lessonPlanVersionId}`);
    return loadLearnerLessonViewModel(userId, lessonPlanVersionId);
  }

  const { data: itemMeta, error: itemErr } = await supabase
    .from("lesson_plan_item")
    .select("effective_content_version_id")
    .eq("id", lessonPlanItemId)
    .maybeSingle();

  if (itemErr) {
    throw new Error(itemErr.message);
  }
  if (!itemMeta) {
    throw new Error("Missing lesson item.");
  }

  const { error: lipUp } = await supabase
    .from("lesson_item_progress")
    .update({
      article_status: "completed",
      completed_at: new Date().toISOString(),
      completed_content_version_id: itemMeta.effective_content_version_id,
    })
    .eq("id", lipId);

  if (lipUp) {
    throw new Error(lipUp.message);
  }

  await syncLearnerProgressCompletedIfAllStepsDone(
    supabase,
    userId,
    lessonPlanVersionId,
  );

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
