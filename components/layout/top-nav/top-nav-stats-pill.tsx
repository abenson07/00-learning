import { Flame } from "lucide-react";

import { cn } from "@/lib/utils";

export function TopNavStatsPill({
  streakDays,
  className,
}: {
  streakDays: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-10 items-center rounded-full bg-zinc-200/95 pl-1.5 pr-2.5 text-sm font-medium text-zinc-900",
        "dark:bg-zinc-700/85 dark:text-zinc-50",
        className,
      )}
      role="group"
      aria-label="Your streak"
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full border-2",
            "border-zinc-500/80 dark:border-zinc-400/90",
          )}
        >
          <Flame
            className="size-3.5 text-zinc-600 dark:text-zinc-200"
            strokeWidth={2}
            aria-hidden
          />
        </span>
        <span className="whitespace-nowrap tabular-nums text-xs sm:text-sm">
          {streakDays} days
        </span>
      </div>
    </div>
  );
}
