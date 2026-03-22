/** Pure types + helpers for learner lesson UI (safe to import from Client Components). */

export type LessonReadingMeta = {
  lessonReadingId: string;
  readingSequence: number;
  contentItemId: string;
  contentTitle: string;
  effectiveContentVersionId: string;
  contentItemCurrentVersionId: string | null;
};

export type LessonPlanLessonMeta = {
  lessonPlanItemId: string;
  sequence: number;
  lessonTitle: string;
  lessonLearningGoal: string | null;
  lessonTools: string[];
  requiresQuiz: boolean;
  readings: LessonReadingMeta[];
};

export type LessonReadingProgressState = LessonReadingMeta & {
  readingProgressId: string | null;
  articleStatus: string;
  completedAt: string | null;
  completedContentVersionId: string | null;
};

export type LessonStepState = {
  lessonPlanItemId: string;
  sequence: number;
  lessonTitle: string;
  lessonLearningGoal: string | null;
  lessonTools: string[];
  requiresQuiz: boolean;
  itemProgressId: string | null;
  articleStatus: string;
  completedAt: string | null;
  completedContentVersionId: string | null;
  readings: LessonReadingProgressState[];
};

export type LearnerLessonViewModel = {
  planLearningGoal: string | null;
  planTools: string[];
  aggregatedTools: string[];
  learnerProgressId: string | null;
  learnerStatus: string | null;
  learnerCompletedAt: string | null;
  steps: LessonStepState[];
  activeStepIndex: number;
  activeReadingIndex: number;
  canRegenerateLessonPlan: boolean;
};

export function parseToolsJson(raw: unknown): string[] {
  if (raw == null || !Array.isArray(raw)) {
    return [];
  }
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === "string" && x.trim() !== "") {
      out.push(x);
    }
  }
  return out;
}

export function deriveLessonAggregateFromReadings(
  readings: LessonReadingProgressState[],
): Pick<
  LessonStepState,
  "articleStatus" | "completedAt" | "completedContentVersionId"
> {
  if (readings.length === 0) {
    return {
      articleStatus: "pending",
      completedAt: null,
      completedContentVersionId: null,
    };
  }
  const allDone = readings.every((r) => r.articleStatus === "completed");
  if (!allDone) {
    const anyStarted = readings.some(
      (r) => r.articleStatus === "in_progress" || r.articleStatus === "completed",
    );
    return {
      articleStatus: anyStarted ? "in_progress" : "pending",
      completedAt: null,
      completedContentVersionId: null,
    };
  }
  const last = readings[readings.length - 1]!;
  return {
    articleStatus: "completed",
    completedAt: last.completedAt,
    completedContentVersionId: last.completedContentVersionId,
  };
}

/** Plan order: lesson sequence, then reading sequence within each lesson. */
export function globalReadingEntries(steps: LessonStepState[]): {
  lessonIndex: number;
  readingIndex: number;
  lessonPlanItemId: string;
  lessonReadingId: string;
}[] {
  const out: {
    lessonIndex: number;
    readingIndex: number;
    lessonPlanItemId: string;
    lessonReadingId: string;
  }[] = [];
  for (let li = 0; li < steps.length; li++) {
    const les = steps[li]!;
    for (let ri = 0; ri < les.readings.length; ri++) {
      out.push({
        lessonIndex: li,
        readingIndex: ri,
        lessonPlanItemId: les.lessonPlanItemId,
        lessonReadingId: les.readings[ri]!.lessonReadingId,
      });
    }
  }
  return out;
}

/** Undo is only safe on the last completed reading in plan order (no later reading is complete). */
export function canRevertReadingCompletion(
  steps: LessonStepState[],
  lessonPlanItemId: string,
  lessonReadingId: string,
): boolean {
  const entries = globalReadingEntries(steps);
  const idx = entries.findIndex(
    (e) =>
      e.lessonPlanItemId === lessonPlanItemId &&
      e.lessonReadingId === lessonReadingId,
  );
  if (idx < 0) {
    return false;
  }
  const step = steps[entries[idx]!.lessonIndex]!;
  const rd = step.readings[entries[idx]!.readingIndex]!;
  if (rd.articleStatus !== "completed") {
    return false;
  }
  for (let j = idx + 1; j < entries.length; j++) {
    const s2 = steps[entries[j]!.lessonIndex]!;
    const r2 = s2.readings[entries[j]!.readingIndex]!;
    if (r2.articleStatus === "completed") {
      return false;
    }
  }
  return true;
}

export function getNextReadingDestination(
  lessonPlanVersionId: string,
  steps: LessonStepState[],
  lessonPlanItemId: string,
  lessonReadingId: string,
): { href: string; label: string } {
  const entries = globalReadingEntries(steps);
  const idx = entries.findIndex(
    (e) =>
      e.lessonPlanItemId === lessonPlanItemId &&
      e.lessonReadingId === lessonReadingId,
  );
  if (idx < 0) {
    return { href: `/lessons/${lessonPlanVersionId}`, label: "Back to plan" };
  }
  if (idx < entries.length - 1) {
    const next = entries[idx + 1]!;
    const isNextLesson = next.lessonPlanItemId !== lessonPlanItemId;
    return {
      href: `/lessons/${lessonPlanVersionId}/items/${next.lessonPlanItemId}?reading=${next.lessonReadingId}`,
      label: isNextLesson ? "Next lesson" : "Next reading",
    };
  }
  return { href: `/lessons/${lessonPlanVersionId}`, label: "Back to plan" };
}

export function findFirstIncompleteReadingGlobal(
  steps: LessonStepState[],
): {
  lessonIndex: number;
  readingIndex: number;
  lessonPlanItemId: string;
  lessonReadingId: string;
} | null {
  for (let li = 0; li < steps.length; li++) {
    const les = steps[li]!;
    for (let ri = 0; ri < les.readings.length; ri++) {
      const rd = les.readings[ri]!;
      if (rd.articleStatus !== "completed") {
        return {
          lessonIndex: li,
          readingIndex: ri,
          lessonPlanItemId: les.lessonPlanItemId,
          lessonReadingId: rd.lessonReadingId,
        };
      }
    }
  }
  return null;
}

export function isViewingAheadOfCanonical(
  steps: LessonStepState[],
  selectedLessonIndex: number,
  selectedReadingIndex: number,
): boolean {
  const next = findFirstIncompleteReadingGlobal(steps);
  if (!next) {
    return false;
  }
  if (selectedLessonIndex < next.lessonIndex) {
    return false;
  }
  if (selectedLessonIndex > next.lessonIndex) {
    return true;
  }
  return selectedReadingIndex > next.readingIndex;
}

export function buildPrerequisiteBannerText(
  steps: LessonStepState[],
  next: NonNullable<ReturnType<typeof findFirstIncompleteReadingGlobal>>,
): string {
  const lesson = steps[next.lessonIndex];
  const reading = lesson?.readings[next.readingIndex];
  if (!lesson || !reading) {
    return "Complete earlier lessons before continuing.";
  }
  return `Finish “${reading.contentTitle}” (lesson ${lesson.sequence}: ${lesson.lessonTitle}) before marking this reading complete or skipping ahead.`;
}
