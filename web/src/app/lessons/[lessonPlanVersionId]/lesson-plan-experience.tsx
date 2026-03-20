"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  ensureLearnerProgressAction,
  getArticleReadBundleForLessonStepAction,
  loadLearnerLessonViewAction,
  markArticleCompletedAction,
  regenerateLessonPlanWithLatestAction,
  type ArticleReadBundle,
} from "@/app/lessons/actions";
import LessonQuizPanel from "@/app/lessons/lesson-quiz-panel";
import ArticleReader from "@/components/article-reader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuthUser } from "@/lib/use-auth-user";
import type { LearnerLessonViewModel } from "@/lib/lesson-data";

type Props = {
  lessonPlanVersionId: string;
  planTitle: string;
  domainName: string;
  description: string | null;
};

function renderAddendumMarkdown(text: string) {
  return text.split("\n").map((line, lineIdx) => (
    <p key={lineIdx} className="mb-2 last:mb-0">
      {line.split(/(\*\*.+?\*\*)/g).map((seg, i) => {
        const m = /^\*\*(.+?)\*\*$/.exec(seg);
        if (m) {
          return <strong key={i}>{m[1]}</strong>;
        }
        return seg;
      })}
    </p>
  ));
}

export default function LessonPlanExperience({
  lessonPlanVersionId,
  planTitle,
  domainName,
  description,
}: Props) {
  const router = useRouter();
  const { user, ready } = useAuthUser();
  const [model, setModel] = useState<LearnerLessonViewModel | null>(null);
  const [articleBundle, setArticleBundle] = useState<ArticleReadBundle | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingStart, setPendingStart] = useState(false);
  const [pendingComplete, setPendingComplete] = useState(false);
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

  const activeStep =
    model && model.activeStepIndex < model.steps.length
      ? model.steps[model.activeStepIndex]
      : null;

  useEffect(() => {
    if (!activeStep) {
      setArticleBundle(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const bundle = await getArticleReadBundleForLessonStepAction({
          contentItemId: activeStep.contentItemId,
          articleStatus: activeStep.articleStatus,
          completedContentVersionId: activeStep.completedContentVersionId,
          effectiveContentVersionId: activeStep.effectiveContentVersionId,
          contentItemCurrentVersionId: activeStep.contentItemCurrentVersionId,
        });
        if (!cancelled) {
          setArticleBundle(bundle);
        }
      } catch {
        if (!cancelled) {
          setArticleBundle(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeStep]);

  async function onStartLesson() {
    if (!user) {
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
    if (!user) {
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

  async function onMarkComplete() {
    if (!activeStep || !model?.learnerProgressId) {
      return;
    }
    if (!user) {
      return;
    }
    setActionError(null);
    setPendingComplete(true);
    try {
      const next = await markArticleCompletedAction(
        lessonPlanVersionId,
        activeStep.lessonPlanItemId,
      );
      setModel(next);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not update progress",
      );
    } finally {
      setPendingComplete(false);
    }
  }

  const allArticlesDone =
    !!model &&
    model.steps.length > 0 &&
    model.steps.every((s) => s.articleStatus === "completed");

  const completedLesson = model?.learnerStatus === "completed" || allArticlesDone;

  const stepLabel =
    !ready || (progressLoading && !model)
      ? "Loading progress…"
      : model && model.steps.length > 0
        ? completedLesson
          ? `All ${model.steps.length} steps complete`
          : `Step ${model.activeStepIndex + 1} of ${model.steps.length}`
        : "No steps in this version";

  const relatedArticlesInLesson =
    model && activeStep
      ? model.steps
          .filter((s) => s.contentItemId !== activeStep.contentItemId)
          .map((s) => ({ id: s.contentItemId, title: s.contentTitle }))
      : [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <nav className="text-muted-foreground text-sm">
          <Link href="/lessons" className="hover:text-foreground">
            Lessons
          </Link>
          <span aria-hidden> / </span>
          <span className="text-foreground">{planTitle}</span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {planTitle}
        </h1>
        <p className="text-muted-foreground text-sm">
          {domainName}
          {description ? ` · ${description}` : ""}
        </p>
        {model?.learnerProgressId && model.canRegenerateLessonPlan ? (
          <div className="mt-3">
            <Button
              type="button"
              variant="secondary"
              disabled={!ready || pendingRegenerate || !user}
              onClick={onRegenerateLessonPlan}
            >
              {pendingRegenerate
                ? "Regenerating…"
                : "Regenerate lesson plan with latest updates"}
            </Button>
            <p className="text-muted-foreground mt-2 max-w-xl text-xs">
              Rebuilds your plan snapshot from the newest article versions. Steps
              whose content changed reset to pending so you can retake quizzes.
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

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-medium">Your progress</h2>
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
            disabled={!ready || pendingStart || !user}
          >
            {pendingStart ? "Starting…" : "Start lesson"}
          </Button>
        ) : null}

        {model && model.steps.length > 0 ? (
          <ol className="flex flex-col gap-2">
            {model.steps.map((step, i) => {
              const isActive = i === model.activeStepIndex && !completedLesson;
              const isDone = step.articleStatus === "completed";
              return (
                <li
                  key={step.lessonPlanItemId}
                  className="flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2"
                >
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium"
                    aria-hidden
                  >
                    {isDone ? "✓" : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className={
                        isActive
                          ? "text-sm font-medium text-foreground"
                          : "text-sm text-foreground"
                      }
                    >
                      {step.sequence}. {step.contentTitle}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {isDone
                        ? "Completed"
                        : isActive
                          ? "In progress"
                          : "Pending"}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : null}
      </section>

      {model?.learnerProgressId && activeStep ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Current article</h2>
          <Card className="p-4 sm:p-6">
            {articleBundle ? (
              <>
                <div className="mb-4 flex flex-col gap-1">
                  <h3 className="text-lg font-medium">
                    {articleBundle.snapshot.title}
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    Lesson snapshot v
                    {articleBundle.snapshot.version.versionNumber}
                    {articleBundle.snapshot.version.isLatest
                      ? " · matches latest"
                      : ""}
                  </p>
                </div>
                {articleBundle.addendumMarkdown ? (
                  <div
                    className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-950 dark:border-amber-400/35 dark:bg-amber-400/10 dark:text-amber-50"
                    role="region"
                    aria-label="Addendum"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80 dark:text-amber-100/90">
                      Addendum
                    </p>
                    <div className="mt-2 text-sm">
                      {renderAddendumMarkdown(articleBundle.addendumMarkdown)}
                    </div>
                  </div>
                ) : null}
                <ArticleReader
                  contentItemId={articleBundle.snapshot.contentItemId}
                  contentVersionId={articleBundle.snapshot.version.id}
                  articleTitle={articleBundle.snapshot.title}
                  canonicalPlainText={articleBundle.snapshot.plainText}
                  contentRichJson={articleBundle.snapshot.contentRichJson}
                  topicName={articleBundle.snapshot.topicName}
                  relatedArticles={relatedArticlesInLesson}
                />
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Loading article…</p>
            )}
          </Card>

          {activeStep.requiresQuiz ? (
            <LessonQuizPanel
              lessonPlanVersionId={lessonPlanVersionId}
              lessonPlanItemId={activeStep.lessonPlanItemId}
              requiresQuiz={activeStep.requiresQuiz}
              articleCompleted={activeStep.articleStatus === "completed"}
              onLessonModelUpdated={setModel}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={onMarkComplete}
                disabled={
                  pendingComplete ||
                  !user ||
                  activeStep.articleStatus === "completed"
                }
              >
                {pendingComplete ? "Saving…" : "Mark article completed"}
              </Button>
              <p className="text-muted-foreground max-w-md text-xs">
                This step has no quiz; mark it complete when you are done reading.
              </p>
            </div>
          )}

          {articleBundle && articleBundle.related.length > 0 ? (
            <div className="flex flex-col gap-3 border-t border-border pt-6">
              <h3 className="text-base font-medium">Related articles</h3>
              <ul className="flex flex-col gap-2">
                {articleBundle.related.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/articles/${item.id}`}
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {model?.learnerProgressId && completedLesson ? (
        <Card className="border-dashed bg-muted/30 p-6">
          <p className="font-medium">Lesson complete</p>
          <p className="text-muted-foreground mt-1 text-sm">
            You&apos;ve passed the quizzes (or marked steps) for every item in
            this plan.
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
