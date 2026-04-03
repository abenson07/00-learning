"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getAllLessons,
  getLessonByRouteParam,
  getLessonPlanMeta,
} from "@/lib/curriculum/lesson-plan-data";

export function LessonPlanSidebar({ className }: { className?: string }) {
  const params = useParams();
  const rawId = typeof params?.lessonId === "string" ? params.lessonId : undefined;
  const plan = getLessonPlanMeta();
  const lessons = getAllLessons();
  const current = rawId ? getLessonByRouteParam(rawId) : undefined;
  const total = lessons.length;
  const progressPercent =
    current && total > 0 ? Math.round((current.number / total) * 100) : 0;

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
          course progress (by lesson)
        </p>
      </div>

      <nav
        className="mt-6 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto border-t border-border/60 pt-6 pr-1 pb-4"
        aria-label="Lesson outline"
      >
        {current && current.steps.length > 0 && (
          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              This lesson
            </h2>
            <ol className="mt-3 flex flex-col gap-1.5">
              {current.steps.map((step) => (
                <li key={`${current.id}-s-${step.number}`}>
                  <a
                    href={`#step-${step.number}`}
                    className="block rounded-md px-2 py-1.5 text-[13px] leading-snug text-zinc-600 transition-colors hover:bg-zinc-100/90 hover:text-zinc-900"
                  >
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {step.number}.
                    </span>{" "}
                    {step.title}
                  </a>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            All lessons
          </h2>
          <ul className="mt-3 flex flex-col gap-1">
            {lessons.map((lesson) => {
              const active = current?.id === lesson.id;
              return (
                <li key={lesson.id}>
                  <Link
                    href={`/lessons/${encodeURIComponent(lesson.id)}`}
                    className={cn(
                      "block rounded-md px-2 py-2 text-[13px] leading-snug transition-colors",
                      active
                        ? "bg-zinc-200/90 font-medium text-zinc-900 shadow-sm"
                        : "text-zinc-600 hover:bg-zinc-100/90 hover:text-zinc-900",
                    )}
                  >
                    <span className="font-mono text-[11px] text-zinc-500">
                      {String(lesson.number).padStart(2, "0")}
                    </span>{" "}
                    {lesson.title}
                  </Link>
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
