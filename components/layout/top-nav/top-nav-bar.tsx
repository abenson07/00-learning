import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import { TopNavProfile } from "./top-nav-profile";
import { TopNavSearch } from "./top-nav-search";
import { TopNavStatsPill } from "./top-nav-stats-pill";

export type TopNavProfileProps = ComponentProps<typeof TopNavProfile>;

export type TopNavBarProps = {
  className?: string;
  streakDays?: number;
  profile?: Partial<TopNavProfileProps>;
  searchPlaceholder?: string;
};

export function TopNavBar({
  className,
  streakDays = 0,
  profile,
  searchPlaceholder,
}: TopNavBarProps) {
  return (
    <header
      className={cn(
        "flex w-full items-center justify-between gap-3 border-b border-border pb-4",
        className,
      )}
    >
      <TopNavSearch placeholder={searchPlaceholder} />
      <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
        <TopNavStatsPill streakDays={streakDays} />
        <TopNavProfile {...profile} />
      </div>
    </header>
  );
}
