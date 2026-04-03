"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

import { cn } from "@/lib/utils";

type TaskStatus = "done" | "current" | "upcoming";

type LessonTask = {
  id: string;
  label: string;
  status: TaskStatus;
};

type LessonSection = {
  index: string;
  title: string;
  tasks: LessonTask[];
};

/** Placeholder curriculum — replace with plan data per lesson when wired up. */
const DEMO_PLAN: {
  title: string;
  progressPercent: number;
  sections: LessonSection[];
} = {
  title: "Setup Stark API",
  progressPercent: 3,
  sections: [
    {
      index: "01",
      title: "Get API Access & Credentials",
      tasks: [
        { id: "1a", label: "Install SDK/Dependencies", status: "done" },
        { id: "1b", label: "Initialize Environment Variables", status: "current" },
        { id: "1c", label: "Add Polyfills", status: "upcoming" },
      ],
    },
    {
      index: "02",
      title: "Authenticate With Stark API",
      tasks: [
        { id: "2a", label: "Generate API Key", status: "upcoming" },
        { id: "2b", label: "Configure Auth Headers", status: "upcoming" },
        { id: "2c", label: "Verify Authentication", status: "upcoming" },
      ],
    },
  ],
};

function TaskRow({ task }: { task: LessonTask }) {
  if (task.status === "done") {
    return (
      <li className="flex items-start gap-2.5 text-sm text-foreground">
        <Check
          className="mt-0.5 size-4 shrink-0 text-emerald-500"
          strokeWidth={2.5}
          aria-hidden
        />
        <span>{task.label}</span>
      </li>
    );
  }

  if (task.status === "current") {
    return (
      <li>
        <div
          className={cn(
            "rounded-full bg-muted px-3 py-1.5 text-sm text-foreground shadow-sm",
          )}
        >
          <span className="text-muted-foreground">—</span> {task.label}
        </div>
      </li>
    );
  }

  return (
    <li className="flex gap-2 text-sm text-muted-foreground">
      <span aria-hidden className="select-none">
        —
      </span>
      <span>{task.label}</span>
    </li>
  );
}

export function LessonPlanSidebar({ className }: { className?: string }) {
  const params = useParams();
  const lessonId = typeof params?.lessonId === "string" ? params.lessonId : undefined;

  const plan = DEMO_PLAN;

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
        {lessonId && (
          <p className="mt-1 text-[11px] text-muted-foreground">Lesson {lessonId}</p>
        )}
      </div>

      <div className="mt-8 border-t border-border/60 pt-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-semibold tabular-nums tracking-tight text-foreground">
            {String(plan.progressPercent).padStart(2, "0")}
          </span>
          <span className="text-lg font-medium text-muted-foreground">%</span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          progress with integration
        </p>
      </div>

      <nav
        className="mt-6 flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto border-t border-border/60 pt-6 pr-1 pb-4"
        aria-label="Lesson plan"
      >
        {plan.sections.map((section) => (
          <section key={section.index}>
            <h2 className="text-[13px] font-semibold leading-snug text-foreground">
              <span className="text-muted-foreground">{section.index}.</span>{" "}
              {section.title}
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {section.tasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </ul>
          </section>
        ))}
      </nav>
    </aside>
  );
}
