"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  {
    href: "/library",
    label: "Library",
    match: (p: string) =>
      p === "/library" || p.startsWith("/library/") || p.startsWith("/articles/"),
  },
  {
    href: "/lessons",
    label: "Lessons",
    match: (p: string) => p === "/lessons" || p.startsWith("/lessons/"),
  },
  {
    href: "/settings",
    label: "Settings",
    match: (p: string) => p === "/settings" || p.startsWith("/settings/"),
  },
] as const;

function TopNavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-border bg-card shadow-sm ring-1 ring-black/5">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:gap-4 md:py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-foreground text-xs font-bold text-background"
            >
              LP
            </Link>
            <nav
              className="flex flex-wrap items-center gap-0.5"
              aria-label="Main"
            >
              {navItems.map((item) => (
                <TopNavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={item.match(pathname)}
                />
              ))}
            </nav>
          </div>

          <p className="text-muted-foreground hidden min-w-0 flex-1 text-center text-xs font-medium tracking-wide text-balance uppercase lg:block">
            Learning platform
          </p>

          <div className="flex min-w-0 flex-1 items-center gap-2 md:max-w-md md:flex-none lg:max-w-sm">
            <div className="relative min-w-0 flex-1">
              <input
                type="search"
                readOnly
                placeholder="Search the library…"
                className="h-9 w-full cursor-default rounded-md border border-border bg-muted pr-10 pl-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                aria-label="Search (preview)"
                tabIndex={-1}
              />
              <span className="pointer-events-none absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Search className="size-3.5" strokeWidth={2} aria-hidden />
              </span>
            </div>
            <button
              type="button"
              className="relative flex size-9 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Notifications"
            >
              <Bell className="size-4" strokeWidth={1.75} />
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-sm bg-primary ring-2 ring-card" />
            </button>
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/50 py-1 pr-1.5 pl-1">
              <span className="flex size-7 items-center justify-center rounded-md bg-zinc-900 text-[0.65rem] font-semibold text-white">
                You
              </span>
              <span className="hidden text-sm font-medium text-foreground sm:inline">
                Learner
              </span>
              <ChevronDown
                className="size-4 text-muted-foreground"
                strokeWidth={2}
                aria-hidden
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 bg-card px-4 py-5 md:border-x md:border-border/60 md:px-6 md:py-8 md:shadow-sm">
        {children}
      </main>
    </div>
  );
}
