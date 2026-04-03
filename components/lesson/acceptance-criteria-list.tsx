"use client";

import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type AcceptanceCriteriaListProps = {
  lessonId: string;
  items: string[];
};

function storageKey(lessonId: string) {
  return `lesson-plan:acceptance:${lessonId}`;
}

export function AcceptanceCriteriaList({ lessonId, items }: AcceptanceCriteriaListProps) {
  const [checked, setChecked] = React.useState<Record<number, boolean>>({});
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(false);
    try {
      const raw = localStorage.getItem(storageKey(lessonId));
      const next: Record<number, boolean> = {};
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        for (let i = 0; i < items.length; i++) {
          if (parsed[String(i)]) next[i] = true;
        }
      }
      setChecked(next);
    } catch {
      setChecked({});
    }
    setHydrated(true);
  }, [lessonId, items.length]);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      const toStore: Record<string, boolean> = {};
      for (let i = 0; i < items.length; i++) {
        if (checked[i]) toStore[String(i)] = true;
      }
      localStorage.setItem(storageKey(lessonId), JSON.stringify(toStore));
    } catch {
      // ignore quota / private mode
    }
  }, [checked, hydrated, lessonId, items.length]);

  return (
    <ul className="space-y-3">
      {items.map((line, i) => {
        const isChecked = Boolean(checked[i]);
        const id = `${lessonId}-acceptance-${i}`;
        return (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-foreground">
            <Checkbox
              id={id}
              checked={isChecked}
              onCheckedChange={(v) =>
                setChecked((prev) => ({ ...prev, [i]: v === true }))
              }
              className="mt-0.5"
            />
            <label
              htmlFor={id}
              className={cn(
                "cursor-pointer text-pretty",
                isChecked &&
                  "text-muted-foreground line-through decoration-foreground/35 [text-decoration-thickness:1px]",
              )}
            >
              {line}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
