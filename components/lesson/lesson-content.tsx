import Link from "next/link";
import {
  BookMarked,
  Check,
  Clock,
  ListChecks,
  MessageSquareCode,
  MonitorPlay,
  Sparkles,
  Terminal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CurriculumLesson, LessonPlanMeta } from "@/lib/curriculum/lesson-plan-data";

type LessonContentProps = {
  plan: LessonPlanMeta;
  lesson: CurriculumLesson;
};

function StepTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "setup":
    case "terminal":
      return <Terminal className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
    case "cursor_prompt":
    case "cursor_agent":
    case "cursor_config":
      return (
        <MessageSquareCode className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      );
    case "browser_review":
      return <MonitorPlay className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
    default:
      return <Sparkles className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
  }
}

export function LessonContent({ plan, lesson }: LessonContentProps) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-10 px-4 py-6 pb-16 md:px-6 md:py-8">
      <header className="mx-auto w-full max-w-3xl space-y-4 border-b border-border/80 pb-8">
        <nav className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
          <Link
            href="/"
            className="transition-colors hover:text-foreground"
          >
            Home
          </Link>
          <span aria-hidden className="text-muted-foreground/60">
            /
          </span>
          <Link
            href="/lesson-plan"
            className="transition-colors hover:text-foreground"
          >
            {plan.title}
          </Link>
          <span aria-hidden className="text-muted-foreground/60">
            /
          </span>
          <span className="font-medium text-foreground">Lesson {lesson.number}</span>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className="rounded-md bg-sage/80 font-medium text-sage-foreground"
          >
            {lesson.phase}
          </Badge>
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Clock className="size-3.5" strokeWidth={2} aria-hidden />
            {lesson.estimated_time}
          </span>
        </div>

        <div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {lesson.title}
          </h1>
          <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            {lesson.subtitle}
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-muted/30 p-4 md:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Goal
          </p>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-foreground md:text-[15px]">
            {lesson.goal}
          </p>
        </div>
      </header>

      {lesson.foundational_reading.length > 0 && (
        <section
          className="mx-auto w-full max-w-3xl space-y-4"
          aria-labelledby="foundational-reading-heading"
        >
          <div className="flex items-center gap-2">
            <BookMarked className="size-5 text-foreground" strokeWidth={2} aria-hidden />
            <h2
              id="foundational-reading-heading"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              Foundational reading
            </h2>
          </div>
          <ul className="grid gap-3">
            {lesson.foundational_reading.map((item) => (
              <li key={item.article_id}>
                <Card className="border-border/80 shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader className="space-y-2 pb-3 pt-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold leading-snug">
                        <Link
                          href={`/articles/${encodeURIComponent(item.article_id)}`}
                          className="text-foreground underline-offset-4 transition-colors hover:text-brand hover:underline"
                        >
                          {item.title}
                        </Link>
                      </CardTitle>
                      <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                        {item.article_id}
                      </Badge>
                    </div>
                    <CardDescription className="text-[13px] leading-relaxed">
                      {item.reason}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        className="mx-auto w-full max-w-3xl space-y-6"
        aria-labelledby="steps-heading"
      >
        <div className="flex items-center gap-2">
          <ListChecks className="size-5 text-foreground" strokeWidth={2} aria-hidden />
          <h2 id="steps-heading" className="text-lg font-semibold tracking-tight text-foreground">
            Steps
          </h2>
        </div>

        <ol className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          {lesson.steps.map((step) => (
            <li
              key={`${lesson.id}-step-${step.number}`}
              id={`step-${step.number}`}
              className="scroll-mt-28"
            >
              <article className="relative overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground">
                <div className="flex border-b border-border/60 bg-muted/30 px-4 py-3 md:px-5">
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex min-w-0 gap-3">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-200/90 text-sm font-semibold text-zinc-900"
                        aria-hidden
                      >
                        {step.number}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <h3 className="text-base font-semibold leading-snug text-foreground">
                          {step.title}
                        </h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                            <StepTypeIcon type={step.type} />
                            {step.type_label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <CardContent className="space-y-5 px-4 py-5 md:px-5">
                  <div className="prose prose-neutral max-w-none text-[15px] leading-relaxed dark:prose-invert prose-p:my-3 prose-p:text-foreground/95 first:prose-p:mt-0 last:prose-p:mb-0">
                    {step.content.split(/\n\n+/).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>

                  {step.commands.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Commands
                      </p>
                      <pre className="overflow-x-auto rounded-lg border border-border/80 bg-muted/50 p-4 text-[13px] leading-relaxed text-foreground">
                        <code>{step.commands.join("\n")}</code>
                      </pre>
                    </div>
                  )}

                  {step.prompt_guidance && (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Prompt guidance
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-foreground">
                        {step.prompt_guidance}
                      </p>
                    </div>
                  )}

                  {step.example_prompt && (
                    <div className="rounded-lg border border-border/80 bg-sage/15 px-4 py-3 dark:bg-sage/10">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-sage-foreground">
                        Example prompt
                      </p>
                      <p className="mt-2 whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-foreground">
                        {step.example_prompt}
                      </p>
                    </div>
                  )}

                  {step.browser_check && (
                    <div className="rounded-lg border border-brand/25 bg-brand/[0.06] px-4 py-3 dark:bg-brand/10">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/80">
                        Browser check
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-foreground">
                        {step.browser_check}
                      </p>
                    </div>
                  )}

                  {step.inline_articles.length > 0 && (
                    <div className="space-y-2 border-t border-border/60 pt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Related articles
                      </p>
                      <ul className="flex flex-col gap-2">
                        {step.inline_articles.map((a) => (
                          <li
                            key={a.article_id}
                            className="flex flex-col gap-0.5 rounded-md bg-muted/40 px-3 py-2 text-sm"
                          >
                            <Link
                              href={`/articles/${encodeURIComponent(a.article_id)}`}
                              className="font-medium text-foreground underline-offset-4 hover:underline"
                            >
                              {a.article_id}
                            </Link>
                            <span className="text-[13px] text-muted-foreground">{a.note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {step.concept && (
                    <div className="rounded-xl border border-border bg-secondary/40 px-4 py-4 dark:bg-secondary/20">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Concept
                      </p>
                      <p className="mt-2 text-base font-semibold text-foreground">
                        {step.concept.title}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                        {step.concept.body}
                      </p>
                      {step.concept.user_story_example && (
                        <dl className="mt-4 space-y-2 rounded-lg border border-border/60 bg-card/80 p-3 text-sm">
                          <div>
                            <dt className="text-[11px] font-medium uppercase text-muted-foreground">
                              As a
                            </dt>
                            <dd className="mt-0.5 text-foreground">
                              {step.concept.user_story_example.as_a}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[11px] font-medium uppercase text-muted-foreground">
                              I want to
                            </dt>
                            <dd className="mt-0.5 text-foreground">
                              {step.concept.user_story_example.i_want_to}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[11px] font-medium uppercase text-muted-foreground">
                              So that
                            </dt>
                            <dd className="mt-0.5 text-foreground">
                              {step.concept.user_story_example.so_that}
                            </dd>
                          </div>
                        </dl>
                      )}
                    </div>
                  )}
                </CardContent>
              </article>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="mx-auto w-full max-w-3xl space-y-4 rounded-xl border border-border/80 bg-card p-5 text-card-foreground shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_-4px_rgba(15,23,42,0.08)] md:p-6"
        aria-labelledby="acceptance-heading"
      >
        <div className="flex items-center gap-2">
          <Check className="size-5 text-zinc-500" strokeWidth={2} aria-hidden />
          <h2 id="acceptance-heading" className="text-lg font-semibold tracking-tight">
            Acceptance criteria
          </h2>
        </div>
        <ul className="space-y-3">
          {lesson.acceptance_criteria.map((line, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-foreground">
              <Check
                className="mt-0.5 size-4 shrink-0 text-zinc-400"
                strokeWidth={2.5}
                aria-hidden
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mx-auto w-full max-w-3xl rounded-xl border border-border/80 border-l-4 border-l-sage bg-muted/30 px-4 py-4 md:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          What&apos;s next
        </p>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-foreground md:text-[15px]">
          {lesson.completion_note}
        </p>
      </footer>
    </main>
  );
}
