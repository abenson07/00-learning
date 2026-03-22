"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

import {
  ensureLearnerProgressAction,
  loadLearnerLessonViewAction,
  regenerateLessonPlanWithLatestAction,
} from "@/app/lessons/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { LearnerLessonViewModel } from "@/lib/lesson-learner-model";
import { localLearnerProgressWithoutAuthClient } from "@/lib/local-learner-progress-client";
import { useAuthUser } from "@/lib/use-auth-user";
import { cn } from "@/lib/utils";

type Props = {
  lessonPlanVersionId: string;
  planTitle: string;
  domainName: string;
  description: string | null;
  planLearningGoal: string | null;
  planTools: string[];
};

export default function LessonPlanOverview({
  lessonPlanVersionId,
  planTitle,
  domainName,
  description,
  planLearningGoal,
  planTools,
}: Props) {
  const router = useRouter();
  const { user, ready } = useAuthUser();
  const canUseLearnerProgress =
    !!user || localLearnerProgressWithoutAuthClient;
  const [model, setModel] = useState<LearnerLessonViewModel | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingStart, setPendingStart] = useState(false);
  const [pendingRegenerate, setPendingRegenerate] = useState(false);
  const [progressLoading, setProgressLoading] = useState(true);

  const refreshModel = useCallback(async () => {
    setLoadError(null);
    setProgressLoading(true);
    try {
      const next = await loadLearnerLessonViewAction(lessonPlanVersionId);
      setModel(next);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load progress");
    } finally {
      setProgressLoading(false);
    }
  }, [lessonPlanVersionId]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    void refreshModel();
  }, [ready, refreshModel]);

  async function onStartLesson() {
    if (!canUseLearnerProgress) {
      return;
    }
    setActionError(null);
    setPendingStart(true);
    try {
      const next = await ensureLearnerProgressAction(lessonPlanVersionId);
      setModel(next);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not start lesson");
    } finally {
      setPendingStart(false);
    }
  }

  async function onRegenerateLessonPlan() {
    if (!canUseLearnerProgress) {
      return;
    }
    setActionError(null);
    setPendingRegenerate(true);
    try {
      const { newLessonPlanVersionId } =
        await regenerateLessonPlanWithLatestAction(lessonPlanVersionId);
      router.push(`/lessons/${newLessonPlanVersionId}`);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not regenerate lesson plan",
      );
    } finally {
      setPendingRegenerate(false);
    }
  }

  const allLessonsDone =
    !!model &&
    model.steps.length > 0 &&
    model.steps.every((s) => s.articleStatus === "completed");

  const completedLesson = model?.learnerStatus === "completed" || allLessonsDone;

  const stepLabel =
    !ready || (progressLoading && !model)
      ? "Loading progress…"
      : model && model.steps.length > 0
        ? completedLesson
          ? `All ${model.steps.length} lessons complete`
          : `Next up: lesson ${model.activeStepIndex + 1} of ${model.steps.length}`
        : "No lessons in this version";

  const activeStepIndex =
    !completedLesson && model && model.steps.length > 0
      ? Math.min(model.activeStepIndex, model.steps.length - 1)
      : -1;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <nav className="text-muted-foreground text-sm">
          <Link
            href="/lessons"
            className="font-medium text-primary hover:text-primary/80"
          >
            Lessons
          </Link>
          <span aria-hidden> / </span>
          <span className="text-foreground">{planTitle}</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
          {planTitle}
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {domainName}
          {description ? ` · ${description}` : ""}
        </p>

        <Card className="mt-2 border-border p-5">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Details
          </p>
          {planLearningGoal ? (
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {planLearningGoal}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No plan summary yet — open a lesson for readings and goals.
            </p>
          )}
          {(planTools.length > 0 || (model && model.aggregatedTools.length > 0)) ? (
            <p className="mt-4 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Tools: </span>
              {[...new Set([...planTools, ...(model?.aggregatedTools ?? [])])].join(
                " · ",
              )}
            </p>
          ) : null}
        </Card>

        {model?.learnerProgressId && model.canRegenerateLessonPlan ? (
          <div className="mt-3">
            <Button
              type="button"
              variant="secondary"
              disabled={!ready || pendingRegenerate || !canUseLearnerProgress}
              onClick={onRegenerateLessonPlan}
            >
              {pendingRegenerate
                ? "Regenerating…"
                : "Regenerate lesson plan with latest updates"}
            </Button>
            <p className="text-muted-foreground mt-2 max-w-xl text-xs">
              Rebuilds your plan snapshot from the newest article versions.
            </p>
          </div>
        ) : null}
      </div>

      {loadError ? (
        <p className="text-destructive text-sm">{loadError}</p>
      ) : null}
      {actionError ? (
        <p className="text-destructive text-sm">{actionError}</p>
      ) : null}

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold tracking-tight">Lessons</h2>
          <div className="text-muted-foreground text-sm">
            {model?.learnerProgressId ? (
              <span
                className={
                  completedLesson ? "font-medium text-foreground" : undefined
                }
              >
                {completedLesson ? "Completed" : "In progress"}
              </span>
            ) : (
              <span>Not started</span>
            )}
          </div>
        </div>
        <p className="text-muted-foreground text-sm">{stepLabel}</p>

        {!model?.learnerProgressId && model && model.steps.length > 0 ? (
          <Button
            type="button"
            onClick={onStartLesson}
            disabled={!ready || pendingStart || !canUseLearnerProgress}
          >
            {pendingStart ? "Starting…" : "Start lesson plan"}
          </Button>
        ) : null}

        {model && model.steps.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {model.steps.map((step, i) => {
              const isLessonDone = step.articleStatus === "completed";
              const isActive = i === activeStepIndex && !completedLesson;
              const href = `/lessons/${lessonPlanVersionId}/items/${step.lessonPlanItemId}`;
              return (
                <li key={step.lessonPlanItemId}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-start gap-3 rounded-md border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40",
                      isActive &&
                        "border-foreground/25 bg-muted/50 ring-2 ring-foreground/15",
                    )}
                  >
                    <span
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-xs font-semibold"
                      aria-hidden
                    >
                      {isLessonDone ? "✓" : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {step.sequence}. {step.lessonTitle}
                          </div>
                          {isActive ? (
                            <span className="mt-1 inline-block text-xs font-semibold tracking-wide text-primary uppercase">
                              Active
                            </span>
                          ) : null}
                        </div>
                        {isActive ? (
                          <ChevronRight
                            className="size-5 shrink-0 text-foreground"
                            aria-hidden
                          />
                        ) : null}
                      </div>
                      {step.lessonLearningGoal ? (
                        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                          {step.lessonLearningGoal}
                        </p>
                      ) : (
                        <p className="text-muted-foreground mt-2 text-sm">
                          Open this lesson for readings and materials.
                        </p>
                      )}
                      <p className="text-muted-foreground mt-2 text-xs">
                        {isLessonDone
                          ? "Lesson complete"
                          : isActive
                            ? "Continue here"
                            : "Pending"}
                        {step.readings.length > 0
                          ? ` · ${step.readings.length} reading${step.readings.length === 1 ? "" : "s"}`
                          : null}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      {model?.learnerProgressId && completedLesson ? (
        <Card className="border-dashed border-black/20 bg-muted/40 p-6 ring-1 ring-black/8">
          <p className="font-semibold tracking-tight">Lesson plan complete</p>
          <p className="text-muted-foreground mt-1 text-sm">
            You&apos;ve finished every lesson in this plan.
          </p>
          <Link
            href="/lessons"
            className="text-primary mt-3 inline-block text-sm font-medium hover:underline"
          >
            Back to all lessons
          </Link>
        </Card>
      ) : null}
    </div>
  );
}
