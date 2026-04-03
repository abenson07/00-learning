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

import { cn } from "@/lib/utils";

export type SidebarRecentItem = {
  href: string;
  title: string;
};

const primaryNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lessons/1", label: "Lessons", icon: GraduationCap },
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
          ? "bg-white/[0.08] text-zinc-100"
          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200",
      )}
    >
      <Icon className="size-[18px] shrink-0 opacity-90" aria-hidden />
      {label}
    </Link>
  );
}

export function AppSidebar({
  recentItems,
}: {
  recentItems?: SidebarRecentItem[] | null;
}) {
  const pathname = usePathname();

  const showPlaceholders = recentItems == null;
  const list = recentItems ?? [];

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh w-[min(100%,280px)] shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-[#181818] py-6 pl-5 pr-4 text-white md:flex",
      )}
    >
      <Link
        href="/"
        className="mb-7 block pl-1 text-lg font-semibold tracking-tight text-zinc-200"
      >
        learning
      </Link>

      <nav className="flex flex-col gap-1" aria-label="Primary">
        {primaryNav.map(({ href, label, icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : href === "/lessons/1"
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
        <p className="mb-2 pl-1 text-[11px] font-medium uppercase tracking-wider text-zinc-600">
          Recently viewed
        </p>
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
          {showPlaceholders &&
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-md px-2.5 py-2 text-center text-xs text-zinc-600"
              >
                Recently viewed articles
              </div>
            ))}
          {!showPlaceholders && list.length === 0 && (
            <p className="rounded-md px-2.5 py-3 text-center text-xs leading-relaxed text-zinc-600">
              Nothing here yet. Browse the library to get started.
            </p>
          )}
          {!showPlaceholders &&
            list.map((item) => (
              <Link
                key={`${item.href}-${item.title}`}
                href={item.href}
                className="rounded-md px-2.5 py-2 text-left text-xs font-medium leading-snug text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-300"
              >
                <span className="line-clamp-2">{item.title}</span>
              </Link>
            ))}
        </div>
      </div>

      <div className="relative mt-6 shrink-0 rounded-lg border border-white/[0.08] bg-zinc-800/40 px-3.5 pb-4 pt-4 text-zinc-200">
        <div className="flex gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-zinc-500">
            <BookOpen className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-zinc-200">
              Level{" "}
              <Zap
                className="inline-block size-[1em] align-[-0.08em] text-zinc-500"
                strokeWidth={2}
                aria-hidden
              />{" "}
              up your plan
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Unlock structured paths and extra practice.
            </p>
            <Link
              href="/lesson-plan"
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-white/10 bg-zinc-900/80 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-white/15 hover:bg-zinc-900"
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
