import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAllLessons,
  getLessonPlanMeta,
} from "@/lib/curriculum/lesson-plan-data";
import { fetchLessonPlan } from "@/lib/curriculum/fetch-lesson-plan";

export async function LessonPlanOverview() {
  const content = await fetchLessonPlan();
  const plan = getLessonPlanMeta(content);
  const lessons = getAllLessons(content);

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-10 px-4 py-8 md:px-6 md:py-12">
      <header className="space-y-4 border-b border-border/80 pb-10">
        <nav className="text-[13px] text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <span className="mx-2 text-muted-foreground/60">/</span>
          <span className="font-medium text-foreground">Lesson plan</span>
        </nav>
        <div className="flex items-center gap-2">
          <BookOpen className="size-8 text-foreground" strokeWidth={1.75} aria-hidden />
        </div>
        <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          {plan.title}
        </h1>
        <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          {plan.description}
        </p>
        <p className="text-[13px] text-muted-foreground">
          {lessons.length} lessons · follow in order or jump in from the sidebar when
          you&apos;re in a lesson
        </p>
      </header>

      <ol className="flex flex-col gap-4">
        {lessons.map((lesson) => (
          <li key={lesson.id}>
            <Link href={`/lessons/${encodeURIComponent(lesson.id)}`} className="group block">
              <Card className="border-border/80 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_-4px_rgba(15,23,42,0.08)] transition-[border-color,box-shadow] hover:border-sage/60 hover:shadow-md">
                <CardHeader className="space-y-3 pb-4 pt-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-md font-mono text-[11px]">
                      Lesson {lesson.number}
                    </Badge>
                    <Badge variant="outline" className="rounded-md text-[10px] font-normal text-muted-foreground">
                      {lesson.phase}
                    </Badge>
                    <span className="text-[12px] text-muted-foreground">{lesson.estimated_time}</span>
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold leading-snug transition-colors group-hover:text-brand md:text-xl">
                      {lesson.title}
                    </CardTitle>
                    <CardDescription className="mt-2 text-[15px] leading-relaxed">
                      {lesson.subtitle}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                    Open lesson
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
