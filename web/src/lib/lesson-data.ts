import { getSupabaseServerClient } from "@/lib/supabase/server";
import { listRelatedContentItems, type ContentItemListRow } from "@/lib/library-data";

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
};

export type LessonPlanStepMeta = {
  lessonPlanItemId: string;
  sequence: number;
  contentItemId: string;
  contentTitle: string;
  effectiveContentVersionId: string;
};

export type ArticleSnapshotRead = {
  contentItemId: string;
  title: string;
  slug: string;
  topicId: string;
  plainText: string;
  contentRichJson: unknown;
  version: {
    id: string;
    versionNumber: number;
    isLatest: boolean;
  };
};

export type LessonStepState = LessonPlanStepMeta & {
  itemProgressId: string | null;
  articleStatus: string;
  completedAt: string | null;
};

export type LearnerLessonViewModel = {
  learnerProgressId: string | null;
  learnerStatus: string | null;
  learnerCompletedAt: string | null;
  steps: LessonStepState[];
  /** Index of first step whose article is not completed; `steps.length` when all done */
  activeStepIndex: number;
};

export async function listLessonPlansForLessonsPage(): Promise<LessonPlanSummary[]> {
  const supabase = getSupabaseServerClient();

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
    .map(({ sort_order: _s, ...rest }) => rest);
}

export async function getLessonPlanVersionMeta(
  lessonPlanVersionId: string,
): Promise<LessonPlanVersionMeta | null> {
  const supabase = getSupabaseServerClient();

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
    .select("id, title, description, domain_id")
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
  };
}

export async function getLessonPlanSteps(
  lessonPlanVersionId: string,
): Promise<LessonPlanStepMeta[] | null> {
  const supabase = getSupabaseServerClient();

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
      content_item_id,
      effective_content_version_id,
      content_item ( title )
    `,
    )
    .eq("lesson_plan_version_id", lessonPlanVersionId)
    .order("sequence", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  type RawItem = {
    id: string;
    sequence: number;
    content_item_id: string;
    effective_content_version_id: string;
    content_item: unknown;
  };

  function contentTitleFromEmbed(raw: unknown): string {
    const row = unwrapOne(raw) as { title?: string } | null;
    return typeof row?.title === "string" ? row.title : "Article";
  }

  return ((rows as RawItem[] | null) ?? []).map((row) => ({
    lessonPlanItemId: row.id,
    sequence: row.sequence,
    contentItemId: row.content_item_id,
    contentTitle: contentTitleFromEmbed(row.content_item),
    effectiveContentVersionId: row.effective_content_version_id,
  }));
}

export async function getArticleSnapshotByVersionId(
  contentItemId: string,
  effectiveVersionId: string,
): Promise<ArticleSnapshotRead | null> {
  const supabase = getSupabaseServerClient();

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

  return {
    contentItemId: item.id,
    title: item.title,
    slug: item.slug,
    topicId: item.topic_id,
    plainText: version.plain_text,
    contentRichJson: version.content_rich_json,
    version: {
      id: version.id,
      versionNumber: version.version_number,
      isLatest: version.is_latest,
    },
  };
}

export async function loadLearnerLessonViewModel(
  userId: string,
  lessonPlanVersionId: string,
): Promise<LearnerLessonViewModel> {
  const stepsMeta = await getLessonPlanSteps(lessonPlanVersionId);
  if (!stepsMeta || stepsMeta.length === 0) {
    return {
      learnerProgressId: null,
      learnerStatus: null,
      learnerCompletedAt: null,
      steps: [],
      activeStepIndex: 0,
    };
  }

  const supabase = getSupabaseServerClient();

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
    const steps: LessonStepState[] = stepsMeta.map((s) => ({
      ...s,
      itemProgressId: null,
      articleStatus: "pending",
      completedAt: null,
    }));
    return {
      learnerProgressId: null,
      learnerStatus: null,
      learnerCompletedAt: null,
      steps,
      activeStepIndex: 0,
    };
  }

  const { data: itemRows, error: itemErr } = await supabase
    .from("lesson_item_progress")
    .select(
      "id, lesson_plan_item_id, article_status, completed_at",
    )
    .eq("learner_progress_id", progress.id);

  if (itemErr) {
    throw new Error(itemErr.message);
  }

  const byItemId = new Map(
    (itemRows ?? []).map((r) => [
      r.lesson_plan_item_id,
      {
        id: r.id as string,
        articleStatus: r.article_status as string,
        completedAt: r.completed_at as string | null,
      },
    ]),
  );

  const steps: LessonStepState[] = stepsMeta.map((s) => {
    const lip = byItemId.get(s.lessonPlanItemId);
    return {
      ...s,
      itemProgressId: lip?.id ?? null,
      articleStatus: lip?.articleStatus ?? "pending",
      completedAt: lip?.completedAt ?? null,
    };
  });

  let activeStepIndex = steps.findIndex((st) => st.articleStatus !== "completed");
  if (activeStepIndex < 0) {
    activeStepIndex = steps.length;
  }

  return {
    learnerProgressId: progress.id,
    learnerStatus: progress.status,
    learnerCompletedAt: progress.completed_at,
    steps,
    activeStepIndex,
  };
}

export async function listRelatedForLessonArticle(
  contentItemId: string,
  topicId: string,
): Promise<ContentItemListRow[]> {
  return listRelatedContentItems(contentItemId, topicId, 5);
}
