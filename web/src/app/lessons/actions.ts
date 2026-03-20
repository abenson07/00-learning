"use server";

import { revalidatePath } from "next/cache";

import { getAuthUser } from "@/lib/auth/server";
import {
  buildArticleReadBundleForLessonStep,
  getLessonPlanSteps,
  listQuizQuestionsPublicForLessonPlanItem,
  loadLearnerLessonViewModel,
  loadQuizQuestionsForScoring,
  type ArticleReadBundleForLesson,
  type LearnerLessonViewModel,
  type LessonStepState,
  type QuizQuestionPublic,
} from "@/lib/lesson-data";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { createSupabaseUserServerClient } from "@/lib/supabase/server-user";

const QUIZ_PASS_RATIO = 0.7;

function parseContentItemCurrentVersionEmbed(raw: unknown): string | null {
  const embed = Array.isArray(raw) ? raw[0] : raw;
  if (
    embed &&
    typeof embed === "object" &&
    typeof (embed as { current_version_id?: string }).current_version_id ===
      "string"
  ) {
    return (embed as { current_version_id: string }).current_version_id;
  }
  return null;
}

async function syncLearnerProgressCompletedIfAllStepsDone(
  lessonPlanVersionId: string,
): Promise<void> {
  const refreshed = await loadLearnerLessonViewModel(lessonPlanVersionId);
  if (!refreshed.learnerProgressId) {
    return;
  }
  const allDone =
    refreshed.steps.length > 0 &&
    refreshed.steps.every((s) => s.articleStatus === "completed");
  if (!allDone) {
    return;
  }
  const supabase = await createSupabaseUserServerClient();
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
  lessonPlanVersionId: string,
  lessonPlanItemId: string,
): Promise<{ vm: LearnerLessonViewModel; step: LessonStepState }> {
  const vm = await loadLearnerLessonViewModel(lessonPlanVersionId);
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
  lessonPlanVersionId: string,
): Promise<LearnerLessonViewModel> {
  return loadLearnerLessonViewModel(lessonPlanVersionId);
}

export async function ensureLearnerProgressAction(
  lessonPlanVersionId: string,
): Promise<LearnerLessonViewModel> {
  const auth = await getAuthUser();
  if (!auth) {
    return loadLearnerLessonViewModel(lessonPlanVersionId);
  }
  const { userId } = auth;
  const supabase = await createSupabaseUserServerClient();

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
    return loadLearnerLessonViewModel(lessonPlanVersionId);
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
  return loadLearnerLessonViewModel(lessonPlanVersionId);
}

