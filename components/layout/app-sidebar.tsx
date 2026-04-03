"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Library,
  Zap,
} from "lucide-react";

import { DEFAULT_LESSON_HREF } from "@/lib/curriculum/curriculum-defaults";
import { cn } from "@/lib/utils";

export type SidebarRecentItem = {
  href: string;
  title: string;
};

const lessonsHref = DEFAULT_LESSON_HREF;

const primaryNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: lessonsHref, label: "Lessons", icon: GraduationCap },
  { href: "/library", label: "Library", icon: Library },
] as const;

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-zinc-200/90 text-zinc-900 shadow-sm"
          : "text-zinc-600 hover:bg-zinc-100/90 hover:text-zinc-900",
      )}
    >
      <Icon className="size-[18px] shrink-0 text-zinc-700" aria-hidden />
      {label}
    </Link>
  );
}

export function AppSidebar({
  recentItems,
  className,
}: {
  recentItems?: SidebarRecentItem[] | null;
  className?: string;
}) {
  const pathname = usePathname();

  const showPlaceholders = recentItems == null;
  const list = recentItems ?? [];

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh w-[min(100%,280px)] shrink-0 flex-col overflow-hidden py-6 pl-5 pr-4 text-foreground md:flex",
        className,
      )}
    >
      <Link
        href="/"
        className="mb-7 block pl-1 text-lg font-semibold tracking-tight text-zinc-900"
      >
        learning
      </Link>

      <nav className="flex flex-col gap-1" aria-label="Primary">
        {primaryNav.map(({ href, label, icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : href === lessonsHref
                ? pathname.startsWith("/lessons")
                : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={active}
            />
          );
        })}
      </nav>

      <div className="mt-8 flex min-h-0 flex-1 flex-col">
        <p className="mb-2 pl-1 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Recently viewed
        </p>
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
          {showPlaceholders &&
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-md px-2.5 py-2 text-center text-xs text-zinc-500"
              >
                Recently viewed articles
              </div>
            ))}
          {!showPlaceholders && list.length === 0 && (
            <p className="rounded-md px-2.5 py-3 text-center text-xs leading-relaxed text-zinc-500">
              Nothing here yet. Browse the library to get started.
            </p>
          )}
          {!showPlaceholders &&
            list.map((item) => (
              <Link
                key={`${item.href}-${item.title}`}
                href={item.href}
                className="rounded-md px-2.5 py-2 text-left text-xs font-medium leading-snug text-zinc-600 transition-colors hover:bg-zinc-100/80 hover:text-zinc-900"
              >
                <span className="line-clamp-2">{item.title}</span>
              </Link>
            ))}
        </div>
      </div>

      <div className="relative mt-6 shrink-0 rounded-lg border border-border bg-card px-3.5 pb-4 pt-4 text-foreground shadow-sm">
        <div className="flex gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sage/25 text-sage-foreground dark:bg-sage/15 dark:text-sage-foreground">
            <BookOpen className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-zinc-900">
              Level{" "}
              <Zap
                className="inline-block size-[1em] align-[-0.08em] text-sage-foreground"
                strokeWidth={2}
                aria-hidden
              />{" "}
              up your plan
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Unlock structured paths and extra practice.
            </p>
            <Link
              href="/lesson-plan"
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              View lesson plan
              <ArrowUpRight className="size-3.5 opacity-80" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
