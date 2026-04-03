import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { LessonPreviewCard } from "./lesson-preview-card";

export type HomeLessonPreviewLesson =
  | {
      id: string;
      index: number;
      title: string;
      variant: "active";
      href: string;
      illustration?: ReactNode;
    }
  | {
      id: string;
      index: number;
      title: string;
      variant: "upcoming";
      illustration?: ReactNode;
    };

export type HomeLessonPreviewProps = {
  greeting: string;
  headline: string;
  ctaLabel: string;
  ctaHref: string;
  lessons: HomeLessonPreviewLesson[];
  className?: string;
};

export function HomeLessonPreview({
  greeting,
  headline,
  ctaLabel,
  ctaHref,
  lessons,
  className,
}: HomeLessonPreviewProps) {
  return (
    <section
      className={cn(
        "home-lesson-preview overflow-hidden rounded-[24px] bg-[#1f1a17] p-6 text-white shadow-inner shadow-black/20 md:p-8",
        className,
      )}
      aria-labelledby="home-lesson-preview-headline"
    >
      <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-10">
        <div className="flex max-w-xl shrink-0 flex-col gap-5 lg:py-1">
          <p className="text-sm font-medium text-white/80">{greeting}</p>
          <h2
            id="home-lesson-preview-headline"
            className="text-balance text-2xl font-bold leading-tight tracking-tight md:text-3xl md:leading-tight"
          >
            {headline}
          </h2>
          <div>
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-[#FF4D2D] px-5 py-2.5 text-sm font-semibold text-[#0a0a0a] transition-[filter,transform] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D2D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1f1a17] active:scale-[0.99]"
            >
              {ctaLabel}
              <ArrowUpRight className="size-4 shrink-0" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="min-w-0 flex-1 lg:flex lg:items-stretch">
          <div
            className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1 pt-0.5 [scrollbar-width:thin]"
            role="list"
            aria-label="Upcoming lessons"
          >
            {lessons.map((lesson) => {
              const { id, ...cardProps } = lesson;
              return (
                <div key={id} role="listitem">
                  <LessonPreviewCard {...cardProps} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
