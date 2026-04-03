import { Globe, Landmark, ShoppingBag } from "lucide-react";

import bundledPlanFile from "@/lessons-01-07.json";
import { DEFAULT_LESSON_HREF } from "@/lib/curriculum/curriculum-defaults";
import { fetchLessonPlan } from "@/lib/curriculum/fetch-lesson-plan";
import type { LessonPlanContent } from "@/lib/curriculum/lesson-plan-data";
import { hasSupabaseEnvConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

import { HomeLessonPreview } from "./home-lesson-preview";
import type {
  HomeLessonPreviewLesson,
  HomeLessonPreviewProps,
} from "./home-lesson-preview";

const PREVIEW_ICON_COMPONENTS = [Globe, ShoppingBag, Landmark] as const;

const bundledPlan = (bundledPlanFile as { lesson_plan: LessonPlanContent })
  .lesson_plan;

function previewIllustration(slotIndex: number) {
  const Icon =
    PREVIEW_ICON_COMPONENTS[slotIndex % PREVIEW_ICON_COMPONENTS.length];
  return <Icon strokeWidth={1.25} aria-hidden />;
}

function firstLessonHref(plan: LessonPlanContent): string {
  const first = plan.lessons[0];
  return first
    ? `/lessons/${encodeURIComponent(first.id)}`
    : DEFAULT_LESSON_HREF;
}

function buildPreviewLessons(
  plan: LessonPlanContent,
  maxCards = 3,
): HomeLessonPreviewLesson[] {
  return plan.lessons.slice(0, maxCards).map((lesson, i) => {
    const index = lesson.number;
    const illustration = previewIllustration(i);
    if (i === 0) {
      return {
        id: lesson.id,
        index,
        title: lesson.title,
        variant: "active" as const,
        href: `/lessons/${encodeURIComponent(lesson.id)}`,
        illustration,
      };
    }
    return {
      id: lesson.id,
      index,
      title: lesson.title,
      variant: "upcoming" as const,
      illustration,
    };
  });
}

async function resolveDashboardGreeting(): Promise<string> {
  if (!hasSupabaseEnvConfigured()) {
    return "Welcome back.";
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return "Welcome back.";
    }
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const fullName = meta?.full_name ?? meta?.name;
    if (typeof fullName === "string" && fullName.trim()) {
      const first = fullName.trim().split(/\s+/)[0];
      if (first) {
        return `Welcome back, ${first}.`;
      }
    }
    const email = user.email;
    if (email) {
      const local = email.split("@")[0];
      if (local) {
        return `Welcome back, ${local}.`;
      }
    }
    return "Welcome back.";
  } catch {
    return "Welcome back.";
  }
}

function previewPropsForPlan(plan: LessonPlanContent) {
  return {
    headline: "You've completed 5 lessons this week!",
    ctaLabel: "Resume lesson",
    ctaHref: firstLessonHref(plan),
    lessons: buildPreviewLessons(plan),
  } as const;
}

export type DashboardLessonPreviewOptions = {
  surface?: HomeLessonPreviewProps["surface"];
};

/** Static shell for Suspense fallback (no `cookies()` / auth). */
export function DashboardLessonPreviewFallback({
  surface,
}: DashboardLessonPreviewOptions = {}) {
  const props = previewPropsForPlan(bundledPlan);
  return (
    <HomeLessonPreview
      {...props}
      greeting="Welcome back."
      surface={surface}
    />
  );
}

export async function DashboardLessonPreview({
  surface,
}: DashboardLessonPreviewOptions = {}) {
  const greeting = await resolveDashboardGreeting();
  const plan = await fetchLessonPlan();
  const props = previewPropsForPlan(plan);
  return (
    <HomeLessonPreview {...props} greeting={greeting} surface={surface} />
  );
}
