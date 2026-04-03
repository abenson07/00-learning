/**
 * Client-safe defaults derived from bundled `lessons-01-07.json` (same source as SQL seed).
 * Used where sync module scope is required (e.g. main nav) without a server fetch.
 */
import data from "@/lessons-01-07.json";

const lessons = data.lesson_plan.lessons;
const first = lessons[0];

export const DEFAULT_LESSON_HREF = first
  ? `/lessons/${encodeURIComponent(first.id)}`
  : "/lessons";

/** Build-time route segments for `generateStaticParams` — no DB required. */
export const STATIC_LESSON_IDS: string[] = lessons.map((l) => l.id);
