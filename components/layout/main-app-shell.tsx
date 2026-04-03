import { cn } from "@/lib/utils";

import type { SidebarRecentItem } from "./app-sidebar";
import { AppSidebar } from "./app-sidebar";
import type { TopNavBarProps } from "./top-nav";
import { TopNavBar } from "./top-nav";

export type MainAppShellProps = {
  children: React.ReactNode;
  /** When set, replaces the default app sidebar (e.g. lesson plan rail on `/lessons/...`). */
  sidebar?: React.ReactNode;
  sidebarRecentItems?: SidebarRecentItem[] | null;
  /** Merged onto the primary sidebar (e.g. match `bg-background` for a unified shell). */
  sidebarClassName?: string;
  /** Omit to hide the top bar; pass props to customize streak, profile, search. */
  topNav?: TopNavBarProps | false;
  /**
   * `lesson`: main column is an elevated white card (`bg-card`) with shadow on the grey shell.
   */
  mainSurface?: "default" | "lesson";
};

export function MainAppShell({
  children,
  sidebar,
  sidebarRecentItems,
  sidebarClassName,
  topNav,
  mainSurface = "default",
}: MainAppShellProps) {
  const showTopNav = topNav !== false;
  const lesson = mainSurface === "lesson";

  return (
    <div className="flex min-h-svh w-full bg-background">
      {sidebar ?? (
        <AppSidebar className={sidebarClassName} recentItems={sidebarRecentItems} />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {showTopNav && (
          <div className="shrink-0 bg-background px-6 pt-5 md:px-10">
            <TopNavBar {...(topNav ?? {})} className={topNav?.className} />
          </div>
        )}
        <div
          className={cn(
            "min-h-0 min-w-0 flex-1",
            lesson && "p-3 md:p-5",
          )}
        >
          {lesson ? (
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border/80 bg-card text-card-foreground shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_24px_-4px_rgba(15,23,42,0.12)] md:rounded-xl">
              {children}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
