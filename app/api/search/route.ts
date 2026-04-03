import { NextResponse } from "next/server";

import { filterHomeArticlesByQuery } from "@/lib/articles/filter-by-query";
import { fetchArticles } from "@/lib/articles/load-articles";
import { fetchLessonPlan } from "@/lib/curriculum/fetch-lesson-plan";
import {
  buildSearchIndex,
  filterSearchIndex,
  type SearchCourseHit,
  type SearchLessonHit,
} from "@/lib/curriculum/search-index";
import type {
  SearchApiLessonRow,
  SearchApiResponse,
} from "@/lib/search/types";

function serializeCourse(c: SearchCourseHit): SearchApiLessonRow {
  return {
    kind: "course",
    id: c.id,
    title: c.title,
    subtitle: c.description,
    phase: null,
    courseTitle: c.title,
    href: c.href,
  };
}

function serializeLesson(l: SearchLessonHit): SearchApiLessonRow {
  return {
    kind: "lesson",
    id: l.id,
    title: l.title,
    subtitle: l.subtitle,
    phase: l.phase,
    courseTitle: l.courseTitle,
    href: l.href,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("q") ?? "";
  const q = raw.trim();

  if (q.length === 0) {
    return NextResponse.json(
      { articles: [], lessons: [] } satisfies SearchApiResponse,
      { status: 200 },
    );
  }

  const plan = await fetchLessonPlan();
  const index = buildSearchIndex(plan);
  const { courses, lessons } = filterSearchIndex(index, q);

  const { articles: allArticles } = await fetchArticles();
  const matchedArticles = filterHomeArticlesByQuery(allArticles, q);

  const payload: SearchApiResponse = {
    articles: matchedArticles.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      href: `/articles/${encodeURIComponent(a.id)}`,
      category: a.category,
    })),
    lessons: [
      ...courses.map(serializeCourse),
      ...lessons.map(serializeLesson),
    ],
  };

  return NextResponse.json(payload);
}
