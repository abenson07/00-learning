import curriculumData from "@/vibe-code-lesson-plan.json";

type RawLesson = {
  id: string;
  number?: number;
  phase?: string;
  title?: string;
  subtitle?: string;
  goal?: string;
};

type RawLessonPlan = {
  id: string;
  title?: string;
  description?: string;
  lessons?: RawLesson[];
};

type RawCurriculumFile = {
  lesson_plan: RawLessonPlan;
};

const data = curriculumData as RawCurriculumFile;

export type SearchCourseHit = {
  kind: "course";
  id: string;
  title: string;
  description: string | null;
  href: string;
  searchText: string;
};

export type SearchLessonHit = {
  kind: "lesson";
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  subtitle: string | null;
  phase: string | null;
  href: string;
  searchText: string;
};

export type CurriculumSearchIndex = {
  courses: SearchCourseHit[];
  lessons: SearchLessonHit[];
};

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function buildSearchIndex(): CurriculumSearchIndex {
  const plan = data.lesson_plan;
  const courseId = plan.id ?? "course";
  const courseTitle = typeof plan.title === "string" ? plan.title : "Course";
  const courseDescription =
    typeof plan.description === "string" ? plan.description : null;

  const courses: SearchCourseHit[] = [
    {
      kind: "course",
      id: courseId,
      title: courseTitle,
      description: courseDescription,
      href: `/lesson-plan?plan=${encodeURIComponent(courseId)}`,
      searchText: normalize(
        [courseTitle, courseDescription ?? ""].filter(Boolean).join(" "),
      ),
    },
  ];

  const lessons: SearchLessonHit[] = (plan.lessons ?? []).map((lesson) => {
    const title = typeof lesson.title === "string" ? lesson.title : "Lesson";
    const subtitle =
      typeof lesson.subtitle === "string" ? lesson.subtitle : null;
    const phase = typeof lesson.phase === "string" ? lesson.phase : null;
    const goal = typeof lesson.goal === "string" ? lesson.goal : "";
    const id = typeof lesson.id === "string" ? lesson.id : String(lesson.number ?? "");

    return {
      kind: "lesson",
      id,
      courseId,
      courseTitle,
      title,
      subtitle,
      phase,
      href: `/lessons/${encodeURIComponent(id)}`,
      searchText: normalize(
        [
          title,
          subtitle ?? "",
          phase ?? "",
          goal,
          courseTitle,
        ].join(" "),
      ),
    };
  });

  return { courses, lessons };
}

/** Singleton index — curriculum JSON is static at build time. */
let cached: CurriculumSearchIndex | null = null;

export function getSearchIndex(): CurriculumSearchIndex {
  if (!cached) cached = buildSearchIndex();
  return cached;
}

export function filterSearchIndex(
  index: CurriculumSearchIndex,
  query: string,
): { courses: SearchCourseHit[]; lessons: SearchLessonHit[] } {
  const q = normalize(query);
  if (!q) {
    return { courses: index.courses, lessons: index.lessons };
  }

  const matches = (searchText: string) => searchText.includes(q);

  return {
    courses: index.courses.filter((c) => matches(c.searchText)),
    lessons: index.lessons.filter((l) => matches(l.searchText)),
  };
}
