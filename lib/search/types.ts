export type SearchApiArticle = {
  id: string;
  title: string;
  description: string | null;
  href: string;
  category: string;
};

export type SearchApiLessonRow = {
  kind: "course" | "lesson";
  id: string;
  title: string;
  subtitle: string | null;
  phase: string | null;
  courseTitle: string;
  href: string;
};

export type SearchApiResponse = {
  articles: SearchApiArticle[];
  lessons: SearchApiLessonRow[];
};
