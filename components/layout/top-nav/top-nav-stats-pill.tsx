import { Flame, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

function formatXp(n: number) {
  return `${n.toLocaleString()} XP`;
}

export function TopNavStatsPill({
  xp,
  streakDays,
  className,
}: {
  xp: number;
  streakDays: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-10 items-center rounded-full bg-zinc-200/95 pl-1.5 pr-2.5 text-sm font-medium text-zinc-900",
        "dark:bg-[#2E2E2E] dark:text-white",
        className,
      )}
      role="group"
      aria-label="Your progress"
    >
      <div className="flex items-center gap-2 pr-2.5 sm:pr-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm shadow-orange-600/20">
          <Zap className="size-3.5" strokeWidth={2.25} aria-hidden />
        </span>
        <span className="whitespace-nowrap tabular-nums text-xs sm:text-sm">
          {formatXp(xp)}
        </span>
      </div>
      <div
        className="h-5 w-px shrink-0 bg-zinc-300 dark:bg-white/15"
        aria-hidden
      />
      <div className="flex items-center gap-2 pl-2.5 sm:pl-3">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full border-2",
            "border-zinc-500/80 dark:border-white",
          )}
        >
          <Flame
            className="size-3.5 text-zinc-600 dark:text-white"
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
