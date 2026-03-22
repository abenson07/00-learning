"use client";

import { useCallback, useEffect, useState } from "react";

import {
  loadQuizSessionAction,
  startQuizAttemptAction,
  submitQuizAttemptAction,
} from "@/app/lessons/actions";
import { Button } from "@/components/ui/button";
import type { LearnerLessonViewModel, QuizQuestionPublic } from "@/lib/lesson-data";

type QuizSession = {
  questions: QuizQuestionPublic[];
  inProgressAttemptId: string | null;
  lastSubmitted: {
    status: string;
    score: number;
    maxScore: number;
    submittedAt: string;
  } | null;
};

type Props = {
  lessonPlanVersionId: string;
  lessonPlanItemId: string;
  requiresQuiz: boolean;
  articleCompleted: boolean;
  onLessonModelUpdated: (next: LearnerLessonViewModel) => void;
};

export default function LessonQuizPanel({
  lessonPlanVersionId,
  lessonPlanItemId,
  requiresQuiz,
  articleCompleted,
  onLessonModelUpdated,
}: Props) {
  const [open, setOpen] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pendingStart, setPendingStart] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    if (!requiresQuiz || articleCompleted) {
      setSession(null);
      return;
    }
    setLoadError(null);
    setLoading(true);
    try {
      const next = await loadQuizSessionAction(
        lessonPlanVersionId,
        lessonPlanItemId,
      );
      setSession(next);
      setAttemptId(next.inProgressAttemptId);
      setAnswers({});
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load quiz");
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [lessonPlanVersionId, lessonPlanItemId, requiresQuiz, articleCompleted]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  async function onStartQuiz() {
    setActionError(null);
    setPendingStart(true);
    try {
      const { attemptId: id } = await startQuizAttemptAction(
        lessonPlanVersionId,
        lessonPlanItemId,
      );
      setAttemptId(id);
      setAnswers({});
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not start quiz");
    } finally {
      setPendingStart(false);
    }
  }

  async function onSubmit() {
    if (!attemptId || !session) {
      return;
    }
    const missing = session.questions.some((q) => !answers[q.id]?.trim());
    if (missing) {
      setActionError("Answer every question before submitting.");
      return;
    }
    setActionError(null);
    setPendingSubmit(true);
    try {
      const next = await submitQuizAttemptAction(
        lessonPlanVersionId,
        lessonPlanItemId,
        attemptId,
        answers,
      );
      onLessonModelUpdated(next);
      setAttemptId(null);
      setAnswers({});
      // After a pass, the server advances the active step; this component still
      // has the previous `lessonPlanItemId` until the parent re-renders. Calling
      // loadQuizSessionAction here would assert that id is the active step and
      // throw "Finish the current step first." On failure, the active step is
      // unchanged — refresh so last-attempt state loads.
      const thisStepDone =
        next.steps.find((s) => s.lessonPlanItemId === lessonPlanItemId)
          ?.articleStatus === "completed";
      if (!thisStepDone) {
        await refreshSession();
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setPendingSubmit(false);
    }
  }

  if (!requiresQuiz) {
    return null;
  }

  if (articleCompleted) {
    return (
      <details
        className="rounded-md border border-border bg-card"
        open={open}
        onToggle={(e) => setOpen(e.currentTarget.open)}
      >
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
          Quiz — completed
        </summary>
        <div className="border-t border-border px-4 py-3 text-muted-foreground text-sm">
          You passed the quiz for this step.
        </div>
      </details>
    );
  }

  return (
    <details
      className="rounded-md border border-border bg-card"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
        Step quiz
      </summary>
      <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
        {loadError ? (
          <p className="text-destructive text-sm">{loadError}</p>
        ) : null}
        {actionError ? (
          <p className="text-destructive text-sm">{actionError}</p>
        ) : null}

        {loading || !session ? (
          <p className="text-muted-foreground text-sm">Loading quiz…</p>
        ) : session.questions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No quiz questions are configured for this step.
          </p>
        ) : (
          <>
            {session.lastSubmitted && !attemptId ? (
              <p className="text-muted-foreground text-sm">
                Last attempt: {session.lastSubmitted.score}/
                {session.lastSubmitted.maxScore} points (
                {session.lastSubmitted.status === "passed"
                  ? "passed"
                  : "not passed"}
                ). You can try again.
              </p>
            ) : null}

            {!attemptId ? (
              <Button
                type="button"
                onClick={onStartQuiz}
                disabled={pendingStart}
              >
                {pendingStart ? "Starting…" : "Start quiz"}
              </Button>
            ) : (
              <div className="flex flex-col gap-6">
                {session.questions.map((q) => (
                  <fieldset key={q.id} className="flex flex-col gap-2">
                    <legend className="text-sm font-medium">
                      {q.questionIndex}. {q.questionText}
                    </legend>
                    <div className="flex flex-col gap-2 pl-0">
                      {q.choices.map((c) => (
                        <label
                          key={c.id}
                          className="flex cursor-pointer items-start gap-2 text-sm"
                        >
                          <input
                            type="radio"
                            className="mt-1"
                            name={`quiz-q-${q.id}`}
                            value={c.id}
                            checked={answers[q.id] === c.id}
                            onChange={() =>
                              setAnswers((prev) => ({
                                ...prev,
                                [q.id]: c.id,
                              }))
                            }
                          />
                          <span>{c.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <Button
                  type="button"
                  onClick={onSubmit}
                  disabled={pendingSubmit}
                >
                  {pendingSubmit ? "Submitting…" : "Submit answers"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}
