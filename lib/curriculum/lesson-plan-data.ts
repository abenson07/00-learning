import curriculumFile from "@/vibe-code-lesson-plan.json";

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

type RawFile = {
  lesson_plan: {
    id: string;
    title: string;
    description: string;
    lessons: CurriculumLesson[];
  };
};

const data = curriculumFile as RawFile;

export function getLessonPlanMeta(): LessonPlanMeta {
  const p = data.lesson_plan;
  return {
    id: p.id,
    title: p.title,
    description: p.description,
  };
}

export function getAllLessons(): CurriculumLesson[] {
  return data.lesson_plan.lessons ?? [];
}

export function getAllLessonIds(): string[] {
  return getAllLessons().map((l) => l.id);
}

/** First lesson path for nav and CTAs — stable across curriculum edits. */
export function getDefaultLessonHref(): string {
  const first = getAllLessons()[0];
  return first ? `/lessons/${encodeURIComponent(first.id)}` : "/lessons";
}

/**
 * Resolve a route param like `lesson-01`, `1`, or `01` to a canonical lesson id.
 */
export function resolveLessonIdParam(raw: string): string | null {
  const lessons = getAllLessons();
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

export function getLessonById(canonicalId: string): CurriculumLesson | undefined {
  return getAllLessons().find((l) => l.id === canonicalId);
}

export function getLessonByRouteParam(raw: string): CurriculumLesson | undefined {
  const id = resolveLessonIdParam(raw);
  return id ? getLessonById(id) : undefined;
}
