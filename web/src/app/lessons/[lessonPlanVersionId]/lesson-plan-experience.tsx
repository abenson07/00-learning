"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  ensureLearnerProgressAction,
  getArticleReadBundleAction,
  loadLearnerLessonViewAction,
  markArticleCompletedAction,
  type ArticleReadBundle,
} from "@/app/lessons/actions";
import ArticleReader from "@/components/article-reader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMockUserFromStorage } from "@/lib/use-mock-user-from-storage";
import type { LearnerLessonViewModel } from "@/lib/lesson-data";

type Props = {
  lessonPlanVersionId: string;
  planTitle: string;
  domainName: string;
  description: string | null;
};

export default function LessonPlanExperience({
  lessonPlanVersionId,
  planTitle,
  domainName,
  description,
}: Props) {
  const { user, ready } = useMockUserFromStorage();
  const [model, setModel] = useState<LearnerLessonViewModel | null>(null);
  const [articleBundle, setArticleBundle] = useState<ArticleReadBundle | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingStart, setPendingStart] = useState(false);
  const [pendingComplete, setPendingComplete] = useState(false);
  const [progressLoading, setProgressLoading] = useState(true);

  const refreshModel = useCallback(async () => {
    const uid = user.id.trim();
    if (!uid) {
      setProgressLoading(false);
      setModel(null);
      return;
    }
    setLoadError(null);
    setProgressLoading(true);
    try {
      const next = await loadLearnerLessonViewAction(uid, lessonPlanVersionId);
      setModel(next);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load progress");
    } finally {
      setProgressLoading(false);
    }
  }, [lessonPlanVersionId, user.id]);

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
        const bundle = await getArticleReadBundleAction(
          activeStep.contentItemId,
          activeStep.effectiveContentVersionId,
        );
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
    const uid = user.id.trim();
    if (!uid) {
      return;
    }
    setActionError(null);
    setPendingStart(true);
    try {
      const next = await ensureLearnerProgressAction(uid, lessonPlanVersionId);
      setModel(next);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not start lesson");
    } finally {
      setPendingStart(false);
    }
  }

  async function onMarkComplete() {
    if (!activeStep || !model?.learnerProgressId) {
      return;
    }
    const uid = user.id.trim();
    if (!uid) {
      return;
    }
    setActionError(null);
    setPendingComplete(true);
    try {
      const next = await markArticleCompletedAction(
        uid,
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
            disabled={!ready || pendingStart || !user.id.trim()}
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
                <ArticleReader
                  contentItemId={articleBundle.snapshot.contentItemId}
                  contentVersionId={articleBundle.snapshot.version.id}
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

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={onMarkComplete}
              disabled={
                pendingComplete ||
                !user.id.trim() ||
                activeStep.articleStatus === "completed"
              }
            >
              {pendingComplete ? "Saving…" : "Mark article completed"}
            </Button>
            <p className="text-muted-foreground max-w-md text-xs">
              Quiz rules plug in during learn-005; this stub only tracks article
              completion.
            </p>
          </div>

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
            You&apos;ve finished every article in this plan. Quizzes will refine
            completion in a later phase.
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
