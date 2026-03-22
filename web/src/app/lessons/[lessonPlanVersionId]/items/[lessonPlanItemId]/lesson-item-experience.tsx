"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";

import {
  ensureLearnerProgressAction,
  getArticleReadBundleForLessonStepAction,
  loadLearnerLessonViewAction,
  markReadingCompletedAction,
  revertReadingCompletedAction,
  type ArticleReadBundle,
} from "@/app/lessons/actions";
import ArticleReader from "@/components/article-reader";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  buildPrerequisiteBannerText,
  canRevertReadingCompletion,
  findFirstIncompleteReadingGlobal,
  getNextReadingDestination,
  isViewingAheadOfCanonical,
  type LearnerLessonViewModel,
  type LessonPlanLessonMeta,
} from "@/lib/lesson-learner-model";
import { localLearnerProgressWithoutAuthClient } from "@/lib/local-learner-progress-client";
import { useAuthUser } from "@/lib/use-auth-user";
import { cn } from "@/lib/utils";

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

type Props = {
  lessonPlanVersionId: string;
  lessonPlanItemId: string;
  planTitle: string;
  domainName: string;
  description: string | null;
  planLearningGoal: string | null;
  planTools: string[];
  serverLesson: LessonPlanLessonMeta;
};

export default function LessonItemExperience({
  lessonPlanVersionId,
  lessonPlanItemId,
  planTitle,
  domainName,
  description,
  planLearningGoal,
  planTools,
  serverLesson,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const readingParam = searchParams.get("reading");
  const { user, ready } = useAuthUser();
  const canUseLearnerProgress =
    !!user || localLearnerProgressWithoutAuthClient;
  const [model, setModel] = useState<LearnerLessonViewModel | null>(null);
  const [articleBundle, setArticleBundle] = useState<ArticleReadBundle | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingStart, setPendingStart] = useState(false);
  const [pendingComplete, setPendingComplete] = useState(false);
  const [pendingRevert, setPendingRevert] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  const refreshModel = useCallback(async () => {
    setLoadError(null);
    try {
      const next = await loadLearnerLessonViewAction(lessonPlanVersionId);
      setModel(next);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load progress");
    }
  }, [lessonPlanVersionId]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    void refreshModel();
  }, [ready, refreshModel]);

  const stepIndex = useMemo(() => {
    if (!model?.steps.length) {
      return -1;
    }
    return model.steps.findIndex((s) => s.lessonPlanItemId === lessonPlanItemId);
  }, [model?.steps, lessonPlanItemId]);

  const selectedLesson =
    stepIndex >= 0 && model ? model.steps[stepIndex]! : null;

  const readingIndex = useMemo(() => {
    if (!selectedLesson?.readings.length) {
      return 0;
    }
    if (readingParam) {
      const idx = selectedLesson.readings.findIndex(
        (r) => r.lessonReadingId === readingParam,
      );
      if (idx >= 0) {
        return idx;
      }
    }
    const inc = selectedLesson.readings.findIndex(
      (r) => r.articleStatus !== "completed",
    );
    return inc >= 0 ? inc : 0;
  }, [selectedLesson, readingParam]);

  const selectedReading = selectedLesson?.readings[readingIndex] ?? null;

  useEffect(() => {
    if (!selectedReading) {
      setArticleBundle(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const bundle = await getArticleReadBundleForLessonStepAction({
          contentItemId: selectedReading.contentItemId,
          articleStatus: selectedReading.articleStatus,
          completedContentVersionId: selectedReading.completedContentVersionId,
          effectiveContentVersionId: selectedReading.effectiveContentVersionId,
          contentItemCurrentVersionId: selectedReading.contentItemCurrentVersionId,
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
  }, [selectedReading]);

  const showAheadBanner =
    !!model &&
    model.steps.length > 0 &&
    stepIndex >= 0 &&
    isViewingAheadOfCanonical(model.steps, stepIndex, readingIndex);

  const nextIncomplete = model ? findFirstIncompleteReadingGlobal(model.steps) : null;
  const bannerText =
    showAheadBanner && nextIncomplete
      ? buildPrerequisiteBannerText(model!.steps, nextIncomplete)
      : null;

  useEffect(() => {
    if (!bannerText || !bannerRef.current) {
      return;
    }
    gsap.fromTo(
      bannerRef.current,
      { opacity: 0, y: -8 },
      { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
    );
  }, [bannerText, lessonPlanItemId, readingIndex]);

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

  async function onMarkReadingComplete() {
    if (!selectedLesson || !selectedReading || !model?.learnerProgressId) {
      return;
    }
    if (!canUseLearnerProgress) {
      return;
    }
    setActionError(null);
    setPendingComplete(true);
    try {
      const next = await markReadingCompletedAction(
        lessonPlanVersionId,
        selectedLesson.lessonPlanItemId,
        selectedReading.lessonReadingId,
      );
      setModel(next);
      router.replace(
        `${lessonBase}?reading=${selectedReading.lessonReadingId}`,
        { scroll: false },
      );
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not update progress",
      );
    } finally {
      setPendingComplete(false);
    }
  }

  async function onRevertReadingComplete() {
    if (!selectedLesson || !selectedReading || !model?.learnerProgressId) {
      return;
    }
    if (!canUseLearnerProgress) {
      return;
    }
    setActionError(null);
    setPendingRevert(true);
    try {
      const next = await revertReadingCompletedAction(
        lessonPlanVersionId,
        selectedLesson.lessonPlanItemId,
        selectedReading.lessonReadingId,
      );
      setModel(next);
      router.replace(
        `${lessonBase}?reading=${selectedReading.lessonReadingId}`,
        { scroll: false },
      );
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not update progress",
      );
    } finally {
      setPendingRevert(false);
    }
  }

  const relatedArticlesInLesson =
    model && selectedReading
      ? model.steps
          .flatMap((s) => s.readings)
          .filter((r) => r.contentItemId !== selectedReading.contentItemId)
          .map((r) => ({ id: r.contentItemId, title: r.contentTitle }))
          .filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i)
      : [];

  const canMarkThisReading =
    canUseLearnerProgress &&
    !!model?.learnerProgressId &&
    !!selectedReading?.readingProgressId &&
    selectedReading.articleStatus !== "completed" &&
    !showAheadBanner &&
    !pendingComplete;

  const markReadingButtonDisabled = !canMarkThisReading;

  const nextAfterThisReading = useMemo(() => {
    if (
      !model?.steps.length ||
      !selectedReading ||
      selectedReading.articleStatus !== "completed"
    ) {
      return null;
    }
    return getNextReadingDestination(
      lessonPlanVersionId,
      model.steps,
      lessonPlanItemId,
      selectedReading.lessonReadingId,
    );
  }, [
    lessonPlanItemId,
    lessonPlanVersionId,
    model?.steps,
    selectedReading,
  ]);

  const canRedoThisReading =
    !!model?.steps.length &&
    !!selectedReading &&
    selectedReading.articleStatus === "completed" &&
    canRevertReadingCompletion(
      model.steps,
      lessonPlanItemId,
      selectedReading.lessonReadingId,
    );

  const progressRowMissing =
    !!model?.learnerProgressId &&
    !!selectedReading &&
    selectedReading.readingProgressId == null;

  const displayTitle = selectedLesson?.lessonTitle ?? serverLesson.lessonTitle;
  const displayGoal =
    selectedLesson?.lessonLearningGoal ?? serverLesson.lessonLearningGoal;
  const displayTools =
    selectedLesson?.lessonTools?.length
      ? selectedLesson.lessonTools
      : serverLesson.lessonTools;

  const planPath = `/lessons/${lessonPlanVersionId}`;
  const lessonBase = `/lessons/${lessonPlanVersionId}/items/${lessonPlanItemId}`;

  const unknownStep = model && stepIndex < 0;

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-muted-foreground text-sm">
        <Link href="/lessons" className="font-medium text-primary hover:text-primary/80">
          Lessons
        </Link>
        <span aria-hidden> / </span>
        <Link href={planPath} className="font-medium text-primary hover:text-primary/80">
          {planTitle}
        </Link>
        <span aria-hidden> / </span>
        <span className="text-foreground">{displayTitle}</span>
      </nav>

      {loadError ? (
        <p className="text-destructive text-sm">{loadError}</p>
      ) : null}
      {actionError ? (
        <p className="text-destructive text-sm">{actionError}</p>
      ) : null}
      {unknownStep ? (
        <p className="text-destructive text-sm">
          This lesson is not part of the loaded plan.{" "}
          <Link href={planPath} className="underline">
            Back to plan
          </Link>
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(10rem,13rem)_minmax(0,1fr)_minmax(10rem,15rem)] xl:grid-cols-[minmax(11rem,14rem)_minmax(0,1fr)_minmax(11rem,16rem)]">
        <aside className="order-2 flex flex-col gap-2 lg:order-1">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Lessons
          </p>
          <nav className="flex flex-col gap-1 rounded-md border border-border bg-card p-2">
            {!model?.steps.length ? (
              <p className="text-muted-foreground p-2 text-sm">Loading…</p>
            ) : (
              model.steps.map((step) => {
                const href = `/lessons/${lessonPlanVersionId}/items/${step.lessonPlanItemId}`;
                const here = step.lessonPlanItemId === lessonPlanItemId;
                const done = step.articleStatus === "completed";
                return (
                  <Link
                    key={step.lessonPlanItemId}
                    href={href}
                    className={cn(
                      "rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/70",
                      here && "bg-foreground font-semibold text-background",
                      !here && done && "text-muted-foreground line-through decoration-foreground/30",
                    )}
                  >
                    <span className="text-muted-foreground mr-1.5 tabular-nums">
                      {step.sequence}.
                    </span>
                    {step.lessonTitle}
                  </Link>
                );
              })
            )}
          </nav>
        </aside>

        <div className="order-1 min-w-0 space-y-4 lg:order-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {displayTitle}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {domainName}
                {description ? ` · ${description}` : ""}
              </p>
              {planLearningGoal ? (
                <p className="text-muted-foreground mt-2 max-w-2xl text-xs leading-relaxed">
                  <span className="font-medium text-foreground">Plan goal: </span>
                  {planLearningGoal}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              {!model?.learnerProgressId ? (
                <>
                  <p className="text-muted-foreground max-w-xs text-right text-xs">
                    Start the plan to record progress.
                  </p>
                  {!canUseLearnerProgress ? (
                    <Link
                      href={`/login?next=${encodeURIComponent(lessonBase)}`}
                      className={cn(
                        buttonVariants({ variant: "secondary", size: "default" }),
                      )}
                    >
                      Sign in
                    </Link>
                  ) : (
                    <Button
                      type="button"
                      onClick={onStartLesson}
                      disabled={!ready || pendingStart}
                    >
                      {pendingStart ? "Starting…" : "Start lesson plan"}
                    </Button>
                  )}
                </>
              ) : progressRowMissing ? (
                <p className="text-destructive max-w-xs text-right text-xs">
                  Progress out of sync for this reading.
                </p>
              ) : selectedReading?.articleStatus === "completed" &&
                nextAfterThisReading ? (
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <Link
                    href={nextAfterThisReading.href}
                    className={cn(
                      buttonVariants({ variant: "default", size: "default" }),
                      "text-center",
                    )}
                  >
                    {nextAfterThisReading.label}
                  </Link>
                  {canRedoThisReading ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pendingRevert || pendingComplete}
                      onClick={onRevertReadingComplete}
                    >
                      {pendingRevert ? "Updating…" : "Redo lesson"}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={onMarkReadingComplete}
                  disabled={markReadingButtonDisabled}
                >
                  {pendingComplete ? "Saving…" : "Mark as done"}
                </Button>
              )}
            </div>
          </div>

          {bannerText ? (
            <div
              ref={bannerRef}
              role="status"
              className="rounded-md border border-black/12 bg-muted px-4 py-3 text-sm text-foreground"
            >
              <p className="font-medium">Out of order</p>
              <p className="mt-1 text-xs opacity-90">{bannerText}</p>
            </div>
          ) : null}

          <Card className="border-border p-5 sm:p-6">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Lesson information
            </p>
            {articleBundle ? (
              <>
                <div className="mt-3 mb-4 flex flex-col gap-1">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {articleBundle.snapshot.title}
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    Snapshot v{articleBundle.snapshot.version.versionNumber}
                    {articleBundle.snapshot.version.isLatest ? " · latest" : ""}
                  </p>
                </div>
                {articleBundle.addendumMarkdown ? (
                  <div
                    className="mb-6 rounded-md border border-black/10 bg-muted px-4 py-3 text-foreground ring-1 ring-black/5"
                    role="region"
                    aria-label="Addendum"
                  >
                    <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
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
            ) : selectedReading ? (
              <p className="text-muted-foreground mt-4 text-sm">
                Loading article…
              </p>
            ) : (
              <p className="text-muted-foreground mt-4 text-sm">
                No readings for this lesson.
              </p>
            )}
          </Card>

          <Card className="border-border p-5">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              What success looks like
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Outcome for the lesson
            </p>
            {displayGoal ? (
              <p className="mt-3 text-sm leading-relaxed text-foreground">
                {displayGoal}
              </p>
            ) : (
              <p className="text-muted-foreground mt-3 text-sm">
                No outcome text for this lesson yet.
              </p>
            )}
          </Card>

          <div className="flex flex-col gap-2">
            {!model?.learnerProgressId ? (
              <p className="text-muted-foreground max-w-md text-sm">
                Start this lesson plan once to record progress. Then you can mark
                each reading complete in order.
              </p>
            ) : progressRowMissing ? (
              <p className="text-destructive max-w-md text-sm">
                This reading has no progress row (data out of sync). Try
                refreshing the page. If it persists, restart the plan from the{" "}
                <Link href={planPath} className="underline">
                  plan page
                </Link>
                .
              </p>
            ) : (
              <>
                {!canUseLearnerProgress ? (
                  <p className="text-muted-foreground text-sm">
                    <Link
                      href={`/login?next=${encodeURIComponent(lessonBase)}`}
                      className="font-medium text-primary hover:underline"
                    >
                      Sign in
                    </Link>{" "}
                    to save progress.
                  </p>
                ) : null}
                {canUseLearnerProgress && showAheadBanner ? (
                  <p className="text-muted-foreground max-w-md text-xs">
                    Complete the reading shown in the banner first; then Mark as
                    done unlocks.
                  </p>
                ) : null}
                {canUseLearnerProgress &&
                model.learnerProgressId &&
                !showAheadBanner &&
                selectedReading &&
                selectedReading.articleStatus !== "completed" ? (
                  <p className="text-muted-foreground max-w-md text-xs">
                    Readings unlock in order for credit. You can open any lesson
                    from the list; complete them in sequence when you are ready.
                  </p>
                ) : null}
                {canUseLearnerProgress &&
                selectedReading?.articleStatus === "completed" &&
                canRedoThisReading ? (
                  <p className="text-muted-foreground max-w-md text-xs">
                    Redo lesson clears this reading so you can mark it done
                    again. You can only redo the latest completed step in the
                    plan.
                  </p>
                ) : null}
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
            <Card className="border-dashed bg-muted/20 p-4">
              <p className="text-sm font-medium">Quiz</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Coming soon.
              </p>
            </Card>
            <Card className="border-dashed bg-muted/20 p-4">
              <p className="text-sm font-medium">Homework</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Coming soon.
              </p>
            </Card>
          </div>
        </div>

        <aside className="order-3 flex flex-col gap-4">
          <Card className="p-4">
            <h2 className="text-sm font-semibold">Articles to read</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              In this lesson
            </p>
            <ul className="mt-3 flex flex-col gap-1">
              {(selectedLesson && selectedLesson.readings.length > 0
                ? selectedLesson.readings
                : serverLesson.readings
              ).map((rd) => {
                const progressRow = selectedLesson?.readings.find(
                  (r) => r.lessonReadingId === rd.lessonReadingId,
                );
                const done = progressRow?.articleStatus === "completed";
                const sel =
                  selectedReading?.lessonReadingId === rd.lessonReadingId;
                return (
                  <li key={rd.lessonReadingId}>
                    <Link
                      href={`${lessonBase}?reading=${rd.lessonReadingId}`}
                      scroll={false}
                      className={cn(
                        "block rounded-md px-2 py-1.5 text-sm hover:bg-muted/70",
                        sel && "bg-muted font-medium",
                      )}
                    >
                      <span className="text-muted-foreground mr-1 tabular-nums">
                        {rd.readingSequence}.
                      </span>
                      {rd.contentTitle}
                      {done ? (
                        <span className="text-muted-foreground ml-1 text-xs">
                          ✓
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold">Tools used</h2>
            <p className="text-muted-foreground mt-2 text-xs">
              {displayTools.length > 0 || planTools.length > 0
                ? [...new Set([...displayTools, ...planTools])].join(" · ")
                : "None listed for this lesson."}
            </p>
          </Card>

          <Card className="border-dashed p-4">
            <h2 className="text-sm font-semibold">Videos to watch</h2>
            <p className="text-muted-foreground mt-2 text-xs">
              Coming soon — linked videos will appear here.
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold">Related topics</h2>
            {articleBundle?.snapshot.topicName ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Topic:{" "}
                <span className="text-foreground">{articleBundle.snapshot.topicName}</span>
              </p>
            ) : (
              <p className="text-muted-foreground mt-2 text-xs">
                Open an article to see taxonomy context.
              </p>
            )}
            {articleBundle && articleBundle.related.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-2">
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
            ) : null}
          </Card>

          <div className="hidden flex-col gap-4 lg:flex">
            <Card className="border-dashed bg-muted/20 p-4">
              <p className="text-sm font-medium">Quiz</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Coming soon — lesson quizzes will live here.
              </p>
            </Card>
            <Card className="border-dashed bg-muted/20 p-4">
              <p className="text-sm font-medium">Homework</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Coming soon — exercises tied to this lesson.
              </p>
            </Card>
          </div>
        </aside>
      </div>

      <p className="text-muted-foreground text-center text-xs">
        <Link
          href={planPath}
          className="font-medium text-primary hover:text-primary/80"
        >
          ← Back to lesson plan
        </Link>
      </p>
    </div>
  );
}
