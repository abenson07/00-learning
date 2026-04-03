import type { LessonPlanContent } from "@/lib/curriculum/lesson-plan-data";

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

export function buildSearchIndex(plan: LessonPlanContent): CurriculumSearchIndex {
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
    const title = lesson.title || "Lesson";
    const subtitle = lesson.subtitle || null;
    const phase = lesson.phase || null;
    const goal = lesson.goal || "";
    const id = lesson.id || String(lesson.number ?? "");

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
        [title, subtitle ?? "", phase ?? "", goal, courseTitle].join(" "),
      ),
    };
  });

  return { courses, lessons };
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
