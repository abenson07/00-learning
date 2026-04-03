import { cache } from "react";

import fallbackFile from "@/lessons-01-07.json";
import { hasSupabaseEnvConfigured } from "@/lib/supabase/env";
import { createPublicServerClient } from "@/lib/supabase/server";

import type { LessonPlanContent } from "./lesson-plan-data";

function getLessonPlanSlug(): string {
  const raw = process.env.LESSON_PLAN_SLUG?.trim();
  return raw || "movie-tracker";
}

function getFallbackPlan(): LessonPlanContent {
  const raw = fallbackFile as { lesson_plan: LessonPlanContent };
  return raw.lesson_plan;
}

function isValidPlan(content: unknown): content is LessonPlanContent {
  if (!content || typeof content !== "object") return false;
  const c = content as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    Array.isArray(c.lessons) &&
    c.lessons.length > 0
  );
}

/**
 * Loads the active lesson plan from Supabase (`lesson_plans` by slug), or falls back
 * to bundled `lessons-01-07.json`. Cached per request via React `cache()`.
 */
export const fetchLessonPlan = cache(async (): Promise<LessonPlanContent> => {
  const fallback = getFallbackPlan();
  /** Avoid Supabase network during static generation (`next build`); use bundled JSON. */
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return fallback;
  }
  if (!hasSupabaseEnvConfigured()) {
    return fallback;
  }
  try {
    const supabase = createPublicServerClient();
    const slug = getLessonPlanSlug();
    const { data, error } = await supabase
      .from("lesson_plans")
      .select("content")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("[fetchLessonPlan]", error.message);
      return fallback;
    }

    const row = data as { content: unknown } | null;
    if (!row?.content || !isValidPlan(row.content)) {
      return fallback;
    }
    return row.content;
  } catch (e) {
    console.error("[fetchLessonPlan]", e);
    return fallback;
  }
});
