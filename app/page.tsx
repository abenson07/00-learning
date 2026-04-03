import Link from "next/link";
import { Globe, Landmark, ShoppingBag } from "lucide-react";

import { ArticlesBrowser } from "@/components/home/articles-browser";
import { HomeLessonPreview } from "@/components/home/home-lesson-preview";
import { MainAppShell } from "@/components/layout/main-app-shell";
import { Button } from "@/components/ui/button";
import { fetchArticles } from "@/lib/articles/load-articles";
import { hasSupabaseEnvConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

async function resolveDashboardGreeting(): Promise<string> {
  if (!hasSupabaseEnvConfigured()) {
    return "Welcome back.";
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return "Welcome back.";
    }
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const fullName = meta?.full_name ?? meta?.name;
    if (typeof fullName === "string" && fullName.trim()) {
      const first = fullName.trim().split(/\s+/)[0];
      if (first) {
        return `Welcome back, ${first}.`;
      }
    }
    const email = user.email;
    if (email) {
      const local = email.split("@")[0];
      if (local) {
        return `Welcome back, ${local}.`;
      }
    }
    return "Welcome back.";
  } catch {
    return "Welcome back.";
  }
}

export default async function HomePage() {
  const [{ articles, loadError }, greetingLine] = await Promise.all([
    fetchArticles(),
    resolveDashboardGreeting(),
  ]);

  const sidebarRecentItems = articles.slice(0, 5).map((a) => ({
    href: `/articles/${a.id}`,
    title: a.title,
  }));

  return (
    <MainAppShell sidebarRecentItems={sidebarRecentItems}>
      <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-8 p-4 md:p-6">
        <HomeLessonPreview
          greeting={greetingLine}
          headline="You've completed 5 lessons this week!"
          ctaLabel="Resume lesson"
          ctaHref="/lessons/1"
          lessons={[
            {
              id: "preview-1",
              index: 1,
              title: "Going shopping",
              variant: "upcoming",
              illustration: <ShoppingBag strokeWidth={1.25} aria-hidden />,
            },
            {
              id: "preview-2",
              index: 2,
              title: "Around the world",
              variant: "active",
              href: "/lessons/1",
              illustration: <Globe strokeWidth={1.25} aria-hidden />,
            },
            {
              id: "preview-3",
              index: 3,
              title: "Paris en ville",
              variant: "upcoming",
              illustration: <Landmark strokeWidth={1.25} aria-hidden />,
            },
          ]}
        />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Home</h1>
            <p className="mt-2 text-muted-foreground">
              Articles and quick links — same cards as the library.
            </p>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/library">Library</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/lesson-plan">Lesson plan</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/lessons/1">Lesson (sample)</Link>
            </Button>
          </nav>
        </div>
        <section className="rounded-lg border bg-background p-4 md:p-6">
          <ArticlesBrowser articles={articles} loadError={loadError} />
        </section>
      </main>
    </MainAppShell>
  );
}
