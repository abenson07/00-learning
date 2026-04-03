"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import type { LessonStepProgressRow } from "@/lib/curriculum/fetch-lesson-step-progress";
import {
  countLocalCompletedSteps,
  completedStepKey,
  LESSON_STEP_LOCAL_CHANGED_EVENT,
} from "@/lib/curriculum/lesson-step-local";
import type {
  CurriculumLesson,
  LessonPlanMeta,
} from "@/lib/curriculum/lesson-plan-data";
import { getLessonByRouteParam } from "@/lib/curriculum/lesson-plan-data";

export type LessonPlanSidebarProps = {
  plan: LessonPlanMeta;
  lessons: CurriculumLesson[];
  /** From server when signed in; empty when not. */
  initialCompletedSteps?: LessonStepProgressRow[];
  /** When true, progress uses `initialCompletedSteps` (updates after refresh). */
  hasSession?: boolean;
  className?: string;
};

export function LessonPlanSidebar({
  plan,
  lessons,
  initialCompletedSteps = [],
  hasSession = false,
  className,
}: LessonPlanSidebarProps) {
  const params = useParams();
  const rawId = typeof params?.lessonId === "string" ? params.lessonId : undefined;
  const current = rawId ? getLessonByRouteParam(rawId, lessons) : undefined;

  const totalSteps = useMemo(
    () => lessons.reduce((sum, l) => sum + l.steps.length, 0),
    [lessons],
  );

  const serverCompletedCount = useMemo(() => {
    const seen = new Set<string>();
    for (const s of initialCompletedSteps) {
      seen.add(completedStepKey(s.lessonId, s.stepNumber));
    }
    return seen.size;
  }, [initialCompletedSteps]);

  const [guestCompletedCount, setGuestCompletedCount] = useState(0);

  useEffect(() => {
    if (hasSession) return;
    const apply = () => setGuestCompletedCount(countLocalCompletedSteps(lessons));
    apply();
    window.addEventListener(LESSON_STEP_LOCAL_CHANGED_EVENT, apply);
    window.addEventListener("storage", apply);
    return () => {
      window.removeEventListener(LESSON_STEP_LOCAL_CHANGED_EVENT, apply);
      window.removeEventListener("storage", apply);
    };
  }, [hasSession, lessons]);

  const completedCount = hasSession ? serverCompletedCount : guestCompletedCount;
  const progressPercent =
    totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  const lessonsInOrder = useMemo(
    () => [...lessons].sort((a, b) => a.number - b.number),
    [lessons],
  );

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh w-[min(100%,280px)] shrink-0 flex-col overflow-hidden py-6 pl-5 pr-4 text-foreground md:flex md:flex-col",
        className,
      )}
    >
      <div className="min-w-0 pl-0.5">
        <Link
          href="/"
          className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
          Back to dashboard
        </Link>
        <p className="text-[13px] font-medium leading-snug text-foreground">
          {plan.title}
        </p>
        {current && (
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Lesson {current.number}: {current.title}
          </p>
        )}
      </div>

      <div className="mt-8 border-t border-border/60 pt-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-semibold tabular-nums tracking-tight text-foreground">
            {String(progressPercent).padStart(2, "0")}
          </span>
          <span className="text-lg font-medium text-muted-foreground">%</span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          course progress ({completedCount} of {totalSteps} steps)
        </p>
      </div>

      <nav
        className="mt-6 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto border-t border-border/60 pt-6 pr-1 pb-4"
        aria-label="Lesson outline"
      >
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Lessons
          </h2>
          <ul className="mt-3 flex flex-col gap-0.5">
            {lessonsInOrder.map((lesson) => {
              const active = current?.id === lesson.id;
              return (
                <li key={lesson.id} className="flex flex-col">
                  <Link
                    href={`/lessons/${encodeURIComponent(lesson.id)}`}
                    className={cn(
                      "block rounded-md px-2 py-2 text-[13px] leading-snug transition-colors",
                      active
                        ? "bg-zinc-200/90 font-medium text-zinc-900 shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-100/90 hover:text-zinc-900",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="font-mono text-[11px] text-zinc-500">
                      {String(lesson.number).padStart(2, "0")}
                    </span>{" "}
                    {lesson.title}
                  </Link>
                  {active && lesson.steps.length > 0 && (
                    <ol className="mt-1 mb-2 ml-2 flex flex-col gap-1 border-l border-border/60 pl-3">
                      {lesson.steps.map((step) => (
                        <li key={`${lesson.id}-s-${step.number}`}>
                          <a
                            href={`#step-${step.number}`}
                            className="block rounded-md py-1 pr-1 text-[12px] leading-snug text-zinc-600 transition-colors hover:bg-zinc-100/90 hover:text-zinc-900"
                          >
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {step.number}.
                            </span>{" "}
                            {step.title}
                          </a>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="border-t border-border/60 pt-4">
          <Link
            href="/lesson-plan"
            className="text-[12px] font-medium text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-900 hover:underline"
          >
            Full lesson plan overview
          </Link>
        </section>
      </nav>
    </aside>
  );
}