export async function markArticleCompletedAction(
  lessonPlanVersionId: string,
  lessonPlanItemId: string,
): Promise<LearnerLessonViewModel> {
  const supabase = await createSupabaseUserServerClient();
  const { vm, step } = await assertActiveStepContext(
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
    .select(
      "id, lesson_plan_version_id, effective_content_version_id, content_item ( current_version_id )",
    )
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

  const currentVid = parseContentItemCurrentVersionEmbed(itemMeta.content_item);
  const completedVersionId =
    currentVid ?? itemMeta.effective_content_version_id;

  const { error: updErr } = await supabase
    .from("lesson_item_progress")
    .update({
      article_status: "completed",
      completed_at: new Date().toISOString(),
      completed_content_version_id: completedVersionId,
    })
    .eq("learner_progress_id", vm.learnerProgressId)
    .eq("lesson_plan_item_id", lessonPlanItemId);

  if (updErr) {
    throw new Error(updErr.message);
  }

  await syncLearnerProgressCompletedIfAllStepsDone(lessonPlanVersionId);

  revalidatePath(`/lessons/${lessonPlanVersionId}`);
  return loadLearnerLessonViewModel(lessonPlanVersionId);
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
  lessonPlanVersionId: string,
  lessonPlanItemId: string,
): Promise<QuizSessionPayload> {
  const { step } = await assertActiveStepContext(
    lessonPlanVersionId,
    lessonPlanItemId,
  );

  const questions =
    await listQuizQuestionsPublicForLessonPlanItem(lessonPlanItemId);

  const lipId = step.itemProgressId;
  if (!lipId) {
    throw new Error("Missing progress row for this step.");
  }

  const supabase = await createSupabaseUserServerClient();

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
  lessonPlanVersionId: string,
  lessonPlanItemId: string,
): Promise<{ attemptId: string }> {
  const { step } = await assertActiveStepContext(
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

  const supabase = await createSupabaseUserServerClient();

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
  lessonPlanVersionId: string,
  lessonPlanItemId: string,
  attemptId: string,
  answers: Record<string, string>,
): Promise<LearnerLessonViewModel> {
  const { step } = await assertActiveStepContext(
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

  const supabase = await createSupabaseUserServerClient();

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
    return loadLearnerLessonViewModel(lessonPlanVersionId);
  }

  const { data: itemMeta, error: itemErr } = await supabase
    .from("lesson_plan_item")
    .select(
      "effective_content_version_id, content_item ( current_version_id )",
    )
    .eq("id", lessonPlanItemId)
    .maybeSingle();

  if (itemErr) {
    throw new Error(itemErr.message);
  }
  if (!itemMeta) {
    throw new Error("Missing lesson item.");
  }

  const currentVid = parseContentItemCurrentVersionEmbed(itemMeta.content_item);
  const completedVersionId =
    currentVid ?? itemMeta.effective_content_version_id;

  const { error: lipUp } = await supabase
    .from("lesson_item_progress")
    .update({
      article_status: "completed",
      completed_at: new Date().toISOString(),
      completed_content_version_id: completedVersionId,
    })
    .eq("id", lipId);

  if (lipUp) {
    throw new Error(lipUp.message);
  }

  await syncLearnerProgressCompletedIfAllStepsDone(lessonPlanVersionId);

  revalidatePath(`/lessons/${lessonPlanVersionId}`);
  return loadLearnerLessonViewModel(lessonPlanVersionId);
}

export type ArticleReadBundle = ArticleReadBundleForLesson;

export async function getArticleReadBundleForLessonStepAction(input: {
  contentItemId: string;
  articleStatus: string;
  completedContentVersionId: string | null;
  effectiveContentVersionId: string;
  contentItemCurrentVersionId: string | null;
}): Promise<ArticleReadBundleForLesson | null> {
  return buildArticleReadBundleForLessonStep(input);
}

/** @deprecated Prefer getArticleReadBundleForLessonStepAction (learn-006 versioning). */
export async function getArticleReadBundleAction(
  contentItemId: string,
  effectiveVersionId: string,
): Promise<ArticleReadBundleForLesson | null> {
  return buildArticleReadBundleForLessonStep({
    contentItemId,
    articleStatus: "pending",
    completedContentVersionId: null,
    effectiveContentVersionId: effectiveVersionId,
    contentItemCurrentVersionId: null,
  });
}

export async function regenerateLessonPlanWithLatestAction(
  lessonPlanVersionId: string,
): Promise<{ newLessonPlanVersionId: string }> {
  const admin = getSupabaseServiceRoleClient();

  const vm = await loadLearnerLessonViewModel(lessonPlanVersionId);
  if (!vm.learnerProgressId) {
    throw new Error("Start the lesson before regenerating.");
  }
  if (!vm.canRegenerateLessonPlan) {
    throw new Error(
      "No completed step has a newer content version to fold into the plan.",
    );
  }

  const { data: lpv, error: lpvErr } = await admin
    .from("lesson_plan_version")
    .select("id, lesson_plan_id, version_number")
    .eq("id", lessonPlanVersionId)
    .maybeSingle();

  if (lpvErr) {
    throw new Error(lpvErr.message);
  }
  if (!lpv) {
    throw new Error("Lesson plan version not found.");
  }

  const { data: oldItems, error: itemsErr } = await admin
    .from("lesson_plan_item")
    .select(
      `
      id,
      sequence,
      content_item_id,
      effective_content_version_id,
      requires_quiz,
      content_item ( current_version_id )
    `,
    )
    .eq("lesson_plan_version_id", lessonPlanVersionId)
    .order("sequence", { ascending: true });

  if (itemsErr) {
    throw new Error(itemsErr.message);
  }
  const items = oldItems ?? [];
  if (items.length === 0) {
    throw new Error("This lesson version has no items.");
  }

  const newEffectives = items.map((row) => {
    const cur = parseContentItemCurrentVersionEmbed(
      (row as { content_item?: unknown }).content_item,
    );
    if (!cur) {
      throw new Error("Missing current_version_id for a content item.");
    }
    return cur;
  });

  const nextVersionNumber = lpv.version_number + 1;

  const { data: newLpv, error: insLpvErr } = await admin
    .from("lesson_plan_version")
    .insert({
      lesson_plan_id: lpv.lesson_plan_id,
      version_number: nextVersionNumber,
      source_timestamp: new Date().toISOString(),
      is_active: true,
    })
    .select("id")
    .single();

  if (insLpvErr) {
    throw new Error(insLpvErr.message);
  }

  const { error: deactivateErr } = await admin
    .from("lesson_plan_version")
    .update({ is_active: false })
    .eq("lesson_plan_id", lpv.lesson_plan_id)
    .neq("id", newLpv.id);

  if (deactivateErr) {
    throw new Error(deactivateErr.message);
  }

  type OldItemRow = {
    id: string;
    sequence: number;
    content_item_id: string;
    effective_content_version_id: string;
    requires_quiz: boolean;
  };

  const typedOld = items as OldItemRow[];

  const insertPayload = typedOld.map((row, i) => ({
    lesson_plan_version_id: newLpv.id,
    sequence: row.sequence,
    content_item_id: row.content_item_id,
    effective_content_version_id: newEffectives[i]!,
    requires_quiz: row.requires_quiz,
  }));

  const { data: newItemRows, error: insItemsErr } = await admin
    .from("lesson_plan_item")
    .insert(insertPayload)
    .select("id, sequence")
    .order("sequence", { ascending: true });

  if (insItemsErr) {
    throw new Error(insItemsErr.message);
  }
  const newIds = (newItemRows ?? []).map((r) => r.id);

  if (newIds.length !== typedOld.length) {
    throw new Error("Failed to create new lesson items.");
  }

  for (let i = 0; i < typedOld.length; i++) {
    const oldId = typedOld[i]!.id;
    const newId = newIds[i]!;
    const { data: qs, error: qErr } = await admin
      .from("quiz_question")
      .select("question_index, question_text, choices, correct_choice_id, max_points")
      .eq("lesson_plan_item_id", oldId);

    if (qErr) {
      throw new Error(qErr.message);
    }
    if (qs && qs.length > 0) {
      const { error: iqErr } = await admin.from("quiz_question").insert(
        qs.map((q) => ({
          lesson_plan_item_id: newId,
          question_index: q.question_index,
          question_text: q.question_text,
          choices: q.choices,
          correct_choice_id: q.correct_choice_id,
          max_points: q.max_points,
        })),
      );
      if (iqErr) {
        throw new Error(iqErr.message);
      }
    }
  }

  const { data: lipRows, error: lipQErr } = await admin
    .from("lesson_item_progress")
    .select("id, lesson_plan_item_id")
    .eq("learner_progress_id", vm.learnerProgressId);

  if (lipQErr) {
    throw new Error(lipQErr.message);
  }

  for (const lip of lipRows ?? []) {
    const idx = typedOld.findIndex((o) => o.id === lip.lesson_plan_item_id);
    if (idx < 0) {
      throw new Error("Progress row references an unknown lesson item.");
    }
    const oldEff = typedOld[idx]!.effective_content_version_id;
    const newEff = newEffectives[idx]!;
    const newItemId = newIds[idx]!;
    const versionChanged = oldEff !== newEff;

    if (versionChanged) {
      const { error: delA } = await admin
        .from("quiz_attempt")
        .delete()
        .eq("lesson_item_progress_id", lip.id);
      if (delA) {
        throw new Error(delA.message);
      }
      const { error: upL } = await admin
        .from("lesson_item_progress")
        .update({
          lesson_plan_item_id: newItemId,
          article_status: "pending",
          completed_at: null,
          completed_content_version_id: null,
        })
        .eq("id", lip.id);
      if (upL) {
        throw new Error(upL.message);
      }
    } else {
      const { error: upL } = await admin
        .from("lesson_item_progress")
        .update({ lesson_plan_item_id: newItemId })
        .eq("id", lip.id);
      if (upL) {
        throw new Error(upL.message);
      }
    }
  }

  const { error: upProgErr } = await admin
    .from("learner_progress")
    .update({ lesson_plan_version_id: newLpv.id })
    .eq("id", vm.learnerProgressId);

  if (upProgErr) {
    throw new Error(upProgErr.message);
  }

  const refreshed = await loadLearnerLessonViewModel(newLpv.id);
  const allDone =
    refreshed.steps.length > 0 &&
    refreshed.steps.every((s) => s.articleStatus === "completed");
  const { error: stErr } = await admin
    .from("learner_progress")
    .update({
      status: allDone ? "completed" : "active",
      completed_at: allDone ? new Date().toISOString() : null,
    })
    .eq("id", vm.learnerProgressId);

  if (stErr) {
    throw new Error(stErr.message);
  }

  revalidatePath("/lessons");
  revalidatePath(`/lessons/${lessonPlanVersionId}`);
  revalidatePath(`/lessons/${newLpv.id}`);

  return { newLessonPlanVersionId: newLpv.id };
}
