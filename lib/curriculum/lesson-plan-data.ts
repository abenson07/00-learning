export type LessonInlineArticle = {
  article_id: string;
  note: string;
};

export type LessonConcept = {
  title: string;
  body: string;
  user_story_example?: {
    as_a: string;
    i_want_to: string;
    so_that: string;
  };
};

export type LessonStep = {
  number: number;
  title: string;
  type: string;
  type_label: string;
  content: string;
  commands: string[];
  /** Optional sample terminal output shown under the command (educational). */
  command_example_output?: string | null;
  prompt_guidance: string | null;
  example_prompt: string | null;
  browser_check: string | null;
  inline_articles: LessonInlineArticle[];
  concept: LessonConcept | null;
};

export type FoundationalReading = {
  article_id: string;
  title: string;
  reason: string;
};

export type CurriculumLesson = {
  id: string;
  number: number;
  phase: string;
  title: string;
  subtitle: string;
  estimated_time: string;
  goal: string;
  foundational_reading: FoundationalReading[];
  steps: LessonStep[];
  acceptance_criteria: string[];
  completion_note: string;
};

export type LessonPlanMeta = {
  id: string;
  title: string;
  description: string;
};

/** Payload shape stored in DB `lesson_plans.content` and in `lessons-01-07.json` → `lesson_plan`. */
export type LessonPlanContent = {
  id: string;
  title: string;
  description: string;
  lessons: CurriculumLesson[];
};

export function getLessonPlanMeta(plan: LessonPlanContent): LessonPlanMeta {
  return {
    id: plan.id,
    title: plan.title,
    description: plan.description,
  };
}

export function getAllLessons(plan: LessonPlanContent): CurriculumLesson[] {
  return plan.lessons ?? [];
}

/**
 * Resolve a route param like `lesson-01`, `1`, or `01` to a canonical lesson id.
 */
export function resolveLessonIdParam(
  raw: string,
  lessons: CurriculumLesson[],
): string | null {
  if (lessons.some((l) => l.id === raw)) {
    return raw;
  }
  const n = parseInt(raw.replace(/^lesson-?/i, ""), 10);
  if (!Number.isNaN(n)) {
    const padded = String(n).padStart(2, "0");
    const byPadded = `lesson-${padded}`;
    if (lessons.some((l) => l.id === byPadded)) {
      return byPadded;
    }
  }
  return null;
}

export function getLessonById(
  canonicalId: string,
  lessons: CurriculumLesson[],
): CurriculumLesson | undefined {
  return lessons.find((l) => l.id === canonicalId);
}

export function getLessonByRouteParam(
  raw: string,
  lessons: CurriculumLesson[],
): CurriculumLesson | undefined {
  const id = resolveLessonIdParam(raw, lessons);
  return id ? getLessonById(id, lessons) : undefined;
}
