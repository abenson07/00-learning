import { Globe, Landmark, ShoppingBag } from "lucide-react";

import { getDefaultLessonHref } from "@/lib/curriculum/lesson-plan-data";
import { hasSupabaseEnvConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

import { HomeLessonPreview } from "./home-lesson-preview";
import type {
  HomeLessonPreviewLesson,
  HomeLessonPreviewProps,
} from "./home-lesson-preview";

const defaultLessonHref = getDefaultLessonHref();

const LESSONS: HomeLessonPreviewLesson[] = [
  {
    id: "preview-active",
    index: 1,
    title: "Around the world",
    variant: "active",
    href: defaultLessonHref,
    illustration: <Globe strokeWidth={1.25} aria-hidden />,
  },
  {
    id: "preview-2",
    index: 2,
    title: "Going shopping",
    variant: "upcoming",
    illustration: <ShoppingBag strokeWidth={1.25} aria-hidden />,
  },
  {
    id: "preview-3",
    index: 3,
    title: "Paris en ville",
    variant: "upcoming",
    illustration: <Landmark strokeWidth={1.25} aria-hidden />,
  },
];

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

const previewProps = {
  headline: "You've completed 5 lessons this week!",
  ctaLabel: "Resume lesson",
  ctaHref: defaultLessonHref,
  lessons: LESSONS,
} as const;

export type DashboardLessonPreviewOptions = {
  surface?: HomeLessonPreviewProps["surface"];
};

/** Static shell for Suspense fallback (no `cookies()` / auth). */
export function DashboardLessonPreviewFallback({
  surface,
}: DashboardLessonPreviewOptions = {}) {
  return (
    <HomeLessonPreview
      {...previewProps}
      greeting="Welcome back."
      surface={surface}
    />
  );
}

export async function DashboardLessonPreview({
  surface,
}: DashboardLessonPreviewOptions = {}) {
  const greeting = await resolveDashboardGreeting();
  return (
    <HomeLessonPreview {...previewProps} greeting={greeting} surface={surface} />
  );
}
