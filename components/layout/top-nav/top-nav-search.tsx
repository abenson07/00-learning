import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

export function TopNavSearch({
  className,
  placeholder = "Search for a course, lesson, etc.",
}: {
  className?: string;
  placeholder?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-[min(100%,42rem)] items-center gap-3 rounded-xl border border-border bg-card px-3 py-1.5 shadow-sm dark:border-border/80 dark:bg-card/60",
        className,
      )}
    >
      <Search
        className="size-[18px] shrink-0 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden
      />
      <input
        type="search"
        name="q"
        placeholder={placeholder}
        className={cn(
          "min-w-0 flex-1 bg-transparent py-1.5 text-sm text-foreground outline-none",
          "placeholder:text-muted-foreground",
        )}
        aria-label="Search"
        autoComplete="off"
      />
    </div>
  );
}
