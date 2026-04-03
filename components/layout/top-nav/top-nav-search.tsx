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
        "flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-zinc-200/90 bg-white px-3 py-1.5 shadow-sm dark:border-0 dark:bg-transparent dark:shadow-none",
        "md:max-w-[min(100%,42rem)]",
        className,
      )}
    >
      <Search
        className="size-[18px] shrink-0 text-zinc-500 dark:text-[#A0A0A0]"
        strokeWidth={1.75}
        aria-hidden
      />
      <input
        type="search"
        name="q"
        placeholder={placeholder}
        className={cn(
          "min-w-0 flex-1 bg-transparent py-1.5 text-sm text-zinc-900 outline-none",
          "placeholder:text-zinc-500 dark:text-white dark:placeholder:text-[#A0A0A0]",
        )}
        aria-label="Search"
        autoComplete="off"
      />
    </div>
  );
}
