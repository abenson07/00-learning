import Link from "next/link";

import { cn } from "@/lib/utils";

export type ArticleCardProps = {
  title: string;
  /** Secondary line under the title (e.g. description or category). */
  meta?: string | null;
  /** Label in the trailing pill (e.g. category). */
  badge: string;
  className?: string;
} & (
  | { comingSoon: true }
  | { comingSoon?: false; href: string }
);

export function ArticleCard(props: ArticleCardProps) {
  const { title, meta, badge, className } = props;
  const comingSoon = props.comingSoon === true;

  const body = (
    <>
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="text-balance font-bold leading-snug tracking-tight text-white">
          {title}
        </h3>
        {meta ? (
          <p className="line-clamp-2 text-sm font-normal leading-snug text-[#A0A0A0]">
            {meta}
          </p>
        ) : null}
      </div>
      <div className="mt-6 flex justify-end">
        <span
          className={cn(
            "inline-flex max-w-full min-w-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-white",
            "bg-[#1E1B1B]",
            comingSoon && "opacity-90",
          )}
        >
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              comingSoon ? "bg-orange-400" : "bg-[#D14780]",
            )}
            aria-hidden
          />
          <span className="min-w-0 truncate">{badge}</span>
        </span>
      </div>
    </>
  );

  const shellClass = cn(
    "flex min-h-[120px] min-w-0 flex-col rounded-2xl bg-[#2A2626] p-4 transition-[transform,box-shadow] sm:p-5",
    "ring-1 ring-white/5",
    !comingSoon &&
      "hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D14780] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    comingSoon && "cursor-default opacity-95",
    className,
  );

  if (comingSoon) {
    return (
      <div
        className={shellClass}
        aria-disabled="true"
        aria-label={`${title}, coming soon`}
      >
        {body}
      </div>
    );
  }

  return (
    <Link href={props.href} className={shellClass} prefetch={false}>
      {body}
    </Link>
  );
}
