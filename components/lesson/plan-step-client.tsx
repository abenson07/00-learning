"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";

import { setLessonStepComplete } from "@/app/lessons/actions";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import {
  readStepCompleteFromStorage,
  writeStepCompleteToStorage,
} from "@/lib/curriculum/lesson-step-local";
import { cn } from "@/lib/utils";

function referencePillSubtitle(note: string): string {
  const firstClause = note.split(/\s+—\s+|\s+–\s+/)[0]?.trim() ?? note.trim();
  if (firstClause.length <= 72) return firstClause;
  return `${firstClause.slice(0, 71)}…`;
}

export function PlanReferencePills({
  articles,
}: {
  articles: { article_id: string; note: string }[];
}) {
  if (articles.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {articles.map((a) => (
        <Link
          key={a.article_id}
          href={`/articles/${encodeURIComponent(a.article_id)}`}
          className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border/80 bg-white px-3 py-1.5 text-left font-mono text-[13px] text-zinc-950 transition-colors hover:bg-zinc-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
        >
          <FileText className="size-3.5 shrink-0 text-zinc-500" strokeWidth={2} aria-hidden />
          <span className="min-w-0">
            {a.article_id}
            <span className="text-zinc-400"> · </span>
            <span className="font-sans text-[13px] font-normal text-zinc-600">
              {referencePillSubtitle(a.note)}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export function CopyableCommandBlock({
  commandText,
  exampleOutput,
}: {
  commandText: string;
  exampleOutput?: string | null;
}) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = React.useCallback(async () => {
    const ok = await copyToClipboard(commandText);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }, [commandText]);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Run in terminal at your root</p>
      <div className="flex items-stretch overflow-hidden rounded-lg bg-zinc-800 dark:bg-zinc-900">
        <pre className="min-w-0 flex-1 overflow-x-auto p-3.5 font-mono text-[13px] leading-relaxed text-zinc-100">
          <code>{commandText}</code>
        </pre>
        <button
          type="button"
          onClick={onCopy}
          className="flex shrink-0 items-center justify-center border-l border-zinc-700 px-3 text-zinc-100 transition-colors hover:bg-zinc-700/80"
          aria-label={copied ? "Copied" : "Copy command to clipboard"}
        >
          {copied ? (
            <Image
              src="/done.svg"
              alt=""
              width={16}
              height={16}
              className="size-4"
              aria-hidden
            />
          ) : (
            <Image
              src="/copy.svg"
              alt=""
              width={16}
              height={16}
              className="size-4"
              aria-hidden
            />
          )}
        </button>
      </div>
      {exampleOutput ? (
        <div className="space-y-2 pt-1">
          <p className="text-sm font-medium text-foreground">You should see something like:</p>
          <pre className="overflow-x-auto rounded-lg border border-border/80 bg-muted/50 p-4 font-mono text-[12px] leading-relaxed text-foreground/95 whitespace-pre-wrap">
            {exampleOutput}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

export function ExamplePromptCopyLink({ promptText }: { promptText: string }) {
  const [copied, setCopied] = React.useState(false);

  const onClick = React.useCallback(async () => {
    const ok = await copyToClipboard(promptText);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }, [promptText]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mt-3 text-left text-[13px] text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground",
        copied && "text-emerald-600 dark:text-emerald-400",
      )}
    >
      {copied ? "Copied to clipboard" : "See example prompt"}
    </button>
  );
}

export function StepMarkCompleteButton({
  planId,
  lessonId,
  stepNumber,
  useServerProgress,
  initialComplete = false,
}: {
  planId: string;
  lessonId: string;
  stepNumber: number;
  useServerProgress: boolean;
  /** When using server progress, seed from server-rendered completions. */
  initialComplete?: boolean;
}) {
  const router = useRouter();
  const [complete, setComplete] = React.useState(initialComplete);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (useServerProgress) {
      setComplete(initialComplete);
      return;
    }
    setComplete(readStepCompleteFromStorage(lessonId, stepNumber));
  }, [useServerProgress, initialComplete, lessonId, stepNumber]);

  const toggle = React.useCallback(async () => {
    const next = !complete;
    if (useServerProgress) {
      setPending(true);
      setComplete(next);
      const result = await setLessonStepComplete({
        planId,
        lessonId,
        stepNumber,
        complete: next,
      });
      if (!result.ok) {
        setComplete(!next);
        setPending(false);
        return;
      }
      router.refresh();
      setPending(false);
      return;
    }
    setComplete(next);
    writeStepCompleteToStorage(lessonId, stepNumber, next);
  }, [complete, useServerProgress, planId, lessonId, stepNumber, router]);

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-mono text-sm text-white transition-colors disabled:opacity-60",
        complete
          ? "bg-emerald-700 hover:bg-emerald-800"
          : "bg-zinc-700 hover:bg-zinc-800 dark:bg-zinc-600 dark:hover:bg-zinc-500",
      )}
    >
      <Image
        src="/done.svg"
        alt=""
        width={16}
        height={16}
        className="size-4 shrink-0"
        aria-hidden
      />
      {complete ? "Completed" : "Mark as complete"}
    </button>
  );
}
