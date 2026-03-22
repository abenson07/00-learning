import { getLearnerDbContext } from "@/lib/learner-db-context";
import {
  listRelatedContentItems,
  type ContentItemListRow,
} from "@/lib/library-data";
import {
  deriveLessonAggregateFromReadings,
  parseToolsJson,
  type LearnerLessonViewModel,
  type LessonPlanLessonMeta,
  type LessonReadingMeta,
  type LessonReadingProgressState,
  type LessonStepState,
} from "@/lib/lesson-learner-model";
import { createSupabaseAnonServerClient } from "@/lib/supabase/server";
import { createSupabaseUserServerClient } from "@/lib/supabase/server-user";

export type {
  LearnerLessonViewModel,
  LessonPlanLessonMeta,
  LessonReadingMeta,
  LessonReadingProgressState,
  LessonStepState,
} from "@/lib/lesson-learner-model";
export {
  buildPrerequisiteBannerText,
  canRevertReadingCompletion,
  deriveLessonAggregateFromReadings,
  findFirstIncompleteReadingGlobal,
  getNextReadingDestination,
  globalReadingEntries,
  isViewingAheadOfCanonical,
  parseToolsJson,
} from "@/lib/lesson-learner-model";

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export type LessonPlanSummary = {
  lessonPlanId: string;
  title: string;
  description: string | null;
  domainName: string;
  versionId: string;
};

export type LessonPlanVersionMeta = {
  lessonPlanId: string;
  title: string;
  description: string | null;
  domainName: string;
  learningGoal: string | null;
  planTools: string[];
};

export type ArticleSnapshotRead = {
  contentItemId: string;
  title: string;
  slug: string;
  topicId: string;
  topicName: string;
  plainText: string;
  contentRichJson: unknown;
  version: {
    id: string;
    versionNumber: number;
    isLatest: boolean;
  };
};

export type QuizChoice = { id: string; label: string };

/** Questions shown in the browser (no correct answer). */
export type QuizQuestionPublic = {
  id: string;
  questionIndex: number;
  questionText: string;
  choices: QuizChoice[];
  maxPoints: number;
};

function parseQuizChoices(raw: unknown): QuizChoice[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: QuizChoice[] = [];
  for (const c of raw) {
    if (!c || typeof c !== "object") {
      continue;
    }
    const o = c as Record<string, unknown>;
    if (typeof o.id === "string" && typeof o.label === "string") {
      out.push({ id: o.id, label: o.label });
    }
  }
  return out;
}

