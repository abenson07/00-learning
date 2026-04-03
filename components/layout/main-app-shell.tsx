import type { SidebarRecentItem } from "./app-sidebar";
import { AppSidebar } from "./app-sidebar";
import type { TopNavBarProps } from "./top-nav";
import { TopNavBar } from "./top-nav";

export function MainAppShell({
  children,
  sidebarRecentItems,
  topNav,
}: {
  children: React.ReactNode;
  sidebarRecentItems?: SidebarRecentItem[] | null;
  /** Omit to hide the top bar; pass props to customize streak, profile, search. */
  topNav?: TopNavBarProps | false;
}) {
  const showTopNav = topNav !== false;

  return (
    <div className="flex min-h-svh w-full bg-background">
      <AppSidebar recentItems={sidebarRecentItems} />
      <div className="flex min-w-0 flex-1 flex-col">
        {showTopNav && (
          <div className="shrink-0 px-6 pt-5 md:px-10">
            <TopNavBar {...(topNav ?? {})} />
          </div>
        )}
        <div className="min-h-0 min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
