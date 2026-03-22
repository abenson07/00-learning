"use server";
/**
 * Quiz server actions (load/start/submit) remain for a future lesson-level quiz feature.
 * UI currently uses placeholders; do not wire these to article steps.
 */

import { revalidatePath } from "next/cache";

import { getAuthUser } from "@/lib/auth/server";
import { getLearnerDbContext } from "@/lib/learner-db-context";
import {
  buildArticleReadBundleForLessonStep,
  canRevertReadingCompletion,
  deriveLessonAggregateFromReadings,
  findFirstIncompleteReadingGlobal,
  getLessonPlanLessons,
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
  const ctx = await getLearnerDbContext();
  if (!ctx) {
    return;
  }
  const { error } = await ctx.client
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

async function syncLearnerProgressReopenIfIncomplete(
  lessonPlanVersionId: string,
): Promise<void> {
  const refreshed = await loadLearnerLessonViewModel(lessonPlanVersionId);
  if (!refreshed.learnerProgressId) {
    return;
  }
  const allDone =
    refreshed.steps.length > 0 &&
    refreshed.steps.every((s) => s.articleStatus === "completed");
  if (allDone) {
    return;
  }
  const ctx = await getLearnerDbContext();
  if (!ctx) {
    return;
  }
  const { error } = await ctx.client
    .from("learner_progress")
    .update({
      status: "active",
      completed_at: null,
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
  const ctx = await getLearnerDbContext();
  if (!ctx) {
    if (process.env.NODE_ENV === "development") {
      const auth = await getAuthUser();
      if (!auth && !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
        throw new Error(
          "Local lesson progress without sign-in needs SUPABASE_SERVICE_ROLE_KEY in web/.env.local (dev only).",
        );
      }
    }
    return loadLearnerLessonViewModel(lessonPlanVersionId);
  }
  const { userId, client: supabase } = ctx;

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

  const lessons = await getLessonPlanLessons(lessonPlanVersionId);
  if (lessons && lessons.length > 0) {
    const { data: insertedLips, error: lipErr } = await supabase
      .from("lesson_item_progress")
      .insert(
        lessons.map((s) => ({
          learner_progress_id: inserted.id,
          lesson_plan_item_id: s.lessonPlanItemId,
          article_status: "pending",
        })),
      )
      .select("id, lesson_plan_item_id");

    if (lipErr) {
      throw new Error(lipErr.message);
    }

    const lrpRows: {
      lesson_item_progress_id: string;
      lesson_reading_id: string;
      article_status: string;
    }[] = [];
    for (const lip of insertedLips ?? []) {
      const meta = lessons.find((l) => l.lessonPlanItemId === lip.lesson_plan_item_id);
      for (const rd of meta?.readings ?? []) {
        lrpRows.push({
          lesson_item_progress_id: lip.id,
          lesson_reading_id: rd.lessonReadingId,
          article_status: "pending",
        });
      }
    }
    if (lrpRows.length > 0) {
      const { error: lrpErr } = await supabase
        .from("lesson_reading_progress")
        .insert(lrpRows);
      if (lrpErr) {
        throw new Error(lrpErr.message);
      }
    }
  }

  revalidatePath(`/lessons/${lessonPlanVersionId}`);
  return loadLearnerLessonViewModel(lessonPlanVersionId);
}

export async function markReadingCompletedAction(
  lessonPlanVersionId: string,
  lessonPlanItemId: string,
  lessonReadingId: string,
): Promise<LearnerLessonViewModel> {
  const ctx = await getLearnerDbContext();
  if (!ctx) {
    if (process.env.NODE_ENV === "development") {
      throw new Error(
        "Local lesson progress without sign-in needs SUPABASE_SERVICE_ROLE_KEY in web/.env.local (dev only).",
      );
    }
    throw new Error("Sign in to save progress.");
  }
  const supabase = ctx.client;
  const vm = await loadLearnerLessonViewModel(lessonPlanVersionId);
  if (!vm.learnerProgressId) {
    throw new Error("Start the lesson before updating progress.");
  }

  const next = findFirstIncompleteReadingGlobal(vm.steps);
  if (
    !next ||
    next.lessonPlanItemId !== lessonPlanItemId ||
    next.lessonReadingId !== lessonReadingId
  ) {
    throw new Error(
      "Finish earlier readings in order before marking this one complete.",
    );
  }

  const step = vm.steps.find((s) => s.lessonPlanItemId === lessonPlanItemId);
  if (!step?.itemProgressId) {
    throw new Error("Missing progress row for this lesson.");
  }
  const reading = step.readings.find((r) => r.lessonReadingId === lessonReadingId);
  if (!reading?.readingProgressId) {
    throw new Error("Missing reading progress row.");
  }
  if (reading.articleStatus === "completed") {
    throw new Error("This reading is already marked complete.");
  }

  const { data: lrMeta, error: lrErr } = await supabase
    .from("lesson_reading")
    .select(
      `
      id,
      effective_content_version_id,
      content_item ( current_version_id ),
      lesson_plan_item ( lesson_plan_version_id )
    `,
    )
    .eq("id", lessonReadingId)
    .maybeSingle();

  if (lrErr) {
    throw new Error(lrErr.message);
  }
  const lpItem = lrMeta
    ? (Array.isArray((lrMeta as { lesson_plan_item?: unknown }).lesson_plan_item)
        ? (lrMeta as { lesson_plan_item: unknown[] }).lesson_plan_item[0]
        : (lrMeta as { lesson_plan_item?: unknown }).lesson_plan_item)
    : null;
  const lpvId =
    lpItem &&
    typeof lpItem === "object" &&
    typeof (lpItem as { lesson_plan_version_id?: string }).lesson_plan_version_id ===
      "string"
      ? (lpItem as { lesson_plan_version_id: string }).lesson_plan_version_id
      : null;

  if (!lrMeta || lpvId !== lessonPlanVersionId) {
    throw new Error("This reading does not belong to the current lesson version.");
  }

  const currentVid = parseContentItemCurrentVersionEmbed(
    (lrMeta as { content_item?: unknown }).content_item,
  );
  const completedVersionId =
    currentVid ??
    (lrMeta as { effective_content_version_id: string })
      .effective_content_version_id;

  const { error: urpErr } = await supabase
    .from("lesson_reading_progress")
    .update({
      article_status: "completed",
      completed_at: new Date().toISOString(),
      completed_content_version_id: completedVersionId,
    })
    .eq("id", reading.readingProgressId);

  if (urpErr) {
    throw new Error(urpErr.message);
  }

  const allReadingsDone = step.readings.every((r) =>
    r.lessonReadingId === lessonReadingId ? true : r.articleStatus === "completed",
  );

  if (allReadingsDone) {
    const { error: lipErr } = await supabase
      .from("lesson_item_progress")
      .update({
        article_status: "completed",
        completed_at: new Date().toISOString(),
        completed_content_version_id: completedVersionId,
      })
      .eq("id", step.itemProgressId);
    if (lipErr) {
      throw new Error(lipErr.message);
    }
  } else {
    const { error: lipErr } = await supabase
      .from("lesson_item_progress")
      .update({ article_status: "in_progress" })
      .eq("id", step.itemProgressId);
    if (lipErr) {
      throw new Error(lipErr.message);
    }
  }

  await syncLearnerProgressCompletedIfAllStepsDone(lessonPlanVersionId);

  revalidatePath(`/lessons/${lessonPlanVersionId}`);
  revalidatePath(
    `/lessons/${lessonPlanVersionId}/items/${lessonPlanItemId}`,
  );
  return loadLearnerLessonViewModel(lessonPlanVersionId);
}

export async function revertReadingCompletedAction(
  lessonPlanVersionId: string,
  lessonPlanItemId: string,
  lessonReadingId: string,
): Promise<LearnerLessonViewModel> {
  const ctx = await getLearnerDbContext();
  if (!ctx) {
    if (process.env.NODE_ENV === "development") {
      throw new Error(
        "Local lesson progress without sign-in needs SUPABASE_SERVICE_ROLE_KEY in web/.env.local (dev only).",
      );
    }
    throw new Error("Sign in to save progress.");
  }
  const supabase = ctx.client;
  const vm = await loadLearnerLessonViewModel(lessonPlanVersionId);
  if (!vm.learnerProgressId) {
    throw new Error("Start the lesson before updating progress.");
  }

  if (
    !canRevertReadingCompletion(vm.steps, lessonPlanItemId, lessonReadingId)
  ) {
    throw new Error(
      "You can only redo the most recently completed reading (nothing later may be complete).",
    );
  }

  const step = vm.steps.find((s) => s.lessonPlanItemId === lessonPlanItemId);
  if (!step?.itemProgressId) {
    throw new Error("Missing progress row for this lesson.");
  }
  const reading = step.readings.find((r) => r.lessonReadingId === lessonReadingId);
  if (!reading?.readingProgressId) {
    throw new Error("Missing reading progress row.");
  }
  if (reading.articleStatus !== "completed") {
    throw new Error("This reading is not marked complete.");
  }

  const { data: lrMeta, error: lrErr } = await supabase
    .from("lesson_reading")
    .select(
      `
      id,
      lesson_plan_item ( lesson_plan_version_id )
    `,
    )
    .eq("id", lessonReadingId)
    .maybeSingle();

  if (lrErr) {
    throw new Error(lrErr.message);
  }
  const lpItem = lrMeta
    ? (Array.isArray((lrMeta as { lesson_plan_item?: unknown }).lesson_plan_item)
        ? (lrMeta as { lesson_plan_item: unknown[] }).lesson_plan_item[0]
        : (lrMeta as { lesson_plan_item?: unknown }).lesson_plan_item)
    : null;
  const lpvId =
    lpItem &&
    typeof lpItem === "object" &&
    typeof (lpItem as { lesson_plan_version_id?: string }).lesson_plan_version_id ===
      "string"
      ? (lpItem as { lesson_plan_version_id: string }).lesson_plan_version_id
      : null;

  if (!lrMeta || lpvId !== lessonPlanVersionId) {
    throw new Error("This reading does not belong to the current lesson version.");
  }

  const { error: urpErr } = await supabase
    .from("lesson_reading_progress")
    .update({
      article_status: "pending",
      completed_at: null,
      completed_content_version_id: null,
    })
    .eq("id", reading.readingProgressId);

  if (urpErr) {
    throw new Error(urpErr.message);
  }

  const updatedReadings = step.readings.map((r) =>
    r.lessonReadingId === lessonReadingId
      ? {
          ...r,
          articleStatus: "pending",
          completedAt: null,
          completedContentVersionId: null,
        }
      : r,
  );
  const agg = deriveLessonAggregateFromReadings(updatedReadings);

  const { error: lipErr } = await supabase
    .from("lesson_item_progress")
    .update({
      article_status: agg.articleStatus,
      completed_at: agg.completedAt,
      completed_content_version_id: agg.completedContentVersionId,
    })
    .eq("id", step.itemProgressId);

  if (lipErr) {
    throw new Error(lipErr.message);
  }

  await syncLearnerProgressReopenIfIncomplete(lessonPlanVersionId);

  revalidatePath(`/lessons/${lessonPlanVersionId}`);
  revalidatePath(
    `/lessons/${lessonPlanVersionId}/items/${lessonPlanItemId}`,
  );
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

  const { data: readingRows, error: readErr } = await supabase
    .from("lesson_reading")
    .select(
      `
      id,
      effective_content_version_id,
      content_item ( current_version_id )
    `,
    )
    .eq("lesson_plan_item_id", lessonPlanItemId)
    .order("reading_sequence", { ascending: true });

  if (readErr) {
    throw new Error(readErr.message);
  }
  const reads = readingRows ?? [];
  if (reads.length === 0) {
    throw new Error("Missing lesson readings.");
  }

  const nowIso = new Date().toISOString();
  let lastCompletedVersionId = "";
  for (const row of reads) {
    const currentVid = parseContentItemCurrentVersionEmbed(
      (row as { content_item?: unknown }).content_item,
    );
    const vid =
      currentVid ??
      (row as { effective_content_version_id: string })
        .effective_content_version_id;
    lastCompletedVersionId = vid;
    const { error: lrpUp } = await supabase
      .from("lesson_reading_progress")
      .update({
        article_status: "completed",
        completed_at: nowIso,
        completed_content_version_id: vid,
      })
      .eq("lesson_item_progress_id", lipId)
      .eq("lesson_reading_id", (row as { id: string }).id);
    if (lrpUp) {
      throw new Error(lrpUp.message);
    }
  }

  const { error: lipUp } = await supabase
    .from("lesson_item_progress")
    .update({
      article_status: "completed",
      completed_at: nowIso,
      completed_content_version_id: lastCompletedVersionId,
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
      title,
      learning_goal,
      tools,
      requires_quiz,
      lesson_reading (
        id,
        reading_sequence,
        content_item_id,
        effective_content_version_id,
        content_item ( current_version_id )
      )
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

  type OldReadingRow = {
    id: string;
    reading_sequence: number;
    content_item_id: string;
    effective_content_version_id: string;
    content_item: unknown;
  };

  type OldItemRow = {
    id: string;
    sequence: number;
    title: string | null;
    learning_goal: string | null;
    tools: unknown;
    requires_quiz: boolean;
    lesson_reading: OldReadingRow[] | OldReadingRow | null;
  };

  function normalizeReadings(raw: OldItemRow["lesson_reading"]): OldReadingRow[] {
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return [...list].sort((a, b) => a.reading_sequence - b.reading_sequence);
  }

  function newEffectiveForReading(r: OldReadingRow): string {
    const cur = parseContentItemCurrentVersionEmbed(r.content_item);
    if (!cur) {
      throw new Error("Missing current_version_id for a content item.");
    }
    return cur;
  }

  const typedOld = items as OldItemRow[];

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

  const insertPayload = typedOld.map((row) => ({
    lesson_plan_version_id: newLpv.id,
    sequence: row.sequence,
    title: row.title,
    learning_goal: row.learning_goal,
    tools: row.tools,
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
    const oldReads = normalizeReadings(typedOld[i]!.lesson_reading);
    const newItemId = newIds[i]!;
    const readingInserts = oldReads.map((r) => ({
      lesson_plan_item_id: newItemId,
      reading_sequence: r.reading_sequence,
      content_item_id: r.content_item_id,
      effective_content_version_id: newEffectiveForReading(r),
    }));
    if (readingInserts.length > 0) {
      const { error: insR } = await admin.from("lesson_reading").insert(readingInserts);
      if (insR) {
        throw new Error(insR.message);
      }
    }
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
    const oldReads = normalizeReadings(typedOld[idx]!.lesson_reading);
    const newItemId = newIds[idx]!;
    const versionChanged = oldReads.some(
      (r) => r.effective_content_version_id !== newEffectiveForReading(r),
    );

    const { data: oldReadingRows, error: oldRErr } = await admin
      .from("lesson_reading")
      .select("id, reading_sequence")
      .eq("lesson_plan_item_id", typedOld[idx]!.id)
      .order("reading_sequence", { ascending: true });

    if (oldRErr) {
      throw new Error(oldRErr.message);
    }

    const { data: newReadingRows, error: newRErr } = await admin
      .from("lesson_reading")
      .select("id, reading_sequence")
      .eq("lesson_plan_item_id", newItemId)
      .order("reading_sequence", { ascending: true });

    if (newRErr) {
      throw new Error(newRErr.message);
    }

    const oldRList = oldReadingRows ?? [];
    const newRList = newReadingRows ?? [];
    if (oldRList.length !== newRList.length) {
      throw new Error("Reading row count mismatch after regenerate.");
    }

    if (versionChanged) {
      const { error: delA } = await admin
        .from("quiz_attempt")
        .delete()
        .eq("lesson_item_progress_id", lip.id);
      if (delA) {
        throw new Error(delA.message);
      }
      const { error: delLrp } = await admin
        .from("lesson_reading_progress")
        .delete()
        .eq("lesson_item_progress_id", lip.id);
      if (delLrp) {
        throw new Error(delLrp.message);
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
      const { error: insLrp } = await admin.from("lesson_reading_progress").insert(
        newRList.map((nr) => ({
          lesson_item_progress_id: lip.id,
          lesson_reading_id: nr.id,
          article_status: "pending",
        })),
      );
      if (insLrp) {
        throw new Error(insLrp.message);
      }
    } else {
      const { error: upL } = await admin
        .from("lesson_item_progress")
        .update({ lesson_plan_item_id: newItemId })
        .eq("id", lip.id);
      if (upL) {
        throw new Error(upL.message);
      }
      for (let j = 0; j < oldRList.length; j++) {
        const oldRid = oldRList[j]!.id;
        const newRid = newRList[j]!.id;
        if (oldRid === newRid) {
          continue;
        }
        const { error: upLrp } = await admin
          .from("lesson_reading_progress")
          .update({ lesson_reading_id: newRid })
          .eq("lesson_item_progress_id", lip.id)
          .eq("lesson_reading_id", oldRid);
        if (upLrp) {
          throw new Error(upLrp.message);
        }
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
