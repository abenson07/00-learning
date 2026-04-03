import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import { TopNavProfile } from "./top-nav-profile";
import { TopNavSearch } from "./top-nav-search";
import { TopNavStatsPill } from "./top-nav-stats-pill";

export type TopNavProfileProps = ComponentProps<typeof TopNavProfile>;

export type TopNavBarProps = {
  className?: string;
  xp?: number;
  streakDays?: number;
  profile?: Partial<TopNavProfileProps>;
  searchPlaceholder?: string;
};

export function TopNavBar({
  className,
  xp = 1230,
  streakDays = 0,
  profile,
  searchPlaceholder,
}: TopNavBarProps) {
  return (
    <header
      className={cn(
        "flex w-full items-center justify-between gap-3 border-b border-zinc-200/80 pb-4 dark:border-white/5",
        className,
      )}
    >
      <TopNavSearch placeholder={searchPlaceholder} />
      <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
        <TopNavStatsPill xp={xp} streakDays={streakDays} />
        <TopNavProfile {...profile} />
      </div>
    </header>
  );
}
