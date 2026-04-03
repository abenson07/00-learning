"use client";

import { BookOpen, FileText, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { SearchApiResponse } from "@/lib/search/types";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 250;

export function TopNavSearch({
  className,
  placeholder = "Search articles and lessons…",
}: {
  className?: string;
  placeholder?: string;
}) {
  const id = useId();
  const listId = `${id}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SearchApiResponse | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length === 0) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setData(null);

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Search failed"))))
      .then((json: SearchApiResponse) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData({ articles: [], lessons: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const showPanel =
    open && (debouncedQuery.length > 0 || loading);

  const onFocus = useCallback(() => setOpen(true), []);
  const onChange = useCallback((v: string) => {
    setQuery(v);
    setOpen(true);
  }, []);

  const hasArticles = (data?.articles.length ?? 0) > 0;
  const hasLessons = (data?.lessons.length ?? 0) > 0;
  const empty =
    !loading &&
    debouncedQuery.length > 0 &&
    data &&
    !hasArticles &&
    !hasLessons;

  return (
    <div ref={rootRef} className={cn("relative w-full min-w-0 max-w-[min(100%,42rem)]", className)}>
      <div
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-1.5 shadow-sm dark:border-border/80 dark:bg-card/60",
          showPanel && "rounded-b-none border-b-0 shadow-none",
        )}
      >
        <Search
          className="size-[18px] shrink-0 text-muted-foreground"
          strokeWidth={1.75}
          aria-hidden
        />
        <input
          id={id}
          type="search"
          name="q"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          className={cn(
            "min-w-0 flex-1 bg-transparent py-1.5 text-sm text-foreground outline-none",
            "placeholder:text-muted-foreground",
          )}
          aria-label="Search articles and lessons"
          aria-autocomplete="list"
          aria-controls={showPanel ? listId : undefined}
          autoComplete="off"
        />
        {loading && (
          <Loader2
            className="size-[18px] shrink-0 animate-spin text-muted-foreground"
            aria-hidden
          />
        )}
      </div>

      {showPanel && (
        <div
          id={listId}
          role="region"
          aria-label="Search results"
          aria-live="polite"
          className="absolute left-0 right-0 top-full z-[100] max-h-[min(70vh,24rem)] overflow-y-auto rounded-b-xl border border-t-0 border-border bg-popover shadow-md dark:border-border/80"
        >
          {loading && !data && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              Searching…
            </p>
          )}

          {!loading && empty && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              No results for &ldquo;{debouncedQuery}&rdquo;.
            </p>
          )}

          {data && (hasArticles || hasLessons) && (
            <div className="py-2">
              {hasArticles && (
                <section aria-label="Articles">
                  <h3 className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Articles
                  </h3>
                  <ul className="space-y-0.5 px-1 pb-2">
                    {data.articles.map((a) => (
                      <li key={`article-${a.id}`}>
                        <Link
                          href={a.href}
                          className="flex items-start gap-2 rounded-md px-2 py-2 text-sm outline-none hover:bg-accent focus-visible:bg-accent"
                          onClick={() => {
                            setOpen(false);
                            setQuery("");
                            setDebouncedQuery("");
                            setData(null);
                          }}
                        >
                          <FileText
                            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium leading-tight text-foreground">
                              {a.title}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {a.category}
                              {a.description
                                ? ` · ${a.description.slice(0, 80)}${a.description.length > 80 ? "…" : ""}`
                                : ""}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {hasLessons && (
                <section aria-label="Lessons">
                  <h3 className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Lessons
                  </h3>
                  <ul className="space-y-0.5 px-1 pb-1">
                    {data.lessons.map((row) => (
                      <li key={`${row.kind}-${row.id}`}>
                        <Link
                          href={row.href}
                          className="flex items-start gap-2 rounded-md px-2 py-2 text-sm outline-none hover:bg-accent focus-visible:bg-accent"
                          onClick={() => {
                            setOpen(false);
                            setQuery("");
                            setDebouncedQuery("");
                            setData(null);
                          }}
                        >
                          <BookOpen
                            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <span className="font-medium leading-tight text-foreground">
                                {row.title}
                              </span>
                              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                {row.kind === "course" ? "Course" : "Lesson"}
                              </span>
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {row.kind === "lesson" && row.phase
                                ? `${row.phase} · `
                                : ""}
                              {row.courseTitle}
                              {row.subtitle
                                ? ` · ${row.subtitle}`
                                : ""}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
