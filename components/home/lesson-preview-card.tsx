import Link from "next/link";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const lessonPreviewCardVariants = cva(
  "lesson-preview-card relative flex min-h-[220px] w-[min(100%,148px)] shrink-0 flex-col rounded-2xl border border-transparent p-4 transition-[transform,box-shadow] sm:w-[156px]",
  {
    variants: {
      variant: {
        active:
          "lesson-preview-card--active bg-[#FF4D2D] text-[#0a0a0a] shadow-lg shadow-black/15 hover:brightness-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D2D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1f1a17]",
        upcoming:
          "lesson-preview-card--upcoming cursor-default bg-white text-[#0a0a0a] shadow-sm shadow-black/5",
      },
    },
    defaultVariants: {
      variant: "upcoming",
    },
  },
);

const indexVariants = cva("text-xs font-semibold tabular-nums", {
  variants: {
    variant: {
      active: "text-[#0a0a0a]/80",
      upcoming: "text-[#FF4D2D]",
    },
  },
  defaultVariants: {
    variant: "upcoming",
  },
});

type LessonPreviewCardBase = {
  /** 1-based index shown as zero-padded (e.g. 1 → "01"). */
  index: number;
  title: string;
  illustration?: React.ReactNode;
  className?: string;
};

export type LessonPreviewCardProps =
  | (LessonPreviewCardBase & { variant: "active"; href: string })
  | (LessonPreviewCardBase & { variant?: "upcoming" });

export function LessonPreviewCard(props: LessonPreviewCardProps) {
  const { index, title, illustration, className } = props;
  const variant = props.variant ?? "upcoming";

  const padded = String(index).padStart(2, "0");

  const inner = (
    <>
      <span className={indexVariants({ variant })}>{padded}</span>
      <h3 className="mt-2 line-clamp-3 text-sm font-bold leading-snug tracking-tight">
        {title}
      </h3>
      <div
        className={cn(
          "mt-auto flex flex-1 items-end justify-center pb-1 pt-4 [&_svg]:size-14 [&_svg]:shrink-0",
          variant === "active" ? "text-[#0a0a0a]/90" : "text-[#0a0a0a]",
        )}
      >
        {illustration}
      </div>
    </>
  );

  const cardClass = cn(lessonPreviewCardVariants({ variant }), className);

  if (props.variant === "active") {
    return (
      <Link
        href={props.href}
        className={cardClass}
        aria-current="page"
        data-state="active"
        prefetch={false}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      className={cardClass}
      aria-disabled="true"
      data-state="upcoming"
    >
      {inner}
    </div>
  );
}