export async function listLessonPlansForLessonsPage(): Promise<LessonPlanSummary[]> {
  const supabase = createSupabaseAnonServerClient();

  const { data, error } = await supabase
    .from("lesson_plan_version")
    .select(
      `
      id,
      lesson_plan:lesson_plan_id (
        id,
        title,
        description,
        sort_order,
        domain:domain_id ( name )
      )
    `,
    )
    .eq("is_active", true);

  if (error) {
    throw new Error(error.message);
  }

  type EmbeddedPlan = {
    id: string;
    title: string;
    description: string | null;
    sort_order: number;
    domain: { name: string } | { name: string }[] | null;
  };

  function parseEmbeddedLessonPlan(raw: unknown): EmbeddedPlan | null {
    const obj = unwrapOne(raw);
    if (!obj || typeof obj !== "object") {
      return null;
    }
    const o = obj as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.title !== "string") {
      return null;
    }
    return {
      id: o.id,
      title: o.title,
      description: typeof o.description === "string" ? o.description : null,
      sort_order: typeof o.sort_order === "number" ? o.sort_order : 0,
      domain: (o.domain ?? null) as EmbeddedPlan["domain"],
    };
  }

  type RawVersionRow = { id: string; lesson_plan: unknown };
  const rows = (data as RawVersionRow[] | null) ?? [];

  return rows
    .map((r) => {
      const lp = parseEmbeddedLessonPlan(r.lesson_plan);
      if (!lp) {
        return null;
      }
      const domain = unwrapOne(lp.domain);
      return {
        lessonPlanId: lp.id,
        title: lp.title,
        description: lp.description,
        domainName: domain?.name ?? "—",
        versionId: r.id,
        sort_order: lp.sort_order,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r != null)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(
      (r): LessonPlanSummary => ({
        lessonPlanId: r.lessonPlanId,
        title: r.title,
        description: r.description,
        domainName: r.domainName,
        versionId: r.versionId,
      }),
    );
}

export async function getLessonPlanVersionMeta(
  lessonPlanVersionId: string,
): Promise<LessonPlanVersionMeta | null> {
  const supabase = createSupabaseAnonServerClient();

  const { data: lpv, error: lpvError } = await supabase
    .from("lesson_plan_version")
    .select("id, lesson_plan_id")
    .eq("id", lessonPlanVersionId)
    .maybeSingle();

  if (lpvError) {
    throw new Error(lpvError.message);
  }
  if (!lpv) {
    return null;
  }

  const { data: lp, error: lpError } = await supabase
    .from("lesson_plan")
    .select("id, title, description, domain_id, learning_goal, tools")
    .eq("id", lpv.lesson_plan_id)
    .maybeSingle();

  if (lpError) {
    throw new Error(lpError.message);
  }
  if (!lp) {
    return null;
  }

  const { data: domain, error: domainError } = await supabase
    .from("domain")
    .select("name")
    .eq("id", lp.domain_id)
    .maybeSingle();

  if (domainError) {
    throw new Error(domainError.message);
  }

  return {
    lessonPlanId: lp.id,
    title: lp.title,
    description: lp.description,
    domainName: domain?.name ?? "—",
    learningGoal:
      typeof (lp as { learning_goal?: string }).learning_goal === "string"
        ? (lp as { learning_goal: string }).learning_goal
        : null,
    planTools: parseToolsJson((lp as { tools?: unknown }).tools),
  };
}

export async function getLessonPlanLessons(
  lessonPlanVersionId: string,
): Promise<LessonPlanLessonMeta[] | null> {
  const supabase = createSupabaseAnonServerClient();

  const { data: lpv, error: lpvError } = await supabase
    .from("lesson_plan_version")
    .select("id")
    .eq("id", lessonPlanVersionId)
    .maybeSingle();

  if (lpvError) {
    throw new Error(lpvError.message);
  }
  if (!lpv) {
    return null;
  }

  const { data: rows, error } = await supabase
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
        content_item ( title, current_version_id )
      )
    `,
    )
    .eq("lesson_plan_version_id", lessonPlanVersionId)
    .order("sequence", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  type RawReading = {
    id: string;
    reading_sequence: number;
    content_item_id: string;
    effective_content_version_id: string;
    content_item: unknown;
  };

  type RawItem = {
    id: string;
    sequence: number;
    title: string | null;
    learning_goal: string | null;
    tools: unknown;
    requires_quiz: boolean;
    lesson_reading: RawReading[] | RawReading | null;
  };

  function contentTitleFromEmbed(raw: unknown): string {
    const row = unwrapOne(raw) as { title?: string } | null;
    return typeof row?.title === "string" ? row.title : "Article";
  }

  function contentCurrentVersionFromEmbed(raw: unknown): string | null {
    const row = unwrapOne(raw) as { current_version_id?: string | null } | null;
    return typeof row?.current_version_id === "string"
      ? row.current_version_id
      : null;
  }

  return ((rows as RawItem[] | null) ?? []).map((row) => {
    const rawReadings = row.lesson_reading;
    const readingList = Array.isArray(rawReadings)
      ? rawReadings
      : rawReadings
        ? [rawReadings]
        : [];
    readingList.sort((a, b) => a.reading_sequence - b.reading_sequence);
    const readings: LessonReadingMeta[] = readingList.map((lr) => ({
      lessonReadingId: lr.id,
      readingSequence: lr.reading_sequence,
      contentItemId: lr.content_item_id,
      contentTitle: contentTitleFromEmbed(lr.content_item),
      effectiveContentVersionId: lr.effective_content_version_id,
      contentItemCurrentVersionId: contentCurrentVersionFromEmbed(lr.content_item),
    }));
    const lessonTitle =
      typeof row.title === "string" && row.title.trim() !== ""
        ? row.title
        : readings[0]?.contentTitle ?? "Lesson";
    return {
      lessonPlanItemId: row.id,
      sequence: row.sequence,
      lessonTitle,
      lessonLearningGoal:
        typeof row.learning_goal === "string" ? row.learning_goal : null,
      lessonTools: parseToolsJson(row.tools),
      requiresQuiz: row.requires_quiz,
      readings,
    };
  });
}

export async function getLessonPlanLessonByItemId(
  lessonPlanVersionId: string,
  lessonPlanItemId: string,
): Promise<LessonPlanLessonMeta | null> {
  const lessons = await getLessonPlanLessons(lessonPlanVersionId);
  if (!lessons) {
    return null;
  }
  return (
    lessons.find((l) => l.lessonPlanItemId === lessonPlanItemId) ?? null
  );
}

/** @deprecated Use getLessonPlanLessons */
export async function getLessonPlanSteps(
  lessonPlanVersionId: string,
): Promise<LessonPlanLessonMeta[] | null> {
  return getLessonPlanLessons(lessonPlanVersionId);
}

/** Full quiz row for server-side scoring (includes correct answer). */
export type QuizQuestionScoreRow = {
  id: string;
  correctChoiceId: string;
  maxPoints: number;
};

export async function listQuizQuestionsPublicForLessonPlanItem(
  lessonPlanItemId: string,
): Promise<QuizQuestionPublic[]> {
  const supabase = await createSupabaseUserServerClient();

  const { data: rows, error } = await supabase
    .from("quiz_question")
    .select("id, question_index, question_text, choices, max_points")
    .eq("lesson_plan_item_id", lessonPlanItemId)
    .order("question_index", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  type RawQ = {
    id: string;
    question_index: number;
    question_text: string;
    choices: unknown;
    max_points: number;
  };

  return ((rows as RawQ[] | null) ?? []).map((row) => ({
    id: row.id,
    questionIndex: row.question_index,
    questionText: row.question_text,
    choices: parseQuizChoices(row.choices),
    maxPoints: row.max_points,
  }));
}

export async function loadQuizQuestionsForScoring(
  lessonPlanItemId: string,
): Promise<QuizQuestionScoreRow[]> {
  const supabase = await createSupabaseUserServerClient();

  const { data: rows, error } = await supabase
    .from("quiz_question")
    .select("id, correct_choice_id, max_points")
    .eq("lesson_plan_item_id", lessonPlanItemId)
    .order("question_index", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  type RawS = {
    id: string;
    correct_choice_id: string;
    max_points: number;
  };

  return ((rows as RawS[] | null) ?? []).map((row) => ({
    id: row.id,
    correctChoiceId: row.correct_choice_id,
    maxPoints: row.max_points,
  }));
}

export async function getArticleSnapshotByVersionId(
  contentItemId: string,
  effectiveVersionId: string,
): Promise<ArticleSnapshotRead | null> {
  const supabase = createSupabaseAnonServerClient();

  const [{ data: item, error: itemError }, { data: version, error: versionError }] =
    await Promise.all([
      supabase
        .from("content_item")
        .select("id, title, slug, topic_id")
        .eq("id", contentItemId)
        .maybeSingle(),
      supabase
        .from("content_version")
        .select(
          "id, content_item_id, version_number, is_latest, content_rich_json, plain_text",
        )
        .eq("id", effectiveVersionId)
        .maybeSingle(),
    ]);

  if (itemError) {
    throw new Error(itemError.message);
  }
  if (versionError) {
    throw new Error(versionError.message);
  }
  if (!item || !version) {
    return null;
  }
  if (version.content_item_id !== contentItemId) {
    return null;
  }

  const { data: topic, error: topicError } = await supabase
    .from("topic")
    .select("name")
    .eq("id", item.topic_id)
    .maybeSingle();

  if (topicError) {
    throw new Error(topicError.message);
  }

  return {
    contentItemId: item.id,
    title: item.title,
    slug: item.slug,
    topicId: item.topic_id,
    topicName: topic?.name ?? "Topic",
    plainText: version.plain_text,
    contentRichJson: version.content_rich_json,
    version: {
      id: version.id,
      versionNumber: version.version_number,
      isLatest: version.is_latest,
    },
  };
}

async function resolveAddendumMarkdown(
  contentItemId: string,
  currentVersionId: string | null,
): Promise<string | null> {
  const supabase = createSupabaseAnonServerClient();
  if (currentVersionId) {
    const { data: cv, error } = await supabase
      .from("content_version")
      .select("addendum_markdown")
      .eq("id", currentVersionId)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    const m = cv?.addendum_markdown;
    if (typeof m === "string" && m.trim() !== "") {
      return m;
    }
  }
  const { data: rows, error: e2 } = await supabase
    .from("content_version")
    .select("addendum_markdown")
    .eq("content_item_id", contentItemId)
    .not("addendum_markdown", "is", null)
    .order("version_number", { ascending: false })
    .limit(1);
  if (e2) {
    throw new Error(e2.message);
  }
  const fallback = rows?.[0]?.addendum_markdown;
  return typeof fallback === "string" && fallback.trim() !== "" ? fallback : null;
}

export type ArticleReadBundleForLesson = {
  snapshot: ArticleSnapshotRead;
  related: ContentItemListRow[];
  /** Shown above the reader when the learner completed an older version */
  addendumMarkdown: string | null;
};

export async function buildArticleReadBundleForLessonStep(input: {
  contentItemId: string;
  articleStatus: string;
  completedContentVersionId: string | null;
  effectiveContentVersionId: string;
  contentItemCurrentVersionId: string | null;
}): Promise<ArticleReadBundleForLesson | null> {
  const latestId =
    input.contentItemCurrentVersionId ?? input.effectiveContentVersionId;
  const bodyVersionId =
    input.articleStatus === "completed"
      ? (input.completedContentVersionId ?? input.effectiveContentVersionId)
      : latestId;

  const snapshot = await getArticleSnapshotByVersionId(
    input.contentItemId,
    bodyVersionId,
  );
  if (!snapshot) {
    return null;
  }

  const showAddendum =
    input.articleStatus === "completed" &&
    !!input.contentItemCurrentVersionId &&
    bodyVersionId !== input.contentItemCurrentVersionId;

  const addendumMarkdown = showAddendum
    ? await resolveAddendumMarkdown(
        input.contentItemId,
        input.contentItemCurrentVersionId,
      )
    : null;

  const related = await listRelatedForLessonArticle(
    snapshot.contentItemId,
    snapshot.topicId,
  );

  return { snapshot, related, addendumMarkdown };
}

function emptyViewModel(
  planLearningGoal: string | null,
  planTools: string[],
  aggregatedTools: string[],
): LearnerLessonViewModel {
  return {
    planLearningGoal,
    planTools,
    aggregatedTools,
    learnerProgressId: null,
    learnerStatus: null,
    learnerCompletedAt: null,
    steps: [],
    activeStepIndex: 0,
    activeReadingIndex: 0,
    canRegenerateLessonPlan: false,
  };
}

async function loadPlanGoalAndTools(
  lessonPlanVersionId: string,
): Promise<{ planLearningGoal: string | null; planTools: string[] }> {
  const supabase = createSupabaseAnonServerClient();
  const { data: lpv, error } = await supabase
    .from("lesson_plan_version")
    .select("lesson_plan ( learning_goal, tools )")
    .eq("id", lessonPlanVersionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  const lp = unwrapOne((lpv as { lesson_plan?: unknown } | null)?.lesson_plan);
  if (!lp || typeof lp !== "object") {
    return { planLearningGoal: null, planTools: [] };
  }
  const o = lp as Record<string, unknown>;
  return {
    planLearningGoal: typeof o.learning_goal === "string" ? o.learning_goal : null,
    planTools: parseToolsJson(o.tools),
  };
}

function buildAggregatedTools(stepsMeta: LessonPlanLessonMeta[]): string[] {
  const set = new Set<string>();
  for (const s of stepsMeta) {
    for (const t of s.lessonTools) {
      set.add(t);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export async function loadLearnerLessonViewModel(
  lessonPlanVersionId: string,
): Promise<LearnerLessonViewModel> {
  const { planLearningGoal, planTools } =
    await loadPlanGoalAndTools(lessonPlanVersionId);
  const stepsMeta = await getLessonPlanLessons(lessonPlanVersionId);
  const aggregatedTools = stepsMeta ? buildAggregatedTools(stepsMeta) : [];

  if (!stepsMeta || stepsMeta.length === 0) {
    return emptyViewModel(planLearningGoal, planTools, aggregatedTools);
  }

  const mergeSteps = (
    itemRows: {
      lesson_plan_item_id: string;
      id: string;
      article_status: string;
      completed_at: string | null;
      completed_content_version_id: string | null;
    }[],
    lrpRows: {
      lesson_item_progress_id: string;
      lesson_reading_id: string;
      id: string;
      article_status: string;
      completed_at: string | null;
      completed_content_version_id: string | null;
    }[],
  ): LessonStepState[] => {
    const byItemId = new Map(
      itemRows.map((r) => [
        r.lesson_plan_item_id,
        {
          id: r.id,
          articleStatus: r.article_status,
          completedAt: r.completed_at,
          completedContentVersionId: r.completed_content_version_id,
        },
      ]),
    );
    const lrpByLip = new Map<string, typeof lrpRows>();
    for (const row of lrpRows) {
      const list = lrpByLip.get(row.lesson_item_progress_id) ?? [];
      list.push(row);
      lrpByLip.set(row.lesson_item_progress_id, list);
    }

    return stepsMeta.map((meta) => {
      const lip = byItemId.get(meta.lessonPlanItemId);
      const lipId = lip?.id ?? null;
      const lrps = lipId ? (lrpByLip.get(lipId) ?? []) : [];
      const lrpByReadingId = new Map(
        lrps.map((r) => [
          r.lesson_reading_id,
          {
            id: r.id,
            articleStatus: r.article_status,
            completedAt: r.completed_at,
            completedContentVersionId: r.completed_content_version_id,
          },
        ]),
      );

      const readings: LessonReadingProgressState[] = meta.readings.map((rm) => {
        const pr = lrpByReadingId.get(rm.lessonReadingId);
        return {
          ...rm,
          readingProgressId: pr?.id ?? null,
          articleStatus: pr?.articleStatus ?? "pending",
          completedAt: pr?.completedAt ?? null,
          completedContentVersionId: pr?.completedContentVersionId ?? null,
        };
      });

      const derived = deriveLessonAggregateFromReadings(readings);
      return {
        lessonPlanItemId: meta.lessonPlanItemId,
        sequence: meta.sequence,
        lessonTitle: meta.lessonTitle,
        lessonLearningGoal: meta.lessonLearningGoal,
        lessonTools: meta.lessonTools,
        requiresQuiz: meta.requiresQuiz,
        itemProgressId: lipId,
        articleStatus: derived.articleStatus,
        completedAt: derived.completedAt,
        completedContentVersionId: derived.completedContentVersionId,
        readings,
      };
    });
  };

  const ctx = await getLearnerDbContext();
  if (!ctx) {
    const steps = mergeSteps([], []);
    let activeStepIndex = steps.findIndex((st) => st.articleStatus !== "completed");
    if (activeStepIndex < 0) {
      activeStepIndex = steps.length;
    }
    const activeLesson = activeStepIndex < steps.length ? steps[activeStepIndex] : null;
    const firstIncompleteRi = activeLesson
      ? activeLesson.readings.findIndex((r) => r.articleStatus !== "completed")
      : -1;
    const activeReadingIndex =
      activeLesson && firstIncompleteRi >= 0
        ? firstIncompleteRi
        : activeLesson && activeLesson.readings.length > 0
          ? activeLesson.readings.length - 1
          : 0;
    return {
      planLearningGoal,
      planTools,
      aggregatedTools,
      learnerProgressId: null,
      learnerStatus: null,
      learnerCompletedAt: null,
      steps,
      activeStepIndex,
      activeReadingIndex,
      canRegenerateLessonPlan: false,
    };
  }

  const { userId, client: supabase } = ctx;

  const { data: progress, error: progressError } = await supabase
    .from("learner_progress")
    .select("id, status, completed_at")
    .eq("user_id", userId)
    .eq("lesson_plan_version_id", lessonPlanVersionId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (progressError) {
    throw new Error(progressError.message);
  }

  if (!progress) {
    const steps = mergeSteps([], []);
    let activeStepIndex = steps.findIndex((st) => st.articleStatus !== "completed");
    if (activeStepIndex < 0) {
      activeStepIndex = steps.length;
    }
    const activeLesson = activeStepIndex < steps.length ? steps[activeStepIndex] : null;
    const firstIncompleteRiNp = activeLesson
      ? activeLesson.readings.findIndex((r) => r.articleStatus !== "completed")
      : -1;
    const activeReadingIndex =
      activeLesson && firstIncompleteRiNp >= 0
        ? firstIncompleteRiNp
        : activeLesson && activeLesson.readings.length > 0
          ? activeLesson.readings.length - 1
          : 0;
    return {
      planLearningGoal,
      planTools,
      aggregatedTools,
      learnerProgressId: null,
      learnerStatus: null,
      learnerCompletedAt: null,
      steps,
      activeStepIndex,
      activeReadingIndex,
      canRegenerateLessonPlan: false,
    };
  }

  const { data: itemRows, error: itemErr } = await supabase
    .from("lesson_item_progress")
    .select(
      "id, lesson_plan_item_id, article_status, completed_at, completed_content_version_id",
    )
    .eq("learner_progress_id", progress.id);

  if (itemErr) {
    throw new Error(itemErr.message);
  }

  const lipIds = (itemRows ?? []).map((r) => r.id as string);
  let lrpRows: {
    lesson_item_progress_id: string;
    lesson_reading_id: string;
    id: string;
    article_status: string;
    completed_at: string | null;
    completed_content_version_id: string | null;
  }[] = [];

  if (lipIds.length > 0) {
    const { data: lrData, error: lrpErr } = await supabase
      .from("lesson_reading_progress")
      .select(
        "id, lesson_item_progress_id, lesson_reading_id, article_status, completed_at, completed_content_version_id",
      )
      .in("lesson_item_progress_id", lipIds);

    if (lrpErr) {
      throw new Error(lrpErr.message);
    }
    lrpRows = (lrData ?? []) as typeof lrpRows;
  }

  const steps = mergeSteps(
    (itemRows ?? []) as {
      lesson_plan_item_id: string;
      id: string;
      article_status: string;
      completed_at: string | null;
      completed_content_version_id: string | null;
    }[],
    lrpRows,
  );

  let activeStepIndex = steps.findIndex((st) => st.articleStatus !== "completed");
  if (activeStepIndex < 0) {
    activeStepIndex = steps.length;
  }

  const activeLesson = activeStepIndex < steps.length ? steps[activeStepIndex] : null;
  const firstIncompleteRi = activeLesson
    ? activeLesson.readings.findIndex((r) => r.articleStatus !== "completed")
    : -1;
  const activeReadingIndex =
    activeLesson && firstIncompleteRi >= 0
      ? firstIncompleteRi
      : activeLesson && activeLesson.readings.length > 0
        ? activeLesson.readings.length - 1
        : 0;

  const canRegenerateLessonPlan = steps.some((st) =>
    st.readings.some(
      (rd) =>
        rd.articleStatus === "completed" &&
        !!rd.completedContentVersionId &&
        !!rd.contentItemCurrentVersionId &&
        rd.completedContentVersionId !== rd.contentItemCurrentVersionId,
    ),
  );

  return {
    planLearningGoal,
    planTools,
    aggregatedTools,
    learnerProgressId: progress.id,
    learnerStatus: progress.status,
    learnerCompletedAt: progress.completed_at,
    steps,
    activeStepIndex,
    activeReadingIndex,
    canRegenerateLessonPlan,
  };
}

export async function listRelatedForLessonArticle(
  contentItemId: string,
  topicId: string,
): Promise<ContentItemListRow[]> {
  return listRelatedContentItems(contentItemId, topicId, 5);
}
