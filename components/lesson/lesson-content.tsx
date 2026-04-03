import Link from "next/link";
import { BookMarked, Clock, ListChecks } from "lucide-react";

import { ArticleCard } from "@/components/home/article-card";
import { AcceptanceCriteriaList } from "@/components/lesson/acceptance-criteria-list";
import {
  CopyableCommandBlock,
  ExamplePromptCopyLink,
  PlanReferencePills,
  StepMarkCompleteButton,
} from "@/components/lesson/plan-step-client";
import { Badge } from "@/components/ui/badge";
import { completedStepKey } from "@/lib/curriculum/lesson-step-local";
import type { CurriculumLesson, LessonPlanMeta } from "@/lib/curriculum/lesson-plan-data";

type LessonContentProps = {
  plan: LessonPlanMeta;
  lesson: CurriculumLesson;
  /** Signed-in users: keys from Supabase (`lessonId:stepNumber`). */
  completedStepKeys?: string[];
  useServerStepProgress?: boolean;
};

export function LessonContent({
  plan,
  lesson,
  completedStepKeys = [],
  useServerStepProgress = false,
}: LessonContentProps) {
  const completed = new Set(completedStepKeys);
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lesson.foundational_reading.map((item) => (
              <ArticleCard
                key={item.article_id}
                title={item.title}
                meta={item.reason}
                badge={item.article_id}
                href={`/articles/${encodeURIComponent(item.article_id)}`}
              />
            ))}
          </div>
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
          {lesson.steps.map((step) => {
            return (
              <li
                key={`${lesson.id}-step-${step.number}`}
                id={`step-${step.number}`}
                className="scroll-mt-28"
              >
                <article className="relative rounded-xl border border-border/70 bg-muted/20 px-6 py-7 text-card-foreground md:px-8 md:py-8">
                  <header className="space-y-1">
                    <p className="text-[13px] text-muted-foreground">Step {step.number}</p>
                    <h3 className="text-balance text-xl font-bold tracking-tight text-foreground md:text-2xl">
                      {step.title}
                    </h3>
                    <p className="text-pretty text-sm text-muted-foreground">{step.type_label}</p>
                  </header>

                  <div className="mt-6 space-y-8">
                    <div className="space-y-3 text-[15px] leading-relaxed text-foreground">
                      {step.content.split(/\n\n+/).map((para, i) => (
                        <p key={i} className="text-pretty">
                          {para}
                        </p>
                      ))}
                    </div>

                    {step.inline_articles.length > 0 ? (
                      <PlanReferencePills articles={step.inline_articles} />
                    ) : null}

                    {step.commands.length > 0 ? (
                      <CopyableCommandBlock
                        commandText={step.commands.join("\n")}
                        exampleOutput={step.command_example_output ?? null}
                      />
                    ) : null}

                    {step.prompt_guidance ? (
                      <div>
                        <p className="text-[13px] text-muted-foreground">Prompt guidance</p>
                        <p className="mt-2 text-pretty text-[15px] leading-relaxed text-foreground">
                          {step.prompt_guidance}
                        </p>
                        {step.example_prompt ? (
                          <ExamplePromptCopyLink promptText={step.example_prompt} />
                        ) : null}
                      </div>
                    ) : null}

                    {!step.prompt_guidance && step.example_prompt ? (
                      <div>
                        <p className="text-[13px] text-muted-foreground">Example prompt</p>
                        <ExamplePromptCopyLink promptText={step.example_prompt} />
                      </div>
                    ) : null}

                    {step.browser_check ? (
                      <div>
                        <p className="text-[13px] text-muted-foreground">Browser check</p>
                        <p className="mt-2 text-pretty text-[15px] leading-relaxed text-foreground">
                          {step.browser_check}
                        </p>
                      </div>
                    ) : null}

                    {step.concept ? (
                      <div className="rounded-xl border border-border/80 bg-background/60 px-4 py-4 md:px-5 md:py-5">
                        <p className="text-[13px] text-muted-foreground">Concept</p>
                        <p className="mt-2 text-base font-semibold text-foreground">
                          {step.concept.title}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                          {step.concept.body}
                        </p>
                        {step.concept.user_story_example ? (
                          <dl className="mt-4 space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
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
                        ) : null}
                      </div>
                    ) : null}

                    <StepMarkCompleteButton
                      planId={plan.id}
                      lessonId={lesson.id}
                      stepNumber={step.number}
                      useServerProgress={useServerStepProgress}
                      initialComplete={completed.has(
                        completedStepKey(lesson.id, step.number),
                      )}
                    />
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </section>

      <section
        className="mx-auto w-full max-w-3xl space-y-4 rounded-xl border border-border/70 bg-muted/20 px-6 py-7 text-card-foreground md:px-8 md:py-8"
        aria-labelledby="acceptance-heading"
      >
        <h2
          id="acceptance-heading"
          className="text-[13px] font-normal text-muted-foreground"
        >
          Acceptance criteria
        </h2>
        <p className="text-[15px] font-medium text-foreground">Here&apos;s how you test it:</p>
        <AcceptanceCriteriaList lessonId={lesson.id} items={lesson.acceptance_criteria} />
        <p className="text-pretty text-sm leading-relaxed text-foreground">
          If any of this doesn&apos;t work, prompt Cursor to fix it.
        </p>
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
